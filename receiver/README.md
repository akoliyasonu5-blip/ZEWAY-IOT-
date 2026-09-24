# ZEWAY receiver (JT/T 808 mode and JSON GPS)

A previously supplied Kingwo IoT MT100 manual identifies three switchable modes: Kingwo, JT808, GT800. **A separately supplied TrackingTheWorld MT-100 datasheet instead identifies @Track. This JT/T 808 decoder is not compatible with @Track without a new adapter. Verify the exact installed hardware and protocol before configuring it.** This service implements the **JT/T 808 basic location packet** (0x0200), registration (0x0100), authentication (0x0102), heartbeat (0x0002), and general responses (0x8001). It accepts 2013 (12-digit) and 2019 (20-digit) terminal headers, but does not support fragmented packets, multimedia, or remote control. No scooter lock/unlock action is implemented.

## Run

Use a host with a **public inbound raw TCP port** (for the device) and HTTPS for the browser API. Typical static site hosting and HTTP-only web services cannot receive MT100's raw TCP stream. Configure a TCP reverse proxy or host firewall for `TCP_PORT` and HTTPS reverse proxy for `PORT`.

```sh
API_TOKEN='choose-a-long-random-secret' TERMINAL_IDS='YOUR_12_DIGIT_JT808_TERMINAL_ID' TCP_PORT=7008 PORT=3000 node server.js
```

Set `TERMINAL_IDS` to the 12- or 20-digit terminal identity used in JT808 messages, which may be different from the 15-digit IMEI printed on the device. The dashboard needs `https://YOUR_HOST/api/devices` and the same API token. The server creates trip summaries from successive moving and stopped GPS fixes and sends `devices`, `trips`, and `alerts` to the dashboard. Optional `GEOFENCE="28.6205,77.3658,2"` generates a geofence-exit alert (latitude, longitude, radius in km). It keeps locations, trips, and alerts in memory, so all history resets after restart. Trip addresses are coordinate strings until reverse geocoding is added. Protect both API and device network path; use host firewall restrictions where possible.

**Do not send the Kingwo SMS configuration to a device identified only by the TrackingTheWorld MT-100 datasheet.** Its @Track packet layouts and configuration commands are not supplied. Identify the installed unit and obtain its matching full protocol/configuration guide first.

## Scope and validation

Run `npm test` for framing and sample location decoding. A synthetic packet test does **not** prove interoperability with this device's firmware. Capture the first raw packet on the configured TCP port to verify exact terminal ID, header variant, registration response and location fields. Until the receiver obtains a valid GPS packet, the dashboard correctly displays no live position. Battery percentage is not available in the basic 0x0200 packet. The 9–100 V power input in the manual should not be interpreted as scooter battery state of charge.
