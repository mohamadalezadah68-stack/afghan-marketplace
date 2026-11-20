const API_BASE = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_BASE = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_FIELDS = "current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max";

const elements = {
  form: document.querySelector("#search-form"),
  search: document.querySelector("#city-search"),
  locationButton: document.querySelector("#location-button"),
  status: document.querySelector("#status"),
  placeName: document.querySelector("#place-name"),
  placeDetail: document.querySelector("#place-detail"),
  updatedAt: document.querySelector("#updated-at"),
  currentIcon: document.querySelector("#current-icon"),
  currentTemperature: document.querySelector("#current-temperature"),
  currentDescription: document.querySelector("#current-description"),
  feelsLike: document.querySelector("#feels-like"),
  wind: document.querySelector("#wind-value"),
  humidity: document.querySelector("#humidity-value"),
  precipitation: document.querySelector("#precipitation-value"),
  uv: document.querySelector("#uv-value"),
  hourly: document.querySelector("#hourly-forecast"),
  daily: document.querySelector("#daily-forecast"),
};

let currentUnit = "celsius";
let latestForecast = null;
let latestPlace = null;

function weatherInfo(code, isDay = true) {
  if (code === 0) return { label: isDay ? "Clear sky" : "Clear night", icon: isDay ? "☀️" : "🌙" };
  if (code === 1) return { label: "Mostly clear", icon: isDay ? "🌤️" : "🌙" };
  if (code === 2) return { label: "Partly cloudy", icon: "⛅" };
  if (code === 3) return { label: "Overcast", icon: "☁️" };
  if ([45, 48].includes(code)) return { label: "Foggy", icon: "🌫️" };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "Drizzle", icon: "🌦️" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "Rain", icon: "🌧️" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Snow", icon: "🌨️" };
  if ([сode = 95, 96, 99].includes(code)) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "Variable conditions", icon: "🌥️" };
}

function setStatus(message, isError = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("is-error", isError);
}

function toDisplayTemperature(celsius) {
  const value = currentUnit === "fahrenheit" ? (celsius * 9) / 5 + 32 : celsius;
  return `${Math.round(value)}°`;
}

function unitSuffix() {
  return currentUnit === "fahrenheit" ? "°F" : "°C";
}

function makeForecastCard(className, children) {
  const card = document.createElement("article");
  card.className = className;
  for (const child of children) card.append(child);
  return card;
}

function makeText(className, text, tagName = "p") {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text;
  return node;
}

function renderForecast() {
  if (!latestForecast) return;
  const { current, hourly, daily } = latestForecast;
  const place = latestPlace;
  const currentWeather = weatherInfo(current.weather_code, current.is_day === 1);

  elements.placeName.textContent = place.name;
  elements.placeDetail.textContent = [place.admin1, place.country].filter(Boolean).join(" · ") || "Local forecast";
  elements.updatedAt.textContent = `Local time · ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: place.timezone }).format(new Date(current.time))}`;
  elements.currentIcon.textContent = currentWeather.icon;
  elements.currentDescription.textContent = currentWeather.label;
  elements.currentTemperature.textContent = Math.round(current.temperature_2m);
  elements.feelsLike.textContent = toDisplayTemperature(current.apparent_temperature);
  elements.wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  elements.humidity.textContent = `${current.relative_humidity_2m}%`;
  elements.precipitation.textContent = `${current.precipitation} mm`;
  elements.uv.textContent = `${daily.uv_index_max[0]}`;

  const now = new Date(current.time);
  const hourItems = hourly.time.map((time, index) => ({ time: new Date(time), index }))
    .filter(({ time }) => time >= now)
    .slice(0, 24);
  elements.hourly.replaceChildren(...hourItems.map(({ time, index }) => {
    const weather = weatherInfo(hourly.weather_code[index], time.getHours() >= 6 && time.getHours() < 18);
    const label = index === hourItems[0]?.index ? "Now" : new Intl.DateTimeFormat(undefined, { hour: "numeric", timeZone: place.timezone }).format(time);
    const rain = hourly.precipitation_probability[index];
    return makeForecastCard("hour-card", [
      makeText("hour-label", label),
      makeText("hour-icon", weather.icon, "span"),
      makeText("hour-temperature", toDisplayTemperature(hourly.temperature_2m[index])),
      makeText("hour-rain", `☂ ${rain ?? 0}%`),
    ]);
  }));

  elements.daily.replaceChildren(...daily.time.map((date, index) => {
    const day = new Date(`${date}T12:00:00`);
    const label = index === 0 ? "Today" : new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: place.timezone }).format(day);
    const weather = weatherInfo(daily.weather_code[index]);
    return makeForecastCard("day-row", [
      makeText("day-name", label),
      makeText("day-icon", weather.icon, "span"),
      makeText("day-condition", weather.label),
      makeText("day-low", toDisplayTemperature(daily.temperature_2m_min[index])),
      makeText("day-high", toDisplayTemperature(daily.temperature_2m_max[index])),
    ]);
  }));
}

async function getForecast(place) {
  latestPlace = place;
  setStatus(`Getting the forecast for ${place.name}…`);
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    ...Object.fromEntries(FORECAST_FIELDS.split("&").map((field) => field.split("="))),
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
    timezone: place.timezone || "auto",
    forecast_days: "7",
  });

  try {
    const response = await fetch(`${API_BASE}?${params}`);
    if (!response.ok) throw new Error(`Weather service returned ${response.status}`);
    latestForecast = await response.json();
    renderForecast();
    setStatus("Forecast updated just now.");
  } catch (error) {
    console.error("Could not load forecast:", error);
    setStatus("We couldn't load the weather. Check your connection and try again.", true);
  }
}

async function searchCity(city) {
  const query = city.trim();
  if (!query) return;
  setStatus(`Searching for ${query}…`);
  elements.form.querySelector("button").disabled = true;
  try {
    const params = new URLSearchParams({ name: query, count: "1", language: "en", format: "json" });
    const response = await fetch(`${GEOCODING_BASE}?${params}`);
    if (!response.ok) throw new Error(`Location service returned ${response.status}`);
    const data = await response.json();
    if (!data.results?.length) {
      setStatus(`No city found for “${query}”. Try another name.`, true);
      return;
    }
    await getForecast(data.results[0]);
  } catch (error) {
    console.error("Could not search city:", error);
    setStatus("We couldn't search for that city. Check your connection and try again.", true);
  } finally {
    elements.form.querySelector("button").disabled = false;
  }
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    setStatus("Location isn't available in this browser. Search for a city instead.", true);
    return;
  }
  elements.locationButton.disabled = true;
  setStatus("Finding your location…");
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    await getForecast({
      name: "Your location",
      admin1: "",
      country: "",
      latitude: coords.latitude,
      longitude: coords.longitude,
      timezone: "auto",
    });
    elements.locationButton.disabled = false;
  }, (error) => {
    elements.locationButton.disabled = false;
    const message = error.code === error.PERMISSION_DENIED
      ? "Location access was denied. Search for a city instead."
      : "Couldn't determine your location. Search for a city instead.";
    setStatus(message, true);
  }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
}

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  searchCity(elements.search.value);
});
elements.locationButton.addEventListener("click", useCurrentLocation);
document.querySelectorAll(".unit-button").forEach((button) => {
  button.addEventListener("click", () => {
    currentUnit = button.dataset.unit;
    document.querySelectorAll(".unit-button").forEach((unitButton) => {
      const active = unitButton === button;
      unitButton.classList.toggle("is-active", active);
      unitButton.setAttribute("aria-pressed", String(active));
    });
    renderForecast();
  });
});

searchCity("Kabul");
