#!/usr/bin/env node
/**
 * Batch generator: 6 videos + 6 photos for BridoConnect thematic media.
 *
 * Concurrency: Runway limits to 5 concurrent generations, batches of 4.
 *
 * Usage:
 *   source ~/Desktop/r1/.env && node scripts/gen-media-set.mjs
 */
import { writeFile, mkdir, stat } from "node:fs/promises";
import { dirname } from "node:path";

const apiKey = process.env.RUNWAYML_API_SECRET;
if (!apiKey) { console.error("RUNWAYML_API_SECRET required"); process.exit(1); }

const PROMPT_GUARDRAILS = " No text, no logos, no watermarks, no recognizable brands. Documentary tone. Warm sienna and amber color palette, soft natural light. 35mm film aesthetic, dignified.";

// VIDEOS — 5s each. Premium models for hero, faster for supporting.
const VIDEOS = [
  {
    name: "hero-connection",
    out: "public/videos/hero-connection.mp4",
    model: "gen4.5",
    prompt: "Cinematic wide shot at golden hour: a mother gently holds her young child's hand walking along a quiet European street, soft warm light, slow camera dolly forward, hopeful and dignified atmosphere." + PROMPT_GUARDRAILS,
  },
  {
    name: "direct-exchange",
    out: "public/videos/direct-exchange.mp4",
    model: "seedance2",
    prompt: "Close-up shot: two pairs of hands exchanging a small wrapped care package, sunlight from the side, hands of different skin tones, simple wooden table, intimate and warm." + PROMPT_GUARDRAILS,
  },
  {
    name: "trust-shield",
    out: "public/videos/trust-shield.mp4",
    model: "seedance2",
    prompt: "Abstract kinetic visual: glowing soft amber shield with a verified checkmark slowly assembling from particles, dark warm background, ambient particles floating, calm and trustworthy." + PROMPT_GUARDRAILS,
  },
  {
    name: "verified-people",
    out: "public/videos/verified-people.mp4",
    model: "seedance2",
    prompt: "Slow montage of silhouette portraits, diverse people facing camera at sunset, faces in soft shadow respecting privacy, dignified, slow camera panning right." + PROMPT_GUARDRAILS,
  },
  {
    name: "global-reach",
    out: "public/videos/global-reach.mp4",
    model: "seedance2",
    prompt: "Stylized animation: warm earth globe rotating slowly, golden light arcs flowing between continents representing direct human aid, no political borders, soft warm palette." + PROMPT_GUARDRAILS,
  },
  {
    name: "hope",
    out: "public/videos/hope.mp4",
    model: "gen4.5",
    prompt: "Tight shot: a young child smiling softly in natural window light, eyes lit up, slow gentle camera, intimate and dignified, no overt sentimentality." + PROMPT_GUARDRAILS,
  },
];

// PHOTOS — square portraits + landscape scenes.
const IMAGE_GUARDRAILS = " No text overlays, no logos, no watermarks. Photographic, 35mm film aesthetic, warm color palette, soft natural light. Dignified documentary style.";

const PHOTOS = [
  {
    name: "recipient-uk-mother",
    out: "public/images/recipients/uk-mother.jpg",
    model: "gemini_image3_pro",
    ratio: "1024:1024",
    prompt: "Portrait of a Ukrainian woman in her mid-thirties holding her young child, both looking calmly off-camera, natural window light from the side, modest interior visible behind, traditional embroidered blouse subtle hint." + IMAGE_GUARDRAILS,
  },
  {
    name: "recipient-syrian-father",
    out: "public/images/recipients/syrian-father.jpg",
    model: "gemini_image3_pro",
    ratio: "1024:1024",
    prompt: "Portrait of a Middle Eastern father in his forties, dignified expression, looking thoughtfully into middle distance, soft golden hour light through a window, modest urban setting." + IMAGE_GUARDRAILS,
  },
  {
    name: "recipient-afghan-teacher",
    out: "public/images/recipients/afghan-teacher.jpg",
    model: "gemini_image3_pro",
    ratio: "1024:1024",
    prompt: "Portrait of a young Afghan woman teacher, holding a stack of textbooks, looking determined and hopeful, light scarf, simple classroom backdrop, warm afternoon light." + IMAGE_GUARDRAILS,
  },
  {
    name: "sponsor-european",
    out: "public/images/sponsor-european.jpg",
    model: "gemini_image3_pro",
    ratio: "1024:1024",
    prompt: "Portrait of a European person in their forties at a wooden desk with a laptop, looking at the screen with a thoughtful kind expression, warm desk lamp, cozy home office, mug of coffee." + IMAGE_GUARDRAILS,
  },
  {
    name: "aid-delivery",
    out: "public/images/aid-delivery.jpg",
    model: "gen4_image",
    ratio: "1280:720",
    prompt: "Documentary photo: close-up of hands receiving a small wrapped care package, both pairs visible, modest indoor setting, warm directional light, focus on the exchange." + IMAGE_GUARDRAILS,
  },
  {
    name: "verification-passport",
    out: "public/images/verification-passport.jpg",
    model: "gen4_image",
    ratio: "1024:1024",
    prompt: "Top-down photo of hands holding a passport on a wooden desk, blue passport cover generic non-specific, professional lighting, paperwork and a pen nearby, clean composition." + IMAGE_GUARDRAILS,
  },
];

const ALL = [...VIDEOS.map(v => ({ ...v, type: "video" })), ...PHOTOS.map(p => ({ ...p, type: "photo" }))];

async function submitVideo(item) {
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

async function submitImage(item) {
  const r = await fetch("https://api.dev.runwayml.com/v1/text_to_image", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-Runway-Version": "2024-11-06",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: item.model, promptText: item.prompt, ratio: item.ratio }),
  });
  if (!r.ok) throw new Error(`${item.name}: submit ${r.status} ${await r.text()}`);
  return (await r.json()).id;
}

async function pollAndSave(item, taskId) {
  for (let i = 0; i < 80; i++) {
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

async function skipExisting(item) {
  try {
    const s = await stat(item.out);
    if (s.size > 1000) {
      console.log(`↻ ${item.name.padEnd(28)} ${(s.size / 1024).toFixed(0).padStart(6)} KB (exists, skip)`);
      return true;
    }
  } catch { /* not exists */ }
  return false;
}

async function processBatch(batch) {
  // Submit in parallel, then poll in parallel
  const submitted = await Promise.allSettled(batch.map(async (item) => {
    if (await skipExisting(item)) return { item, skip: true };
    const id = item.type === "video" ? await submitVideo(item) : await submitImage(item);
    console.log(`→ ${item.name.padEnd(28)} task ${id.slice(0, 12)}`);
    return { item, id };
  }));
  await Promise.allSettled(submitted.map(async (s) => {
    if (s.status === "rejected") { console.error("submit-err:", s.reason?.message ?? s.reason); return; }
    if (s.value.skip) return;
    try { await pollAndSave(s.value.item, s.value.id); }
    catch (e) { console.error("poll-err:", e.message); }
  }));
}

async function main() {
  const BATCH_SIZE = 4;
  console.log(`Generating ${ALL.length} items (${VIDEOS.length} videos + ${PHOTOS.length} photos) in batches of ${BATCH_SIZE}…`);
  for (let i = 0; i < ALL.length; i += BATCH_SIZE) {
    const batch = ALL.slice(i, i + BATCH_SIZE);
    console.log(`\n--- batch ${i / BATCH_SIZE + 1}/${Math.ceil(ALL.length / BATCH_SIZE)} (${batch.length} items) ---`);
    await processBatch(batch);
  }
  console.log("\nAll done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
