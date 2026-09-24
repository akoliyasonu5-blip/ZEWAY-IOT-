# ZEWAY IoT Supabase

Project: ZEWAY IOT (`wllrbpxmfhbdobexiswl`)

The dashboard uses email/password authentication. Device and vehicle records belong to the signed-in user. GPS positions are readable only by their owner, and the browser cannot write them. A separate, authenticated TCP receiver will need to insert positions using a server-only key after MT100 packets are validated. Never put that key in GitHub or the browser.

The existing device registry is saved in the current browser; after signing in, use **Sync this browser's devices** to upload its records. Adding/editing/removing a device while signed in writes to Supabase. A registered device appears offline until a GPS fix reaches the database. Physical lock/unlock is disabled outside sample mode.

Supabase cannot listen for the MT100's raw JT808 TCP connection. The receiver needs a separate public TCP host. The GitHub Pages site is the frontend.
