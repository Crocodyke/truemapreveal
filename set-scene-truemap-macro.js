/**
 * True Map Reveal — Set True Map For This Scene
 * ------------------------------------------------------------
 * Run this ONCE per scene (re-run any time to change it) to tell the
 * module which "true map" image belongs to the CURRENTLY VIEWED scene.
 * Each scene remembers its own true map, radius, etc. independently.
 */

const api = game.modules.get("true-map-reveal")?.api;

if (!api) {
  ui.notifications.error("True Map Reveal module is not installed/enabled.");
} else if (!canvas.scene) {
  ui.notifications.warn("No active scene.");
} else {
  const existing = api.getSceneConfig() ?? {};

  new Dialog({
    title: `Set True Map — ${canvas.scene.name}`,
    content: `
      <form>
        <div class="form-group">
          <label>True Map Image Path</label>
          <div style="display:flex; gap:4px;">
            <input type="text" name="trueMapPath" value="${existing.trueMapPath ?? ""}" style="flex:1;"/>
            <button type="button" id="tmr-browse">Browse</button>
          </div>
        </div>
        <div class="form-group">
          <label>Reveal Radius (px)</label>
          <input type="number" name="revealRadius" value="${existing.revealRadius ?? game.settings.get("true-map-reveal", "defaultRevealRadius")}"/>
        </div>
        <div class="form-group">
          <label>Soft Edge Feather (px)</label>
          <input type="number" name="softEdge" value="${existing.softEdge ?? game.settings.get("true-map-reveal", "defaultSoftEdge")}"/>
        </div>
        <div class="form-group">
          <label>Follow Speed (1 = instant)</label>
          <input type="number" step="0.1" name="followSpeed" value="${existing.followSpeed ?? game.settings.get("true-map-reveal", "defaultFollowSpeed")}"/>
        </div>
      </form>
    `,
    buttons: {
      save: {
        label: "Save",
        callback: async (html) => {
          const form = html[0].querySelector("form");
          const trueMapPath = form.trueMapPath.value.trim();
          const revealRadius = Number(form.revealRadius.value);
          const softEdge = Number(form.softEdge.value);
          const followSpeed = Number(form.followSpeed.value);

          if (!trueMapPath) {
            ui.notifications.error("You must provide an image path.");
            return;
          }

          await api.setSceneConfig({ trueMapPath, revealRadius, softEdge, followSpeed });
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "save",
    render: (html) => {
      html.find("#tmr-browse").click(() => {
        const input = html.find('input[name="trueMapPath"]')[0];
        new FilePicker({
          type: "image",
          current: input.value,
          callback: (path) => (input.value = path)
        }).render(true);
      });
    }
  }).render(true);
}
