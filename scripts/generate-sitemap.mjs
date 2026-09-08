#!/usr/bin/env node
// Генерирует public/sitemap.xml из списка public routes.
// Запускается автоматически перед `npm run build` (см. package.json).
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.VITE_APP_URL || "https://bridoconnect.com";

// Только публичные маршруты (без /app/*, /auth и параметризованных)
const ROUTES = [
  { path: "/", priority: 1.0, changefreq: "daily" },
  { path: "/how-it-works", priority: 0.9, changefreq: "monthly" },
  { path: "/transparency", priority: 0.9, changefreq: "weekly" },
  { path: "/about", priority: 0.7, changefreq: "monthly" },
  { path: "/faq", priority: 0.7, changefreq: "monthly" },
  { path: "/shop", priority: 0.8, changefreq: "daily" },
  { path: "/verification", priority: 0.6, changefreq: "monthly" },
  { path: "/live", priority: 0.7, changefreq: "hourly" },
  { path: "/impressum", priority: 0.3, changefreq: "yearly" },
  { path: "/datenschutz", priority: 0.3, changefreq: "yearly" },
  { path: "/agb", priority: 0.3, changefreq: "yearly" },
];

const LOCALES = ["uk", "en", "de", "ru", "pl"]; // hreflang alternates

const now = new Date().toISOString().slice(0, 10);

const urls = ROUTES.map(({ path, priority, changefreq }) => {
  const alt = LOCALES.map(
    (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${BASE}${path}?lang=${l}" />`,
  ).join("\n");
  return `  <url>
    <loc>${BASE}${path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
${alt}
    <xhtml:link rel="alternate" hreflang="x-default" href="${BASE}${path}" />
  </url>`;
}).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;

const outPath = resolve(__dirname, "..", "public", "sitemap.xml");
await writeFile(outPath, xml, "utf8");
console.log(`✓ sitemap.xml → ${ROUTES.length} routes × ${LOCALES.length + 1} langs`);
