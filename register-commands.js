require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const required = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID", "OWNER_ID"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Falta ${key} en el archivo .env`);
}

const plans = [
  ["permanent", "Permanente"], ["1h", "1 hora"], ["3h", "3 horas"],
  ["5h", "5 horas"], ["7h", "7 horas"], ["1d", "1 día"],
  ["2d", "2 días"], ["5d", "5 días"], ["7d", "7 días"],
  ["20d", "20 días"], ["25d", "25 días"], ["30d", "30 días"],
  ["admin", "Admin"]
];

const command = new SlashCommandBuilder()
  .setName("generar")
  .setDescription("Genera y entrega una licencia privada de Alexito Store")
  .addUserOption(o => o.setName("cliente").setDescription("Cliente que recibirá la licencia").setRequired(true))
  .addStringOption(o => o.setName("nombre").setDescription("Nombre del cliente").setRequired(true).setMaxLength(80))
  .addStringOption(o => o.setName("uid").setDescription("ID de dispositivo ALX1-REQ-...").setRequired(true).setMaxLength(180))
  .addStringOption(o => {
    o.setName("plan").setDescription("Duración de la licencia").setRequired(true);
    for (const [value, name] of plans) o.addChoices({ name, value });
    return o;
  });

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
  body: [command.toJSON()]
}).then(() => {
  console.log("Comando /generar registrado en el servidor.");
}).catch(err => {
  console.error("No se pudo registrar /generar:", err);
  process.exitCode = 1;
});
