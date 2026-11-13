# Trackpe GPS Server — Railway Deployment

This repository contains the dashboard and a Kingwo HQ20 TCP receiver. GitHub Pages hosts only the browser dashboard; it cannot accept the tracker's TCP connection.

## What this deployment runs

- Dashboard/API health endpoint on HTTP port 3000.
- Kingwo `*HQ20...#` TCP listener on port 5001.
- The configured terminal allowlist initially contains the supplied device identifier `866777078395650`.

## Deploy

1. Sign in to Railway and create a new project from the GitHub repository `akoliyasonu5-blip/ZEWAY-IOT-`.
2. Select the repository root as the service root. Railway should build the root `Dockerfile`.
3. Add these service variables in Railway (do not put secrets in GitHub):
   - `API_TOKEN`: a long random secret generated in Railway or a password manager.
   - `PORT=3000`
   - `KINGWO_TCP_PORT=5001`
   - `AUTO_REGISTER=false`
   - `TERMINAL_IDS=866777078395650`
4. Deploy and wait until the service health check `/health` succeeds on port 3000.
5. In Railway service networking, enable a **TCP Proxy** for the container port `5001`. Record the public TCP hostname and port Railway assigns. Do not use the HTTP domain or port 3000 for the tracker.
6. The dashboard's **Data connection** section uses the Railway HTTPS domain ending in `/api/devices` and the same `API_TOKEN`. Keep the token private.

## Device setup still required

The MT100 must be configured to send its Kingwo HQ20 protocol to the Railway TCP proxy hostname and assigned TCP port. Use only the exact server-address/APN command documented for this specific MT100 firmware or supplied by Kingwo. Do not guess SMS commands. Airtel APN is commonly `airtelgprs.com`, but confirm the device's own network settings.

## Important verification

A successful deployment or `/health` response does **not** prove the GPS is connected. The device is live only after its real IMEI/terminal ID appears in `/api/devices` with a recent position and valid coordinates.

The current receiver keeps recent position history in process memory. For durable long-term history and multi-user accounts, configure the existing Supabase integration with a server-only secret and verify the database tables/RLS before production use. Do not expose a Supabase service-role/secret key in the browser, GitHub, or chat.

Railway may charge for hosting and TCP proxy usage. Review the current plan and pricing before activating paid resources.
