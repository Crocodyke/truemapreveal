const MODULE_ID = "true-map-reveal";
const SOCKET_CHANNEL = `module.${MODULE_ID}`;

let state = {
  active: false,
  tokenId: null,
  container: null,
  hookId: null,
  ticker: null
};

/* ------------------------------------------------------------------ */
/* Settings — GM configures these once via Module Settings            */
/* ------------------------------------------------------------------ */
Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "trueMapPath", {
    name: "True Map Image Path",
    hint: "Path to the 'true map' image. Must match the current scene's dimensions/alignment for the reveal to line up.",
    scope: "world",
    config: true,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, "revealRadius", {
    name: "Reveal Radius (px)",
    hint: "Radius of the soft reveal circle around the token, in pixels.",
    scope: "world",
    config: true,
    type: Number,
    default: 300
  });

  game.settings.register(MODULE_ID, "softEdge", {
    name: "Soft Edge Feather (px)",
    hint: "How feathered the edge of the reveal circle is, in pixels.",
    scope: "world",
    config: true,
    type: Number,
    default: 80
  });

  game.settings.register(MODULE_ID, "followSpeed", {
    name: "Follow Speed",
    hint: "1 = instant follow. Lower values (e.g. 0.2) make the reveal glide/lag behind the token for a smoother feel.",
    scope: "world",
    config: true,
    type: Number,
    default: 1.0
  });
});

/* ------------------------------------------------------------------ */
/* Core reveal logic — runs identically on every client               */
/* ------------------------------------------------------------------ */
async function buildReveal(tokenId, sceneId, config) {
  if (canvas.scene?.id !== sceneId) return;

  const token = canvas.tokens.get(tokenId);
  if (!token) {
    console.warn(`${MODULE_ID}: token ${tokenId} not found on this scene.`);
    return;
  }

  teardownReveal();

  const texture = await loadTexture(config.trueMapPath);
  if (!texture) {
    ui.notifications.error(`${MODULE_ID}: could not load image at ${config.trueMapPath}`);
    return;
  }

  const sprite = new PIXI.Sprite(texture);
  sprite.x = 0;
  sprite.y = 0;
  sprite.width = canvas.scene.width;
  sprite.height = canvas.scene.height;

  const maskRadius = config.revealRadius;
  const softEdge = config.softEdge;
  const maskSize = (maskRadius + softEdge) * 2;

  const gradCanvas = document.createElement("canvas");
  gradCanvas.width = maskSize;
  gradCanvas.height = maskSize;
  const ctx = gradCanvas.getContext("2d");
  const grad = ctx.createRadialGradient(
    maskSize / 2, maskSize / 2, Math.max(maskRadius - softEdge, 0),
    maskSize / 2, maskSize / 2, maskRadius + softEdge
  );
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, maskSize, maskSize);

  const maskTexture = PIXI.Texture.from(gradCanvas);
  const maskSprite = new PIXI.Sprite(maskTexture);
  maskSprite.anchor.set(0.5);

  sprite.mask = maskSprite;

  const container = new PIXI.Container();
  container.addChild(sprite);
  container.addChild(maskSprite);
  canvas.primary.addChild(container);

  const updatePosition = () => {
    const center = token.center ?? { x: token.x + token.w / 2, y: token.y + token.h / 2 };
    maskSprite.x += (center.x - maskSprite.x) * (config.followSpeed ?? 1);
    maskSprite.y += (center.y - maskSprite.y) * (config.followSpeed ?? 1);
  };
  updatePosition();

  const hookId = Hooks.on("refreshToken", (refreshedToken) => {
    if (refreshedToken.id === tokenId) updatePosition();
  });

  const ticker = () => updatePosition();
  canvas.app.ticker.add(ticker);

  state = { active: true, tokenId, container, hookId, ticker };
}

function teardownReveal() {
  if (state.container) state.container.destroy({ children: true });
  if (state.hookId) Hooks.off("refreshToken", state.hookId);
  if (state.ticker) canvas.app.ticker.remove(state.ticker);
  state = { active: false, tokenId: null, container: null, hookId: null, ticker: null };
}

/* ------------------------------------------------------------------ */
/* Socket listener — receives broadcasts from the GM's client         */
/* ------------------------------------------------------------------ */
Hooks.once("ready", () => {
  game.socket.on(SOCKET_CHANNEL, (payload) => {
    if (payload.action === "enable") {
      buildReveal(payload.tokenId, payload.sceneId, payload.config);
    } else if (payload.action === "disable") {
      teardownReveal();
    }
  });

  // Late-join / reload sync: check scene flag on canvas ready
  Hooks.on("canvasReady", () => {
    teardownReveal();
    const flag = canvas.scene?.getFlag(MODULE_ID, "state");
    if (flag?.active) {
      buildReveal(flag.tokenId, canvas.scene.id, flag.config);
    }
  });

  // Expose a simple API for macros: game.modules.get('true-map-reveal').api
  const mod = game.modules.get(MODULE_ID);
  mod.api = {
    /**
     * Enable the reveal for the currently controlled token (GM only).
     * Uses configured module settings unless overrides are passed.
     */
    async enableForControlledToken(overrides = {}) {
      if (!game.user.isGM) {
        ui.notifications.warn("Only the GM can toggle the True Map Reveal.");
        return;
      }
      const token = canvas.tokens.controlled[0];
      if (!token) {
        ui.notifications.warn("Select a token first.");
        return;
      }

      const config = {
        trueMapPath: overrides.trueMapPath ?? game.settings.get(MODULE_ID, "trueMapPath"),
        revealRadius: overrides.revealRadius ?? game.settings.get(MODULE_ID, "revealRadius"),
        softEdge: overrides.softEdge ?? game.settings.get(MODULE_ID, "softEdge"),
        followSpeed: overrides.followSpeed ?? game.settings.get(MODULE_ID, "followSpeed")
      };

      if (!config.trueMapPath) {
        ui.notifications.error("Set the True Map Image Path in Module Settings first.");
        return;
      }

      const payload = {
        action: "enable",
        tokenId: token.id,
        sceneId: canvas.scene.id,
        config
      };

      game.socket.emit(SOCKET_CHANNEL, payload);
      await buildReveal(payload.tokenId, payload.sceneId, payload.config); // local render for GM
      await canvas.scene.setFlag(MODULE_ID, "state", { active: true, tokenId: token.id, config });

      ui.notifications.info("True Map Reveal enabled for all clients.");
    },

    async disable() {
      if (!game.user.isGM) {
        ui.notifications.warn("Only the GM can toggle the True Map Reveal.");
        return;
      }
      game.socket.emit(SOCKET_CHANNEL, { action: "disable" });
      teardownReveal();
      await canvas.scene.setFlag(MODULE_ID, "state", { active: false });
      ui.notifications.info("True Map Reveal disabled for all clients.");
    }
  };
});
