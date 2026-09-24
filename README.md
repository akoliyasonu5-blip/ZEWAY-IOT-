# ZEWAY IoT fleet dashboard

- `dist/index.html`: Real-data-only dashboard for GitHub Pages with vehicle registration, interactive fleet map, GPS history routes and daily trip estimates. Empty devices and maps stay empty until data arrives.
- `receiver/`: JT/T 808 TCP/UDP decoder and an authenticated JSON GPS endpoint. It can publish valid GPS points to Supabase. **The supplied TrackingTheWorld MT-100 datasheet specifies @Track, not JT/T 808; this decoder is not verified for that device.**
- Configure GitHub repository **Settings → Pages → Build and deployment → GitHub Actions**; push this repository to `main`. The workflow publishes `dist`.
- The dashboard is online at https://akoliyasonu5-blip.github.io/ZEWAY-IOT-/ . It displays actual GPS positions only after a compatible receiver is running and the tracker sends it packets. GitHub Pages itself does not accept raw TCP or UDP tracker packets.
- Vehicles added while signed in under **Supabase** persist for that account. Without sign-in they stay in browser storage. Device IDs may use 6–64 letters, numbers, underscores, hyphens or colons. IMEI-only entries need a matching identifier from the incoming protocol before GPS can be linked.
- Dashboard tracking uses stored positions for the selected day, draws route lines, and derives trip summaries from real GPS reports. Distances are GPS estimates; the daily query currently includes up to the first 1,000 points.
- Physical lock/unlock buttons remain disabled until the specific hardware and its safe command flow are verified.

## Connect a different GPS device

Register its unique device ID in **Devices & vehicles**. A running receiver must also allow the same ID in its private `TERMINAL_IDS` setting. If its vendor can send HTTPS webhooks, configure it to POST JSON to `https://YOUR-RECEIVER/api/positions` with an `Authorization: Bearer YOUR_API_TOKEN` header. The payload is `{"device_id":"GPS-CUSTOM-123","lat":28.58,"lng":77.32,"speed":21,"recorded_at":"2026-09-24T13:00:00Z"}` (speed in km/h, UTC time). The receiver rejects unknown IDs and invalid coordinates; accepted points appear through its `/api/devices` endpoint and can be published to Supabase when the private Supabase receiver credentials are configured. Keep the API token and Supabase secret off GitHub Pages.

For trackers that only send raw TCP/UDP or a vendor-specific format, add the corresponding decoder or vendor bridge. The included raw-packet decoder supports JT/T 808; a device model name alone cannot identify or decode every manufacturer protocol. The receiver must run on an internet-accessible host or a working tunnel, and the device must be configured to send to that host. Until a real GPS report arrives, the device correctly remains Offline.

## MT-100 datasheet clarification

The supplied **TTW-MT100-DataSheet-20160523.pdf** identifies a TrackingTheWorld MT-100 using **@Track** over TCP, UDP or SMS. Earlier Kingwo IoT MT100 material described selectable JT/T 808 mode; the identical model name does not prove the hardware or protocol is identical. Do not send Kingwo `PROTOCOL` or `IP` SMS commands to a TrackingTheWorld MT-100. The datasheet does not include @Track packet layouts, device-specific configuration SMS, or a confirmed IMEI, so @Track decoding and physical live connectivity cannot yet be verified. Obtain the exact installed unit manufacturer/label and full @Track protocol/configuration manual or vendor webhook/API details before redirecting traffic.
