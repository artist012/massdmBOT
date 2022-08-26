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
        .setName("탈퇴")
        .setDescription("엄준식 뒷메 서비스에서 탈퇴합니다."),
    async execute(interaction, client) {
        await db.get(`SELECT EXISTS (SELECT * FROM users WHERE id="${interaction.user.id}") as result;`, (err,row) => {
            if (err) {
                interaction.reply({
                    content: "⛔ 탈퇴 도중 DB에서 오류가 발생했습니다 ⛔",
                    ephemeral: true
                })
                return console.error(`[${scriptName} DATABASE-RESIGN-CHECK] Problem in processing: ` + err.message);
            }

            if(row.result) {
                const modal = new Modal()
                    .setCustomId('resign')
                    .setTitle('엄준식 뒷메 서비스 탈퇴')
                    .addComponents(
                    new TextInputComponent()
                        .setCustomId('approval')
                        .setLabel('탈퇴하시려면, "탈퇴"라고 적어주세요')
                        .setStyle('SHORT')
                        .setMinLength(2)
                        .setMaxLength(2)
                        .setPlaceholder('진짜 탈퇴하시려고요ㅜㅅㅠ?')
                        .setRequired(true),
                    new TextInputComponent()
                        .setCustomId('feedback')
                        .setLabel('저희가 개선할점이 있다면 피드백 해주세요')
                        .setStyle('LONG')
                        .setMaxLength(400)
                        .setPlaceholder('피드백을 받고 더 강해져서 돌아올게요!')
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