require("dotenv").config();
const path = require("node:path");
const fs = require("node:fs");
const {
  Client, GatewayIntentBits, ChannelType, PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");
const { generateLicense } = require("./license");

const required = ["DISCORD_TOKEN", "CLIENT_ID", "GUILD_ID", "OWNER_ID"];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Falta ${key} en .env`);
}

const privateKeyPath = path.resolve(process.env.LICENSE_PRIVATE_KEY_PATH || "./secrets/ALEXITO_LICENSE_PRIVATE_KEY.pem");
const dataDir = path.resolve("./data");
const historyPath = path.join(dataDir, "deliveries.json");

function saveHistory(record) {
  fs.mkdirSync(dataDir, { recursive: true });
  let rows = [];
  try { rows = JSON.parse(fs.readFileSync(historyPath, "utf8")); } catch {}
  rows.unshift(record);
  fs.writeFileSync(historyPath, JSON.stringify(rows, null, 2), { mode: 0o600 });
}

function dateMx(seconds) {
  if (!seconds) return "Sin vencimiento";
  return new Date(seconds * 1000).toLocaleString("es-MX", {
    timeZone: "America/Mexico_City",
    dateStyle: "medium",
    timeStyle: "short"
  });
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once("ready", () => {
  console.log(`Bot conectado como ${client.user.tag}`);
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "generar") return;

  // Bloqueo real por ID: ningún otro usuario puede generar licencias.
  if (interaction.user.id !== process.env.OWNER_ID) {
    return interaction.reply({ content: "⛔ Solo el propietario de Alexito Store puede generar licencias.", ephemeral: true });
  }
  if (interaction.guildId !== process.env.GUILD_ID) {
    return interaction.reply({ content: "Este comando no está habilitado en este servidor.", ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const customer = interaction.options.getUser("cliente", true);
    const clientName = interaction.options.getString("nombre", true);
    const deviceRequest = interaction.options.getString("uid", true);
    const type = interaction.options.getString("plan", true);

    const license = generateLicense({
      deviceRequest, type, clientName, privateKeyPath
    });

    const guild = interaction.guild;
    const me = await guild.members.fetchMe();
    const overwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks
      ]},
      { id: customer.id, allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory
      ]},
      { id: me.id, allow: [
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ManageChannels
      ]}
    ];

    const channelName = `entrega-${customer.username}`
      .toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-")
      .slice(0, 75) + "-" + license.id.slice(-4).toLowerCase();

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      topic: `Entrega privada de licencia para ${customer.tag} · UID ${license.device}`,
      parent: process.env.DELIVERY_CATEGORY_ID || undefined,
      permissionOverwrites: overwrites,
      reason: `Entrega privada de licencia Alexito Store para ${customer.tag}`
    });

    const embed = new EmbedBuilder()
      .setColor(0xD10B16)
      .setTitle("ALEXITO STORE · LICENCIA ENTREGADA")
      .setDescription("📊 **Estado:** Activado Signed")
      .addFields(
        { name: " Name", value: clientName, inline: true },
        { name: "📱 UID", value: `\`${deviceRequest}\``, inline: false },
        { name: "🌐 LINK", value: `\`${license.link}\``, inline: false },
        { name: "🗓️ Registered", value: dateMx(license.issued), inline: true },
        { name: "🖥️ PLAN", value: license.label, inline: true },
        { name: "📲 MODEL", value: "IPHONE", inline: true },
        { name: "⚙️ VERSIÓN IOS", value: "No especificada", inline: true },
        { name: "🔑 KEY", value: `\`\`\`\n${license.token}\n\`\`\``, inline: false }
      )
      .setFooter({ text: "Alexito Store · Entrega privada" })
      .setTimestamp();

    await channel.send({
      content: `${customer} · Tu licencia está lista. Este canal es privado.`,
      embeds: [embed],
      allowedMentions: { users: [customer.id] }
    });

    saveHistory({
      id: license.id, client: clientName, customerId: customer.id,
      device: license.device, token: license.token, type: license.type,
      label: license.label, issued: license.issued, expires: license.expires,
      channelId: channel.id, createdAt: new Date().toISOString()
    });

    await interaction.editReply({
      content: `✅ Licencia generada y entregada en ${channel}. Solo tú, el bot y ${customer} tienen acceso.`
    });
  } catch (error) {
    console.error(error);
    await interaction.editReply({
      content: `❌ No se pudo completar la entrega: ${error.message}\nRevisa el UID, la clave PEM y los permisos del bot.`
    });
  }
});

client.login(process.env.DISCORD_TOKEN);
