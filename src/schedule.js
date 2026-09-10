import { parseDate } from "./data.js";

export const scheduleHeaders = [
  "Title",
  "Description",
  "Frequency",
  "Week of Month",
  "Day of Week",
  "Time",
  "Starts On",
  "Expires On",
  "Link",
];

const weekdayNumbers = new Map([
  ["sunday", 0],
  ["monday", 1],
  ["tuesday", 2],
  ["wednesday", 3],
  ["thursday", 4],
  ["friday", 5],
  ["saturday", 6],
]);

const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ordinals = ["", "first", "second", "third", "fourth", "fifth"];

function parseTime(value) {
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minute > 59 || (meridiem && (hour < 1 || hour > 12)) || (!meridiem && hour > 23)) return null;
  if (meridiem === "AM" && hour === 12) hour = 0;
  if (meridiem === "PM" && hour !== 12) hour += 12;
  return { hour, minute };
}

function parseWeekdays(value) {
  const days = String(value).split(",").map((day) => weekdayNumbers.get(day.trim().toLowerCase()));
  return days.length && days.every((day) => day !== undefined) ? [...new Set(days)] : [];
}

function endOfDay(date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function monthlyOccurrence(item, year, month) {
  const firstDay = new Date(year, month, 1);
  const offset = (item.weekday - firstDay.getDay() + 7) % 7;
  const day = 1 + offset + ((item.week - 1) * 7);
  return new Date(year, month, day, item.hour, item.minute);
}

export function nextOccurrence(item, now = new Date()) {
  const startsOn = item.startsOn && item.startsOn > now ? item.startsOn : now;
  let occurrence;

  if (item.frequency === "monthly") {
    occurrence = monthlyOccurrence(item, startsOn.getFullYear(), startsOn.getMonth());

    if (occurrence < startsOn) {
      occurrence = monthlyOccurrence(item, startsOn.getFullYear(), startsOn.getMonth() + 1);
    }
  } else if (item.frequency === "weekly") {
    occurrence = item.weekdays.reduce((soonest, weekday) => {
      const candidate = new Date(startsOn);
      candidate.setHours(item.hour, item.minute, 0, 0);
      candidate.setDate(candidate.getDate() + ((weekday - candidate.getDay() + 7) % 7));
      if (candidate < startsOn) candidate.setDate(candidate.getDate() + 7);
      return !soonest || candidate < soonest ? candidate : soonest;
    }, null);
  }

  if (!occurrence || (item.expiresOn && occurrence > endOfDay(item.expiresOn))) return null;
  return occurrence;
}

function joinWeekdays(weekdays) {
  const names = weekdays.map((day) => weekdayNames[day]);
  if (names.length < 2) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

export function normalizeScheduleRows(rows, now = new Date()) {
  return rows.map((row) => {
    const title = String(row.Title ?? "").trim();
    const description = String(row.Description ?? "").trim();
    const frequency = String(row.Frequency ?? "").trim().toLowerCase();
    const week = Number(row["Week of Month"]);
    const weekdays = parseWeekdays(row["Day of Week"]);
    const time = parseTime(row.Time);
    const startsOn = parseDate(row["Starts On"]);
    const expiresOn = parseDate(row["Expires On"]);
    const link = String(row.Link ?? "").trim();

    if (!title || !time || !weekdays.length) return null;
    if (frequency === "monthly" && (!Number.isInteger(week) || week < 1 || week > 5 || weekdays.length !== 1)) return null;
    if (frequency !== "monthly" && frequency !== "weekly") return null;

    const item = {
      title,
      description,
      frequency,
      week,
      weekday: weekdays[0],
      weekdays,
      hour: time.hour,
      minute: time.minute,
      startsOn,
      expiresOn,
      link,
    };
    const occurrence = nextOccurrence(item, now);
    if (!occurrence) return null;

    return {
      ...item,
      occurrence,
      recurrence: frequency === "monthly"
        ? `Every ${ordinals[week]} ${weekdayNames[weekdays[0]]}`
        : `Every ${joinWeekdays(weekdays)}`,
    };
  }).filter(Boolean).sort((a, b) => a.occurrence - b.occurrence || a.title.localeCompare(b.title));
}
