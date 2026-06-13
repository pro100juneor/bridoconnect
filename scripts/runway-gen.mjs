#!/usr/bin/env node
/**
 * Runway Gen-3 video generation.
 *
 * Usage:
 *   RUNWAYML_API_SECRET=<key> node scripts/runway-gen.mjs \
 *     --prompt "warm sunset over Kharkiv apartments, slow camera dolly, hopeful" \
 *     --duration 5 \
 *     --out public/videos/hero-landing.mp4
 *
 * Or load key from ~/Desktop/r1/.env automatically:
 *   node scripts/runway-gen.mjs --prompt "..." --out public/videos/hero.mp4
 *
 * Polls Runway every 5s until generation completes, downloads result.
 */
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);

async function loadKey() {
  if (process.env.RUNWAYML_API_SECRET) return process.env.RUNWAYML_API_SECRET;
  const fallback = resolve(homedir(), "Desktop/r1/.env");
  if (existsSync(fallback)) {
    const text = await readFile(fallback, "utf8");
    const m = text.match(/^RUNWAYML_API_SECRET=(.+)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("RUNWAYML_API_SECRET not set and ~/Desktop/r1/.env has no RUNWAYML_API_SECRET");
}

async function main() {
  const prompt = args.prompt;
  const out = args.out;
  const duration = Number(args.duration || 5);
  if (!prompt || !out) {
    console.error("Usage: --prompt <text> --out <path> [--duration 5|10]");
    process.exit(1);
  }
  if (![4, 5, 6, 8, 10].includes(duration)) {
    console.error("duration must be 4, 5, 6, 8 or 10");
    process.exit(1);
  }
  const apiKey = await loadKey();

  // 1. Submit generation
  const submit = await fetch("https://api.dev.runwayml.com/v1/text_to_video", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-Runway-Version": "2024-11-06",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.RUNWAY_MODEL || "gen4_turbo",
      promptText: prompt,
      duration,
      ratio: process.env.RUNWAY_RATIO || "1280:720",
    }),
  });

  if (!submit.ok) {
    console.error(`Submit failed ${submit.status}:`, await submit.text());
    process.exit(2);
  }
  const { id } = await submit.json();
  console.log(`task id: ${id}`);

  // 2. Poll until completion
  let videoUrl;
  for (let attempt = 0; attempt < 60; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));
    const status = await fetch(`https://api.dev.runwayml.com/v1/tasks/${id}`, {
      headers: { "Authorization": `Bearer ${apiKey}`, "X-Runway-Version": "2024-11-06" },
    });
    const json = await status.json();
    process.stdout.write(`\r[${attempt + 1}/60] status: ${json.status} `);
    if (json.status === "SUCCEEDED") {
      videoUrl = json.output?.[0];
      console.log("\n✓ generation done");
      break;
    }
    if (json.status === "FAILED") {
      console.error(`\n✗ generation failed:`, json.failure || json);
      process.exit(3);
    }
  }
  if (!videoUrl) {
    console.error("\nTimeout after 5 minutes");
    process.exit(4);
  }

  // 3. Download
  console.log(`downloading from ${videoUrl}…`);
  const dl = await fetch(videoUrl);
  if (!dl.ok) {
    console.error(`download failed ${dl.status}`);
    process.exit(5);
  }
  const buf = Buffer.from(await dl.arrayBuffer());
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, buf);
  console.log(`✓ saved ${buf.length} bytes → ${out}`);
}

main().catch((e) => { console.error(e); process.exit(99); });
