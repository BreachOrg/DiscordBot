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
        name: "server-stop",
        description: "Arrête le serveur Breach.",
        aliases: ["srv-stop"],
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
            return message.reply("ℹ️ Aucun serveur tracé. Soit il n'a jamais été lancé via le bot, soit le fichier PID a été supprimé.");
        }

        if (!isPidRunning(saved.pid)) {
            clearPid();
            return message.reply(`⚠️ Le serveur (PID \`${saved.pid}\`) n'est plus actif — il a probablement crashé. Fichier PID nettoyé.`);
        }

        try {
            process.kill(saved.pid);
            clearPid();
            return message.reply(`🛑 Serveur (PID \`${saved.pid}\`, config \`${saved.config}\`) arrêté.`);
        } catch (err) {
            return message.reply(`❌ Impossible de kill le PID \`${saved.pid}\` : ${err.message}`);
        }
    }
}).toJSON();