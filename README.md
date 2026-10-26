# PuntMe

**Find someone for any job.** Search a job, like *window cleaner*, *plumber* or *dog groomer*, and PuntMe lists the local people and businesses who do it. Each listing comes from their **Google Business Profile** and shows the rating, reviews, opening hours, phone number, website and directions.

PuntMe is a mobile web app built with **React + Vite**. It has a clean, light design with white cards, DM Sans and Space Grotesk type, and a blue accent.

---

## Features

- 🔍 **Search any job.** Type anything, tap a quick search, or browse by job.
- 🗺️ **Around you.** A Google map of people who do the job you last searched for, plus the top rated near you.
- 🏢 **Google Business listings.** Real businesses with ratings, reviews, photos, opening hours, phone and website.
- 🎛️ **Filters and sorting.** *Open now*, *4.5+ stars* and *Within 5 km*. Sort by best match, top rated or nearest.
- 📄 **Business page.** Call, WhatsApp, route and website buttons, a live map, opening hours, Google reviews and an **Ask for a quote** button that opens WhatsApp with a message ready to send.
- 💬 **WhatsApp.** Shown for South African mobile numbers (+27 6x, 7x and 8x). Google doesn't say which numbers use WhatsApp, so landlines don't get the button.
- 🔖 **Saved list.** Keep the people you like. Only Google's place ID is stored; details load fresh each time.
- 📍 **Your area.** Search any real South African suburb or town as you type, or use your phone's GPS, which names your suburb (e.g. *Sandown, Sandton*). Your area is remembered.
- 🕘 **Recent searches and suggestions.** Your last searches are one tap away, and matching jobs appear as you type.
- 📱 **Feels like a real app.** The phone's back button and back swipe work, screens slide in and out, lists keep their scroll position, and buttons react the moment you press them.
- 📲 **Install it.** Add to Home Screen gives a proper icon, full screen and the notch handled. After the first visit it opens even with no signal.
- 📤 **Share.** Send a business to someone with the phone's share sheet (or copy the link).

## Quick start

You need [Node.js](https://nodejs.org) 20.19 or newer.

```bash
npm install
npm run dev
```

Open the address that's printed (usually http://localhost:5173).

**On your phone:** connect it to the same Wi-Fi as your computer and open the **Network** address that Vite prints, for example `http://192.168.1.20:5173`.

Until you add a Google API key, PuntMe runs on **demo data** so you can try every screen. Demo businesses have no phone numbers, because a made-up number could belong to a real person, so their Call and WhatsApp buttons explain that instead of dialling.

## Connect Google Business listings

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a project. Billing must be turned on, but Google gives you a monthly free allowance.
2. Enable these three APIs:
   - **Maps JavaScript API**
   - **Places API (New)**
   - **Maps Embed API**, for the maps on Discover and business pages. It's free with no usage limit.
3. Go to **APIs & Services → Credentials → Create credentials → API key**.
4. **Restrict the key.** This step is important because the key is visible in the browser.
   - *Application restrictions* → **Websites**. Add `http://localhost:5173/*` and your real domain.
   - *API restrictions* → allow only the three APIs above.
5. **Quickest way to try it:** open PuntMe → **Settings** → paste the key under *Google Maps API key* → **Connect**. PuntMe checks the key with Google and switches to real businesses straight away. The key is kept on that phone only.

   **For a deployed app**, put it in `.env` instead so every visitor gets real listings. Copy `.env.example` to `.env` and paste in your key:

   ```bash
   cp .env.example .env
   ```

   ```env
   VITE_GOOGLE_MAPS_API_KEY=your-key-here
   ```

6. Restart `npm run dev`. The **Settings** tab should now show **Source: Google Business**.

> Why not free OpenStreetMap data instead of Google? We tested it: OpenStreetMap lists almost no South African tradespeople (one plumber in all of central Pretoria) and its public search servers took minutes to answer. PuntMe does use OpenStreetMap, through [Photon](https://photon.komoot.io), for area names and GPS suburb names, which are free and fast.

> Each search is one Places *Text Search* request that asks for ratings, phone, hours and reviews. Check the [Places API pricing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing) and set a budget alert in Google Cloud.

## How PuntMe uses Google data

Google's Maps Platform terms don't allow copying business details into your own database or onto the device. PuntMe follows these rules:

- **Search is always live.** Every search asks Google directly, so new businesses and changed hours show up straight away. Nothing needs syncing.
- **Saved businesses are stored as place IDs only.** A place ID is Google's permanent ID for a business, and the terms allow keeping it. When you open the Saved tab, PuntMe loads each business's current details from Google.
- **Details stay in memory only.** They're kept for the current session so that reopening a business doesn't cost another request. They're never written to storage.

Demo listings aren't Google data, so they're saved in full.

## Coming next: "Claim your business"

Business owners will be able to sign in with Google and connect their own Google Business Profile, so their PuntMe page updates whenever they change their Google listing. This needs:

1. Approval for the [Google Business Profile APIs](https://developers.google.com/my-business/content/prereqs). You apply through Google's access request form.
2. An OAuth client ID (type *Web application*) in the same Google Cloud project.
3. A database to store which businesses have claimed their profile. Firebase is the suggested choice.

## Scripts

| Command           | What it does                                      |
| ----------------- | ------------------------------------------------- |
| `npm run dev`     | Starts the dev server (also reachable on your Wi-Fi network) |
| `npm run build`   | Builds the production app into `dist/`            |
| `npm run preview` | Serves the `dist/` build locally to test it       |

## Project structure

```
puntME/
├── index.html               # App shell, iOS meta tags
├── vite.config.js           # Vite config (network access, build target)
├── package.json
├── .env.example             # Copy to .env and add your Google key
├── public/
│   ├── icon.svg             # App icon (+ PNG icons for phones)
│   ├── manifest.webmanifest # Add-to-home-screen settings
│   └── sw.js                # Service worker: opens offline, never caches business data
└── src/
    ├── main.jsx             # React entry point
    ├── App.jsx              # Screen stack + browser history, search state, area
    ├── puntme.css           # All styles
    ├── screens/
    │   ├── Discover.jsx     # Home: search, quick searches, browse, map, top rated
    │   ├── Results.jsx      # Search results with filters and sorting
    │   ├── Provider.jsx     # Business page
    │   ├── Saved.jsx        # Saved tab (loads businesses by place ID)
    │   └── Settings.jsx     # Area, connect Google key, clear saved/recent
    ├── ui/
    │   ├── icons.jsx        # Icons
    │   ├── LocationSheet.jsx # "Your area" bottom sheet
    │   ├── Toast.jsx        # Short messages at the bottom
    │   └── pieces.jsx       # Avatar, save button, tab bar, list card, maps
    ├── data/
    │   ├── categories.js    # Quick searches, browse tiles and the job list
    │   └── demo.js          # Demo listings used when there is no API key
    └── lib/
        ├── places.js        # Google Places search, place-ID lookups, key connect
        ├── geo.js           # Area search + GPS suburb names (Photon / OpenStreetMap)
        ├── saved.js         # Saved list (place IDs only)
        ├── format.js        # Opening hours, WhatsApp, distance and link helpers
        └── useLocalStorage.js
```

## Deploying

Run `npm run build` and upload the `dist/` folder to any static host, such as Vercel, Netlify, Cloudflare Pages or GitHub Pages. Set `VITE_GOOGLE_MAPS_API_KEY` in the host's environment variables, and add your live domain to the key's website restrictions.

## Tech

- [React 19](https://react.dev)
- [Vite 8](https://vite.dev)
- [Google Maps JavaScript API: Places](https://developers.google.com/maps/documentation/javascript/place)
- [Photon](https://photon.komoot.io) for place names. Data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- Plain CSS with no UI library. Fonts: [DM Sans](https://fonts.google.com/specimen/DM+Sans) and [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk).
