Lars Lentz's PWM Generator — PWA for GitHub Pages
===================================================
Target URL : https://larslentz.github.io/pwmgen
Version    : 1.04
Built      : 2026-06-24
Base path  : /pwmgen/

WHAT IS THIS?
-------------
A square-wave PWM generator that outputs a real PWM signal through your
computer's headphone / 3.5 mm audio jack. Runs entirely in the browser
(no server-side code). After the first visit the app is fully cached by
the service worker and works offline.

=======================================================================
 OPTION A — GITHUB PAGES  (recommended — enables PWA install)
=======================================================================

Prerequisites: a GitHub account and Git installed on your machine.

Step 1 — Create the repository
  a. Go to https://github.com/new
  b. Set Repository name to:  pwmgen
  c. Set visibility to Public (GitHub Pages requires public repos on
     the free plan)
  d. Do NOT add a README, .gitignore, or licence — keep it empty
  e. Click "Create repository"

Step 2 — Push this ZIP's contents to GitHub
  Extract this ZIP to a folder, open a terminal inside it, then run:

    git init
    git branch -m gh-pages
    git add .
    git commit -m "Deploy PWM Generator PWA"
    git remote add origin https://github.com/larslentz/pwmgen.git
    git push -u origin gh-pages

Step 3 — Enable GitHub Pages
  a. Open your repo on GitHub → Settings → Pages
  b. Under "Build and deployment" → Source: "Deploy from a branch"
  c. Branch: gh-pages  /  folder: / (root)
  d. Click Save

Step 4 — Wait ~1 minute, then open:
    https://larslentz.github.io/pwmgen

Step 5 — Install to your phone
  Android Chrome: tap the three-dot menu → "Add to Home Screen"
  iOS Safari    : tap Share → "Add to Home Screen"

  The app installs as a standalone app and works fully offline.

Updating the app in future:
  Rebuild the ZIP (from source, with BASE_PATH=/pwmgen/), extract it
  into the same folder, then commit and push again.

=======================================================================
 OPTION B — NETLIFY DROP  (instant HTTPS, no account required)
=======================================================================

  1. Extract this ZIP to a folder
  2. Go to https://app.netlify.com/drop
  3. Drag the extracted folder onto the page
  4. Netlify gives you a random HTTPS URL immediately
  5. PWA install works from that URL on Android/iOS Chrome

  NOTE: This build is compiled for /pwmgen/ as the base path.
  If Netlify serves from a different path, asset URLs may differ.
  GitHub Pages (Option A) is the safest match for this build.

=======================================================================
 OPTION C — LOCAL SERVER  (no install prompt, good for testing)
=======================================================================

  Service workers require a secure context. On localhost this works
  in Chrome/Edge automatically.

  Extract this ZIP, open a terminal in the folder, then run ONE of:

    npx serve .           →  open http://localhost:3000/pwmgen/
    python -m http.server →  open http://localhost:8080/pwmgen/

  Access the app at the /pwmgen/ path shown above, not the root /.

=======================================================================
 HARDWARE CONNECTION
=======================================================================

  1. Connect a 3.5 mm cable to your computer's headphone jack.
  2. Wire to a MOSFET gate (IRLZ44N) or BJT base (2N2222) through
     a series resistor (~100 ohm for MOSFET, ~1 kohm for BJT).
  3. Set system volume to 100% for maximum drive.
  4. Open the "Hardware Guide" tab inside the app for full schematics.

For questions, contact Lars Lentz.
