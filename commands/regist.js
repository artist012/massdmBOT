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
        .setName("가입")
        .setDescription("엄준식 뒷메 서비스에 가입합니다."),
    async execute(interaction, client) {
        await db.get(`SELECT EXISTS (SELECT * FROM users WHERE id="${interaction.user.id}") as result;`, (err,row) => {
            if (err) {
                interaction.reply({
                    content: "⛔ 가입 도중 DB에서 오류가 발생했습니다 ⛔",
                    ephemeral: true
                })
                return console.error(`[${scriptName} DATABASE-REGIST-CHECK] Problem in processing: ` + err.message);
            }

            if(row.result) {
                return interaction.reply({
                    content: "⛔ 당신은 이미 가입되어 있습니다 ⛔"
                })
            } else {
                let nameLen = interaction.user.username.length;

                const modal = new Modal()
                    .setCustomId('tos')
                    .setTitle('엄준식 뒷메 서비스 이용약관\nhttp://umm-tos.kro.kr')
                    .addComponents(
                    new TextInputComponent()
                        .setCustomId('approval')
                        .setLabel('이용약관에 동의하시려면 본인의 \'디스코드 유저 네임\'을 입력해주세요.')
                        .setStyle('SHORT')
                        .setMinLength(nameLen)
                        .setMaxLength(nameLen)
                        .setPlaceholder('디스코드 유저 네임')
                        .setRequired(true)
                );
                showModal(modal, {
                    client: client,
                    interaction: interaction
                });
            }
        });
    },
};