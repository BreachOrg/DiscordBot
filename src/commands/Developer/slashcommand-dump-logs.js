const { ChatInputCommandInteraction, AttachmentBuilder, MessageFlags } = require("discord.js");
const fs = require('fs');
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");

module.exports = new ApplicationCommand({
    command: {
        name: 'dump-logs',
        description: 'Dump the bot logs.',
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

        if (!fs.existsSync('./terminal.log')) {
            await interaction.editReply({
                content: 'The logs file does not exist yet.'
            });

            return;
        }

        let logs = fs.readFileSync('./terminal.log', 'utf-8');
        logs = `${logs}`.replace(new RegExp(client.token, 'gi'), 'CLIENT_TOKEN');

        await interaction.editReply({
            content: 'Here are the current logs.',
            files: [
                new AttachmentBuilder(Buffer.from(logs, 'utf-8'), { name: 'terminal.log' })
            ]
        });
    }
}).toJSON();