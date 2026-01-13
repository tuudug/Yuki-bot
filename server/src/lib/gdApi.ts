import { db } from "../db/index.js";
import { levelCache, type NewLevelCache } from "../db/schema.js";
import { eq } from "drizzle-orm";

const GD_API_URL = "http://www.boomlings.com/database";
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const GD_REQUEST_SECRET = "Wmfd2893gb7";

const DIFFICULTY_MAP: Record<number, string> = {
  0: "N/A",
  10: "Easy",
  20: "Normal",
  30: "Hard",
  40: "Harder",
  50: "Insane",
};

const DEMON_DIFFICULTY_MAP: Record<number, string> = {
  3: "Easy Demon",
  4: "Medium Demon",
  0: "Hard Demon",
  5: "Insane Demon",
  6: "Extreme Demon",
};

// Official songs with artist info (song IDs 0-21 for main levels)
const OFFICIAL_SONGS: { name: string; author: string }[] = [
  { name: "Stereo Madness", author: "ForeverBound" },
  { name: "Back On Track", author: "DJVI" },
  { name: "Polargeist", author: "Step" },
  { name: "Dry Out", author: "DJVI" },
  { name: "Base After Base", author: "DJVI" },
  { name: "Cant Let Go", author: "DJVI" },
  { name: "Jumper", author: "Waterflame" },
  { name: "Time Machine", author: "Waterflame" },
  { name: "Cycles", author: "DJVI" },
  { name: "xStep", author: "DJVI" },
  { name: "Clutterfunk", author: "Waterflame" },
  { name: "Theory of Everything", author: "DJ-Nate" },
  { name: "Electroman Adventures", author: "Waterflame" },
  { name: "Clubstep", author: "DJ-Nate" },
  { name: "Electrodynamix", author: "DJ-Nate" },
  { name: "Hexagon Force", author: "Waterflame" },
  { name: "Blast Processing", author: "Waterflame" },
  { name: "Theory of Everything 2", author: "DJ-Nate" },
  { name: "Geometrical Dominator", author: "Waterflame" },
  { name: "Deadlocked", author: "F-777" },
  { name: "Fingerdash", author: "MDK" },
  { name: "Dash", author: "MDK" },
];

// Main levels (IDs 1-22)
interface DefaultLevelInfo {
  name: string;
  stars: number;
  duration: number;
  songName: string;
  songAuthor: string;
}

const DEFAULT_LEVELS: Record<number, DefaultLevelInfo> = {
  1: {
    name: "Stereo Madness",
    stars: 1,
    duration: 93,
    songName: "Stereo Madness",
    songAuthor: "ForeverBound",
  },
  2: {
    name: "Back On Track",
    stars: 2,
    duration: 91,
    songName: "Back On Track",
    songAuthor: "DJVI",
  },
  3: {
    name: "Polargeist",
    stars: 3,
    duration: 94,
    songName: "Polargeist",
    songAuthor: "Step",
  },
  4: {
    name: "Dry Out",
    stars: 4,
    duration: 100,
    songName: "Dry Out",
    songAuthor: "DJVI",
  },
  5: {
    name: "Base After Base",
    stars: 5,
    duration: 111,
    songName: "Base After Base",
    songAuthor: "DJVI",
  },
  6: {
    name: "Cant Let Go",
    stars: 6,
    duration: 102,
    songName: "Cant Let Go",
    songAuthor: "DJVI",
  },
  7: {
    name: "Jumper",
    stars: 7,
    duration: 81,
    songName: "Jumper",
    songAuthor: "Waterflame",
  },
  8: {
    name: "Time Machine",
    stars: 8,
    duration: 94,
    songName: "Time Machine",
    songAuthor: "Waterflame",
  },
  9: {
    name: "Cycles",
    stars: 9,
    duration: 93,
    songName: "Cycles",
    songAuthor: "DJVI",
  },
  10: {
    name: "xStep",
    stars: 10,
    duration: 103,
    songName: "xStep",
    songAuthor: "DJVI",
  },
  11: {
    name: "Clutterfunk",
    stars: 11,
    duration: 104,
    songName: "Clutterfunk",
    songAuthor: "Waterflame",
  },
  12: {
    name: "Theory of Everything",
    stars: 12,
    duration: 135,
    songName: "Theory of Everything",
    songAuthor: "DJ-Nate",
  },
  13: {
    name: "Electroman Adventures",
    stars: 10,
    duration: 126,
    songName: "Electroman Adventures",
    songAuthor: "Waterflame",
  },
  14: {
    name: "Clubstep",
    stars: 14,
    duration: 145,
    songName: "Clubstep",
    songAuthor: "DJ-Nate",
  },
  15: {
    name: "Electrodynamix",
    stars: 12,
    duration: 132,
    songName: "Electrodynamix",
    songAuthor: "DJ-Nate",
  },
  16: {
    name: "Hexagon Force",
    stars: 12,
    duration: 119,
    songName: "Hexagon Force",
    songAuthor: "Waterflame",
  },
  17: {
    name: "Blast Processing",
    stars: 10,
    duration: 90,
    songName: "Blast Processing",
    songAuthor: "Waterflame",
  },
  18: {
    name: "Theory of Everything 2",
    stars: 14,
    duration: 192,
    songName: "Theory of Everything 2",
    songAuthor: "DJ-Nate",
  },
  19: {
    name: "Geometrical Dominator",
    stars: 10,
    duration: 154,
    songName: "Geometrical Dominator",
    songAuthor: "Waterflame",
  },
  20: {
    name: "Deadlocked",
    stars: 15,
    duration: 194,
    songName: "Deadlocked",
    songAuthor: "F-777",
  },
  21: {
    name: "Fingerdash",
    stars: 12,
    duration: 126,
    songName: "Fingerdash",
    songAuthor: "MDK",
  },
  22: {
    name: "Dash",
    stars: 10,
    duration: 120,
    songName: "Dash",
    songAuthor: "MDK",
  },
};

export function getDefaultLevelName(levelId: number): DefaultLevelInfo | null {
  return DEFAULT_LEVELS[levelId] || null;
}

interface GDLevelInfo {
  levelId: number;
  name: string;
  creator: string;
  description: string;
  difficulty: string;
  stars: number;
  isDemon: boolean;
  demonDifficulty: string | null;
  songName: string;
  songAuthor: string;
  duration: number;
  downloads: number;
  likes: number;
}

function parseGDResponse(response: string): Record<string, string> {
  const parts = response.split(":");
  const result: Record<string, string> = {};
  for (let i = 0; i < parts.length - 1; i += 2) {
    result[parts[i]] = parts[i + 1];
  }
  return result;
}

function decodeBase64(str: string): string {
  try {
    return Buffer.from(str, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

async function fetchLevelFromGD(levelId: number): Promise<GDLevelInfo | null> {
  try {
    const response = await fetch(`${GD_API_URL}/downloadGJLevel22.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "",
      },
      body: new URLSearchParams({
        levelID: levelId.toString(),
        secret: GD_REQUEST_SECRET,
      }),
    });

    const text = await response.text();
    if (text === "-1" || !text) {
      return null;
    }

    const parts = text.split("#");
    const levelData = parseGDResponse(parts[0]);

    // Parse creator info
    const creatorData = parts[1] ? parts[1].split(":") : [];
    const creator = creatorData[1] || "Unknown";

    // Parse song info
    let songName = "Unknown";
    let songAuthor = "Unknown";
    const customSongId = parseInt(levelData["35"] || "0");

    if (parts[2] && customSongId > 0) {
      // Custom song from Newgrounds
      const songData = parseGDResponse(parts[2].replace(/~\|~/g, ":"));
      songName = songData["2"] || "Unknown";
      songAuthor = songData["4"] || "Unknown";
    } else {
      // Official song (key 12 is the official song ID)
      const songId = parseInt(levelData["12"] || "0");
      const officialSong = OFFICIAL_SONGS[songId];
      if (officialSong) {
        songName = officialSong.name;
        songAuthor = officialSong.author;
      }
    }

    const difficultyNumerator = parseInt(levelData["9"] || "0");
    const isDemon = levelData["17"] === "1";
    const demonDiff = parseInt(levelData["43"] || "0");

    let difficulty = DIFFICULTY_MAP[difficultyNumerator] || "N/A";
    let demonDifficulty: string | null = null;

    if (isDemon) {
      difficulty = "Demon";
      demonDifficulty = DEMON_DIFFICULTY_MAP[demonDiff] || "Hard Demon";
    }

    // Duration in seconds (key 15 is song offset, we'll estimate based on objects)
    const duration = parseInt(levelData["15"] || "0");

    return {
      levelId,
      name: levelData["2"] || "Unknown",
      creator,
      description: decodeBase64(levelData["3"] || ""),
      difficulty,
      stars: parseInt(levelData["18"] || "0"),
      isDemon,
      demonDifficulty,
      songName,
      songAuthor,
      duration,
      downloads: parseInt(levelData["10"] || "0"),
      likes: parseInt(levelData["14"] || "0"),
    };
  } catch (error) {
    console.error("Error fetching level from GD:", error);
    return null;
  }
}

export async function getLevelInfo(
  levelId: number
): Promise<GDLevelInfo | null> {
  // Check cache first
  const cached = await db.query.levelCache.findFirst({
    where: eq(levelCache.levelId, levelId),
  });

  if (cached && cached.cachedAt) {
    const cacheAge = Date.now() - cached.cachedAt.getTime();
    if (cacheAge < CACHE_DURATION_MS) {
      return {
        levelId: cached.levelId,
        name: cached.name,
        creator: cached.creator || "Unknown",
        description: cached.description || "",
        difficulty: cached.difficulty || "N/A",
        stars: cached.stars || 0,
        isDemon: cached.isDemon || false,
        demonDifficulty: cached.demonDifficulty,
        songName: cached.songName || "Unknown",
        songAuthor: cached.songAuthor || "Unknown",
        duration: cached.duration || 0,
        downloads: cached.downloads || 0,
        likes: cached.likes || 0,
      };
    }
  }

  // Fetch from GD servers
  const levelInfo = await fetchLevelFromGD(levelId);
  if (!levelInfo) {
    return null;
  }

  // Update cache
  const cacheData: NewLevelCache = {
    levelId: levelInfo.levelId,
    name: levelInfo.name,
    creator: levelInfo.creator,
    description: levelInfo.description,
    difficulty: levelInfo.difficulty,
    stars: levelInfo.stars,
    isDemon: levelInfo.isDemon,
    demonDifficulty: levelInfo.demonDifficulty,
    songName: levelInfo.songName,
    songAuthor: levelInfo.songAuthor,
    duration: levelInfo.duration,
    downloads: levelInfo.downloads,
    likes: levelInfo.likes,
    cachedAt: new Date(),
  };

  await db.insert(levelCache).values(cacheData).onConflictDoUpdate({
    target: levelCache.levelId,
    set: cacheData,
  });

  return levelInfo;
}
