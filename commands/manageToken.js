const { Modal, TextInputComponent, showModal } = require('discord-modals');
const { SlashCommandBuilder } = require("@discordjs/builders");
const axios = require('axios');
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
        .setName("토큰관리")
        .setDescription("뒷메를 위한 토큰을 관리합니다, (*관리자만 사용할수 있습니다)")
        .addStringOption(option =>
            option.setName('작업')
                .setDescription('실행할 작업을 선택해주세요')
                .setRequired(true)
                .addChoices({
                    name: '토큰확인', 
                    value: 'viewtoken'
                })
                .addChoices({
                    name: '토큰정리', 
                    value: 'tokenc'
                })
                .addChoices({
                    name: '토큰추가', 
                    value: 'addtoken'
                })),
    async execute(interaction, client) {
        let work = interaction.options.getString('작업');
        
        db.get(`SELECT EXISTS (SELECT * FROM users WHERE id="${interaction.user.id}") as result;`, (err, row) => {
            if (err) {
                interaction.reply({
                    content: "⛔ 토큰 관리중 DB에서 오류가 발생했습니다 ⛔",
                    ephemeral: true
                });
                return console.error(`[${scriptName} DATABASE-MT-USER CHECK] Problem in processing: ` + err.message);
            }

            if (row.result) {
                db.get(`SELECT permission FROM users WHERE id="${interaction.user.id}"`, async (err, row) => {
                    if (err) {
                        interaction.reply({
                            content: "⛔ 유저 정보를 불러오던중에 오류가 발생했습니다 ⛔",
                            ephemeral: true
                        });
                        return console.error(`[${scriptName} DATABASE-MT-USER GET DATA] Problem in processing: ` + err.message);
                    }

                    if (row.permission == "admin") {
                        if (work == "tokenc") {
                            await interaction.deferReply({ ephemeral: true });

                            let wt = 0;
                            let ft = 0;

                            // 토큰 체킹
                            db.all(`SELECT * FROM tokens;`, async (err, row) => {
                                if (err) {
                                    interaction.editReply("⛔ 토큰 정보를 불러오던중에 오류가 발생했습니다 ⛔");
                                    return console.error(`[${scriptName} DATABASE-MT-TOKENS GET DATA] Problem in processing: ` + err.message);
                                }

                                const promises = row.map(async (element) => {
                                    var isToken = await CheckToken(element.token);

                                    if (isToken) {
                                        wt++;
                                    } else {
                                        db.run(`DELETE FROM tokens WHERE token="${element.token}"`);
                                        ft++;
                                    }
                                });
                                await Promise.all(promises);

                                var embed = new MessageEmbed()
                                    .setColor(embedColor)
                                    .setTitle(`토큰 정리 보고서`)
                                    .addFields(
                                        { name: `작업자`, value: `<@${interaction.user.id}>` },
                                        { name: '\u200B', value: '\u200B' },
                                        { name: `총 토큰`, value: `${row.length}개`, inline: true },
                                        { name: `작동 토큰`, value: `${wt}개`, inline: true },
                                        { name: `터진 토큰`, value: `${ft}개`, inline: true }
                                    )
                                    .setTimestamp();

                                interaction.editReply({ embeds: [embed] });
                            });
                        } else if (work == "addtoken") {
                            // 토큰 추가 모달
                            const modal = new Modal()
                                .setCustomId('addtoken')
                                .setTitle('토큰 추가')
                                .addComponents(
                                    new TextInputComponent()
                                        .setCustomId('tokens')
                                        .setLabel('이메일:비번:토큰 인식못함')
                                        .setStyle('LONG')
                                        .setPlaceholder('토큰')
                                        .setRequired(true)
                                );
                            showModal(modal, {
                                client: client,
                                interaction: interaction
                            });
                        } else if (work == "viewtoken") {
                            // 재고 확인
                            db.all(`SELECT * FROM tokens;`, async (err, row) => {
                                if (err) {
                                    interaction.editReply("⛔ 토큰 정보를 불러오던중에 오류가 발생했습니다 ⛔");
                                    return console.error(`[${scriptName} DATABASE-MT-TOKENS GET DATA2] Problem in processing: ` + err.message);
                                }

                                var embed = new MessageEmbed()
                                    .setColor(embedColor)
                                    .setTitle(`현재 DB에 있는 토큰`)
                                    .setDescription("더 정확한 값을 보려면 토큰을 정리해주세요")
                                    .addFields(
                                        { name: `토큰`, value: `${row.length}개` }
                                    )
                                    .setTimestamp();

                                interaction.reply({ embeds: [embed], ephemeral: true });
                            });
                        }
                    } else {
                        return interaction.reply({
                            content: "⛔ 당신은 이 명령어를 실행할 권한이 없습니다 ⛔",
                            ephemeral: true
                        });
                    }
                });
            } else {
                return interaction.reply({
                    content: "⛔ 당신은 가입하지 않았습니다 ⛔",
                    ephemeral: true
                });
            }
        });

        const pick = (num) => {
            const characters ='abcdefghijklmnopqrstuvwxyz0123456789';
            let result = '';
            const charactersLength = characters.length;
            for (let i = 0; i < num; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            
            return result;
        }
        const Headers = (_token) => {
            return {
                "authorization": `${_token}`,
                "cookie": `__dcfduid=${pick(32)}; __sdcfduid=${pick(96)}; locale=en-US`,
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9004 Chrome/91.0.4472.164 Electron/13.6.6 Safari/537.36",
                "x-debug-options": "bugReporterEnabled",
                "x-discord-locale": "ko",
                "x-super-properties": "eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6ImtvLUtSIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEwMC4wLjQ4OTYuMTUxIFdoYWxlLzMuMTQuMTM0LjYyIFNhZmFyaS81MzcuMzYiLCJicm93c2VyX3ZlcnNpb24iOiIxMDAuMC40ODk2LjE1MSIsIm9zX3ZlcnNpb24iOiIxMCIsInJlZmVycmVyIjoiIiwicmVmZXJyaW5nX2RvbWFpbiI6IiIsInJlZmVycmVyX2N1cnJlbnQiOiIiLCJyZWZlcnJpbmdfZG9tYWluX2N1cnJlbnQiOiIiLCJyZWxlYXNlX2NoYW5uZWwiOiJzdGFibGUiLCJjbGllbnRfYnVpbGRfbnVtYmVyIjoxMzA4MzIsImNsaWVudF9ldmVudF9zb3VyY2UiOm51bGx9"
            }
        }
        const CheckToken = async (token) => {
            const tokenC = /[a-zA-Z0-9.-_]/;

            if(tokenC.test(token)) {
                try {
                    const res = await axios.get('https://canary.discord.com/api/v9/users/@me/library', {
                        headers: Headers(token)
                    })
            
                    if(res.status == 200) {
                        return true;
                    } else {
                        return false;
                    }
                } catch(e) {
                    return false;
                }
            }
        }
    },
};