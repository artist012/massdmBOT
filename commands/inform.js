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
        .setName("정보")
        .setDescription("자신의 정보를 확인합니다."),
    async execute(interaction, client) {
        db.get(`SELECT EXISTS (SELECT * FROM users WHERE id="${interaction.user.id}") as result;`, (err,row) => {
            if (err) {
                interaction.reply({
                    content: "⛔ 유저 정보를 불러오던중에 오류가 발생했습니다 ⛔",
                    ephemeral: true
                })
                return console.error(`[${scriptName} DATABASE-INF-USER CHECK] Problem in processing: ` + err.message);
            }

            if(row.result) {
                db.get(`SELECT * FROM users WHERE id="${interaction.user.id}"`, (err, row) => {
                    if (err) {
                        interaction.reply({
                            content: "⛔ 유저 정보를 불러오던중에 오류가 발생했습니다 ⛔",
                            ephemeral: true
                        })
                        return console.error(`[${scriptName} DATABASE-INF-USER GET DATA] Problem in processing: ` + err.message);
                    }

                    var embed = new MessageEmbed()
                        .setColor(embedColor)
                        .setTitle(`${interaction.user.tag}님의 정보`)
                        .addFields(
                            { name: `유저`, value: `<@${interaction.user.id}>`},
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
                    content: "⛔ 당신은 가입하지 않았습니다 ⛔",
                    ephemeral: true
                })
            }
        });
    },
};