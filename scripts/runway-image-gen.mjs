#!/usr/bin/env node
/**
 * Runway text_to_image generator.
 *
 * Usage:
 *   RUNWAYML_API_SECRET=<key> node scripts/runway-image-gen.mjs \
 *     --prompt "warm portrait of Ukrainian mother" \
 *     --model gemini_image3_pro \
 *     --ratio 1024:1024 \
 *     --out public/images/recipients/uk-mother.jpg
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
  const prompt = args.prompt;
  const out = args.out;
  const model = args.model || "gemini_image3_pro";
  const ratio = args.ratio || "1024:1024";
  if (!prompt || !out) {
    console.error("Usage: --prompt <text> --out <path> [--model gemini_image3_pro] [--ratio 1024:1024]");
    process.exit(1);
  }
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) { console.error("RUNWAYML_API_SECRET required"); process.exit(2); }

  // 1. Submit
  const submit = await fetch("https://api.dev.runwayml.com/v1/text_to_image", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "X-Runway-Version": "2024-11-06",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, promptText: prompt, ratio }),
  });
  if (!submit.ok) {
    console.error(`Submit failed ${submit.status}:`, await submit.text());
    process.exit(3);
  }
  const { id } = await submit.json();
  process.stdout.write(`task ${id.slice(0, 8)} `);

  // 2. Poll
  let url;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const r = await fetch(`https://api.dev.runwayml.com/v1/tasks/${id}`, {
      headers: { "Authorization": `Bearer ${apiKey}`, "X-Runway-Version": "2024-11-06" },
    });
    const j = await r.json();
    process.stdout.write(".");
    if (j.status === "SUCCEEDED") { url = j.output[0]; break; }
    if (j.status === "FAILED") { console.error(`\nFAILED: ${j.failure ?? "unknown"}`); process.exit(4); }
  }
  if (!url) { console.error("\ntimeout"); process.exit(5); }

  // 3. Download
  const dl = await fetch(url);
  const buf = new Uint8Array(await dl.arrayBuffer());
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, buf);
  console.log(` ✓ ${(buf.byteLength / 1024).toFixed(0)} KB → ${out}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
