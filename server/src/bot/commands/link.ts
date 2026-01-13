import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export const data = new SlashCommandBuilder()
  .setName("link")
  .setDescription("Link your Discord account to Geometry Dash");

export async function execute(interaction: ChatInputCommandInteraction) {
  const discordId = interaction.user.id;
  const serverUrl = process.env.SERVER_URL || "http://localhost:3000";

  // Check if already linked
  const existingUser = await db.query.users.findFirst({
    where: eq(users.discordId, discordId),
  });

  const embed = new EmbedBuilder()
    .setColor(0x00d9ff)
    .setTitle("🔗 Link Your GD Account")
    .setDescription(
      existingUser
        ? `Your account is already linked to **${existingUser.gdUsername || "Unknown"}**.\n\nTo re-link, follow the steps below:`
        : "Connect your Discord to Geometry Dash to use `/recent`!"
    )
    .addFields(
      {
        name: "Step 1",
        value: `[Click here to authorize](${serverUrl}/link)`,
        inline: false,
      },
      {
        name: "Step 2",
        value: "Copy the 6-character code shown",
        inline: false,
      },
      {
        name: "Step 3",
        value: "Open Geometry Dash with Yuki mod installed",
        inline: false,
      },
      {
        name: "Step 4",
        value: "Go to Yuki settings and click 'Link Discord'",
        inline: false,
      },
      {
        name: "Step 5",
        value: "Enter the code and you're done! 🎉",
        inline: false,
      }
    )
    .setFooter({ text: "The code expires in 5 minutes" });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
