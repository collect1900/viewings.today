const CONFIG_KEY = "veiling-kijkdagen-supabase";

function getStoredConfig() {
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
  const sameDate = start.toDateString() === end.toDateString();
  const datePart = new Intl.DateTimeFormat("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(start);
  const timeFormat = new Intl.DateTimeFormat("nl-NL", {
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
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
