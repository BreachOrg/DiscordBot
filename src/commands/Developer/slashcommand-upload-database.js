const { ChatInputCommandInteraction, ApplicationCommandOptionType, MessageFlags } = require("discord.js");
const fs = require('fs');
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");
const { QuickYAML } = require('quick-yaml.db');

module.exports = new ApplicationCommand({
    command: {
        name: 'upload-database',
        description: 'Upload a new bot database.',
        type: 1,
        dm_permission: false,
        default_member_permissions: '8',
        options: [{
            name: 'database',
            description: 'The database file to upload.',
            type: ApplicationCommandOptionType.Attachment,
            required: true
        }]
    },
    options: {},
    /**
     * 
     * @param {DiscordBot} client 
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const attachment = interaction.options.getAttachment('database', true);
        const response = await fetch(attachment.url);

        if (!response.ok) {
            await interaction.editReply({
                content: 'Unable to download the provided database file.'
            });

            return;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(config.database.path, buffer);
        client.database = new QuickYAML(config.database.path);

        await interaction.editReply({
            content: 'Successfully uploaded the new database.'
        });
    }
}).toJSON();