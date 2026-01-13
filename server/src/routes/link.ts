import { Hono } from "hono";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { generateLinkCode, verifyLinkCode } from "../lib/linkCodes.js";
import { nanoid } from "nanoid";

const link = new Hono();

const DISCORD_API = "https://discord.com/api/v10";

// OAuth redirect to Discord
link.get("/link", (c) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI!);
  const scope = encodeURIComponent("identify");
  
  const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
  return c.redirect(url);
});

// OAuth callback - shows link code
link.get("/callback", async (c) => {
  const code = c.req.query("code");
  
  if (!code) {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Link Failed</title></head>
        <body>
          <h1>Link Failed</h1>
          <p>No authorization code received. Please try again.</p>
        </body>
      </html>
    `);
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      }),
    });

    const tokenData = await tokenResponse.json() as { access_token: string };
    
    if (!tokenData.access_token) {
      throw new Error("Failed to get access token");
    }

    // Get user info
    const userResponse = await fetch(`${DISCORD_API}/users/@me`, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json() as { id: string; username: string };
    
    if (!userData.id) {
      throw new Error("Failed to get user info");
    }

    // Generate link code
    const linkCode = generateLinkCode(userData.id, userData.username);

    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Link Code</title></head>
        <body>
          <h1>Your Link Code</h1>
          <p>Welcome, <strong>${userData.username}</strong></p>
          <p>Enter this code in Geometry Dash:</p>
          <h2 style="font-family: monospace; letter-spacing: 4px;">${linkCode}</h2>
          <p><small>This code expires in 5 minutes</small></p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth error:", error);
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>Link Failed</title></head>
        <body>
          <h1>Link Failed</h1>
          <p>Something went wrong during authorization. Please try again.</p>
        </body>
      </html>
    `);
  }
});

// Verify link code from GD mod
link.post("/api/link/verify", async (c) => {
  const body = await c.req.json() as {
    code: string;
    gd_account_id: number;
    gd_username: string;
  };

  const { code, gd_account_id, gd_username } = body;

  if (!code || !gd_account_id || !gd_username) {
    return c.json({ success: false, error: "Missing required fields" }, 400);
  }

  const pendingLink = verifyLinkCode(code);
  
  if (!pendingLink) {
    return c.json({ success: false, error: "Invalid or expired code" }, 400);
  }

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.discordId, pendingLink.discordId),
  });

  const authToken = nanoid(32);

  if (existingUser) {
    // Update existing user
    await db
      .update(users)
      .set({
        gdAccountId: gd_account_id,
        gdUsername: gd_username,
        authToken,
        discordUsername: pendingLink.discordUsername,
      })
      .where(eq(users.discordId, pendingLink.discordId));
  } else {
    // Create new user
    await db.insert(users).values({
      discordId: pendingLink.discordId,
      discordUsername: pendingLink.discordUsername,
      gdAccountId: gd_account_id,
      gdUsername: gd_username,
      authToken,
    });
  }

  return c.json({
    success: true,
    auth_token: authToken,
    discord_username: pendingLink.discordUsername,
  });
});

export default link;
