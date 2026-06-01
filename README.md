# World Marketing Day — Lucky Draw 2026
## Complete Setup & Deployment Guide

---

## 📁 Folder Structure

```
world-marketing-day/
├── index.html              ← Public registration page
├── admin.html              ← Organiser / admin panel
│
├── css/
│   ├── style.css           ← Shared styles (art-deco gold theme)
│   └── admin.css           ← Admin dashboard styles
│
├── js/
│   ├── config.js           ← ⚙️ YOUR SETTINGS GO HERE
│   ├── particles.js        ← Animated starfield background
│   ├── confetti.js         ← Confetti burst on winner
│   ├── wheel.js            ← Spinning lucky wheel animation
│   ├── app.js              ← Registration page logic
│   └── admin.js            ← Admin panel logic
│
├── backend/
│   └── Code.gs             ← Google Apps Script (copy into GAS editor)
│
└── README.md               ← This file
```

---

## 🚀 Step-by-Step Implementation

### STEP 1 — Create Your Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new blank spreadsheet.
2. Name it **"WMD Lucky Draw 2026"** (or anything you like).
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/  ← COPY THIS PART →  /edit
   ```
   Example ID: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`

> The script will automatically create the "Entries" and "Winners" tabs on first use.

---

### STEP 2 — Deploy the Google Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**.
2. Delete the default `function myFunction()` placeholder.
3. Open `backend/Code.gs` from this project and **copy all its contents** into the Apps Script editor.
4. At the top of the script, set your values:
   ```javascript
   const SHEET_ID       = "YOUR_SHEET_ID_HERE";   // from Step 1
   const ADMIN_PASSWORD = "MarketingDay2026!";     // choose a strong password
   ```
5. Click **Save** (💾 icon or Ctrl+S).
6. Click **Deploy → New deployment**.
7. Configure the deployment:
   - **Type**: Web app
   - **Execute as**: Me (your Google account)
   - **Who has access**: Anyone
8. Click **Deploy** and authorise permissions when prompted.
9. **Copy the Web App URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

### STEP 3 — Configure the Frontend

Open `js/config.js` and fill in your values:

```javascript
const CONFIG = {
  SCRIPT_URL:     "https://script.google.com/macros/s/AKfycb.../exec",
  ADMIN_PASSWORD: "MarketingDay2026!",   // must match Code.gs
  EVENT_NAME:     "World Marketing Day Lucky Draw 2026",
};
```

> ⚠️ **Both passwords must match** — `Config.ADMIN_PASSWORD` (frontend) and `ADMIN_PASSWORD` (Code.gs backend).

---

### STEP 4 — Customise Branding

#### Logo
In `index.html` and `admin.html`, replace the logo placeholder:
```html
<!-- Replace this: -->
<div class="logo-placeholder">
  <span class="logo-icon">✦</span>
  <span class="logo-text">YourBrand</span>
</div>

<!-- With this (example): -->
<img src="assets/logo.png" alt="Company Logo" class="site-logo" />
```

#### Colours
In `css/style.css`, update the CSS variables at the top:
```css
:root {
  --gold:       #C9A84C;   /* Primary accent — change to your brand colour */
  --night:      #080C18;   /* Background */
  ...
}
```

#### Event Name
Update the `<title>` tags in both HTML files and `CONFIG.EVENT_NAME` in `js/config.js`.

---

### STEP 5 — Deploy the Frontend

#### Option A — Static Hosting (Recommended)
Upload all files to any static host:
- **Netlify**: Drag & drop the folder at [netlify.com](https://netlify.com)
- **Vercel**: `vercel deploy` from the folder
- **GitHub Pages**: Push to a repo, enable Pages
- **Amazon S3**: Upload with public read access

#### Option B — Local Testing
Simply open `index.html` in a browser (Chrome recommended). Note: fetch requests to the Apps Script URL require a server context — use [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) in VS Code, or:
```bash
npx serve .
```

---

## 🔐 Security Notes

| Layer | Measure |
|-------|---------|
| Input validation | Client-side (JS) + server-side (Apps Script) |
| Input sanitisation | HTML stripping, length limits, on both sides |
| Admin auth | Password verified by backend; session token issued |
| Duplicate prevention | Email checked before each insert in Apps Script |
| HTTPS | Enforced by Google's Apps Script hosting |

> For higher-security deployments, move the admin panel to a server-side app and use OAuth 2.0 instead of a shared password.

---

## 🎲 Lucky Draw Logic

1. The admin clicks **"Draw a Winner"**.
2. JavaScript fetches all participants, filters out previous winners.
3. A cryptographically random index is chosen via `Math.floor(Math.random() * eligible.length)`.
4. (Optional) The spinning wheel animates, landing on the selected winner.
5. The winner is POSTed to Apps Script → written to the **Winners** sheet.
6. Confetti launches; winner details appear on screen.
7. The same email **cannot be drawn again** (checked on both frontend and backend).

---

## 📋 Google Sheet Structure

### "Entries" Tab (auto-created)
| Column A | Column B | Column C |
|----------|----------|----------|
| Name | Email | Timestamp |
| Alex Johnson | alex@example.com | 2026-06-01T10:30:00.000Z |

### "Winners" Tab (auto-created)
| Column A | Column B | Column C |
|----------|----------|----------|
| Name | Email | Drawn At |
| Alex Johnson | alex@example.com | 2026-06-01T14:00:00.000Z |

---

## 🛠 Troubleshooting

**"Registration is not yet configured"**
→ Set `SCRIPT_URL` in `js/config.js`.

**"Incorrect password" on admin login**
→ Make sure `ADMIN_PASSWORD` in `Code.gs` matches `ADMIN_PASSWORD` in `js/config.js`.

**Apps Script 401/403 errors**
→ Re-deploy the script: Apps Script → Deploy → Manage deployments → Edit → New version → Deploy.

**Entries not saving**
→ Check that `SHEET_ID` in `Code.gs` is correct and that the script has permission to the sheet (re-authorise if needed).

**CORS errors in browser console**
→ Apps Script Web Apps don't support CORS headers on POST. Use `no-cors` mode or ensure the response is returned properly. If you see this, ensure you're POSTing to the exact deployment URL (not an edit URL).

---

## 📱 Mobile Support

The design is fully responsive:
- Registration form stacks naturally on mobile
- Admin panel switches to a top navigation bar on small screens
- Spinning wheel scales to viewport width

---

## 🎨 Design Credits

- **Typefaces**: [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) + [DM Sans](https://fonts.google.com/specimen/DM+Sans) via Google Fonts
- **Theme**: Art-Deco Gold × Deep Midnight Blue
- **Animations**: Custom canvas particles, CSS keyframes, confetti, spinning wheel — all vanilla JS/CSS, zero dependencies

---

*Built for World Marketing Day Lucky Draw 2026*
