import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRows, parseDate } from "../src/data.js";
import { parseCsv } from "../src/csv.js";

test("parses spreadsheet dates", () => {
  assert.equal(parseDate("09/13/2026").getFullYear(), 2026);
  assert.equal(parseDate("9/13/26").getMonth(), 8);
  assert.equal(parseDate("2026-09-13T00:00:00.000Z").getDate(), 13);
  assert.equal(parseDate("") , null);
});

test("keeps an item through its expiration day and removes older rows", () => {
  const rows = [
    { "Display Date": "09/08/2026", "Expires On": "09/08/2026", Text: "Visible today", Link: "" },
    { "Display Date": "09/07/2026", "Expires On": "09/07/2026", Text: "Expired", Link: "" },
  ];
  const items = normalizeRows(rows, new Date(2026, 8, 8, 12));
  assert.deepEqual(items.map((item) => item.text), ["Visible today"]);
});

test("requires text and an expiration date and sorts by display date", () => {
  const rows = [
    { "Display Date": "09/20/2026", "Expires On": "09/30/2026", Text: "Second", Link: "" },
    { "Display Date": "09/10/2026", "Expires On": "09/30/2026", Text: "First", Link: "https://example.org" },
    { "Display Date": "09/01/2026", "Expires On": "", Text: "Missing expiry", Link: "" },
  ];
  const items = normalizeRows(rows, new Date(2026, 8, 8));
  assert.deepEqual(items.map((item) => item.text), ["First", "Second"]);
  assert.equal(items[0].link, "https://example.org");
});

test("parses quoted CSV fields containing commas and line breaks", () => {
  const csv = 'Display Date,Expires On,Text,Link\r\n09/13/2026,09/14/2026,"Bring gloves, rakes, and bags.","https://example.org/a,b"\r\n09/20/2026,09/20/2026,"Two-line\nannouncement",';
  const rows = parseCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].Text, "Bring gloves, rakes, and bags.");
  assert.equal(rows[0].Link, "https://example.org/a,b");
  assert.equal(rows[1].Text, "Two-line\nannouncement");
});

test("rejects a CSV feed with missing required columns", () => {
  assert.throws(() => parseCsv("Display Date,Text\n09/13/2026,Hello"), /missing columns/i);
});
