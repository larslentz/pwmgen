Lars Lentz's PWM Generator — PWA Offline Package
==================================================
Version  : 1.03
Built    : 2026-06-24
Contents : Static web app (HTML + JS + CSS + Service Worker)

WHAT IS THIS?
-------------
A square-wave PWM generator that outputs a real PWM signal via your
computer's headphone / 3.5 mm audio jack. Runs entirely in the browser —
no installation required for basic use.

This ZIP contains a Progressive Web App (PWA) build. Once served over
HTTPS (or localhost), the app caches itself and works offline.

─────────────────────────────────────────────────────────────────
OPTION A — LOCAL SERVER (Windows / macOS / Linux)
─────────────────────────────────────────────────────────────────
Requirements: Node.js or Python installed.

1. Extract this ZIP to a folder, e.g. C:\PWMGen\

2. Open a terminal in that folder and start a static server:

   Node.js (npx — no install needed):
     npx serve .

   Python 3:
     python -m http.server 8080

3. Open Chrome/Edge and go to:
     http://localhost:5000      (npx serve default)
     http://localhost:8080      (python default)

4. The app loads and runs the PWM generator immediately.

NOTE: Service workers (offline caching) require a SECURE context.
On localhost this works automatically in Chrome/Edge. On plain HTTP
with a non-localhost IP, the service worker won't register — the app
still works, but offline-only mode is not available.

─────────────────────────────────────────────────────────────────
OPTION B — FREE STATIC HOSTING (recommended for mobile install)
─────────────────────────────────────────────────────────────────
To get the "Add to Home Screen" install prompt on Android/iOS, the
app must be served over HTTPS. Free options:

  GitHub Pages  : push this folder contents to a gh-pages branch
  Netlify Drop  : drag-and-drop the folder at app.netlify.com/drop
  Vercel        : `npx vercel .` in the extracted folder

After deploying, open the URL in Chrome on Android → tap the ⋮ menu
→ "Add to Home Screen". The app installs and runs fully offline.

─────────────────────────────────────────────────────────────────
OPTION C — Use the hosted version directly
─────────────────────────────────────────────────────────────────
No server needed — open the hosted app in your browser and tap
"Install" when the banner appears (Chrome on Android/Desktop).

─────────────────────────────────────────────────────────────────
HARDWARE CONNECTION
─────────────────────────────────────────────────────────────────
  1. Connect a 3.5 mm cable to your computer's headphone jack.
  2. Connect the cable to a MOSFET gate (IRLZ44N recommended)
     or BJT base (2N2222) via a resistor.
  3. Set system volume to 100% for maximum gate/base drive.
  4. See the Hardware Guide tab inside the app for full circuits.

─────────────────────────────────────────────────────────────────
For questions, contact Lars Lentz.
