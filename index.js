// embed color #2F3136
const { Client, Collection, MessageEmbed } = require('discord.js');
const { Modal, TextInputComponent, showModal } = require('discord-modals');
const discordModals = require('discord-modals');
const sqlite3 = require('sqlite3');
const axios = require('axios');
const Websocket = require('ws');
const { bot_token, feedbackChannel, embedColor, logChannel, api_key, cul_id, cul_pw, ccapikey } = require('./info.json');
const fs = require('fs');
const path = require('path');
const scriptName = path.basename(__filename);

const price = 10;

const db = new sqlite3.Database('./DATABASE/data.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log(`[${scriptName}] DB connection complete.`);
    }
});

const client = new Client({intents:32767});
discordModals(client);

process.on('uncaughtException', (err) => {
    console.error('Uncaught Error: ', err);
});

client.commands = new Collection();
const commandFiles = fs.readdirSync("./commands").filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

client.once('ready', async () =>{
    console.log("Main BOT START")
    
    client.user.setActivity('엄준식 뒷메 서비스',{
        type: "STREAMING",
        url: "https://www.twitch.tv/onmumunet/"
    })
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction, client);
    } catch (error) {
        console.error(error);
        await interaction.reply({
            content: "⛔ 명령어를 실행하던중 오류가 발생했습니다 ⛔",
            ephemeral: true,
        });
    }
});

client.on('modalSubmit', async (modal) => {
    if(modal.customId === 'tos') {
        const approval = modal.getTextInputValue('approval');

        if(approval == modal.user.username) {
            db.run(`INSERT INTO users (id) VALUES(${modal.user.id})`, (err, row) => {
                if (err) {
                    modal.reply({
                        content: "⛔ 가입 도중 DB에서 오류가 발생했습니다 ⛔",
                        ephemeral: true
                    })
                    return console.error(`[${scriptName} DATABASE-TOS] Problem in processing: ` + err.message);
                }
                return modal.reply(`✅ <@${modal.user.id}>님 가입을 성공했습니다 ✅`);
            });
        } else {
            return modal.reply(`⛔ <@${modal.user.id}>님이 약관에 동의하지 않아 가입에 실패했습니다 ⛔`);
        }
    } else if(modal.customId === 'resign') {
        const approval = modal.getTextInputValue('approval');
        const feedback = modal.getTextInputValue('feedback');

        if(approval == "탈퇴") {
            db.run(`DELETE FROM users WHERE id="${modal.user.id}";`, (err, row) => {
                if (err) {
                    modal.reply({
                        content: "⛔ 탈퇴 도중 DB에서 오류가 발생했습니다 ⛔",
                        ephemeral: true
                    })
                    return console.error(`[${scriptName} DATABASE-RESIGN] Problem in processing: ` + err.message);
                }

                if(feedback !== null) {
                    let channel = client.channels.cache.get(feedbackChannel);
                    var embed = new MessageEmbed()
                        .setColor(embedColor)
                        .setTitle(`\`${modal.user.tag}(${modal.user.id})\`님의 피드백`)
                        .setDescription(`${feedback}`)
                        .setTimestamp()
                    try {
                        channel.send({ embeds: [embed] })
                    } catch {
                        console.log("피드백 채널아이디가 올바르지 않습니다.")
                    }
                }

                return modal.reply(`✅ <@${modal.user.id}>님 탈퇴가 완료되었습니다 ✅`);
            });
        } else {
            return modal.reply(`⛔ <@${modal.user.id}>님이 탈퇴를 승인하지 않아 탈퇴에 실패했습니다 ⛔`);
        }
    } else if(modal.customId === 'charge') {
        const code = modal.getTextInputValue('code');
        const reg = /\d{4}-\d{4}-\d{4}-(\d{4}|\d{6})/;
        let channel = client.channels.cache.get(logChannel);
        
        if(reg.test(code)) {
            await modal.deferReply({ ephemeral: true });
            // 충전 코드
            // return modal.editReply("🚧 개발중 🚧")
            
            let res = await axios.post("http://13.125.101.202:3000/api/charge", {
                token: api_key,
                pin: code,
                id: cul_id,
                pw: cul_pw,
            }).catch(e => {
                var embed = new MessageEmbed()
                    .setColor('#f04040')
                    .setTitle(`충전 로그`)
                    .setDescription(`문화상품권을 이용한 충전을 실패했습니다`)
                    .addFields(
                        { name: `유저`, value: `<@${modal.user.id}>`},
                        { name: '코드', value: `${code}`},
                        { name: `사유`, value: `문화상품권 충전 서버에서 문제가 발생했습니다`},
                    )
                    .setTimestamp()
                try {
                    channel.send({ embeds: [embed] })
                } catch {
                    console.log("로그 채널아이디가 올바르지 않습니다.")
                }
                
                console.log(e)
                return modal.editReply('⛔ 충전을 실패했습니다, 관리자에게 문의해주세요 ⛔');
            });

            if(res.data.result) {
                db.run(`UPDATE users SET money = money+${res.data.amount} WHERE id="${modal.user.id}";`, (err,_) => {
                    if (err) {
                        modal.editReply('⛔ 유저 정보를 업데이트 하던중에 오류가 발생했습니다 ⛔');
                        return console.error(`[${scriptName} DATABASE-CHARGE-UPDATE MONEY+] Problem in processing: ` + err.message);
                    }
                
                    var embed = new MessageEmbed()
                        .setColor('#81c147')
                        .setTitle(`충전 로그`)
                        .setDescription(`문화상품권 충전 성공`)
                        .addFields(
                            { name: `유저`, value: `<@${modal.user.id}>`},
                            { name: '코드', value: `${code}`},
                            { name: '돈', value: `${res.data.amount}`},
                            { name: `사유`, value: `${res.data.reason}`},
                        )
                        .setTimestamp()
                    try {
                        channel.send({ embeds: [embed] })
                    } catch {
                        console.log("로그 채널아이디가 올바르지 않습니다.")
                    }
                    
                    return modal.editReply(`✅ ${res.data.amount}원 충전 완료 ✅`);
                });
            } else {
                var embed = new MessageEmbed()
                    .setColor('#f04040')
                    .setTitle(`충전 로그`)
                    .setDescription(`문화상품권 충전 실패`)
                    .addFields(
                        { name: `유저`, value: `<@${modal.user.id}>`},
                        { name: '코드', value: `${code}`},
                        { name: `사유`, value: `${res.data.reason}`},
                    )
                    .setTimestamp()
                try {
                    channel.send({ embeds: [embed] })
                } catch {
                    console.log("로그 채널아이디가 올바르지 않습니다.")
                }
                
                return modal.editReply(`⛔ 충전을 실패했습니다 ⛔\n\n사유: ${res.data.reason}`);
            }
        } else {
            var embed = new MessageEmbed()
                .setColor('#f04040')
                .setTitle(`충전 로그`)
                .setDescription(`문화상품권을 이용한 충전을 불허했습니다`)
                .addFields(
                    { name: `유저`, value: `<@${modal.user.id}>`},
                    { name: '코드', value: `${code}`},
                    { name: `사유`, value: `해당 코드는 문화상품권에 정규표현식을 통과하지 못했습니다`},
                )
                .setTimestamp()
            try {
                channel.send({ embeds: [embed] })
            } catch {
                console.log("로그 채널아이디가 올바르지 않습니다.")
            }

            return modal.reply({
                content: `⛔ \`${code}\`는 올바르지 않은 코드 입니다 ⛔`,
                ephemeral: true
            })
        }
    } else if(modal.customId === "addtoken") {
        await modal.deferReply({ ephemeral: true });

        const tokens = modal.getTextInputValue('tokens').split(/\r?\n/);
        let wt = 0;
        let ft = 0;
        let jb = 0;

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

        for(let token of tokens) {
            var isToken = await CheckToken(token);

            if(isToken) {
                db.get(`SELECT EXISTS (SELECT * FROM tokens WHERE token="${token}") as result;`, async (err, row) => {
                    if(row.result) {
                        jb++
                    } else {
                        db.run(`insert into tokens values ("${token}");`);
                        wt++
                    }
                });
            } else {
                ft++
            }
        }

        var embed = new MessageEmbed()
            .setColor(embedColor)
            .setTitle(`토큰 추가 보고서`)
            .setDescription("정확하지 않을수 있음")
            .addFields(
                { name: `작업자`, value: `<@${modal.user.id}>` },
                { name: '\u200B', value: '\u200B' },
                { name: `총 토큰`, value: `${tokens.length}`},
                { name: `작동 토큰`, value: `${wt}개`, inline: true },
                { name: `중복 토큰`, value: `${jb}개`, inline: true },
                { name: `터진 토큰`, value: `${ft}개`, inline: true }
            )
            .setTimestamp();

        modal.editReply({ embeds: [embed] });
    } else if(modal.customId.endsWith('_dm')) {
        await modal.deferReply({ ephemeral: true });
        
        const token = modal.getTextInputValue('token');
        const serverid = modal.getTextInputValue('serverid');
        const channelid = modal.getTextInputValue('channelid');
        const invite = modal.getTextInputValue('invite');
        const message = modal.getTextInputValue('message');

        const umm = new umm_dm(modal, token, serverid, channelid, invite, message)

        db.get(`SELECT EXISTS (SELECT * FROM users WHERE id="${modal.user.id}") as result;`, async (err,row) => {
            if (err) {
                modal.editReply({
                    content: "⛔ 뒷메중 DB에서 오류가 발생했습니다 ⛔",
                    ephemeral: true
                })
                return console.error(`[${scriptName} DATABASE-DM-USER CHECK] Problem in processing: ` + err.message);
            }
    
            if(row.result) {
                if(await umm.checkToken()) {
                    if(await umm.checkCG()) {
                        if(await umm.checkInvite()) {
                            umm.dm();
                        } else {
                            return modal.editReply({
                                content: "⛔ 초대링크가 올바르지 않거나, 뒷메할 서버 아이디와 일치하지 않습니다 ⛔",
                                ephemeral: true
                            })
                        }
                    } else {
                        return modal.editReply({
                            content: "⛔ 서버 아이디 또는 채널 아이디가 올바르지 않습니다 ⛔",
                            ephemeral: true
                        })
                    }
                } else {
                    return modal.editReply({
                        content: "⛔ 파싱을 위한 토큰이 올바르지 않습니다 ⛔",
                        ephemeral: true
                    })
                }
            } else {
                return modal.editReply({
                    content: "⛔ 당신은 가입하지 않았습니다 ⛔",
                    ephemeral: true
                })
            }
        });
    }
});

client.on('interactionCreate', async (interaction) => {
	if (!interaction.isSelectMenu()) return;
	
    if(interaction.customId === "mode") {
        let mode = interaction.values[0];

        switch(mode) {
            case "normal":
                form("디스코드", 'normal', 'discord.gg/umm-dm X | umm-dm O')
                break;
            case "aztra":
                form("아즈트라", 'aztra', '전체 https://aztra.xyz/invite/LHjMa6Oh O')
                break;
        }
    }

    function form(_mode, _en, _ex) {
        const modal = new Modal()
            .setCustomId(_en+'_dm')
            .setTitle('엄준식 뒷메 서비스')
            .addComponents(
            new TextInputComponent()
                .setCustomId('token')
                .setLabel('파싱할 서버에 들어가있는 토큰을 입력해주세요')
                .setStyle('SHORT')
                .setMaxLength(100)
                .setPlaceholder('OTMxODE5NDkxNTk4NDM0MzI1.YeJ-kw.GaeToO5S5mt92Bv_AZHABFKbtdE')
                .setRequired(true),
            new TextInputComponent()
                .setCustomId('serverid')
                .setLabel('서버 아이디를 입력해주세요')
                .setStyle('SHORT')
                .setMinLength(18)
                .setMaxLength(18)
                .setPlaceholder('963209769668194334')
                .setRequired(true),
            new TextInputComponent()
                .setCustomId('channelid')
                .setLabel('채널 아이디를 입력해주세요')
                .setStyle('SHORT')
                .setMinLength(18)
                .setMaxLength(18)
                .setPlaceholder('963209769668194334')
                .setRequired(true),
            new TextInputComponent()
                .setCustomId('invite')
                .setLabel(_mode + ' 서버 초대링크를 입력해주세요.')
                .setStyle('SHORT')
                .setMinLength(1)
                .setMaxLength(30)
                .setPlaceholder(_ex)
                .setRequired(true),
            new TextInputComponent()
                .setCustomId('message')
                .setLabel('보낼 메시지 내용을 입력해주세요 ([@tag] = 유저맨션)')
                .setStyle('LONG')
                .setMinLength(1)
                .setMaxLength(800)
                .setRequired(true),
        );
        showModal(modal, {
            client: client,
            interaction: interaction
        });
    }
});

class umm_dm {
    constructor(modal, token, serverid, channelid, invite, message) {
        this.modal = modal;
        this.token = token;
        this.serverid = serverid;
        this.channelid = channelid;
        this.invite = invite;
        this.message = message;
        this.joined_token = [];
    }

    checkToken = async () => {
        const tokenC = /[a-zA-Z0-9.-_]/;
        
        if(tokenC.test(this.token)) {
            try {
                const res = await axios.get('https://discord.com/api/v9/users/@me/library', {
                    headers: Headers(this.token)
                })
        
                if(res.status == 200) {
                    return true;
                } else {
                    return false;
                }
            } catch {
                return false;
            }
        }
    }

    checkCG = async () => {
        try {
            const res = await axios.get(`https://discord.com/api/v9/guilds/${this.serverid}/channels`, {
                headers: Headers(this.token)
            })
    
            for (let i of res.data) {
                if(i.id == this.channelid) {
                    return true;
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    checkInvite = async () => {
        const res = await axios.get(`https://discord.com/api/v9/invites/${this.invite}`, {
            headers: Headers(this.token)
        })

        if(res.status == 200) {
            if(res.data.guild.id == this.serverid) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    Invite = async (_token) => {
        if(!this.joined_token.includes(_token)) {
            var res = await axios.post(`https://discord.com/api/v10/invites/${this.invite}`, {}, {
                headers: Headers(_token)
            }).then(async (res) => {
                if(res.status == 200) {
                    this.joined_token.push(_token);
                    return true;
                } else {
                    return false;
                }
            }).catch(async (err) => {
                var res = err.response;
                console.log(res.status)
                console.log(res.data.hasOwnProperty("captcha_key"))

                if(res.status == 400) {
                    if(res.data.hasOwnProperty("captcha_key")) {
                        console.log(123)
                        console.log(res.data)
                        const captchaKey = await this.gRecaptchaRes(res.data["captcha_sitekey"]);
                        const rqToken = res.data["captcha_rqtoken"];

                        console.log(`${captchaKey} | ${rqToken}`)
                        
                        var res = await axios.post(`https://discord.com/api/v10/invites/${this.invite}`, {
                            captcha_key: captchaKey,
                            captcha_rqtoken: rqToken
                        }, {
                            headers: Headers(_token),
                        }).then(async (res) => {
                            console.log(res.data)

                            if(res.status == 200) {
                                this.joined_token.push(_token);
                                return true;
                            } else {
                                return false;
                            }
                        }).catch(err => {
                            console.log(err.message)

                            var res = err.response;

                            console.log(res.data)
                            return false;
                        })
                    } else {
                        console.log(res.data)
                        console.log("캡챠키 어디감")
                        return false;
                    }
                } else {
                    console.log("뭔데;;")
                    return false;
                }
            })
        } else {
            return true;
        }
    }

    LeaveAll = async () => {
        this.joined_token.forEach(async (token) => {
            const res = await axios.delete(`https://discord.com/api/v9/users/@me/guilds/${this.serverid}`, {
                headers: Headers(token)
            })
        });
    }

    getCaptchaBalance = async () => {
        const res = await axios.post(`https://api.캡챠사이트.com/getBalance`, {
            "clientKey": ccapikey
        })
        return res.balance
    }

    gRecaptchaRes = async (siteKey) => {
        var res = await axios.post(`https://api.캡챠사이트.com/createTask`, {
            "clientKey": ccapikey,
            "task": {
                "type": "HCaptchaTaskProxyless",
                "websiteURL": "https://discord.com/",
                "websiteKey": siteKey
            }
        })
        const taskId = res.data.taskId;
    
        while (true) {
            var res = await axios.post(`https://api.캡챠사이트.com/getTaskResult`, {
                "clientKey": ccapikey,
                "taskId": taskId
            });

            switch(res.data.status) {
                case "processing":
                    console.log('PROCESSING . . .')
                    continue;
                case "ready":
                    console.log('DONE!')
                    return res.data['solution']['gRecaptchaResponse'];
            }
        }
    }

    dm = async () => {
        let start = new Date();
        let users = await parse(this.token, this.serverid, this.channelid);
        if(!users) { return this.modal.editReply('⛔ 파싱에 실패했습니다 ⛔'); }
        users = users.filter(obj => !obj.group).filter(obj => obj.member.user.bot !== true);

        // users.forEach(u => console.log(u.member.user.username))

        // ver. test
        let cost = price * users.length;
        let Ruser = await getUser(this.modal.user.id);
        let suc = 0;
        let deduct = 0;
        let refund = 0;
        let msg = `***\\* 이 메시지를 닫지 마세요, 결과를 확인할수 없습니다 \\****\n================================\n유저: ${users.length}명 / 예상 차감금액: ${cost}원`;
    
        if(Ruser.money >= cost) {
            this.modal.editReply(msg)
            db.run(`UPDATE users SET money = money-${cost} WHERE id="${this.modal.user.id}";`, (err, _) => {
                if (err) {
                    this.modal.editReply("⛔ 유저 정보를 업데이트 하던중에 오류가 발생했습니다 ⛔");
                    return console.error(`[${scriptName} DATABASE-DM-UPDATE MONEY-] Problem in processing: ` + err.message);
                }
            });

            const cToken = async (token) => {
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
                    } catch {
                        return false;
                    }
                }
            }

            for(var _user of users) {
                let start1 = new Date();

                let user = _user.member.user.id;
                let token = await getToken(1);
                token = token[0].token;
                
                if(await cToken(token)) {
                    try {
                        // 토큰 온라인
                        online(token);
                        
                        if(await this.Invite(token)) { // 토큰 초대
                            // 뒷메 전송
                            var res = await axios.post('https://canary.discord.com/api/v9/users/@me/channels', {recipients:[user]}, {
                                headers: Headers(token)
                            });

                            if(res.status == 200) {
                                let dm = res.data.id;
                                var res = await axios.post(`https://canary.discord.com/api/v9/channels/${dm}/messages`, {
                                    "content": this.message,
                                    "nonce": intpick(18),
                                    "tts": false
                                }, {
                                    headers: Headers(token)
                                });

                                suc++
                            } else {
                                continue;
                            }
                        } else {
                            continue;
                        }
                    } catch (e) {
                        continue;
                    }
                }

                this.LeaveAll();

                deduct = price * suc;
                refund = cost - deduct;
                this.modal.editReply(msg + `\n================================\n성공: ${suc}명 / 실패: ${users.length-suc}명\n차감 금액: ${deduct}₩ / 환불 금액: ${refund}₩\n================================\n***\\* 메시지 수정 딜레이로 인해 원래보다 결과가 늦게 표시될수 있습니다 \\****\n\n대상: ${_user.member.user.username} / 걸린시간: ${new Date()-start1}ms\n================================`);
            }
            db.run(`UPDATE users SET money = money+${refund} WHERE id="${this.modal.user.id}";`, (err, _) => {
                if (err) {
                    this.modal.editReply("⛔ 유저 정보를 업데이트 하던중에 오류가 발생했습니다 ⛔");
                    return console.error(`[${scriptName} DATABASE-DM-UPDATE MONEY+] Problem in processing: ` + err.message);
                }
            });
            this.modal.editReply(`뒷메 결과\n\n뒷메 시도: ${users.length}명\n성공: ${suc}명\n실패: ${users.length-suc}명\n차감 금액: ${deduct}₩\n환불 금액: ${refund}₩\n\n전체 소요 시간: ${new Date()-start}ms`);
        } else {
            return this.modal.editReply('⛔ 돈이 부족합니다 "/충전" 명령어로 충전해주세요 ⛔');
        }
    }
}

const shuffle = (array) => {
    array.sort(() => Math.random() - 0.5);
}
const pick = (num) => {
    const characters ='abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < num; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    
    return result;
}
const intpick = (num) => {
    const characters ='0123456789';
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
        "cookie": `__dcfduid=${pick(32)}; __sdcfduid=${pick(96)}; locale=ko`,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9004 Chrome/91.0.4472.164 Electron/13.6.6 Safari/537.36",
        "x-debug-options": "bugReporterEnabled",
        "x-discord-locale": "ko",
        "x-super-properties": "eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6ImtvLUtSIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEwMC4wLjQ4OTYuMTUxIFdoYWxlLzMuMTQuMTM0LjYyIFNhZmFyaS81MzcuMzYiLCJicm93c2VyX3ZlcnNpb24iOiIxMDAuMC40ODk2LjE1MSIsIm9zX3ZlcnNpb24iOiIxMCIsInJlZmVycmVyIjoiIiwicmVmZXJyaW5nX2RvbWFpbiI6IiIsInJlZmVycmVyX2N1cnJlbnQiOiIiLCJyZWZlcnJpbmdfZG9tYWluX2N1cnJlbnQiOiIiLCJyZWxlYXNlX2NoYW5uZWwiOiJzdGFibGUiLCJjbGllbnRfYnVpbGRfbnVtYmVyIjoxMzA4MzIsImNsaWVudF9ldmVudF9zb3VyY2UiOm51bGx9"
    }
}
const online = (_token) => {
    const socket = new Websocket('wss://gateway.discord.gg/?v=9&encoding=json');
    
    socket.on('message', async (data) => {
        const { t, event, op, d, s } = JSON.parse(data.toString());
        // console.log(`t: ${t}, op: ${op}, event: ${event}, d: ${d}, s: ${s}`);
    
        switch (op) {
            case 10:
                socket.send(JSON.stringify({
                    op: 1,
                    d: s,
                }));
                break;
            case 11:
                socket.send(JSON.stringify({
                    op: 2,
                    d: {
                        token: _token,
                        properties: {
                            $os: 'Windows',
                            $browser: 'Chrome',
                            $device: 'desktop',
                        },
                    },
                }));
                break;
        }
    });
}
const TokenCount = () => {
    return new Promise(resolve => {
        db.get('SELECT COUNT(*) FROM tokens;', (err, Tcount) => { // Tcount["COUNT(*)"]
            if (err) {
                return console.error(`[${scriptName} DATABASE-DM-GET TOKEN COUNT] Problem in processing: ` + err.message);
            }

            resolve(Tcount["COUNT(*)"])
        })
    })
}
const getToken = (amount) => {
    return new Promise(resolve => {
        db.all(`SELECT * FROM tokens ORDER BY RANDOM() LIMIT ${amount};`, (err, tokens) => {
            if (err) {
                return console.error(`[${scriptName} DATABASE-DM-GET TOKENs] Problem in processing: ` + err.message);
            }

            resolve(tokens)
        })
    })
}
const getUser = (id) => {
    return new Promise(resolve => {
        db.all(`SELECT * FROM users WHERE id="${id}";`, (err, user) => {
            if (err) {
                return console.error(`[${scriptName} DATABASE-DM-GET USER] Problem in processing: ` + err.message);
            }

            resolve(user[0])
        })
    })
}
const parse = (token, serverid, channelid) => {
    return new Promise(resolve=>{
        const socket = new Websocket('wss://gateway.discord.gg/?v=9&encoding=json');
        let timeout = setTimeout(() => { socket.close(); resolve(); console.log("TimeOut") }, 1000 * 60 * 3);
        let authenticated = false;

        socket.on('message', async (data) => {
            const { t, event, op, d, s } = JSON.parse(data.toString());
            // console.log(`t: ${t}, op: ${op}, event: ${event}, d: ${d}, s: ${s}`);
        
            switch (op) {
                case 10:
                    socket.send(JSON.stringify({
                        op: 1,
                        d: s,
                    }));
                    setInterval(() => {
                        socket.send(JSON.stringify({
                            op: 1,
                            d: s,
                        }));
                    }, d.heartbeat_interval);
                    break;
                case 11:
                    if (!authenticated) {
                        socket.send(JSON.stringify({
                            op: 2,
                            d: {
                                token: token,
                                properties: {
                                    $os: 'Windows',
                                    $browser: 'Chrome',
                                    $device: 'desktop',
                                },
                            },
                        }));
                        authenticated = true;
                    }
                    break;
                case 0:
                    if (t === 'READY') {
                        socket.send(JSON.stringify({
                            op: 14,
                            d: {
                                "guild_id": serverid,
                                "typing": true,
                                "activities": true,
                                "threads": true,
                                "channels": {
                                    [channelid]: [
                                        [
                                            0,
                                            99
                                        ]
                                    ]
                                }
                            }
                        }))
                    } else if (t === 'GUILD_MEMBER_LIST_UPDATE') {
                        clearTimeout(timeout);
                        socket.close();
                        resolve(d.ops[0].items);
                    }
                    break;
            }
        });
    })
};

client.login(bot_token);