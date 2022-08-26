const fs = require("fs");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const { clientId, bot_token } = require("./info.json");

let guildIds = [ "965969255810088990" ]

const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

const commands = [];

for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: "9" }).setToken(bot_token);

(async () => {
  guildIds.map(async (guildId) => {
    try {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      console.log(`${guildId} 서버 성공`);
    } catch (error) {
      console.error(error);
    }
  });

  // 글로벌 명령어 등록 시 주석을 풀고 사용
  // try {
  //   await rest.put(Routes.applicationCommands(clientId), {
  //     body: commands,
  //   });
  //   console.log(`글로벌 명령어 등록 성공`);
  // } catch (error) {
  //   console.error(error);
  // }
})();