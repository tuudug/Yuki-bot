import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Collection,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";

import * as recentCommand from "./commands/recent.js";
import * as rsCommand from "./commands/rs.js";
import * as linkCommand from "./commands/link.js";

interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const commands: Command[] = [recentCommand, rsCommand, linkCommand];

export async function startBot() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  const commandCollection = new Collection<string, Command>();
  for (const command of commands) {
    commandCollection.set(command.data.name, command);
  }

  client.on("ready", () => {
    console.log(`🤖 Discord bot logged in as ${client.user?.tag}`);
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commandCollection.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing command ${interaction.commandName}:`, error);
      
      const errorMessage = "❌ There was an error executing this command.";
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  });

  // Register slash commands
  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_BOT_TOKEN!);

  try {
    console.log("🔄 Registering slash commands...");

    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), {
      body: commands.map((c) => c.data.toJSON()),
    });

    console.log("✅ Slash commands registered");
  } catch (error) {
    console.error("Failed to register slash commands:", error);
  }

  await client.login(process.env.DISCORD_BOT_TOKEN);

  return client;
}
