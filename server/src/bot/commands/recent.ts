import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { db } from "../../db/index.js";
import { users, scores } from "../../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { getLevelInfo, getDefaultLevelName } from "../../lib/gdApi.js";

export const data = new SlashCommandBuilder()
  .setName("recent")
  .setDescription("Show your most recent Geometry Dash score");

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatCoins(coins: boolean[] | null): string {
  if (!coins || coins.length === 0) return "";
  return coins.map(c => c ? "🪙" : "⚫").join("");
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const discordId = interaction.user.id;

  const user = await db.query.users.findFirst({
    where: eq(users.discordId, discordId),
  });

  if (!user) {
    await interaction.reply({
      content: "❌ Your account is not linked! Use `/link` to connect your GD account.",
      ephemeral: true,
    });
    return;
  }

  const recentScore = await db.query.scores.findFirst({
    where: eq(scores.userId, user.id),
    orderBy: [desc(scores.createdAt)],
  });

  if (!recentScore) {
    await interaction.reply({
      content: "📭 No recent scores found. Play some levels in GD!",
      ephemeral: true,
    });
    return;
  }

  await interaction.deferReply();

  const levelInfo = await getLevelInfo(recentScore.levelId);

  let levelName = `Level #${recentScore.levelId}`;
  let creator = "Unknown";
  let starsText = "";
  let durationText = "";
  let songText = "";
  let gdbrowserUrl = `https://gdbrowser.com/${recentScore.levelId}`;

  // Check if it's a default level (IDs 1-22 are main levels)
  const defaultLevelInfo = getDefaultLevelName(recentScore.levelId);
  
  if (defaultLevelInfo) {
    levelName = defaultLevelInfo.name;
    creator = "RobTop";
    starsText = `${defaultLevelInfo.stars}★`;
    durationText = formatDuration(defaultLevelInfo.duration);
    songText = `${defaultLevelInfo.songAuthor} - ${defaultLevelInfo.songName}`;
  } else if (levelInfo) {
    levelName = levelInfo.name;
    creator = levelInfo.creator;
    starsText = levelInfo.stars > 0 ? `${levelInfo.stars}★` : "";
    durationText = levelInfo.duration > 0 ? formatDuration(levelInfo.duration) : "";
    songText = `${levelInfo.songAuthor} - ${levelInfo.songName}`;
  }

  const statusEmoji = recentScore.passed ? "✅" : "❌";
  const practiceTag = recentScore.isPractice ? " 🔧" : "";

  let description = `▸ ${statusEmoji}${practiceTag} (${recentScore.percentage}%) ▸ Attempt #${recentScore.attempts || 1}`;
  
  if (durationText || songText) {
    description += "\n▸";
    if (durationText) description += ` ⏱️ \`${durationText}\``;
    if (songText) description += ` ▸ 🎶 \`${songText}\``;
  }

  // Add coins line for passes
  if (recentScore.passed && recentScore.coins && recentScore.coins.length > 0) {
    const coinsStr = formatCoins(recentScore.coins);
    if (coinsStr) {
      description += `\n▸ Coins: ${coinsStr}`;
    }
  }

  const title = starsText 
    ? `${levelName} by ${creator} [${starsText}]`
    : `${levelName} by ${creator}`;

  const embed = new EmbedBuilder()
    .setColor(0x2378DB)
    .setTitle(title)
    .setURL(gdbrowserUrl)
    .setDescription(description)
    .setFooter({ 
      text: `On GD Official Server • ${formatTimestamp(recentScore.createdAt || new Date())}` 
    });

  await interaction.editReply({
    content: `**Recent Geometry Dash Play for ${user.gdUsername || interaction.user.username}:**`,
    embeds: [embed],
  });
}
