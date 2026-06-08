const { Message } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const MessageCommand = require("../../structure/MessageCommand");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PID_FILE = path.join(__dirname, "server_pid.json");

function loadPid() {
    if (!fs.existsSync(PID_FILE)) return null;
    try {
        return JSON.parse(fs.readFileSync(PID_FILE, "utf8"));
    } catch {
        return null;
    }
}

function clearPid() {
    if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
}

function isPidRunning(pid) {
    try {
        const output = execSync(`tasklist /FI "PID eq ${pid}" /NH`, { encoding: "utf8" });
        return output.toLowerCase().includes("breachserver");
    } catch {
        return false;
    }
}

module.exports = new MessageCommand({
    command: {
        name: "server-status",
        description: "Vérifie si le serveur Breach tourne.",
        aliases: ["srv-status"],
        permissions: ["SendMessages"]
    },
    options: {
        cooldown: 3000
    },
    /**
     * @param {DiscordBot} client
     * @param {Message} message
     * @param {string[]} args
     */
    run: async (client, message, args) => {
        const saved = loadPid();

        if (!saved) {
            return message.reply("🔴 Aucun serveur tracé par le bot.");
        }

        const running = isPidRunning(saved.pid);

        if (running) {
            const uptime = Math.round((Date.now() - new Date(saved.startedAt).getTime()) / 1000);
            const minutes = Math.floor(uptime / 60);
            const seconds = uptime % 60;

            return message.reply(
                `🟢 Serveur **actif**\n` +
                `Config : \`${saved.config}\`\n` +
                `PID : \`${saved.pid}\`\n` +
                `Uptime : \`${minutes}m ${seconds}s\``
            );
        } else {
            clearPid();
            return message.reply(`🔴 Serveur **inactif** — le process \`${saved.pid}\` n'existe plus (crash ?). Fichier PID nettoyé.`);
        }
    }
}).toJSON();