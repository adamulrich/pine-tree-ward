import assert from "node:assert/strict";
import test from "node:test";
import { normalizeRows, parseDate } from "../src/data.js";
import { parseCsv } from "../src/csv.js";
import { bulletinDate, groupBulletins } from "../src/bulletins.js";
import { nextOccurrence, recurringScheduleItems } from "../src/schedule.js";

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

test("groups bulletin editions by date and sorts newest first", () => {
  const entries = [
    { filename: "Printout 20260823.pdf", date: "20260823", path: "bulletins/Printout 20260823.pdf" },
    { filename: "Digital 20260830.pdf", date: "20260830", path: "bulletins/Digital 20260830.pdf" },
    { filename: "Digital 20260823.pdf", date: "20260823", path: "bulletins/Digital 20260823.pdf" },
    { filename: "Printout 20260830.pdf", date: "20260830", path: "bulletins/Printout 20260830.pdf" },
  ];

  const grouped = groupBulletins(entries);
  assert.deepEqual(grouped.map((item) => item.date), ["20260830", "20260823"]);
  assert.equal(grouped[0].digital.filename, "Digital 20260830.pdf");
  assert.equal(grouped[0].printout.filename, "Printout 20260830.pdf");
});

test("ignores malformed bulletin entries and preserves an incomplete date", () => {
  const grouped = groupBulletins([
    { filename: "Digital 20260230.pdf", date: "20260230", path: "bulletins/Digital 20260230.pdf" },
    { filename: "Digital 20260906.pdf", date: "20260906", path: "bulletins/Digital 20260906.pdf" },
    { filename: "Unexpected.pdf", date: "20260906", path: "bulletins/Unexpected.pdf" },
  ]);

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].digital.filename, "Digital 20260906.pdf");
  assert.equal(grouped[0].printout, null);
  assert.equal(bulletinDate("20260906").getMonth(), 8);
});

test("rejects a bulletin manifest that is not an array", () => {
  assert.throws(() => groupBulletins({}), /must be an array/i);
});

test("finds the second Saturday in the current month", () => {
  const templeSession = recurringScheduleItems[0];
  const occurrence = nextOccurrence(templeSession, new Date(2026, 8, 1, 9));

  assert.equal(occurrence.getFullYear(), 2026);
  assert.equal(occurrence.getMonth(), 8);
  assert.equal(occurrence.getDate(), 12);
  assert.equal(occurrence.getHours(), 10);
  assert.equal(occurrence.getMinutes(), 30);
});

test("moves a recurring item to next month after its scheduled time", () => {
  const templeSession = recurringScheduleItems[0];
  const occurrence = nextOccurrence(templeSession, new Date(2026, 8, 12, 10, 31));

  assert.equal(occurrence.getMonth(), 9);
  assert.equal(occurrence.getDate(), 10);
});
