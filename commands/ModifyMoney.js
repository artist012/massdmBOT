const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageEmbed } = require("discord.js");
const sqlite3 = require('sqlite3');
const path = require('path');
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
        .setName("돈")
        .setDescription("유저가 보유중인 돈을 수정합니다, (*관리자만 사용할수 있습니다)")
        .addUserOption(option => option.setName('유저').setDescription('돈을 수정할 유저를 선택해주세요').setRequired(true))
        .addStringOption(option =>
            option.setName('작업')
                .setDescription('진행할 작업을 선택해주세요')
                .setRequired(true)
                .addChoices({
                    name: '차감', 
                    value: 'minus'
                })
                .addChoices({
                    name: '차증', 
                    value: 'plus'
                }))
        .addNumberOption(option => option.setName('돈').setDescription('차증하거나 차감할 돈을 설정해주세요').setRequired(true)),
    async execute(interaction, client) {
        let user = interaction.options.getUser('유저');

        db.get(`SELECT EXISTS (SELECT * FROM users WHERE id="${interaction.user.id}") as result;`, (err,row) => {
            if (err) {
                interaction.reply({
                    content: "⛔ 권한 수정중 DB에서 오류가 발생했습니다 ⛔",
                    ephemeral: true
                })
                return console.error(`[${scriptName} DATABASE-MM-USER CHECK] Problem in processing: ` + err.message);
            }

            if(row.result) {
                db.get(`SELECT permission FROM users WHERE id="${interaction.user.id}"`, (err,row) => {
                    if (err) {
                        interaction.reply({
                            content: "⛔ 유저 정보를 불러오던중에 오류가 발생했습니다 ⛔",
                            ephemeral: true
                        })
                        return console.error(`[${scriptName} DATABASE-MM-USER GET DATA] Problem in processing: ` + err.message);
                    }

                    if(row.permission == "admin") {
                        db.get(`SELECT EXISTS (SELECT * FROM users WHERE id="${user.id}") as result;`, (err,row) => {
                            if (err) {
                                interaction.reply({
                                    content: "⛔ 유저 정보를 불러오던중에 오류가 발생했습니다 ⛔",
                                    ephemeral: true
                                })
                                return console.error(`[${scriptName} DATABASE-MM-USER TARGET CHECK] Problem in processing: ` + err.message);
                            }

                            if(row.result) {
                                let work = interaction.options.getString('작업');
                                let money = interaction.options.getNumber('돈');
                                
                                db.get(`SELECT money FROM users WHERE id="${user.id}";`, (err,row) => {
                                    if (err) {
                                        interaction.reply({
                                            content: "⛔ 유저 정보를 불러오던중에 오류가 발생했습니다 ⛔",
                                            ephemeral: true
                                        })
                                        return console.error(`[${scriptName} DATABASE-MM-TARGET GET MONEY] Problem in processing: ` + err.message);
                                    }
                                    let bmoney = row.money;
                                    let _form = form(user, work, money, bmoney);
                                    
                                    if(work == "plus") {
                                        db.run(`UPDATE users SET money = money+${money} WHERE id="${user.id}";`, (err,_) => {
                                            if (err) {
                                                interaction.reply({
                                                    content: "⛔ 유저 정보를 업데이트 하던중에 오류가 발생했습니다 ⛔",
                                                    ephemeral: true
                                                })
                                                return console.error(`[${scriptName} DATABASE-MM-UPDATE MONEY+] Problem in processing: ` + err.message);
                                            }
                                            return interaction.reply({
                                                embeds: [_form],
                                                ephemeral: true
                                            })
                                        });
                                    } else if(work == "minus") {
                                        db.run(`UPDATE users SET money = money-${money} WHERE id="${user.id}";`, (err,_) => {
                                            if (err) {
                                                interaction.reply({
                                                    content: "⛔ 유저 정보를 업데이트 하던중에 오류가 발생했습니다 ⛔",
                                                    ephemeral: true
                                                })
                                                return console.error(`[${scriptName} DATABASE-MM-UPDATE MONEY-] Problem in processing: ` + err.message);
                                            }
                                            return interaction.reply({
                                                embeds: [_form],
                                                ephemeral: true
                                            })
                                        });
                                    }
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

        function form(user, work, money, bmoney) {
            let result;
            
            if(work == "plus") {
                work = "차증";
                result = bmoney+money;
            } else if(work == "minus") {
                work = "차감";
                result = bmoney-money
            }
                
            var embed = new MessageEmbed()
                .setColor(embedColor)
                .setTitle(`${work} 증명서`)
                .addFields(
                    { name: `대상자`, value: `<@${user.id}>`},
                    { name: '작업', value: `${work}` },
                    { name: `${work}전 급액`, value: `${bmoney}`, inline: true },
                    { name: `${work} 급액`, value: `${money}`, inline: true },
                    { name: `${work}후 급액`, value: `${result}`, inline: true },
                )
                .setTimestamp()

            return embed;
        };
    },
};