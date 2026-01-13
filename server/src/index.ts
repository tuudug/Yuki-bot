import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import linkRoutes from "./routes/link.js";
import scoresRoutes from "./routes/scores.js";
import { startBot } from "./bot/index.js";

const app = new Hono();

// Middleware
app.use("*", logger());
app.use("*", cors());

// Health check
app.get("/", (c) => {
  return c.json({
    name: "Yuki",
    version: "1.0.0",
    status: "ok",
  });
});

// Routes
app.route("/", linkRoutes);
app.route("/", scoresRoutes);

// Start server
const port = parseInt(process.env.PORT || "3000");

console.log(`🚀 Starting Yuki server on port ${port}...`);

serve({
  fetch: app.fetch,
  port,
});

console.log(`✅ Server running at http://localhost:${port}`);

// Start Discord bot
startBot().catch(console.error);
