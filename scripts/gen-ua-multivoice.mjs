#!/usr/bin/env node
// Multi-voice UA narration с emotion tags для eleven_v3.
// eleven_v3 поддерживает inline emotion markers [concerned], [warm], [bold]
// + better native UA pronunciation чем multilingual_v2.
import { writeFile, mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) { console.error("ELEVENLABS_API_KEY missing"); process.exit(1); }

const ALEX   = "0p9W8EFOJbkw3zD1oNop";  // Alex — Warm Storyteller male
const SOFIIA = "96XEXOjZRHooATdYA8FY";  // Sofiia — Clear Warm female

const MODEL = "eleven_v3";

// Каждый сегмент со своим emotion tag + индивидуальные voice settings.
// stability LOW (0.10-0.20) = больше натуральных вариаций интонации.
// style HIGH (0.75-0.95) = максимальная экспрессия.
const SEGMENTS = [
  {
    voice: ALEX,
    text: "[concerned] Десь під Харковом мама вкладає дітей спати під обстрілами.",
    settings: { stability: 0.15, similarity_boost: 0.90, style: 0.85, use_speaker_boost: true },
  },
  {
    voice: ALEX,
    text: "[softly] У Лимані бабуся гріється від генератора. [pause] У Львові сім'я біженців не має чим вкрити дітей.",
    settings: { stability: 0.18, similarity_boost: 0.90, style: 0.80, use_speaker_boost: true },
  },
  {
    voice: ALEX,
    text: "[warm, hopeful] Цим людям не потрібен великий фонд. [emphasized] Їм потрібен ти.",
    settings: { stability: 0.20, similarity_boost: 0.90, style: 0.85, use_speaker_boost: true },
  },
  {
    voice: ALEX,
    text: "[conversational] Двісті гривень на ліки. П'ятсот на продукти на тиждень. Дві тисячі на генератор.",
    settings: { stability: 0.25, similarity_boost: 0.85, style: 0.70, use_speaker_boost: true },
  },
  {
    voice: SOFIIA,
    text: "[bright, clear] BridoConnect — це прямий зв'язок. [confident] Відкрий додаток.",
    settings: { stability: 0.20, similarity_boost: 0.90, style: 0.80, use_speaker_boost: true },
  },
  {
    voice: SOFIIA,
    text: "[friendly, instructional] У стрічці побачиш реальних людей з фото та документами. [emphasized] Натисни Підтримати. Введи суму. Готово.",
    settings: { stability: 0.22, similarity_boost: 0.90, style: 0.75, use_speaker_boost: true },
  },
  {
    voice: ALEX,
    text: "[reassuring] Гроші чекають у безпечному замку сім днів. Коли отримувач підтвердить — допомога прийде. [warm] Ти побачиш фото, відгук, історію.",
    settings: { stability: 0.18, similarity_boost: 0.90, style: 0.82, use_speaker_boost: true },
  },
  {
    voice: ALEX,
    text: "[bold, confident] Без фондів. Без посередників. [hopeful, emphasized] Два кліки — і чиєсь життя зміниться вже сьогодні.",
    settings: { stability: 0.12, similarity_boost: 0.92, style: 0.92, use_speaker_boost: true },
  },
];

const TMP = "/tmp/ua-segments";
await mkdir(TMP, { recursive: true });

console.log(`Model: ${MODEL} | Generating ${SEGMENTS.length} expressive segments…`);
const segmentFiles = [];
for (let i = 0; i < SEGMENTS.length; i++) {
  const seg = SEGMENTS[i];
  const file = `${TMP}/seg-${String(i).padStart(2, "0")}.mp3`;
  process.stdout.write(`  ${i + 1}/${SEGMENTS.length} ${seg.voice === ALEX ? "👨 Alex" : "👩 Sofiia"} (${seg.text.length} chars)… `);
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

const listFile = `${TMP}/concat.txt`;
const silence = `${TMP}/silence.mp3`;
execSync(`ffmpeg -y -f lavfi -i anullsrc=channel_layout=mono:sample_rate=44100 -t 0.4 -q:a 9 -ac 1 "${silence}" 2>&1 | tail -1`);

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
