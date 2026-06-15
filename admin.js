const setupNotice = document.querySelector("#setupNotice");
const houseForm = document.querySelector("#houseForm");
const auctionForm = document.querySelector("#auctionForm");
const viewingDayForm = document.querySelector("#viewingDayForm");
const recentList = document.querySelector("#recentList");
const adminStatus = document.querySelector("#adminStatus");
const refreshButton = document.querySelector("#refreshButton");

wireConfigForm(refreshAdmin);
refreshButton.addEventListener("click", refreshAdmin);

houseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await insertRow("auction_houses", formPayload(houseForm, ["latitude", "longitude"]));
  houseForm.reset();
  await refreshAdmin();
});

auctionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await insertRow("auctions", formPayload(auctionForm));
  auctionForm.reset();
  await refreshAdmin();
});

viewingDayForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await insertRow("viewing_days", formPayload(viewingDayForm));
  viewingDayForm.reset();
  await refreshAdmin();
});

refreshAdmin();

function formPayload(form, numericFields = []) {
  const payload = Object.fromEntries(new FormData(form).entries());
  for (const key of Object.keys(payload)) {
    if (payload[key] === "") payload[key] = null;
    if (payload[key] && key.endsWith("_at")) payload[key] = new Date(payload[key]).toISOString();
    if (numericFields.includes(key)) payload[key] = Number(payload[key]);
  }
  return payload;
}

async function insertRow(table, payload) {
  const client = getSupabaseClient();
  if (!client) return showStatus("Vul eerst de Supabase instellingen in.", true);

  const { error } = await client.from(table).insert(payload);
  if (error) return showStatus(error.message, true);
  showStatus("Opgeslagen.");
}

async function refreshAdmin() {
  const client = getSupabaseClient();
  setupNotice.classList.toggle("hidden", Boolean(client));
  if (!client) {
    recentList.innerHTML = "";
    return;
  }

  const [{ data: houses }, { data: auctions }, { data: days, error }] = await Promise.all([
    client.from("auction_houses").select("*").order("name"),
    client.from("auctions").select("*, auction_houses(name)").order("created_at", { ascending: false }),
    client.from("viewing_days").select("*, auctions(title, image_url, auction_houses(name, image_url))").order("starts_at", { ascending: false }).limit(12)
  ]);

  if (error) showStatus(error.message, true);
  fillSelect(houseForm.querySelector("select"), houses || [], "id", "name");
  fillSelect(auctionForm.querySelector("select"), houses || [], "id", "name");
  fillSelect(viewingDayForm.querySelector("select"), auctions || [], "id", "title");
  renderRecent(days || []);
}

function fillSelect(select, rows, valueKey, labelKey) {
  if (!select) return;
  select.innerHTML = `<option value="">Kies...</option>` + rows
    .map((row) => `<option value="${row[valueKey]}">${escapeHtml(row[labelKey])}</option>`)
    .join("");
}

function renderRecent(days) {
  recentList.innerHTML = days.length ? "" : `<p class="empty">Nog geen kijkdagen ingevoerd.</p>`;
  for (const day of days) {
    const item = document.createElement("article");
    item.className = "recent-item";
    item.innerHTML = `
      <div class="recent-row">
        ${imageHtml(day.auctions?.image_url || day.auctions?.auction_houses?.image_url, day.auctions?.title || "Veiling", "recent-thumb")}
        <div>
          <strong>${escapeHtml(day.auctions?.title || "Veiling")}</strong>
          <span>${escapeHtml(day.auctions?.auction_houses?.name || "")}</span>
          <span>${formatViewingDayRange(day.starts_at, day.ends_at)}</span>
        </div>
      </div>
    `;
    recentList.appendChild(item);
  }
}

function showStatus(message, isError = false) {
  adminStatus.textContent = message;
  adminStatus.classList.toggle("error", isError);
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
