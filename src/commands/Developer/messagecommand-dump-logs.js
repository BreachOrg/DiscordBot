const { AttachmentBuilder, Message } = require("discord.js");
const fs = require('fs');
const DiscordBot = require("../../client/DiscordBot");
const MessageCommand = require("../../structure/MessageCommand");

module.exports = new MessageCommand({
    command: {
        name: 'dump-logs',
        description: 'Dump the bot logs.',
        aliases: [],
        permissions: ['Administrator']
    },
    options: {},
    /**
     * 
     * @param {DiscordBot} client 
     * @param {Message} message 
     * @param {string[]} args
     */
    run: async (client, message, args) => {
        if (!fs.existsSync('./terminal.log')) {
            await message.reply({
                content: 'The logs file does not exist yet.'
            });

            return;
        }

        let logs = fs.readFileSync('./terminal.log', 'utf-8');
        logs = `${logs}`.replace(new RegExp(client.token, 'gi'), 'CLIENT_TOKEN');

        await message.reply({
            content: 'Here are the current logs.',
            files: [
                new AttachmentBuilder(Buffer.from(logs, 'utf-8'), { name: 'terminal.log' })
            ]
        });
    }
}).toJSON();