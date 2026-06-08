const { Message } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const MessageCommand = require("../../structure/MessageCommand");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const PID_FILE = path.join(__dirname, "server_pid.json");

const SERVER_PATHS = {
    develop: "D:\\breach\\UnrealEngine\\LocalBuilds\\Engine\\Breach_develop\\Build\\WindowsServer\\BreachServer.exe",
    shipping: "D:\\breach\\UnrealEngine\\LocalBuilds\\Engine\\Breach_develop\\Build\\WindowsServer\\Shipping\\BreachServer.exe"
};

function savePid(pid, config) {
    fs.writeFileSync(PID_FILE, JSON.stringify({ pid, config, startedAt: new Date().toISOString() }));
}

function loadPid() {
    if (!fs.existsSync(PID_FILE)) return null;
    try {
        return JSON.parse(fs.readFileSync(PID_FILE, "utf8"));
    } catch {
        return null;
    }
}

function isPidRunning(pid) {
    try {
        const { execSync } = require("child_process");
        const output = execSync(`tasklist /FI "PID eq ${pid}" /NH`, { encoding: "utf8" });
        return output.toLowerCase().includes("breachserver");
    } catch {
        return false;
    }
}

module.exports = new MessageCommand({
    command: {
        name: "server-start",
        description: "Démarre le serveur Breach. Usage: !server-start <develop|shipping>",
        aliases: ["srv-start"],
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
        const config = args[0]?.toLowerCase();

        if (config !== "develop" && config !== "shipping") {
            return message.reply("❌ Usage : `!server-start <develop|shipping>`");
        }

        const existing = loadPid();
        if (existing && isPidRunning(existing.pid)) {
            return message.reply(
                `⚠️ Un serveur est déjà actif (PID \`${existing.pid}\`, config \`${existing.config}\`). Fais \`!server-stop\` d'abord.`
            );
        }

        const exePath = SERVER_PATHS[config];

        if (!fs.existsSync(exePath)) {
            return message.reply(`❌ Exécutable introuvable : \`${exePath}\`\nLance d'abord le build correspondant.`);
        }

        const child = spawn(exePath, ["-log", "-port=7777"], {
            detached: true,
            stdio: "ignore"
        });
        child.unref();

        savePid(child.pid, config);

        return message.reply(
            `✅ Serveur **${config}** démarré.\nPID : \`${child.pid}\`\nExe : \`${exePath}\``
        );
    }
}).toJSON();