#!/usr/bin/env node
// 4 UA-context Runway video clips для нового hero-story-ua arc.
// Соответствуют конкретным фразам narration UA.
import { writeFile, mkdir, stat } from "node:fs/promises";
import { dirname } from "node:path";

const apiKey = process.env.RUNWAYML_API_SECRET;
if (!apiKey) { console.error("RUNWAYML_API_SECRET required"); process.exit(1); }

// seedance2 = better quality than seedance2_fast, ~50 credits/5s.
// Все промпты — UA-контекст, тёплая палитра, дигнификация (не poverty-porn).
const CLIPS = [
  {
    name: "ua-mother-night",
    out: "public/videos/ua/mother-night.mp4",
    prompt: "Tight medium shot: a Ukrainian mother in her thirties tucking her two young children into bed in a modest apartment, soft warm bedside lamp light, slightly worn but clean blankets, calm and dignified, sound of distant rumble implied through subtle window vibration. Documentary tone, no explosions visible, no military. Warm sienna-amber palette, 35mm aesthetic. No text, no logos.",
    model: "seedance2",
  },
  {
    name: "ua-grandma-generator",
    out: "public/videos/ua/grandma-generator.mp4",
    prompt: "Close-up: an elderly Ukrainian grandmother sitting in a small kitchen warming her hands near a small portable generator, soft golden lamp light, knitted shawl on shoulders, hint of frost on window, peaceful and dignified expression. Warm amber palette. No text, no logos.",
    model: "seedance2",
  },
  {
    name: "ua-volunteer-packages",
    out: "public/videos/ua/volunteer-packages.mp4",
    prompt: "Documentary wide shot: a group of Ukrainian volunteers loading care packages into a van at dusk in a courtyard, blue and yellow ribbons subtly visible on a few boxes, warm golden hour light, dignified and purposeful atmosphere, faces in soft focus. 35mm film aesthetic. No text, no logos, no recognizable brands.",
    model: "seedance2",
  },
  {
    name: "ua-children-receiving",
    out: "public/videos/ua/children-receiving.mp4",
    prompt: "Close-up shot: two children unwrapping a small parcel with school supplies and a warm jacket in a modest apartment, mother visible behind them smiling softly, natural window light, dignified joy, warm earth-tone palette. 35mm aesthetic. No text, no logos.",
    model: "seedance2",
  },
];

async function submit(item) {
  const r = await fetch("https://api.dev.runwayml.com/v1/text_to_video", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-Runway-Version": "2024-11-06",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: item.model, promptText: item.prompt, duration: 5, ratio: "1280:720" }),
  });
  if (!r.ok) throw new Error(`${item.name}: submit ${r.status} ${await r.text()}`);
  return (await r.json()).id;
}

async function pollAndSave(item, taskId) {
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const r = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: { "Authorization": `Bearer ${apiKey}`, "X-Runway-Version": "2024-11-06" },
    });
    const j = await r.json();
    if (j.status === "SUCCEEDED") {
      const url = Array.isArray(j.output) ? j.output[0] : j.output;
      const dl = await fetch(url);
      const buf = new Uint8Array(await dl.arrayBuffer());
      await mkdir(dirname(item.out), { recursive: true });
      await writeFile(item.out, buf);
      console.log(`✓ ${item.name.padEnd(28)} ${(buf.byteLength / 1024).toFixed(0).padStart(6)} KB`);
      return;
    }
    if (j.status === "FAILED" || j.status === "CANCELLED") {
      throw new Error(`${item.name}: ${j.status} ${j.failure ?? ""}`);
    }
  }
  throw new Error(`${item.name}: timeout`);
}

async function skip(item) {
  try {
    const s = await stat(item.out);
    if (s.size > 1000) {
      console.log(`↻ ${item.name.padEnd(28)} ${(s.size / 1024).toFixed(0).padStart(6)} KB (exists, skip)`);
      return true;
    }
  } catch {}
  return false;
}

async function main() {
  console.log(`Generating ${CLIPS.length} UA-context clips...`);
  const ids = await Promise.allSettled(CLIPS.map(async (c) => {
    if (await skip(c)) return { c, skip: true };
    const id = await submit(c);
    console.log(`→ ${c.name.padEnd(28)} task ${id.slice(0, 12)}`);
    return { c, id };
  }));
  await Promise.allSettled(ids.map(async (s) => {
    if (s.status === "rejected") { console.error("submit-err:", s.reason?.message); return; }
    if (s.value.skip) return;
    try { await pollAndSave(s.value.c, s.value.id); }
    catch (e) { console.error("poll-err:", e.message); }
  }));
  console.log("\nUA clips done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
