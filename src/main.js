import { normalizeRows } from "./data.js";
import { parseCsv } from "./csv.js";

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

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
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

Promise.all(sections.map(loadSection));
