# PuntMe

**Find someone for any job.** Search a job, like *window cleaner*, *plumber* or *dog groomer*, and PuntMe lists the local people and businesses who do it: businesses that joined PuntMe themselves, plus listings from **Google Business Profiles** with ratings, reviews, opening hours, phone numbers, websites and directions.

**Got a business?** Tap the profile button in the top right, create an account and add your business in about two minutes. Customers nearby find you, and their quote requests reach your phone as **push notifications**.

PuntMe is an installable web app (PWA) built with **React + Vite**, with a small **Node.js** server for accounts, businesses and notifications. It has a clean, light design with white cards, DM Sans and Space Grotesk type, and a blue accent.

---

## Features

### For people looking for someone

- 🔍 **Search any job.** Type anything, tap a quick search, or browse by job.
- 🗺️ **Around you.** A Google map of people who do the job you last searched for, plus the top rated near you.
- 🏢 **Businesses on PuntMe first.** Businesses that joined PuntMe show first, with a green tick, followed by Google Business listings.
- 🎛️ **Filters and sorting.** *Open now*, *4.5+ stars* and *Within 5 km*. Sort by best match, top rated or nearest.
- 📄 **Business page.** Call, WhatsApp, route and website buttons, a live map, opening hours and reviews.
- 📨 **Ask for a quote.** For businesses on PuntMe, the request goes straight to the owner's phone. For Google listings it opens WhatsApp with a message ready to send.
- 🔔 **Job alerts.** Tap *Notify me* under the results and PuntMe tells you when a new plumber (or anyone else) joins near you.
- 🔖 **Saved list.** Keep the people you like.
- 📍 **Your area.** Search any real South African suburb or town, or use your phone's GPS.

### For business owners

- 👤 **Profile, top right.** Create an account, or sign in, from any tab.
- 🏪 **Add your business.** Four short steps: your business, contact details, where and when you work, and a preview. Already on Google? Find your Google Business Profile and PuntMe fills the form in for you. The draft is kept on the phone until you publish.
- 📥 **Quote requests.** Every request lands in *My business* with the customer's name, number and message, plus one-tap Call and WhatsApp replies.
- 📊 **Stats.** Page views and quote requests for each business.
- ⏸️ **Pause, edit or remove** your listing at any time. You can have up to 5 businesses per account.

### App

- 📲 **Installable.** Install button in the app (Chrome, Edge, Android). On iPhone, PuntMe shows the two taps for *Add to Home Screen*. Home screen shortcuts for Search, Saved and My business.
- 🔔 **Push notifications.** Quote requests for owners, job alerts for everyone, and a test button. A notification that arrives while PuntMe is open also shows in the app.
- ✈️ **Works offline.** After the first visit it opens with no signal. Business data is never cached; it's always live.
- 🔄 **Updates.** When a new version is deployed, the app offers to reload.
- 📱 **Feels native.** The back button and back swipe work, screens slide, lists keep their scroll position, and buttons react the moment you press them.

## Quick start

You need [Node.js](https://nodejs.org) **22.13 or newer**. The database is Node's built-in SQLite, so there's nothing native to compile.

```bash
npm install
npm run dev
```

Open the address that's printed (usually http://localhost:5173). The dev server runs the API at `/api` too, so accounts, businesses and notifications all work. Restart it after changing files in `server/`.

Data is stored in `server/data/` (the database and push keys). It's not committed to git.

**On your phone:** connect it to the same Wi-Fi and open the **Network** address that Vite prints. Notifications and installing need HTTPS (or `localhost`), so test those on your computer, or on the deployed site.

Until you add a Google API key, PuntMe shows **demo data** for Google listings, so you can try every screen. Businesses added in PuntMe are always real.

## Push notifications

PuntMe uses standard Web Push, so there's no Firebase project or app store needed.

- The server makes its keys (VAPID) the first time it starts and saves them in the data folder. To set your own, run `npx web-push generate-vapid-keys` and put them in `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`. Keep the same keys forever: new keys mean every phone has to turn notifications on again.
- Set `VAPID_SUBJECT` to a `mailto:` address you read. Push services use it if something goes wrong.
- **Android, Windows, Mac, Linux:** works in Chrome, Edge, Firefox and Safari.
- **iPhone and iPad (iOS 16.4+):** works once PuntMe is added to the Home Screen. The app explains this and shows how.

What sends a notification:

| When | Who gets it |
| --- | --- |
| A customer sends a quote request | The business owner, on every phone where they're signed in with notifications on |
| A new business goes live | Everyone following that job within 25 km (or the business's travel distance) |
| *Send a test notification* | That phone |

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
5. **Quickest way to try it:** open PuntMe → **Settings** → paste the key under *Google Maps API key* → **Connect**. The key is kept on that phone only.

   **For a deployed app**, put it in `.env` instead so every visitor gets real listings:

   ```bash
   cp .env.example .env
   ```

   ```env
   VITE_GOOGLE_MAPS_API_KEY=your-key-here
   ```

6. Restart `npm run dev` (or rebuild). **Settings** should now show **Source: Google Business**.

With a key, business owners also get **Already on Google?** in the *Add your business* form, which fills the form from their Google Business Profile.

> Why not free OpenStreetMap data instead of Google? We tested it: OpenStreetMap lists almost no South African tradespeople (one plumber in all of central Pretoria) and its public search servers took minutes to answer. PuntMe does use OpenStreetMap, through [Photon](https://photon.komoot.io), for area names and GPS suburb names, which are free and fast.

> Each search is one Places *Text Search* request that asks for ratings, phone, hours and reviews. Check the [Places API pricing](https://developers.google.com/maps/documentation/places/web-service/usage-and-billing) and set a budget alert in Google Cloud.

### How PuntMe uses Google data

Google's Maps Platform terms don't allow copying business details into your own database or onto the device. PuntMe follows these rules:

- **Search is always live.** Every search asks Google directly.
- **Saved Google businesses are stored as place IDs only**, which the terms allow. Their details load fresh from Google each time.
- **Details stay in memory only**, for the current session.
- **Linked listings.** When an owner fills in their form from Google, PuntMe keeps the place ID. In search, the owner's PuntMe listing replaces the Google one and shows Google's rating and reviews live, for that session only.

## Deploying

PuntMe is one Node process that serves the app and the API on one port.

```bash
npm ci
npm run build        # builds the app into dist/ (reads VITE_* from .env)
npm start            # serves dist/ and /api on PORT (default 8787)
```

Run it under a process manager, for example `pm2 start npm --name puntme -- start`, and put it behind Apache or nginx with **HTTPS**. HTTPS is required for installing and for notifications. Forward everything to `http://127.0.0.1:8787`.

- **Back up the data folder** (`PUNTME_DATA_DIR`, default `server/data`). It holds the database and the push keys.
- Behind a proxy, client IPs (used for rate limits) come from `X-Forwarded-For`. `TRUST_PROXY` defaults to trusting the local machine.
- Built files are cached for a year (their names change on every build). `sw.js`, the manifest and pages are never cached, so updates reach people straight away.
- To host the app separately (e.g. on a static host), build with `VITE_API_URL=https://your-api` and start the server with `CORS_ORIGIN=https://your-app`.
- Add your live domain to the Google key's website restrictions.

See `.env.example` for every setting.

## Privacy and security

- Passwords are hashed with scrypt. Sessions are random tokens, stored only as hashes, and expire after 60 days.
- Sign-up, sign-in, quote requests and test notifications are rate limited per IP.
- Only the suburb a business works from is shown, never a street address.
- *Delete account* in the profile removes the account, its businesses and their quote requests.
- Saved people, recent searches and your area stay on the phone.

## Scripts

| Command           | What it does                                                   |
| ----------------- | -------------------------------------------------------------- |
| `npm run dev`     | App + API with live reload (also reachable on your Wi-Fi)      |
| `npm run build`   | Builds the production app into `dist/`                         |
| `npm start`       | Production server: `dist/` and the API                         |
| `npm run preview` | Build, then start the production server                        |

## Project structure

```
puntME/
├── index.html                 # App shell, iOS meta tags
├── vite.config.js             # Vite config; runs the API inside the dev server
├── .env.example               # Every setting, explained
├── server/
│   ├── index.js               # Production server: dist/ + /api, caching headers
│   ├── api.js                 # Accounts, businesses, quote requests, push routes
│   ├── db.js                  # SQLite schema (node:sqlite)
│   ├── match.js               # Which businesses answer a search or job alert
│   └── push.js                # Web Push keys and sending
├── public/
│   ├── manifest.webmanifest   # Install settings, shortcuts, screenshots
│   ├── sw.js                  # Service worker: offline, push, notification taps
│   ├── icon*.png, badge-72.png, shortcut-*.png, screenshots/
└── src/
    ├── App.jsx                # Screen stack + history, links from notifications
    ├── puntme.css             # All styles
    ├── screens/
    │   ├── Discover.jsx       # Home: search, browse, map, top rated, new on PuntMe
    │   ├── Results.jsx        # Results, filters, sorting, "Notify me"
    │   ├── Provider.jsx       # Business page
    │   ├── Saved.jsx          # Saved tab
    │   ├── Settings.jsx       # Area, Google key, business, app
    │   ├── Profile.jsx        # Sign in / account, your businesses, notifications
    │   ├── BusinessForm.jsx   # Add (4 steps) or edit a business
    │   └── MyBusiness.jsx     # Owner view: stats, quote requests, pause, share
    ├── ui/
    │   ├── pieces.jsx         # Avatar, badges, profile button, switch, cards, maps
    │   ├── Sheet.jsx          # Bottom sheet
    │   ├── LocationSheet.jsx  # Area picker
    │   ├── QuoteSheet.jsx     # Ask a PuntMe business for a quote
    │   ├── InstallSheet.jsx   # Add to Home Screen steps for iPhone
    │   ├── NotificationSettings.jsx
    │   ├── Toast.jsx
    │   └── icons.jsx
    ├── data/                  # Job categories and demo listings
    └── lib/
        ├── api.js             # Requests to /api, session token
        ├── account.js         # Signed-in person and their businesses
        ├── businesses.js      # PuntMe businesses as listings, hours, phone format
        ├── places.js          # Google Places search + merging PuntMe businesses
        ├── push.js            # Notification permission, subscription, job alerts
        ├── pwa.js             # Install prompt
        ├── image.js           # Logo resizing
        ├── geo.js             # Area search, GPS suburb names
        ├── saved.js, format.js, useLocalStorage.js
```

## Tech

- [React 19](https://react.dev) and [Vite 8](https://vite.dev)
- [Express 5](https://expressjs.com), Node's built-in [SQLite](https://nodejs.org/api/sqlite.html) and [web-push](https://github.com/web-push-libs/web-push)
- [Google Maps JavaScript API: Places](https://developers.google.com/maps/documentation/javascript/place)
- [Photon](https://photon.komoot.io) for place names. Data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).
- Plain CSS with no UI library. Fonts: [DM Sans](https://fonts.google.com/specimen/DM+Sans) and [Space Grotesk](https://fonts.google.com/specimen/Space+Grotesk).
