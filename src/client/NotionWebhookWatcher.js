const express = require("express");
const { info, warn, error } = require("../utils/Console");

// ─── CONFIG ────────────────────────────────────────────────────────────────
const CONFIG = {
    NOTION_TOKEN:        "process.env.NOTION_TOKEN", 
    DISCORD_WEBHOOK_URL: "process.env.DISCORD_WEBHOOK_URL",
    PORT: 3000,

    PRIORITY_COLORS: {
        "🔴 Critical": 0xFF0000,
        "🟠 High":     0xFF6600,
        "🟡 Medium":   0xFFCC00,
        "🟢 Low":      0x00CC44,
    },

    STATUS_EMOJIS: {
        "Open":        "🔓",
        "In Progress": "🔧",
        "Resolved":    "✅",
        "Closed":      "🔒",
    }
};

class NotionWebhookWatcher {
    /**
     * @param {import("./DiscordBot")} client
     */
    constructor(client) {
        this.client = client;
        this.app    = express();
        this.app.use(express.json());

        this._registerRoutes();
    }

    // ─── ROUTES ─────────────────────────────────────────────────────────────

    _registerRoutes() {
        // Route principale — Notion POST ici à chaque event
        this.app.post("/notion-webhook", (req, res) => {
            const event = req.body;
            info(`[Notion] Payload reçu: ${JSON.stringify(event, null, 2)}`);

            // Handshake initial — Notion vérifie que l'URL est valide
            // en envoyant un challenge ou un verification_token.
            // Il faut répondre immédiatement avec la même valeur,
            // sinon le webhook est rejeté côté Notion.
            if (event.challenge) {
                return res.status(200).json({ challenge: event.challenge });
            }
            if (event.verification_token) {
                return res.status(200).json({ verification_token: event.verification_token });
            }

            // On répond immédiatement à Notion pour éviter un timeout.
            // Notion s'attend à un 200 sous ~3 secondes — si on attend
            // le fetch de la page Notion + l'envoi Discord, on risque
            // de dépasser ce délai. Donc on traite en arrière-plan.
            res.status(200).json({ ok: true });

            setImmediate(() => this._handleEvent(event));
        });

        // Healthcheck — utile pour vérifier que le serveur tourne
        this.app.get("/health", (_, res) => {
            res.json({ status: "ok" });
        });
    }

    // ─── TRAITEMENT EVENT ───────────────────────────────────────────────────

    async _handleEvent(event) {
        try {
            // On ne traite que les créations de pages et les mises à jour
            if (event.type !== "page.created" && event.type !== "data_source.content_updated") return;

            // Selon le type d'event, l'ID de la page n'est pas au même endroit :
            // - page.created          → entity.id (la page elle-même)
            // - data_source.content_updated → updated_blocks[].id
            const pageIds = event.type === "page.created"
                ? [event.entity.id]
                : (event.data?.updated_blocks ?? []).map(b => b.id);

            if (!pageIds.length) return;

            for (const pageId of pageIds) {
                const page = await this._fetchNotionPage(pageId);

                // Notion peut envoyer des events sur des databases ou des blocs,
                // pas seulement des pages — on filtre pour ne garder que les pages
                if (page.object !== "page") continue;

                const payload = this._buildDiscordPayload(page, page.properties);
                await this._sendToDiscord(payload);

                info(`[Notion → Discord] Bug report envoyé: ${pageId}`);
            }
        } catch (err) {
            error("[NotionWebhookWatcher]", err);
        }
    }

    // ─── NOTION API ─────────────────────────────────────────────────────────

    async _fetchNotionPage(pageId) {
        const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
            headers: {
                "Authorization":  `Bearer ${CONFIG.NOTION_TOKEN}`,
                "Notion-Version": "2022-06-28",
                "Content-Type":   "application/json"
            }
        });

        if (!res.ok) {
            throw new Error(`Notion API error: ${res.status} ${await res.text()}`);
        }

        return res.json();
    }

    // ─── PROPERTY PARSER ────────────────────────────────────────────────────

    /**
     * Notion stocke chaque propriété dans un objet avec un champ "type"
     * qui détermine où se trouve la valeur réelle. Cette méthode unifie
     * tout ça en retournant toujours une string ou un tableau.
     */
    _extractProperty(prop) {
        if (!prop) return null;

        switch (prop.type) {
            case "title":
                return prop.title.map(t => t.plain_text).join("") || null;
            case "rich_text":
                return prop.rich_text.map(t => t.plain_text).join("") || null;
            case "select":
                return prop.select?.name || null;
            case "multi_select":
                return prop.multi_select.map(s => s.name);
            case "people":
                return prop.people.map(p => p.name || p.id);
            case "date":
                return prop.date?.start || null;
            case "status":
                return prop.status?.name || null;
            case "url":
                return prop.url || null;
            default:
                return null;
        }
    }

    // ─── DISCORD PAYLOAD ────────────────────────────────────────────────────

    _buildDiscordPayload(page, props) {
        const title          = this._extractProperty(props["Title"])           || "Bug sans titre";
        const priority       = this._extractProperty(props["Priority"])        || "Non définie";
        const context        = this._extractProperty(props["Context"])         || null;
        const tags           = this._extractProperty(props["Tags"])            || [];
        const reportedBy     = this._extractProperty(props["Reported by"])     || [];
        const buildVersion   = this._extractProperty(props["Build version"])   || null;
        const stepByStep     = this._extractProperty(props["Step-by-step"])    || null;
        const expectedResult = this._extractProperty(props["Expected result"]) || null;
        const currentResult  = this._extractProperty(props["Current result"])  || null;
        const errorLog       = this._extractProperty(props["Error Log"])       || null;
        const status         = this._extractProperty(props["Status"])          || "Open";

        const color       = CONFIG.PRIORITY_COLORS[priority] ?? 0x808080;
        const statusEmoji = CONFIG.STATUS_EMOJIS[status]     ?? "❓";

        // On ne crée un field que si la valeur existe — ça évite des
        // fields vides dans l'embed Discord
        const fields = [];

        if (priority)            fields.push({ name: "🎯 Priority",           value: priority,                              inline: true  });
        if (status)              fields.push({ name: `${statusEmoji} Status`,  value: status,                                inline: true  });
        if (buildVersion)        fields.push({ name: "🏗️ Build Version",      value: buildVersion,                          inline: true  });
        if (reportedBy.length)   fields.push({ name: "👤 Reported by",        value: reportedBy.join(", "),                 inline: true  });
        if (tags.length)         fields.push({ name: "🏷️ Tags",               value: tags.map(t => `\`${t}\``).join(" "),   inline: true  });
        if (context)             fields.push({ name: "📋 Context",             value: context,                               inline: false });
        if (stepByStep)          fields.push({ name: "🪜 Steps to reproduce",  value: stepByStep.slice(0, 1024),             inline: false });
        if (expectedResult)      fields.push({ name: "✅ Expected result",     value: expectedResult.slice(0, 1024),         inline: false });
        if (currentResult)       fields.push({ name: "❌ Current result",      value: currentResult.slice(0, 1024),          inline: false });
        if (errorLog)            fields.push({ name: "🪵 Error Log",           value: `\`\`\`\n${errorLog.slice(0, 900)}\n\`\`\``, inline: false });

        return {
            embeds: [{
                title:     `🐛 ${title}`,
                url:       page.url,
                color,
                fields,
                footer:    { text: `Notion Bug Report • ${new Date().toLocaleDateString("fr-FR")}` },
                timestamp: new Date().toISOString()
            }]
        };
    }

    // ─── DISCORD SEND ────────────────────────────────────────────────────────

    async _sendToDiscord(payload) {
        const res = await fetch(CONFIG.DISCORD_WEBHOOK_URL, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error(`Discord webhook error: ${res.status} ${await res.text()}`);
        }
    }

    // ─── START ───────────────────────────────────────────────────────────────

    /**
     * Démarre le serveur Express sur le port configuré.
     * Appelé par DiscordBot.connect() après le login.
     */
    start() {
        this.app.listen(CONFIG.PORT, () => {
            info(`[NotionWebhookWatcher] Serveur démarré sur le port ${CONFIG.PORT}`);
        });
    }
}

module.exports = NotionWebhookWatcher;