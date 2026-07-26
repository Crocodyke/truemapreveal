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

## Configuration — now PER SCENE (v1.1.0+)

Each scene remembers its own true map image and settings independently, so
you can freely switch between the Town of Reverie, the three simulated
worlds, etc. and each one keeps its own configuration.

**Optional world-wide defaults:** Game Settings → Configure Settings →
Module Settings lets you set default radius/feather/follow-speed values
used to pre-fill the per-scene dialog (purely a convenience, not required).

**Per-scene setup:**
1. Create a new **Script Macro** and paste in `set-scene-truemap-macro.js`.
2. While viewing the scene you want to configure, run this macro.
3. A dialog opens — browse to (or paste) the true-map image path for THIS
   scene, adjust radius/feather/follow speed if you like, and click Save.
4. Repeat once for each scene that needs its own true map. You only need to
   do this once per scene, ever — it's remembered from then on.

## Usage

1. Create a second **Script Macro** and paste in `gm-toggle-macro.js`.
2. Navigate to the scene you want (make sure you've already set its true
   map via the macro above at least once).
3. Select the token you want the reveal centered on.
4. Run the toggle macro. Every connected player will immediately see the
   true map revealed in a circle following that token — no action required
   on their end.
5. Run the toggle macro again to turn it off for everyone.
6. Switching to a different scene and running the toggle macro there will
   automatically use THAT scene's own configured true map.

## Notes

- Only the GM can trigger enable/disable (by design).
- State is stored on the scene, so if a player reloads or joins late while
  the reveal is active, it will automatically sync back in for them.
- Switching scenes automatically tears down the reveal (it's scene-specific).
- This has not been tested live against your specific world/system — if you
  hit a console error, copy the exact text and I'll help debug it.
