/**
 * True Map Reveal — GM Toggle
 * ------------------------------------------------------------
 * Requires the "True Map Reveal" MODULE to be installed and enabled.
 * Configure the image path/radius/etc. in Game Settings > Module Settings
 * before using this.
 *
 * Select a token, then run this macro to enable the reveal for everyone.
 * Run it again (token selection doesn't matter) to disable it.
 */

const api = game.modules.get("true-map-reveal")?.api;

if (!api) {
  ui.notifications.error("True Map Reveal module is not installed/enabled.");
} else if (canvas.trueMapRevealMacroState?.active) {
  await api.disable();
  canvas.trueMapRevealMacroState = { active: false };
} else {
  await api.enableForControlledToken();
  canvas.trueMapRevealMacroState = { active: true };
}
