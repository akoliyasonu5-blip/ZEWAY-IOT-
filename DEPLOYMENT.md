# ZEWAY IoT deployment

The dashboard is published from `dist/` by `.github/workflows/pages.yml` when changes are pushed to `main`. In repository Settings → Pages choose GitHub Actions as the build source.

GitHub Pages hosts the interface. The MT100 JT/T 808 receiver in `receiver/` needs a separate public TCP host before a physical device can send live coordinates. Do not add API tokens, SIM details, or private device location data to this public repository.
