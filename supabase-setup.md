# ZEWAY IoT Supabase

Project: ZEWAY IOT (`wllrbpxmfhbdobexiswl`)

The dashboard uses email/password authentication. Device and vehicle records belong to the signed-in user. GPS positions are readable only by their owner, and the browser cannot write them. A separate, authenticated TCP receiver will need to insert positions using a server-only key after compatible GPS packets are validated. Never put that key in GitHub or the browser.

The existing device registry is saved in the current browser; after signing in, use **Sync this browser's devices** to upload its records. Adding/editing/removing a device while signed in writes to Supabase. A registered device appears offline until a GPS fix reaches the database. Physical lock/unlock is disabled.

Supabase cannot listen for a tracker's raw TCP connection. The receiver needs a separate public TCP host. The GitHub Pages site is the frontend.

On the TCP receiver host, set `SUPABASE_URL=https://wllrbpxmfhbdobexiswl.supabase.co` and `SUPABASE_SECRET_KEY` using the project's server-only secret key, along with `TERMINAL_IDS` and `API_TOKEN`. The receiver checks whether each JT808 terminal ID is registered to an account and writes its valid GPS fixes as that owner's positions. The dashboard reads them every ten seconds. The IMEI-only entry must be edited to include the device's actual JT808 terminal ID before a fix can be linked.

The supplied TrackingTheWorld MT-100 datasheet identifies @Track. The current raw TCP decoder handles JT/T 808 only; do not configure that MT-100 to use it until its actual protocol is confirmed and an @Track adapter is implemented.
