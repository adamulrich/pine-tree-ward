const requiredHeaders = ["Display Date", "Expires On", "Text", "Link"];

function parseRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (quoted) throw new Error("CSV contains an unclosed quoted field");
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function parseCsv(text) {
  const [headerRow = [], ...dataRows] = parseRows(text);
  const headers = headerRow.map((header, index) => (index === 0 ? header.replace(/^\uFEFF/, "") : header).trim());
  const missing = requiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`CSV is missing columns: ${missing.join(", ")}`);

  return dataRows
    .filter((row) => row.some((value) => value.trim()))
    .map((row) => Object.fromEntries(requiredHeaders.map((header) => [header, row[headers.indexOf(header)]?.trim() ?? ""])));
}
