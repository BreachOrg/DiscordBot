const { Message } = require("discord.js");
const fs = require('fs');
const DiscordBot = require("../../client/DiscordBot");
const MessageCommand = require("../../structure/MessageCommand");
const config = require("../../config");
const { QuickYAML } = require('quick-yaml.db');

const getDatabaseAttachment = (message, args) => {
    const attachment = message.attachments.first();

    if (attachment) {
        return attachment;
    }

    if (args[0]) {
        return { url: args[0], name: 'database.yml' };
    }

    return null;
};

module.exports = new MessageCommand({
    command: {
        name: 'upload-database',
        description: 'Upload a new bot database.',
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
        const attachment = getDatabaseAttachment(message, args);

        if (!attachment) {
            await message.reply({
                content: 'You must attach a database file or provide a direct file URL.'
            });

            return;
        }

        const response = await fetch(attachment.url);

        if (!response.ok) {
            await message.reply({
                content: 'Unable to download the provided database file.'
            });

            return;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(config.database.path, buffer);
        client.database = new QuickYAML(config.database.path);

        await message.reply({
            content: 'Successfully uploaded the new database.'
        });
    }
}).toJSON();