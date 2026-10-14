const CONFIG_KEY = "veiling-kijkdagen-supabase";
const PUBLIC_SUPABASE_URL = "https://lxjjdzxqxrcjhblytcuf.supabase.co";
const PUBLIC_SUPABASE_KEY = "sb_publishable_9_EslvVxFcKLbo12YCZXIg_wOuz-ajX";

function getEmbeddedConfig() {
  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_KEY) return {};
  return { url: PUBLIC_SUPABASE_URL, key: PUBLIC_SUPABASE_KEY };
}

function getStoredConfig() {
  const embedded = getEmbeddedConfig();
  if (embedded.url && embedded.key) return embedded;

  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY)) || {};
  } catch {
    return {};
  }
}

function saveConfig(url, key) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ url, key }));
}

function getSupabaseClient() {
  const { url, key } = getStoredConfig();
  if (!url || !key || !window.supabase) return null;
  return window.supabase.createClient(url, key);
}

function wireConfigForm(onSaved) {
  const form = document.querySelector("#configForm");
  if (!form) return;

  const embedded = getEmbeddedConfig();
  if (embedded.url && embedded.key) {
    form.closest(".config-panel")?.classList.add("hidden");
    return;
  }

  const stored = getStoredConfig();
  form.querySelector("#supabaseUrl").value = stored.url || "";
  form.querySelector("#supabaseKey").value = stored.key || "";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const url = form.querySelector("#supabaseUrl").value.trim();
    const key = form.querySelector("#supabaseKey").value.trim();
    saveConfig(url, key);
    onSaved?.();
  });
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("nl-NL", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatViewingDayRange(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const sameDate = start.toISOString().slice(0, 10) === end.toISOString().slice(0, 10);
  const datePart = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(start);
  const timeFormat = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit"
  });

  if (sameDate) {
    return `${datePart}, ${timeFormat.format(start)} - ${timeFormat.format(end)}`;
  }

  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}

function toLocalInputValue(date) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 16);
}

// Access stores Dutch wall-clock times in the UTC fields of the database.
// Display those fields unchanged; convert to a real instant only for calendars
// and comparisons with the current time. Amsterdam supplies the DST rules.
function viewingInstant(value) {
  const wallTime = new Date(value).getTime();
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23"
  });
  let instant = wallTime;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant))
      .filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    const shown = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const correction = wallTime - shown;
    if (!correction) break;
    instant += correction;
  }
  return new Date(instant);
}
