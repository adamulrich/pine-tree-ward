const BULLETIN_TYPES = ["Digital", "Printout"];

function isValidDate(value) {
  if (!/^\d{8}$/.test(value)) return false;

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day;
}

function getBulletinType(filename) {
  return BULLETIN_TYPES.find((type) => filename.startsWith(`${type} `)) ?? null;
}

export function groupBulletins(entries) {
  if (!Array.isArray(entries)) throw new TypeError("The bulletin manifest must be an array.");

  const grouped = new Map();

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;

    const filename = String(entry.filename ?? "").trim();
    const date = String(entry.date ?? "").trim();
    const path = String(entry.path ?? "").trim();
    const type = getBulletinType(filename);

    if (!isValidDate(date)
      || !type
      || filename !== `${type} ${date}.pdf`
      || path !== `bulletins/${filename}`) continue;

    if (!grouped.has(date)) grouped.set(date, { date, digital: null, printout: null });
    grouped.get(date)[type.toLowerCase()] = { filename, path };
  }

  return [...grouped.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export function bulletinDate(date) {
  return new Date(
    Number(date.slice(0, 4)),
    Number(date.slice(4, 6)) - 1,
    Number(date.slice(6, 8)),
  );
}
