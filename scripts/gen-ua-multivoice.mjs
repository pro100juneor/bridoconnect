#!/usr/bin/env node
// Multi-voice UA narration: микс male storyteller + female walkthrough.
// Сценарий разбит на сегменты, каждый озвучен своим голосом,
// затем склеен ffmpeg-ом в один MP3 для VideoHero.
import { writeFile, mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) { console.error("ELEVENLABS_API_KEY missing"); process.exit(1); }

// Native UA voices (из shared library, доступны напрямую):
const ALEX   = "0p9W8EFOJbkw3zD1oNop";  // Alex — Warm Storyteller, male middle-age, calm
const SOFIIA = "96XEXOjZRHooATdYA8FY";  // Sofiia — Clear Warm, female young, kiev accent

// Segments: каждый — отдельная фраза/блок, со своим голосом.
// male (Alex) — emotional hook + trust;
// female (Sofiia) — walkthrough instructions ("Відкрий → Натисни → Введи").
const SEGMENTS = [
  { voice: ALEX,   text: "Десь під Харковом мама вкладає дітей спати під обстрілами.", settings: { stability: 0.35, similarity_boost: 0.85, style: 0.65, use_speaker_boost: true } },
  { voice: ALEX,   text: "У Лимані бабуся гріється від генератора. У Львові сім'я біженців не має чим вкрити дітей." },
  { voice: ALEX,   text: "Цим людям не потрібен великий фонд. Їм потрібен ти." },
  { voice: ALEX,   text: "Двісті гривень на ліки. П'ятсот на продукти на тиждень. Дві тисячі на генератор." },
  { voice: SOFIIA, text: "BridoConnect — це прямий зв'язок. Відкрий додаток.", settings: { stability: 0.40, similarity_boost: 0.85, style: 0.55, use_speaker_boost: true } },
  { voice: SOFIIA, text: "У стрічці побачиш реальних людей з фото та документами. Натисни Підтримати. Введи суму. Готово." },
  { voice: ALEX,   text: "Гроші чекають у безпечному замку сім днів. Коли отримувач підтвердить — допомога прийде. Ти побачиш фото, відгук, історію." },
  { voice: ALEX,   text: "Без фондів. Без посередників. Два кліки — і чиєсь життя зміниться вже сьогодні.", settings: { stability: 0.30, similarity_boost: 0.85, style: 0.75, use_speaker_boost: true } },
];

const TMP = "/tmp/ua-segments";
await mkdir(TMP, { recursive: true });

const defaultSettings = {
  stability: 0.40,
  similarity_boost: 0.85,
  style: 0.60,
  use_speaker_boost: true,
};

console.log(`Generating ${SEGMENTS.length} segments…`);
const segmentFiles = [];
for (let i = 0; i < SEGMENTS.length; i++) {
  const seg = SEGMENTS[i];
  const file = `${TMP}/seg-${String(i).padStart(2, "0")}.mp3`;
  process.stdout.write(`  ${i + 1}/${SEGMENTS.length} ${seg.voice === ALEX ? "👨 Alex" : "👩 Sofiia"} (${seg.text.length} chars)… `);
  const resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${seg.voice}`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json", "Accept": "audio/mpeg" },
    body: JSON.stringify({
      text: seg.text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { ...defaultSettings, ...(seg.settings || {}) },
    }),
  });
  if (!resp.ok) {
    console.log(`FAIL ${resp.status}`);
    console.error("  ", (await resp.text()).slice(0, 200));
    process.exit(2);
  }
  const buf = new Uint8Array(await resp.arrayBuffer());
  await writeFile(file, buf);
  console.log(`✓ ${(buf.byteLength / 1024).toFixed(1)} KB`);
  segmentFiles.push(file);
}

// Concat segments via ffmpeg with 0.3s silence pause between them.
const listFile = `${TMP}/concat.txt`;
const silence = `${TMP}/silence.mp3`;
execSync(`ffmpeg -y -f lavfi -i anullsrc=channel_layout=mono:sample_rate=44100 -t 0.3 -q:a 9 -ac 1 "${silence}" 2>&1 | tail -1`);

const lines = [];
segmentFiles.forEach((f, i) => {
  lines.push(`file '${f}'`);
  if (i < segmentFiles.length - 1) lines.push(`file '${silence}'`);
});
await writeFile(listFile, lines.join("\n") + "\n");

const out = "public/audio/narration/uk.mp3";
execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${out}" 2>&1 | tail -1`);
const stat = execSync(`stat -f%z "${out}"`).toString().trim();
console.log(`\n→ ${out} (${(Number(stat) / 1024).toFixed(1)} KB)`);

// Verify total duration
const dur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${out}"`).toString().trim();
console.log(`duration: ${parseFloat(dur).toFixed(1)}s`);
