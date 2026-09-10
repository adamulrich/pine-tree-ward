import { normalizeRows } from "./data.js";
import { parseCsv } from "./csv.js";
import { bulletinDate, groupBulletins } from "./bulletins.js";
import { normalizeScheduleRows, scheduleHeaders } from "./schedule.js";

const sections = [
  {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBCs8631vmwVW7lFBpljj9qe6jX1ixsyBTQMGzymRQJzipcmEIJB1-fEtiFjFZkc_c4RsK88vPLclH/pub?gid=0&single=true&output=csv",
    target: "announcements-list",
    empty: "There are no current announcements.",
    error: "Announcements are temporarily unavailable.",
  },
  {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBCs8631vmwVW7lFBpljj9qe6jX1ixsyBTQMGzymRQJzipcmEIJB1-fEtiFjFZkc_c4RsK88vPLclH/pub?gid=1654438872&single=true&output=csv",
    target: "service-list",
    empty: "There are no current service opportunities.",
    error: "Service opportunities are temporarily unavailable.",
  },
  {
    url: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBCs8631vmwVW7lFBpljj9qe6jX1ixsyBTQMGzymRQJzipcmEIJB1-fEtiFjFZkc_c4RsK88vPLclH/pub?gid=1834157588&single=true&output=csv",
    target: "lessons-list",
    empty: "There are no upcoming lessons.",
    error: "The lesson schedule is temporarily unavailable.",
  },
];

const scheduleUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBCs8631vmwVW7lFBpljj9qe6jX1ixsyBTQMGzymRQJzipcmEIJB1-fEtiFjFZkc_c4RsK88vPLclH/pub?gid=97794274&single=true&output=csv";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const bulletinDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

function createItemCard(item) {
  const article = document.createElement("article");
  article.className = "item-card";

  const body = document.createElement("div");
  body.className = "item-body";

  if (item.displayDate) {
    const time = document.createElement("time");
    time.className = "item-date";
    time.dateTime = item.displayDate.toISOString().slice(0, 10);
    time.textContent = dateFormatter.format(item.displayDate);
    body.append(time);
  }

  const text = document.createElement("p");
  text.className = "item-text";
  text.textContent = item.text;
  body.append(text);
  article.append(body);

  if (item.link) {
    const link = document.createElement("a");
    link.className = "item-link";
    link.href = item.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Learn more";
    link.setAttribute("aria-label", `Learn more: ${item.text}`);
    article.append(link);
  }

  return article;
}

function showMessage(target, message, isError = false) {
  target.replaceChildren();
  const card = document.createElement("p");
  card.className = isError ? "status-card error-card" : "status-card";
  card.textContent = message;
  target.append(card);
}

function renderSection(config, rows) {
  const target = document.getElementById(config.target);
  const items = normalizeRows(rows ?? []);

  if (!items.length) {
    showMessage(target, config.empty);
    return;
  }

  target.replaceChildren(...items.map(createItemCard));
}

async function loadSection(config) {
  const target = document.getElementById(config.target);
  try {
    const response = await fetch(config.url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    renderSection(config, parseCsv(await response.text()));
  } catch (error) {
    console.error(`Could not load ${config.target}`, error);
    showMessage(target, config.error, true);
  }
}

function createBulletinLink(bulletin, label, date) {
  if (!bulletin) {
    const unavailable = document.createElement("span");
    unavailable.className = "bulletin-unavailable";
    unavailable.textContent = "Unavailable";
    return unavailable;
  }

  const link = document.createElement("a");
  link.className = "bulletin-link";
  link.href = bulletin.path.split("/").map(encodeURIComponent).join("/");
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = `${label} PDF`;
  link.setAttribute("aria-label", `Open ${label} bulletin for ${date}`);
  return link;
}

function renderBulletins(entries) {
  const target = document.getElementById("bulletins-list");
  const bulletins = groupBulletins(entries);

  if (!bulletins.length) {
    target.setAttribute("aria-busy", "false");
    showMessage(target, "There are no archived bulletins yet.");
    return;
  }

  const table = document.createElement("table");
  table.className = "bulletin-table";
  table.innerHTML = "<thead><tr><th scope=\"col\">Bulletin date</th><th scope=\"col\">Digital edition</th><th scope=\"col\">Print edition</th></tr></thead>";
  const body = document.createElement("tbody");

  for (const bulletin of bulletins) {
    const formattedDate = bulletinDateFormatter.format(bulletinDate(bulletin.date));
    const row = document.createElement("tr");
    const dateCell = document.createElement("th");
    dateCell.scope = "row";
    const time = document.createElement("time");
    time.dateTime = `${bulletin.date.slice(0, 4)}-${bulletin.date.slice(4, 6)}-${bulletin.date.slice(6, 8)}`;
    time.textContent = formattedDate;
    dateCell.append(time);

    const digitalCell = document.createElement("td");
    digitalCell.dataset.label = "Digital";
    digitalCell.append(createBulletinLink(bulletin.digital, "Digital", formattedDate));

    const printoutCell = document.createElement("td");
    printoutCell.dataset.label = "Print";
    printoutCell.append(createBulletinLink(bulletin.printout, "Print", formattedDate));

    row.append(dateCell, digitalCell, printoutCell);
    body.append(row);
  }

  table.append(body);
  target.replaceChildren(table);
  target.setAttribute("aria-busy", "false");
}

function renderSchedule(rows, now = new Date()) {
  const target = document.getElementById("schedule-list");
  const items = normalizeScheduleRows(rows, now);

  if (!items.length) {
    target.setAttribute("aria-busy", "false");
    showMessage(target, "There are no current recurring events.");
    return;
  }

  const cards = items.map((item) => {
    const occurrence = item.occurrence;
    const article = document.createElement("article");
    article.className = "item-card schedule-card";

    const body = document.createElement("div");
    body.className = "item-body";
    const time = document.createElement("time");
    time.className = "item-date";
    time.dateTime = occurrence.toISOString();
    time.textContent = `${bulletinDateFormatter.format(occurrence)} at ${occurrence.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

    const title = document.createElement("h3");
    title.className = "schedule-title";
    title.textContent = item.title;
    const description = document.createElement("p");
    description.className = "item-text";
    description.textContent = item.description;
    const recurrence = document.createElement("p");
    recurrence.className = "schedule-recurrence";
    recurrence.textContent = item.recurrence;

    body.append(time, title);
    if (item.description) body.append(description);
    body.append(recurrence);
    article.append(body);

    if (item.link) {
      const link = document.createElement("a");
      link.className = "item-link";
      link.href = item.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Details";
      link.setAttribute("aria-label", `View details: ${item.title}`);
      article.append(link);
    }
    return article;
  });

  target.replaceChildren(...cards);
  target.setAttribute("aria-busy", "false");
}

async function loadSchedule() {
  const target = document.getElementById("schedule-list");

  try {
    const response = await fetch(scheduleUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    renderSchedule(parseCsv(await response.text(), scheduleHeaders));
  } catch (error) {
    console.error("Could not load recurring schedule", error);
    target.setAttribute("aria-busy", "false");
    showMessage(target, "The recurring schedule is temporarily unavailable.", true);
  }
}

async function loadBulletins() {
  const target = document.getElementById("bulletins-list");

  try {
    const response = await fetch("bulletins/manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    renderBulletins(await response.json());
  } catch (error) {
    console.error("Could not load bulletin archive", error);
    target.setAttribute("aria-busy", "false");
    showMessage(target, "The bulletin archive is temporarily unavailable.", true);
  }
}

const menuButton = document.querySelector(".menu-button");
const siteNav = document.getElementById("site-nav");

menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  siteNav.classList.toggle("is-open", !open);
});

siteNav.addEventListener("click", (event) => {
  if (event.target instanceof HTMLAnchorElement) {
    menuButton.setAttribute("aria-expanded", "false");
    siteNav.classList.remove("is-open");
  }
});

Promise.all([...sections.map(loadSection), loadSchedule(), loadBulletins()]);
