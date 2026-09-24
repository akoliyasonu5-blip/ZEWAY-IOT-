# ZEWAY IoT fleet dashboard

- `dist/index.html`: Dashboard for GitHub Pages. It includes sample data, device and vehicle registration, trips, alerts, and a location map.
- `receiver/`: JT/T 808 TCP receiver and HTTPS JSON API. Deploy it to a service with **public inbound TCP** and an HTTPS reverse proxy. GitHub Pages and Actions cannot keep a TCP listener running.
- Configure GitHub repository **Settings → Pages → Build and deployment → GitHub Actions**; push this repository to `main`. The workflow publishes `dist`.
- Dashboard URL stays online as a website. It shows actual GPS positions only after the receiver is deployed and MT100 is configured to send its JT/T 808 packets to it.
- Vehicles saved in the dashboard are held in that browser's local storage; they are not shared across browsers. The MT100 receiver returns live GPS and derived trips once connected.
- Lock/unlock is a demo interaction. It cannot physically actuate the installed scooter until wiring, firmware command format, and stationary-only checks are verified.
