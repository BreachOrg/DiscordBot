const { ChatInputCommandInteraction, AttachmentBuilder, MessageFlags } = require("discord.js");
const fs = require('fs');
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const config = require("../../config");

module.exports = new ApplicationCommand({
    command: {
        name: 'dump-database',
        description: 'Dump the bot database.',
        type: 1,
        dm_permission: false,
        default_member_permissions: '8',
        options: []
    },
    options: {},
    /**
     * 
     * @param {DiscordBot} client 
     * @param {ChatInputCommandInteraction} interaction 
     */
    run: async (client, interaction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (!fs.existsSync(config.database.path)) {
            await interaction.editReply({
                content: 'The database file does not exist yet.'
            });

            return;
        }

        const database = fs.readFileSync(config.database.path, 'utf-8');

        await interaction.editReply({
            content: 'Here is the current database.',
            files: [
                new AttachmentBuilder(Buffer.from(database, 'utf-8'), { name: 'database.yml' })
            ]
        });
    }
}).toJSON();