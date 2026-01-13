import { Hono } from "hono";
import { db } from "../db/index.js";
import { users, scores } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { getLevelInfo } from "../lib/gdApi.js";

const scoresRouter = new Hono();

// Receive score from GD mod
scoresRouter.post("/api/scores", async (c) => {
  const body = await c.req.json() as {
    auth_token: string;
    gd_account_id: number;
    gd_username: string;
    level_id: number;
    percentage: number;
    attempts: number;
    passed: boolean;
    is_practice: boolean;
    coins_collected: boolean[];
  };

  const {
    auth_token,
    gd_account_id,
    gd_username,
    level_id,
    percentage,
    attempts,
    passed,
    is_practice,
    coins_collected,
  } = body;

  if (!auth_token || !level_id) {
    return c.json({ success: false, error: "Missing required fields" }, 400);
  }

  // Find user by auth token
  const user = await db.query.users.findFirst({
    where: eq(users.authToken, auth_token),
  });

  if (!user) {
    return c.json({ success: false, error: "Invalid auth token" }, 401);
  }

  // Update GD username if changed
  if (gd_username && gd_username !== user.gdUsername) {
    await db
      .update(users)
      .set({ gdUsername: gd_username, gdAccountId: gd_account_id })
      .where(eq(users.id, user.id));
  }

  // Insert score
  await db.insert(scores).values({
    userId: user.id,
    levelId: level_id,
    percentage,
    attempts,
    passed,
    isPractice: is_practice || false,
    coins: coins_collected,
  });

  // Prefetch level info in background
  getLevelInfo(level_id).catch(console.error);

  return c.json({ success: true });
});

// Get recent score for a user (internal use by bot)
scoresRouter.get("/api/scores/:discordId/recent", async (c) => {
  const discordId = c.req.param("discordId");

  const user = await db.query.users.findFirst({
    where: eq(users.discordId, discordId),
  });

  if (!user) {
    return c.json({ success: false, error: "User not linked" }, 404);
  }

  const recentScore = await db.query.scores.findFirst({
    where: eq(scores.userId, user.id),
    orderBy: [desc(scores.createdAt)],
  });

  if (!recentScore) {
    return c.json({ success: false, error: "No recent scores" }, 404);
  }

  // Get level info
  const levelInfo = await getLevelInfo(recentScore.levelId);

  return c.json({
    success: true,
    score: {
      ...recentScore,
      gdUsername: user.gdUsername,
    },
    level: levelInfo,
  });
});

export default scoresRouter;
