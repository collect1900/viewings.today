const map = L.map("map", { scrollWheelZoom: true }).setView([52.1326, 5.2913], 7);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const markers = L.layerGroup().addTo(map);
const weekInput = document.querySelector("#weekInput");
const weekRangeText = document.querySelector("#weekRangeText");
const weekError = document.querySelector("#weekError");
const prevWeekButton = document.querySelector("#prevWeekButton");
const nextWeekButton = document.querySelector("#nextWeekButton");
const houseList = document.querySelector("#houseList");
const resultCount = document.querySelector("#resultCount");
const setupNotice = document.querySelector("#setupNotice");

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-ics]");
  if (!button) return;
  downloadIcs(JSON.parse(decodeURIComponent(button.dataset.ics)));
});

wireConfigForm(loadViewingDays);
const currentWeekValue = dateToWeekValue(new Date());
const minWeekValue = addWeeks(currentWeekValue, -2);
const maxWeekValue = addWeeks(currentWeekValue, 4);
setDefaultWeek();
bindWeekStep(prevWeekButton, -1);
bindWeekStep(nextWeekButton, 1);
updateWeekLabel();
loadViewingDays();

function setDefaultWeek() {
  weekInput.value = currentWeekValue;
}

function getWeekRange(weekValue) {
  const { year, week } = parseWeekValue(weekValue) || parseWeekValue(dateToWeekValue(new Date()));
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const day = simple.getUTCDay();
  const monday = simple;
  if (day <= 4) monday.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
  else monday.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
  const end = new Date(monday);
  end.setUTCDate(monday.getUTCDate() + 7);
  return { start: monday.toISOString(), end: end.toISOString() };
}

function moveWeek(direction) {
  const nextWeek = addWeeks(weekInput.value, direction);
  if (!isWeekWithinBounds(nextWeek)) {
    showWeekError(direction < 0
      ? "Je kunt maximaal 2 weken terug kiezen."
      : "Je kunt maximaal 4 weken vooruit kiezen.");
    return;
  }

  weekInput.value = nextWeek;
  clearWeekError();
  updateWeekLabel();
  loadViewingDays();
}

function bindWeekStep(button, direction) {
  let handledTouch = false;

  button.addEventListener("touchend", (event) => {
    event.preventDefault();
    handledTouch = true;
    moveWeek(direction);
    window.setTimeout(() => {
      handledTouch = false;
    }, 500);
  }, { passive: false });

  button.addEventListener("click", () => {
    if (handledTouch) return;
    moveWeek(direction);
  });
}

function updateWeekLabel() {
  const { start, end } = getWeekRange(weekInput.value);
  const startDate = new Date(start);
  const endDate = new Date(end);
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  const rangeFormat = new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short"
  });
  const rangeText = `${rangeFormat.format(startDate)} t/m ${rangeFormat.format(endDate)}`;
  weekRangeText.textContent = rangeText;
  prevWeekButton.classList.toggle("is-limit", !isWeekWithinBounds(addWeeks(weekInput.value, -1)));
  nextWeekButton.classList.toggle("is-limit", !isWeekWithinBounds(addWeeks(weekInput.value, 1)));
}

function dateToWeekValue(date) {
  const current = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = current.getUTCDay() || 7;
  current.setUTCDate(current.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(current.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((current - yearStart) / 86400000) + 1) / 7);
  return `${current.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function parseWeekValue(value) {
  const match = String(value || "").match(/^(\d{4})-W(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), week: Number(match[2]) };
}

function addWeeks(weekValue, amount) {
  const { start } = getWeekRange(weekValue);
  const next = new Date(start);
  next.setUTCDate(next.getUTCDate() + amount * 7);
  return dateToWeekValue(next);
}

function isWeekWithinBounds(weekValue) {
  return weekStartTime(weekValue) >= weekStartTime(minWeekValue)
    && weekStartTime(weekValue) <= weekStartTime(maxWeekValue);
}

function weekStartTime(weekValue) {
  return new Date(getWeekRange(weekValue).start).getTime();
}

function showWeekError(message) {
  weekError.textContent = message;
}

function clearWeekError() {
  weekError.textContent = "";
}

async function loadViewingDays() {
  const client = getSupabaseClient();
  setupNotice.classList.toggle("hidden", Boolean(client));
  if (!client) {
    render([]);
    return;
  }

  const { start, end } = getWeekRange(weekInput.value);
  const { data, error } = await client
    .from("viewing_days")
    .select(`
      id,
      starts_at,
      ends_at,
      note,
      auctions (
        id,
        title,
        url,
        image_url,
        auction_houses (
          id,
          name,
          address,
          city,
          website,
          image_url,
          latitude,
          longitude
        )
      )
    `)
    .gte("starts_at", start)
    .lt("starts_at", end)
    .order("starts_at", { ascending: true });

  if (error) {
    houseList.innerHTML = `<p class="empty">Kon kijkdagen niet laden: ${escapeHtml(error.message)}</p>`;
    markers.clearLayers();
    resultCount.textContent = "0";
    return;
  }

  render(groupByHouse(data || []));
}

function groupByHouse(viewingDays) {
  const houses = new Map();
  for (const day of viewingDays) {
    const auction = day.auctions;
    const house = auction?.auction_houses;
    if (!house) continue;

    if (!houses.has(house.id)) {
      houses.set(house.id, { ...house, auctions: new Map() });
    }
    const groupedHouse = houses.get(house.id);
    if (!groupedHouse.auctions.has(auction.id)) {
      groupedHouse.auctions.set(auction.id, { ...auction, viewingDays: [] });
    }
    groupedHouse.auctions.get(auction.id).viewingDays.push(day);
  }

  return [...houses.values()].map((house) => ({
    ...house,
    auctions: [...house.auctions.values()]
  }));
}

function render(houses) {
  markers.clearLayers();
  resultCount.textContent = String(houses.length);
  houseList.innerHTML = houses.length ? "" : `<p class="empty">Geen kijkdagen gevonden voor deze week.</p>`;

  const bounds = [];
  for (const house of houses) {
    const popup = renderPopup(house);
    const marker = L.marker([house.latitude, house.longitude]).bindPopup(popup, { maxWidth: 380 });
    marker.addTo(markers);
    bounds.push([house.latitude, house.longitude]);
    houseList.appendChild(renderHouseCard(house));
  }

  if (bounds.length) map.fitBounds(bounds, { padding: [36, 36], maxZoom: 12 });
}

function renderPopup(house) {
  return `
    <div class="popup">
      ${imageHtml(house.image_url, house.name, "popup-image")}
      <h3>${escapeHtml(house.name)}</h3>
      <p>${escapeHtml([house.address, house.city].filter(Boolean).join(", "))}</p>
      ${house.auctions.map(renderAuctionHtml).join("")}
    </div>
  `;
}

function renderAuctionHtml(auction) {
  return `
    <section class="popup-auction">
      ${imageHtml(auction.image_url, auction.title, "auction-image")}
      <h4>${escapeHtml(auction.title)}</h4>
      ${auction.viewingDays.map((day) => `
        <div class="viewing-row">
          <span>${formatViewingDayRange(day.starts_at, day.ends_at)}</span>
          <button class="calendar-button" type="button" aria-label="Zet in mijn agenda" title="Zet in mijn agenda" data-ics="${encodeURIComponent(JSON.stringify({
            title: auction.title,
            starts_at: day.starts_at,
            ends_at: day.ends_at,
            location: "",
            note: day.note || ""
          }))}">${calendarIcon()}</button>
        </div>
      `).join("")}
    </section>
  `;
}

function renderHouseCard(house) {
  const article = document.createElement("article");
  article.className = "house-card";
  article.innerHTML = `
    <div class="house-card-head">
      ${imageHtml(house.image_url, house.name, "house-image")}
      <div>
        <h3>${escapeHtml(house.name)}</h3>
        <p>${escapeHtml([house.address, house.city].filter(Boolean).join(", "))}</p>
      </div>
    </div>
    ${house.auctions.map((auction) => `
      <section>
        <div class="auction-title-row">
          ${imageHtml(auction.image_url, auction.title, "auction-thumb")}
          <h4>${escapeHtml(auction.title)}</h4>
        </div>
        ${auction.viewingDays.map((day) => `
          <div class="viewing-row">
            <span>${formatViewingDayRange(day.starts_at, day.ends_at)}</span>
            <button class="calendar-button" type="button" aria-label="Zet in mijn agenda" title="Zet in mijn agenda">${calendarIcon()}</button>
          </div>
        `).join("")}
      </section>
    `).join("")}
  `;

  article.querySelectorAll("button").forEach((button, index) => {
    const days = house.auctions.flatMap((auction) => auction.viewingDays.map((day) => ({ auction, day })));
    const { auction, day } = days[index];
    button.addEventListener("click", () => downloadIcs({
      title: auction.title,
      starts_at: day.starts_at,
      ends_at: day.ends_at,
      location: [house.address, house.city].filter(Boolean).join(", "),
      note: day.note || ""
    }));
  });
  return article;
}

function downloadIcs(event) {
  const title = `Kijkdag: ${event.title}`;
  const uid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const content = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Veiling Kijkdagen//MVP//NL",
    "BEGIN:VEVENT",
    `UID:${uid}@veiling-kijkdagen`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(new Date(event.starts_at))}`,
    `DTEND:${icsDate(new Date(event.ends_at))}`,
    `SUMMARY:${icsEscape(title)}`,
    `LOCATION:${icsEscape(event.location || "")}`,
    `DESCRIPTION:${icsEscape(event.note || title)}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${slugify(title)}.ics`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function icsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsEscape(value) {
  return String(value).replace(/[\\;,]/g, "\\$&").replace(/\n/g, "\\n");
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function calendarIcon() {
  return `
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M8 2v4"></path>
      <path d="M16 2v4"></path>
      <path d="M3 10h18"></path>
      <rect x="4" y="5" width="16" height="17" rx="2"></rect>
      <path d="M8 14h.01"></path>
      <path d="M12 14h.01"></path>
      <path d="M16 14h.01"></path>
      <path d="M8 18h.01"></path>
      <path d="M12 18h.01"></path>
    </svg>
  `;
}

function imageHtml(url, alt, className) {
  if (!url) return "";
  return `<img class="${className}" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy">`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}
