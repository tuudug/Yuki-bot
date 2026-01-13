import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { execute as recentExecute } from "./recent.js";

export const data = new SlashCommandBuilder()
  .setName("rs")
  .setDescription("Show your most recent Geometry Dash score (shorthand for /recent)");

export async function execute(interaction: ChatInputCommandInteraction) {
  return recentExecute(interaction);
}
