const { SlashCommandBuilder } = require("@discordjs/builders");
const { Modal, TextInputComponent, showModal } = require('discord-modals');
const sqlite3 = require('sqlite3');
const path = require('path');
const scriptName = path.basename(__filename);

const db = new sqlite3.Database('./DATABASE/data.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log(`[${scriptName}] DB connection complete.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName("충전")
        .setDescription("돈을 충전합니다."),
    async execute(interaction, client) {
        await db.get(`SELECT EXISTS (SELECT * FROM users WHERE id="${interaction.user.id}") as result;`, (err,row) => {
            if (err) {
                interaction.reply({
                    content: "⛔ 충전 도중 DB에서 오류가 발생했습니다 ⛔",
                    ephemeral: true
                })
                return console.error(`[${scriptName} DATABASE-CHARGE-CHECK] Problem in processing: ` + err.message);
            }

            if(row.result) {
                const modal = new Modal()
                    .setCustomId('charge')
                    .setTitle('컬쳐랜드 문상 충전')
                    .addComponents(
                    new TextInputComponent()
                        .setCustomId('code')
                        .setLabel('충전할 문상코드를 입력해주세요.')
                        .setStyle('SHORT')
                        .setMinLength(19)
                        .setMaxLength(21)
                        .setPlaceholder('0000-0000-0000-000000')
                        .setRequired(true)
                );
                showModal(modal, {
                    client: client,
                    interaction: interaction
                });
            } else {
                return interaction.reply({
                    content: "⛔ 당신은 가입되어 있지 않습니다 ⛔"
                })
            }
        });
    },
};