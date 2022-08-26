const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageActionRow, MessageSelectMenu, MessageEmbed } = require("discord.js");
const { embedColor } = require('../info.json');
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
        .setName("뒷메")
        .setDescription("엄준식 뒷메 서비스를 이용합니다."),
    async execute(interaction, client) {
        await db.get(`SELECT EXISTS (SELECT * FROM users WHERE id="${interaction.user.id}") as result;`, (err,row) => {
            if (err) {
                interaction.reply({
                    content: "⛔ 뒷메 준비중 DB에서 오류가 발생했습니다 ⛔",
                    ephemeral: true
                })
                return console.error(`[${scriptName} DATABASE-DM-CHECK] Problem in processing: ` + err.message);
            }

            if(row.result) {
                const row = new MessageActionRow()
                    .addComponents(
                        new MessageSelectMenu()
                            .setCustomId('mode')
                            .setPlaceholder('선택한 모드가 없습니다')
                            .addOptions([
                                {
                                    label: '일반 뒷메',
                                    description: '일반적인 디스코드의 초대코드로 뒷메를 날립니다',
                                    value: 'normal',
                                },
                                // {
                                //     label: '[사용불가] 아즈트라 뒷메',
                                //     description: '아즈트라 보안초대를 우회하여 뒷메를 날립니다',
                                //     value: 'aztra',
                                // },
                            ]),
                    );
                var embed = new MessageEmbed()
                    .setColor(embedColor)
                    .setTitle("사용할 뒷메 서비스를 선택해주세요")

                return interaction.reply({ ephemeral: true, embeds: [embed], components: [row] });
            } else {
                return interaction.reply({
                    content: "⛔ 당신은 가입되어 있지 않습니다 ⛔"
                })
            }
        });
    },
};