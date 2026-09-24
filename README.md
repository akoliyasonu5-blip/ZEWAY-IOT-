# ZEWAY IoT fleet dashboard

- `dist/index.html`: Real-data-only dashboard for GitHub Pages with vehicle registration, interactive fleet map, GPS history routes and daily trip estimates. Empty devices and maps stay empty until data arrives.
- `receiver/`: MT100 JT/T 808 TCP and optional UDP receiver. It can publish valid GPS points to Supabase for the signed-in owner's dashboard. Another tracker protocol needs its own decoder or vendor HTTP gateway; registering a model does not automatically decode it.
- Configure GitHub repository **Settings → Pages → Build and deployment → GitHub Actions**; push this repository to `main`. The workflow publishes `dist`.
- The dashboard is online at https://akoliyasonu5-blip.github.io/ZEWAY-IOT-/ . It displays actual GPS positions only after a compatible receiver is running and the tracker sends it packets. GitHub Pages itself does not accept raw TCP or UDP tracker packets.
- Vehicles added while signed in under **Supabase** persist for that account. Without sign-in they stay in browser storage. Device IDs may use 6–64 letters, numbers, underscores, hyphens or colons. IMEI-only entries need a corresponding protocol ID before MT100 JT808 GPS can be linked.
- Dashboard tracking uses stored positions for the selected day, draws route lines, and derives trip summaries from real GPS reports. Distances are GPS estimates; the daily query currently includes up to the first 1,000 points.
- Physical lock/unlock buttons remain disabled until the specific hardware and its safe command flow are verified.
