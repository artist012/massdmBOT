const { SlashCommandBuilder } = require("@discordjs/builders");
const sqlite3 = require('sqlite3');
const path = require('path');
const { MessageEmbed } = require("discord.js");
const scriptName = path.basename(__filename);
const {embedColor} = require('../info.json');

const db = new sqlite3.Database('./DATABASE/data.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log(`[${scriptName}] DB connection complete.`);
    }
});

module.exports = {
    data: new SlashCommandBuilder()
        .setName("조회")
        .setDescription("유저의 정보를 조회합니다, (*관리자만 사용할수 있습니다)")
        .addUserOption(option => option.setName('유저').setDescription('정보를 조회할 유저를 선택해주세요').setRequired(true)),
    async execute(interaction, client) {
        let user = interaction.options.getUser('유저');
        
        await db.get(`SELECT EXISTS (SELECT * FROM users WHERE id="${interaction.user.id}") as result;`, (err,row) => {
            if (err) {
                interaction.reply({
                    content: "⛔ 권한 수정중 DB에서 오류가 발생했습니다 ⛔",
                    ephemeral: true
                })
                return console.error(`[${scriptName} DATABASE-INQ-USER CHECK] Problem in processing: ` + err.message);
            }

            if(row.result) {
                db.get(`SELECT permission FROM users WHERE id="${interaction.user.id}"`, (err,row) => {
                    if (err) {
                        interaction.reply({
                            content: "⛔ 유저 정보를 불러오던중에 오류가 발생했습니다 ⛔",
                            ephemeral: true
                        })
                        return console.error(`[${scriptName} DATABASE-INQ-USER GET DATA] Problem in processing: ` + err.message);
                    }

                    if(row.permission == "admin") {
                        db.get(`SELECT EXISTS (SELECT * FROM users WHERE id="${user.id}") as result;`, (err,row) => {
                            if (err) {
                                interaction.reply({
                                    content: "⛔ 유저 정보를 불러오던중에 오류가 발생했습니다 ⛔",
                                    ephemeral: true
                                })
                                return console.error(`[${scriptName} DATABASE-INQ-USER TARGET CHECK] Problem in processing: ` + err.message);
                            }

                            if(row.result) {
                                db.get(`SELECT * FROM users WHERE id="${user.id}"`, (err, row) => {
                                    if (err) {
                                        interaction.reply({
                                            content: "⛔ 유저 정보를 불러오던중에 오류가 발생했습니다 ⛔",
                                            ephemeral: true
                                        })
                                        return console.error(`[${scriptName} DATABASE-INQ-TARGET GET DATA] Problem in processing: ` + err.message);
                                    }
                
                                    var embed = new MessageEmbed()
                                        .setColor(embedColor)
                                        .setTitle(`${user.tag}님의 정보`)
                                        .addFields(
                                            { name: `유저`, value: `<@${row.id}>`},
                                            { name: '돈', value: `${row.money}`},
                                            { name: `권한`, value: `${row.permission}`},
                                        )
                                        .setTimestamp()
                
                                    return interaction.reply({
                                        embeds: [embed],
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