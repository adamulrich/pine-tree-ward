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

export function normalizeNewsletters(entries) {
  if (!Array.isArray(entries)) throw new TypeError("The newsletter manifest must be an array.");

  const newslettersByPath = new Map();

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;

    const filename = String(entry.filename ?? "").trim();
    const date = String(entry.date ?? "").trim();
    const path = String(entry.path ?? "").trim();

    if (!isValidDate(date)
      || !filename.toLowerCase().endsWith(".pdf")
      || path !== `newsletters/${filename}`) continue;

    newslettersByPath.set(path, { filename, date, path });
  }

  return [...newslettersByPath.values()].sort((a, b) => {
    const dateOrder = b.date.localeCompare(a.date);
    return dateOrder || a.filename.localeCompare(b.filename);
  });
}
