#!/usr/bin/env node
// Multi-voice UA narration синхронизированный с видеорядом:
// Cinematic-segments (мотивация) + Screen-walkthrough-segments (action).
// Каждый сегмент строго соответствует визуальной сцене.
import { writeFile, mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) { console.error("ELEVENLABS_API_KEY missing"); process.exit(1); }

const ALEX   = "0p9W8EFOJbkw3zD1oNop";  // male, warm storyteller — для мотивации
const SOFIIA = "96XEXOjZRHooATdYA8FY";  // female, kiev clear — для инструкций

const MODEL = "eleven_v3";

// 9 сегментов точно по видеоряду (см. build-walkthrough-video.sh):
//   1-3: cinematic UA-context (мотивация, hook)
//   4-6: phone screen-recordings (walkthrough)
//   7-9: cinematic (trust, guarantee, CTA)
const SEGMENTS = [
  // [1] cinematic: mother-night — emotional hook
  {
    voice: ALEX,
    text: "[concerned] Десь зараз під Харковом мама вкладає дітей спати під обстрілами.",
    settings: { stability: 0.15, similarity_boost: 0.92, style: 0.88, use_speaker_boost: true },
  },
  // [2] cinematic: grandma-generator + volunteers
  {
    voice: ALEX,
    text: "[softly] У Лимані бабуся гріється від генератора. У Львові сім'я біженців ділить останню ковдру на трьох дітей.",
    settings: { stability: 0.18, similarity_boost: 0.90, style: 0.82, use_speaker_boost: true },
  },
  // [3] cinematic: volunteer/children — promise
  {
    voice: ALEX,
    text: "[warm, hopeful] Цим людям не потрібен великий фонд. [emphasized] Їм потрібен ти. І BridoConnect показує, як це зробити просто.",
    settings: { stability: 0.20, similarity_boost: 0.90, style: 0.85, use_speaker_boost: true },
  },
  // [4] screen step1 (feed scroll): "Тут — стрічка з реальними людьми"
  {
    voice: SOFIIA,
    text: "[bright, instructional] Ось стрічка. Кожна картка — реальна людина з фото, історією і перевіреними документами.",
    settings: { stability: 0.22, similarity_boost: 0.90, style: 0.75, use_speaker_boost: true },
  },
  // [5] screen step2 (open deal): "Натисни на людину, прочитай"
  {
    voice: SOFIIA,
    text: "[friendly] Натискаєш на картку — відкривається історія. Скільки потрібно, на що, скільки вже зібрано.",
    settings: { stability: 0.22, similarity_boost: 0.90, style: 0.78, use_speaker_boost: true },
  },
  // [6] screen step3 (donate flow): "Кнопка Підтримати → введи суму"
  {
    voice: SOFIIA,
    text: "[confident, emphasized] Натискаєш «Підтримати». Обираєш суму — від десяти євро. Готово. Це триває менше хвилини.",
    settings: { stability: 0.20, similarity_boost: 0.90, style: 0.82, use_speaker_boost: true },
  },
  // [7] cinematic shield: trust + escrow
  {
    voice: ALEX,
    text: "[reassuring] Твої гроші чекають у безпечному замку сім днів. Аноніми не отримають жодного цента.",
    settings: { stability: 0.18, similarity_boost: 0.92, style: 0.80, use_speaker_boost: true },
  },
  // [8] cinematic children-receiving: result + proof
  {
    voice: ALEX,
    text: "[warm] Коли отримувач підтвердить, що допомога прийшла — ти побачиш фото, його відгук, історію угоди.",
    settings: { stability: 0.18, similarity_boost: 0.90, style: 0.82, use_speaker_boost: true },
  },
  // [9] cinematic hope: CTA
  {
    voice: ALEX,
    text: "[bold, hopeful, emphasized] Два кліки. Без фондів, без посередників. І чиєсь життя зміниться вже сьогодні.",
    settings: { stability: 0.12, similarity_boost: 0.92, style: 0.92, use_speaker_boost: true },
  },
];

const TMP = "/tmp/ua-segments";
await mkdir(TMP, { recursive: true });

console.log(`Model: ${MODEL} | Generating ${SEGMENTS.length} sync'd segments…`);
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
execSync(`ffmpeg -y -f lavfi -i anullsrc=channel_layout=mono:sample_rate=44100 -t 0.35 -q:a 9 -ac 1 "${silence}" 2>&1 | tail -1`);

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
console.log(`\nSegment durations:`);
for (let i = 0; i < segmentFiles.length; i++) {
  const d = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${segmentFiles[i]}"`).toString().trim();
  console.log(`  seg-${String(i).padStart(2, "0")} (${SEGMENTS[i].voice === ALEX ? "👨" : "👩"}): ${parseFloat(d).toFixed(2)}s`);
}
