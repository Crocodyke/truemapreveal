/**
 * True Map Reveal — GM Toggle
 * ------------------------------------------------------------
 * Requires the "True Map Reveal" MODULE to be installed and enabled.
 * Requires you to have already run "Set True Map for This Scene" at
 * least once for the scene you're currently viewing.
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
