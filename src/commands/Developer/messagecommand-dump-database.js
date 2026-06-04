const { AttachmentBuilder, Message } = require("discord.js");
const fs = require('fs');
const DiscordBot = require("../../client/DiscordBot");
const MessageCommand = require("../../structure/MessageCommand");
const config = require("../../config");

module.exports = new MessageCommand({
    command: {
        name: 'dump-database',
        description: 'Dump the bot database.',
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
        if (!fs.existsSync(config.database.path)) {
            await message.reply({
                content: 'The database file does not exist yet.'
            });

            return;
        }

        const database = fs.readFileSync(config.database.path, 'utf-8');

        await message.reply({
            content: 'Here is the current database.',
            files: [
                new AttachmentBuilder(Buffer.from(database, 'utf-8'), { name: 'database.yml' })
            ]
        });
    }
}).toJSON();