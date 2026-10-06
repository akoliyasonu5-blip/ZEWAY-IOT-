# ZEWAY multi-device GPS receiver

This receiver is designed for multiple GPS trackers at the same time.

## Current live inputs

- **JT/T 808** over TCP, and optionally UDP.
- **Generic HTTPS/HTTP JSON** vendor webhook through `POST /api/ingest` or `POST /api/positions`.
- Multiple device IDs can report concurrently. Each device keeps its own latest position, history, trip state, protocol and last-seen connection.
- The dashboard receives receiver-mode positions through the real-time SSE endpoint `/api/stream`.

A GPS model name or IMEI alone is not enough to decode every manufacturer's raw packets. BeeVe Elevate, GT06 and Kingwo/UPro need their verified packet specification/adapter before their raw TCP payload can be decoded. The receiver exposes these as adapter-required through `GET /api/protocols`.

## Recommended onboarding flow

1. Deploy this receiver on a server that can accept the tracker's TCP/UDP traffic and expose the HTTP API through HTTPS.
2. Set a strong `API_TOKEN`.
3. Temporarily set `AUTO_REGISTER=true` while adding new authorized devices.
4. Point each GPS tracker to the receiver host and correct port/protocol.
5. Check `GET /api/devices`. A reporting device appears with its device ID, protocol, transport and last-seen time.
6. After all expected IDs are known, put them into `TERMINAL_IDS=id1,id2,id3` and set `AUTO_REGISTER=false`.
7. Connect the GitHub dashboard to `https://YOUR-RECEIVER/api/devices` with the same API token.

Do not leave auto-registration enabled on an unrestricted public receiver longer than necessary.

## Environment

```sh
API_TOKEN='use-a-long-random-secret'
AUTO_REGISTER=true
TCP_PORT=7008
PORT=3000
node server.js
```

Optional:

```sh
UDP_PORT=7008
TERMINAL_IDS='DEVICE001,DEVICE002,DEVICE003'
GEOFENCE='28.6205,77.3658,2'
SUPABASE_URL='https://YOUR_PROJECT.supabase.co'
SUPABASE_SECRET_KEY='SERVER_ONLY_SECRET'
```

When `AUTO_REGISTER=false`, only IDs in `TERMINAL_IDS` or IDs registered at runtime through the authenticated `POST /api/register` endpoint are accepted.

## Generic vendor webhook

Supported common aliases include `device_id`, `deviceId`, `imei`, `terminal_id`; `lat/latitude`; `lng/lon/longitude`; and `timestamp/time/gps_time`.

Example:

```json
{
  "imei": "867530900000001",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "speed": 21.4,
  "timestamp": "2026-10-06T06:30:00Z",
  "ignition": true,
  "protocol": "beeve-http"
}
```

Send it to `POST /api/ingest` with header `Authorization: Bearer YOUR_API_TOKEN`.

## API

- `GET /health` — receiver health.
- `GET /api/devices` — all currently known devices, connections, trips and alerts.
- `GET /api/protocols` — ready and adapter-required protocols.
- `GET /api/history/:deviceId` — in-memory history for one device.
- `GET /api/stream?token=...` — real-time GPS events for the browser dashboard.
- `POST /api/register` — add a device ID at runtime.
- `POST /api/ingest` — normalized vendor/webhook GPS input.

## Protocol rule

One server can support many manufacturers, but each raw binary/text wire protocol still needs a decoder that is based on the vendor's real protocol document or verified packet capture. Do not guess acknowledgement/control frames. This is especially important for immobilization/lock commands.
