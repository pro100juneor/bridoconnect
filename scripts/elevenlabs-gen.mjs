#!/usr/bin/env node
/**
 * ElevenLabs TTS generation (stub — needs ELEVENLABS_API_KEY).
 *
 * Usage:
 *   ELEVENLABS_API_KEY=<key> node scripts/elevenlabs-gen.mjs \
 *     --text "Допомога від людини — людині" \
 *     --voice "21m00Tcm4TlvDq8ikWAM" \
 *     --out public/audio/hero-uk.mp3
 *
 * Voices (preview):
 *   - Rachel    21m00Tcm4TlvDq8ikWAM  (English female)
 *   - Adam      pNInz6obpgDQGcFmaJgB  (English male)
 *   - Antoni    ErXwobaYiN019PkySvjV  (English male, warm)
 *   For UA/RU: needs multilingual model `eleven_multilingual_v2`.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, []),
);

async function main() {
  const text = args.text;
  const voice = args.voice || "21m00Tcm4TlvDq8ikWAM";
  const out = args.out;
  if (!text || !out) {
    console.error("Usage: --text <text> --out <path> [--voice <id>]");
    process.exit(1);
  }
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error("ELEVENLABS_API_KEY required. Get one at https://elevenlabs.io/app/settings/api-keys");
    process.exit(2);
  }

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!r.ok) {
    console.error(`TTS failed ${r.status}:`, await r.text());
    process.exit(3);
  }

  const buf = Buffer.from(await r.arrayBuffer());
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, buf);
  console.log(`✓ saved ${buf.length} bytes → ${out}`);
}

main().catch((e) => { console.error(e); process.exit(99); });
