import { nanoid } from "nanoid";

interface PendingLink {
  discordId: string;
  discordUsername: string;
  code: string;
  expiresAt: number;
}

const pendingLinks = new Map<string, PendingLink>();

const CODE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

export function generateLinkCode(
  discordId: string,
  discordUsername: string
): string {
  for (const [code, link] of pendingLinks.entries()) {
    if (link.discordId === discordId) {
      pendingLinks.delete(code);
    }
  }

  const code = nanoid(6).toUpperCase();
  pendingLinks.set(code, {
    discordId,
    discordUsername,
    code,
    expiresAt: Date.now() + CODE_EXPIRY_MS,
  });

  return code;
}

export function verifyLinkCode(code: string): PendingLink | null {
  const link = pendingLinks.get(code.toUpperCase());

  if (!link) {
    return null;
  }

  if (Date.now() > link.expiresAt) {
    pendingLinks.delete(code);
    return null;
  }

  pendingLinks.delete(code);
  return link;
}

// Clean up expired codes periodically
setInterval(() => {
  const now = Date.now();
  for (const [code, link] of pendingLinks.entries()) {
    if (now > link.expiresAt) {
      pendingLinks.delete(code);
    }
  }
}, 60 * 1000);
