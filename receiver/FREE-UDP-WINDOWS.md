> **Hardware mismatch:** This guide applies only to a Kingwo MT100 confirmed to support JT/T 808. The supplied TrackingTheWorld MT-100 datasheet says @Track; do not follow the JT/T 808 SMS steps for that unit. Identify the installed tracker and obtain its protocol guide first.

# Free MT100 GPS test from a Windows PC

Railway is currently blocked by its expired trial. This alternative uses a Windows PC that stays on, a free Playit **UDP** tunnel, the MT100's documented UDP mode, and the ZEWAY IOT Supabase project. Playit free does **not** include a custom TCP tunnel.

1. Install Node.js 20+ on the PC. Download the repository and open PowerShell in its `receiver` folder. In the ZEWAY dashboard, sign in under **Supabase** and register the MT100 with its real 12/20-digit JT808 terminal ID. An IMEI-only record cannot be matched to JT808 GPS packets.
2. In the Supabase **ZEWAY IOT** project, open Settings → API Keys and copy the **server-only secret key**. Never paste it in GitHub, the dashboard, a screenshot, or a chat message.
3. Run `powershell -ExecutionPolicy Bypass -File .\start-free-windows.ps1`. Enter the terminal ID and paste the hidden secret key when prompted. Keep this PowerShell window open.
4. Create a free account at https://playit.gg/ and install its Windows agent on the **same PC**. Create a custom **UDP (protocol)** tunnel pointing to local port **7008** on `127.0.0.1`. Keep the agent running. Copy the *external* hostname and port shown by Playit; the external port may differ from 7008.
5. The MT100 manual specifies `PROTOCOL,2,1#` for JT808 and `IP,<external-host>,<external-port>,0#` for UDP, e.g. `IP,example.playit.gg,12345,0#`. Send these through a working device management/SMS channel. If the Airtel portal still says “Not sent,” that must be resolved there before the device can be redirected.
6. Open https://akoliyasonu5-blip.github.io/ZEWAY-IOT-/ and sign in under **Supabase**. A valid GPS fix changes the device from Offline after it reaches the receiver and database.

The receiver's UDP registration/heartbeat exchange is covered by automated local tests. The real MT100 and Airtel network have **not** been tested through Playit. If your PC or the agent stops, live GPS stops. GPS coordinates and device IDs stay private in Supabase with owner-based access rules. The Playit address is used by the device only, not as the dashboard URL.
