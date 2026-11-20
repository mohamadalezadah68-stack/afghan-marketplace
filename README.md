# Afghan Marketplace

A responsive weather dashboard with live current conditions, an hourly forecast, and a 7-day outlook. Search for a city or allow location access to see local weather; switch between Celsius and Fahrenheit at any time.

## Run locally

Open `index.html` in a browser or serve this directory with any static web server. The dashboard needs an internet connection to fetch weather and optional Google Fonts. No API key or build step is required.

## Weather data

Forecasts and city search are provided by the free [Open-Meteo API](https://open-meteo.com/). Browser location is optional; Kabul is loaded by default.

## Files

- `index.html` — accessible dashboard structure
- `styles.css` — responsive dashboard styling
- `app.js` — city search, location, unit conversion, and forecast rendering
