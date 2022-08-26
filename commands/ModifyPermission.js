const { SlashCommandBuilder } = require("@discordjs/builders");
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
        .setName("권한수정")
        .setDescription("유저의 권한을 수정합니다, (*관리자만 사용할수 있습니다)")
        .addUserOption(option => option.setName('유저').setDescription('권한을 수정할 유저를 선택해주세요').setRequired(true))
        .addStringOption(option =>
            option.setName('권한')
                .setDescription('유저에게 지급할 권한을 선택해주세요')
                .setRequired(true)
                .addChoices({
                    name: '일반', 
                    value: 'general'
                })
                .addChoices({
                    name: '관리자', 
                    value: 'admin'
                })),
    async execute(interaction, client) {
        let user = interaction.options.getUser('유저');

        await db.get(`SELECT EXISTS (SELECT * FROM users WHERE id="${interaction.user.id}") as result;`, (err,row) => {
            if (err) {
                interaction.reply({
                    content: "⛔ 권한 수정중 DB에서 오류가 발생했습니다 ⛔",
                    ephemeral: true
                })
                return console.error(`[${scriptName} DATABASE-MP-USER CHECK] Problem in processing: ` + err.message);
            }

            if(row.result) {
                db.get(`SELECT permission FROM users WHERE id="${interaction.user.id}"`, (err,row) => {
                    if (err) {
                        interaction.reply({
                            content: "⛔ 유저 정보를 불러오던중에 오류가 발생했습니다 ⛔",
                            ephemeral: true
                        })
                        return console.error(`[${scriptName} DATABASE-MP-USER GET DATA] Problem in processing: ` + err.message);
                    }

                    if(row.permission == "admin") {
                        db.get(`SELECT EXISTS (SELECT * FROM users WHERE id="${user.id}") as result;`, (err,row) => {
                            if (err) {
                                interaction.reply({
                                    content: "⛔ 유저 정보를 불러오던중에 오류가 발생했습니다 ⛔",
                                    ephemeral: true
                                })
                                return console.error(`[${scriptName} DATABASE-MP-USER TARGET CHECK] Problem in processing: ` + err.message);
                            }

                            if(row.result) {
                                let permission = interaction.options.getString('권한');
                                
                                db.run(`UPDATE users SET permission='${permission}' WHERE id='${user.id}'`, (err, row) => {
                                    if (err) {
                                        interaction.reply({
                                            content: "⛔ 유저 정보를 업데이트 하던중에 오류가 발생했습니다 ⛔",
                                            ephemeral: true
                                        })
                                        return console.error(`[${scriptName} DATABASE-MP-USER UPDATA] Problem in processing: ` + err.message);
                                    }

                                    return interaction.reply({
                                        content: `✅ <@${user.id}>님의 권한을 "${permission}"으로 업데이트 했습니다 ✅`,
                                        ephemeral: true
                                    })
                                });
                            } else {
                                return interaction.reply({
                                    content: "⛔ 가입되지 않은 유저입니다 ⛔",
                                    ephemeral: true
                                })
                            }
                        });
                    } else {
                        return interaction.reply({
                            content: "⛔ 당신은 이 명령어를 실행할 권한이 없습니다 ⛔",
                            ephemeral: true
                        })
                    }
                })
            } else {
                return interaction.reply({
                    content: "⛔ 당신은 가입하지 않았습니다 ⛔",
                    ephemeral: true
                })
            }
        });
    },
};