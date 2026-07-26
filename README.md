# True Map Reveal — Foundry VTT Module (V13/V14 compatible)

Reveals a second "true map" image in a soft circle that follows a chosen
token, synced live to every connected client automatically — no per-session
setup for players.

## Installation

**Option A — Manual (recommended for a personal/home-hosted world):**
1. Locate your Foundry `Data/modules/` folder.
2. Copy the entire `true-map-reveal` folder into `Data/modules/` so you have:
   `Data/modules/true-map-reveal/module.json` (and the `scripts/` folder alongside it).
3. Restart Foundry (or just refresh the Setup screen).
4. In your World, go to **Game Settings → Manage Modules**, find
   **"True Map Reveal"**, and check the box to enable it.
5. Launch your world.

**Option B — The Forge (cloud hosting):**
- The Forge doesn't support arbitrary local module folders the same way as
  self-hosted installs. The most reliable path is to zip this folder and use
  The Forge's **"Install from Manifest URL"** feature by first uploading the
  zip somewhere with a direct download link (e.g. a GitHub repo release),
  then pointing Forge at the raw `module.json` URL. If you tell me you're on
  The Forge specifically, I can help you get it hosted properly (e.g. a
  simple GitHub repo) so the manifest URL works.

## Configuration (one-time, per world)

1. As GM, go to **Game Settings → Configure Settings → Module Settings**.
2. Find the **True Map Reveal** section and set:
   - **True Map Image Path** — path to your true-map image (must match the
     current scene's dimensions/alignment so the reveal lines up correctly).
   - **Reveal Radius** — how big the circle is, in pixels.
   - **Soft Edge Feather** — how blurred/feathered the edge is, in pixels.
   - **Follow Speed** — 1 = instant follow, lower = smoother lag behind the token.
3. Save.

## Usage

1. Create a new **Script Macro** and paste in the contents of
   `gm-toggle-macro.js` (included in this folder).
2. Select the token you want the reveal centered on.
3. Run the macro. Every connected player will immediately see the true map
   revealed in a circle following that token — no action required on their end.
4. Run the macro again to turn it off for everyone.

## Notes

- Only the GM can trigger enable/disable (by design).
- State is stored on the scene, so if a player reloads or joins late while
  the reveal is active, it will automatically sync back in for them.
- Switching scenes automatically tears down the reveal (it's scene-specific).
- This has not been tested live against your specific world/system — if you
  hit a console error, copy the exact text and I'll help debug it.
