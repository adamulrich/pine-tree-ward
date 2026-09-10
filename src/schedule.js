export const recurringScheduleItems = [
  {
    title: "Temple Session",
    description: "Monthly elders quorum temple session",
    recurrence: "Every second Saturday",
    week: 2,
    weekday: 6,
    hour: 10,
    minute: 30,
  },
];

function monthlyOccurrence(item, year, month) {
  const firstDay = new Date(year, month, 1);
  const offset = (item.weekday - firstDay.getDay() + 7) % 7;
  const day = 1 + offset + ((item.week - 1) * 7);
  return new Date(year, month, day, item.hour, item.minute);
}

export function nextOccurrence(item, now = new Date()) {
  let occurrence = monthlyOccurrence(item, now.getFullYear(), now.getMonth());

  if (occurrence < now) {
    occurrence = monthlyOccurrence(item, now.getFullYear(), now.getMonth() + 1);
  }

  return occurrence;
}
