#!/usr/bin/env node
// Punchy 35s UA narration — короткі хлёсткие фрази, switch голосів для drive.
// Кожен сегмент 3-5s, без затянутих пауз.
import { writeFile, mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) { console.error("ELEVENLABS_API_KEY missing"); process.exit(1); }

const ALEX   = "0p9W8EFOJbkw3zD1oNop";  // male storyteller
const SOFIIA = "96XEXOjZRHooATdYA8FY";  // female clear kiev

const MODEL = "eleven_v3";

// 7 punchy segments, ~35s total + 6 × 0.2s silence = ~36s
const SEGMENTS = [
  // [1] Hook 4s — провокация
  {
    voice: ALEX,
    text: "[urgent] Хочеш реально допомогти? [emphasized] Не фондам. Живій людині.",
    settings: { stability: 0.10, similarity_boost: 0.92, style: 0.95, use_speaker_boost: true },
    target_sec: 5.0,
  },
  // [2] Real people 5s — конкретные люди
  {
    voice: ALEX,
    text: "[bold] Ось Олена з Маріуполя. Сергій з Бахмута. Реальні люди з перевіреними документами.",
    settings: { stability: 0.18, similarity_boost: 0.90, style: 0.85, use_speaker_boost: true },
    target_sec: 6.0,
  },
  // [3] Step 1 — feed (Sofiia)
  {
    voice: SOFIIA,
    text: "[bright, confident] Крок один — обираєш людину у стрічці.",
    settings: { stability: 0.20, similarity_boost: 0.92, style: 0.80, use_speaker_boost: true },
    target_sec: 4.5,
  },
  // [4] Step 2 — donate
  {
    voice: SOFIIA,
    text: "[confident] Крок два — натискаєш Підтримати, обираєш суму.",
    settings: { stability: 0.18, similarity_boost: 0.92, style: 0.85, use_speaker_boost: true },
    target_sec: 4.5,
  },
  // [5] Trust — escrow
  {
    voice: ALEX,
    text: "[reassuring, emphasized] Гроші в ескроу. Не отримав — не дойдуть.",
    settings: { stability: 0.15, similarity_boost: 0.92, style: 0.85, use_speaker_boost: true },
    target_sec: 5.0,
  },
  // [6] Proof — confirmation
  {
    voice: ALEX,
    text: "[warm] Підтвердив — ти бачиш фото-результат.",
    settings: { stability: 0.18, similarity_boost: 0.92, style: 0.80, use_speaker_boost: true },
    target_sec: 4.0,
  },
  // [7] CTA 5s — fierce hook
  {
    voice: ALEX,
    text: "[bold, urgent, emphasized] Дві хвилини. Один акт. Зміни життя сьогодні.",
    settings: { stability: 0.10, similarity_boost: 0.95, style: 0.95, use_speaker_boost: true },
    target_sec: 5.5,
  },
];

const TMP = "/tmp/ua-segments";
await mkdir(TMP, { recursive: true });

console.log(`Model: ${MODEL} | Generating ${SEGMENTS.length} punchy segments…`);
const segmentFiles = [];
for (let i = 0; i < SEGMENTS.length; i++) {
  const seg = SEGMENTS[i];
  const file = `${TMP}/seg-${String(i).padStart(2, "0")}.mp3`;
  process.stdout.write(`  ${i + 1}/${SEGMENTS.length} ${seg.voice === ALEX ? "👨" : "👩"} (${seg.text.length}c, ~${seg.target_sec}s)… `);
  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${seg.voice}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
    body: JSON.stringify({ text: seg.text, model_id: MODEL, voice_settings: seg.settings }),
  });
  if (!resp.ok) {
    console.log(`FAIL ${resp.status}`);
    console.error("  ", (await resp.text()).slice(0, 300));
    process.exit(2);
  }
  const buf = new Uint8Array(await resp.arrayBuffer());
  await writeFile(file, buf);
  console.log(`✓ ${(buf.byteLength / 1024).toFixed(1)} KB`);
  segmentFiles.push(file);
}

// Concat segments with tight 0.2s silence
const listFile = `${TMP}/concat.txt`;
const silence = `${TMP}/silence.mp3`;
execSync(`ffmpeg -y -f lavfi -i anullsrc=channel_layout=mono:sample_rate=44100 -t 0.2 -q:a 9 -ac 1 "${silence}" 2>&1 | tail -1`);
const lines = [];
segmentFiles.forEach((f, i) => {
  lines.push(`file '${f}'`);
  if (i < segmentFiles.length - 1) lines.push(`file '${silence}'`);
});
await writeFile(listFile, lines.join("\n") + "\n");

const out = "public/audio/narration/uk.mp3";
execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${out}" 2>&1 | tail -1`);
const stat = execSync(`stat -f%z "${out}"`).toString().trim();
const dur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${out}"`).toString().trim();
console.log(`\n→ ${out} (${(Number(stat) / 1024).toFixed(1)} KB, ${parseFloat(dur).toFixed(1)}s)`);

// Print per-segment durations для video sync
console.log("\nSegment durations (для video sync):");
for (let i = 0; i < segmentFiles.length; i++) {
  const d = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${segmentFiles[i]}"`).toString().trim();
  console.log(`  seg-${String(i).padStart(2, "0")} (${SEGMENTS[i].voice === ALEX ? "👨" : "👩"}): ${parseFloat(d).toFixed(2)}s  (target: ${SEGMENTS[i].target_sec}s)`);
}
