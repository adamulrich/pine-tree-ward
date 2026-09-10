export function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value;
  if (typeof value === "string" && value.trim()) {
    const isoDate = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
    if (isoDate) return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
    const parts = value.trim().match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);
    if (parts) {
      const year = parts[3].length === 2 ? 2000 + Number(parts[3]) : Number(parts[3]);
      return new Date(year, Number(parts[1]) - 1, Number(parts[2]));
    }
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.valueOf())) return parsed;
  }
  return null;
}

function endOfDay(date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function normalizeRows(rows, now = new Date()) {
  return rows
    .map((row) => ({
      displayDate: parseDate(row["Display Date"]),
      expiresOn: parseDate(row["Expires On"]),
      text: String(row.Text ?? "").trim(),
      link: String(row.Link ?? "").trim(),
    }))
    .filter((item) => item.text && item.expiresOn && endOfDay(item.expiresOn) >= now)
    .sort((a, b) => {
      if (!a.displayDate && !b.displayDate) return 0;
      if (!a.displayDate) return 1;
      if (!b.displayDate) return -1;
      return a.displayDate - b.displayDate;
    });
}
