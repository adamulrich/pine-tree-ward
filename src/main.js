import { normalizeRows } from "./data.js";
import { parseCsv } from "./csv.js";
import { bulletinDate, groupBulletins } from "./bulletins.js";
import { normalizeNewsletters } from "./newsletters.js";
import { normalizeScheduleRows, scheduleHeaders } from "./schedule.js";
import { currentComeFollowMeLesson, splitLessonTitle } from "./come-follow-me.js";

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
    toggle: "lessons-toggle",
    empty: "There are no upcoming lessons.",
    error: "The lesson schedule is temporarily unavailable.",
  },
];

const scheduleUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBCs8631vmwVW7lFBpljj9qe6jX1ixsyBTQMGzymRQJzipcmEIJB1-fEtiFjFZkc_c4RsK88vPLclH/pub?gid=97794274&single=true&output=csv";
const compactListSize = 4;

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

function hideToggle(buttonId) {
  if (!buttonId) return;
  const button = document.getElementById(buttonId);
  button.hidden = true;
  button.setAttribute("aria-expanded", "false");
}

function setupExpandableList(buttonId, total, noun, render, collapsedCount = compactListSize) {
  const button = document.getElementById(buttonId);
  let expanded = false;

  const update = () => {
    render(expanded ? total : Math.min(collapsedCount, total));
    button.hidden = total <= collapsedCount;
    button.setAttribute("aria-expanded", String(expanded));
    button.textContent = expanded ? `Show fewer ${noun}` : `Show all ${total} ${noun}`;
  };

  button.onclick = () => {
    expanded = !expanded;
    update();
  };
  update();
}

function renderSection(config, rows) {
  const target = document.getElementById(config.target);
  const items = normalizeRows(rows ?? []);

  if (!items.length) {
    hideToggle(config.toggle);
    showMessage(target, config.empty);
    return;
  }

  if (config.toggle) {
    setupExpandableList(config.toggle, items.length, "lessons", (count) => {
      target.replaceChildren(...items.slice(0, count).map(createItemCard));
    });
  } else {
    target.replaceChildren(...items.map(createItemCard));
  }
}

async function loadSection(config) {
  const target = document.getElementById(config.target);
  try {
    const response = await fetch(config.url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    renderSection(config, parseCsv(await response.text()));
  } catch (error) {
    console.error(`Could not load ${config.target}`, error);
    hideToggle(config.toggle);
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
    hideToggle("bulletins-toggle");
    target.setAttribute("aria-busy", "false");
    showMessage(target, "There are no archived bulletins yet.");
    return;
  }

  setupExpandableList("bulletins-toggle", bulletins.length, "bulletins", (count) => {
    target.replaceChildren(createBulletinTable(bulletins.slice(0, count)));
  });
  target.setAttribute("aria-busy", "false");
}

function createBulletinTable(bulletins) {
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
  return table;
}

function renderNewsletters(entries) {
  const target = document.getElementById("newsletters-list");
  const newsletters = normalizeNewsletters(entries);

  if (!newsletters.length) {
    hideToggle("newsletters-toggle");
    target.setAttribute("aria-busy", "false");
    showMessage(target, "There are no archived newsletters yet.");
    return;
  }

  setupExpandableList("newsletters-toggle", newsletters.length, "newsletters", (count) => {
    target.replaceChildren(createNewsletterTable(newsletters.slice(0, count)));
  }, 2);
  target.setAttribute("aria-busy", "false");
}

function createNewsletterTable(newsletters) {
  const table = document.createElement("table");
  table.className = "bulletin-table newsletter-table";
  table.innerHTML = "<thead><tr><th scope=\"col\">Newsletter date</th><th scope=\"col\">Newsletter</th></tr></thead>";
  const body = document.createElement("tbody");

  for (const newsletter of newsletters) {
    const formattedDate = bulletinDateFormatter.format(bulletinDate(newsletter.date));
    const row = document.createElement("tr");
    const dateCell = document.createElement("th");
    dateCell.scope = "row";
    const time = document.createElement("time");
    time.dateTime = `${newsletter.date.slice(0, 4)}-${newsletter.date.slice(4, 6)}-${newsletter.date.slice(6, 8)}`;
    time.textContent = formattedDate;
    dateCell.append(time);

    const linkCell = document.createElement("td");
    linkCell.dataset.label = "Newsletter";
    const link = document.createElement("a");
    link.className = "bulletin-link";
    link.href = newsletter.path.split("/").map(encodeURIComponent).join("/");
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open PDF";
    link.setAttribute("aria-label", `Open EQ newsletter for ${formattedDate}`);
    linkCell.append(link);

    row.append(dateCell, linkCell);
    body.append(row);
  }

  table.append(body);
  return table;
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

function renderComeFollowMe(now = new Date()) {
  const target = document.getElementById("come-follow-me-content");
  const lesson = currentComeFollowMeLesson(now);

  if (!lesson) {
    target.setAttribute("aria-busy", "false");
    showMessage(target, "The Come, Follow Me lesson for this week is not available.");
    return;
  }

  const { heading, reading } = splitLessonTitle(lesson.title);
  const article = document.createElement("article");
  article.className = "come-follow-me-card";
  const body = document.createElement("div");
  body.className = "come-follow-me-body";

  const label = document.createElement("p");
  label.className = "come-follow-me-label";
  label.textContent = "This week's lesson";

  const title = document.createElement("h3");
  const titleLink = document.createElement("a");
  titleLink.href = lesson.url;
  titleLink.target = "_blank";
  titleLink.rel = "noopener noreferrer";
  titleLink.textContent = heading;
  title.append(titleLink);

  const readings = document.createElement("p");
  readings.className = "come-follow-me-reading";
  readings.setAttribute("aria-label", "This week's scripture reading");

  if (lesson.readings.length) {
    lesson.readings.forEach((item, index) => {
      if (index) readings.append(document.createTextNode("; "));
      const link = document.createElement("a");
      link.href = item.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = item.label;
      readings.append(link);
    });
  } else {
    readings.textContent = reading;
  }

  const lessonLink = document.createElement("a");
  lessonLink.className = "come-follow-me-link";
  lessonLink.href = lesson.url;
  lessonLink.target = "_blank";
  lessonLink.rel = "noopener noreferrer";
  lessonLink.textContent = "Open this week's lesson";

  body.append(label, title, readings);
  article.append(body, lessonLink);
  target.replaceChildren(article);
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
    hideToggle("bulletins-toggle");
    target.setAttribute("aria-busy", "false");
    showMessage(target, "The bulletin archive is temporarily unavailable.", true);
  }
}

async function loadNewsletters() {
  const target = document.getElementById("newsletters-list");

  try {
    const response = await fetch("newsletters/manifest.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    renderNewsletters(await response.json());
  } catch (error) {
    console.error("Could not load newsletter archive", error);
    hideToggle("newsletters-toggle");
    target.setAttribute("aria-busy", "false");
    showMessage(target, "The newsletter archive is temporarily unavailable.", true);
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

renderComeFollowMe();
Promise.all([...sections.map(loadSection), loadSchedule(), loadBulletins(), loadNewsletters()]);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Could not register the service worker", error);
    });
  });
}
