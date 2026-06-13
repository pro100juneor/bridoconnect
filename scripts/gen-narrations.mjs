#!/usr/bin/env node
// Generates 10 ElevenLabs voiceover files from public/audio/narration/scripts.json.
// Reuses scripts/elevenlabs-gen.mjs API call format.
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import scripts from "../public/audio/narration/scripts.json" with { type: "json" };

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) { console.error("ELEVENLABS_API_KEY missing"); process.exit(1); }

const VOICE = scripts._meta.voice_id;
const MODEL = scripts._meta.model;

const languages = Object.keys(scripts).filter((k) => !k.startsWith("_"));
console.log(`Generating ${languages.length} narrations: ${languages.join(", ")}`);

let success = 0;
for (const lang of languages) {
  const text = scripts[lang];
  const out = `public/audio/narration/${lang}.mp3`;
  process.stdout.write(`  ${lang} (${text.length} chars)… `);
  try {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: MODEL,
        voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
      }),
    });
    if (!r.ok) {
      const err = await r.text();
      console.log(`FAIL ${r.status}`);
      console.error("  ", err.slice(0, 200));
      continue;
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, buf);
    console.log(`✓ ${(buf.byteLength / 1024).toFixed(1)} KB`);
    success++;
  } catch (e) {
    console.log(`ERR ${e.message}`);
  }
}
console.log(`Done: ${success}/${languages.length}`);
