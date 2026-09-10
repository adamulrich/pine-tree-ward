import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const churchOrigin = "https://www.churchofjesuschrist.org";
const targetPath = resolve("src", "come-follow-me.js");
const startMarker = "// BEGIN GENERATED COME FOLLOW ME DATA";
const endMarker = "// END GENERATED COME FOLLOW ME DATA";

function option(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? null : process.argv[index + 1];
}

function decodeHtml(value) {
  const named = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi, (match, entity) => {
    if (entity[0] !== "#") return named[entity.toLowerCase()] ?? match;
    const hexadecimal = entity[1].toLowerCase() === "x";
    const number = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    return Number.isFinite(number) ? String.fromCodePoint(number) : match;
  });
}

function plainText(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function fetchText(url, attempt = 1) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "pine-tree-ward-come-follow-me-updater/1.0",
    },
  });

  if (response.ok) return response.text();
  if (attempt < 3 && response.status >= 500) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, attempt * 500));
    return fetchText(url, attempt + 1);
  }
  throw new Error(`Request failed with ${response.status}: ${url}`);
}

function currentSettings(source) {
  const year = Number(source.match(/const scheduleYear = (\d+);/)?.[1]);
  const manual = source.match(/\/study\/manual\/([^/]+)\/\d{2}\?lang=eng/)?.[1];
  if (!year || !manual) throw new Error("Could not read the current schedule settings.");
  return { year, manual };
}

function normalizeManual(value) {
  if (!value) return null;
  if (!value.includes("/")) return value;
  const match = value.match(/\/study\/manual\/([^/?#]+)/);
  if (!match) throw new Error("--manual must be a manual slug or Church manual URL.");
  return match[1];
}

function discoverLessons(html, manual) {
  const pattern = new RegExp(`href="([^"]*\\/study\\/manual\\/${escapeRegex(manual)}\\/(\\d{2})\\?lang=eng[^"]*)"`, "g");
  const lessons = new Map();

  for (const match of html.matchAll(pattern)) {
    const week = Number(match[2]);
    if (week < 1 || week > 53 || lessons.has(week)) continue;
    lessons.set(week, new URL(decodeHtml(match[1]), churchOrigin).href);
  }

  const discovered = [...lessons].sort(([a], [b]) => a - b);
  if (discovered.length < 50) {
    throw new Error(`Only found ${discovered.length} weekly lessons in the manual contents.`);
  }
  return discovered;
}

function extractLesson(week, url, html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) throw new Error(`Lesson ${week} has no page title.`);

  const heading = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "";
  const readings = [];
  const seen = new Set();
  const linkPattern = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of heading.matchAll(linkPattern)) {
    const readingUrl = new URL(decodeHtml(match[1]), churchOrigin);
    if (readingUrl.origin !== churchOrigin || !readingUrl.pathname.startsWith("/study/scriptures/")) continue;
    const label = plainText(match[2]);
    if (!label || seen.has(readingUrl.href)) continue;
    seen.add(readingUrl.href);
    readings.push({ label, url: readingUrl.href });
  }

  return { week, title: plainText(titleMatch[1]), url, readings };
}

async function mapConcurrent(entries, limit, mapper) {
  const results = new Array(entries.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < entries.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(entries[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, entries.length) }, worker));
  return results;
}

async function main() {
  const source = await readFile(targetPath, "utf8");
  const current = currentSettings(source);
  const year = Number(option("year") ?? current.year);
  const manual = normalizeManual(option("manual")) ?? current.manual;

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("--year must be a four-digit year between 2000 and 2100.");
  }
  if (!manual.endsWith(String(year))) {
    throw new Error("The manual slug must end with the selected year.");
  }

  const contentsUrl = `${churchOrigin}/study/manual/${manual}?lang=eng`;
  console.log(`Reading ${contentsUrl}`);
  const discovered = discoverLessons(await fetchText(contentsUrl), manual);
  const lessons = await mapConcurrent(discovered, 6, async ([week, url]) => {
    console.log(`Reading week ${week}...`);
    return extractLesson(week, url, await fetchText(url));
  });

  if (new Set(lessons.map((lesson) => lesson.week)).size !== lessons.length) {
    throw new Error("The generated schedule contains duplicate weeks.");
  }
  if (lessons.some((lesson) => !lesson.title || !lesson.url)) {
    throw new Error("The generated schedule contains an incomplete lesson.");
  }

  const generated = [
    startMarker,
    "// Updated by scripts/update-come-follow-me.js from the official Church manual.",
    `const scheduleYear = ${year};`,
    `const lessons = ${JSON.stringify(lessons, null, 2)};`,
    endMarker,
  ].join("\n");
  const pattern = new RegExp(`${escapeRegex(startMarker)}[\\s\\S]*?${escapeRegex(endMarker)}`);
  if (!pattern.test(source)) throw new Error("Generated data markers are missing from the target file.");

  await writeFile(targetPath, source.replace(pattern, generated), "utf8");
  console.log(`Updated ${lessons.length} lessons in ${targetPath}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
