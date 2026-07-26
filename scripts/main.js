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
/* Settings — these are now just DEFAULTS used when a scene hasn't    */
/* been given its own True Map config yet.                            */
/* ------------------------------------------------------------------ */
Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "defaultRevealRadius", {
    name: "Default Reveal Radius (px)",
    hint: "Used as the starting value when setting up a new scene's true map.",
    scope: "world",
    config: true,
    type: Number,
    default: 300
  });

  game.settings.register(MODULE_ID, "defaultSoftEdge", {
    name: "Default Soft Edge Feather (px)",
    hint: "Used as the starting value when setting up a new scene's true map.",
    scope: "world",
    config: true,
    type: Number,
    default: 80
  });

  game.settings.register(MODULE_ID, "defaultFollowSpeed", {
    name: "Default Follow Speed",
    hint: "1 = instant follow, lower = smoother glide. Used as the starting value for new scenes.",
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
  const rect = canvas.dimensions.sceneRect;
  const bg = canvas.scene.background ?? {};
  sprite.x = rect.x + (bg.offsetX ?? 0);
  sprite.y = rect.y + (bg.offsetY ?? 0);
  sprite.width = rect.width;
  sprite.height = rect.height;

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
/* Socket listener + API                                               */
/* ------------------------------------------------------------------ */
Hooks.once("ready", () => {
  game.socket.on(SOCKET_CHANNEL, (payload) => {
    if (payload.action === "enable") {
      buildReveal(payload.tokenId, payload.sceneId, payload.config);
    } else if (payload.action === "disable") {
      teardownReveal();
    }
  });

  // Late-join / reload / scene-switch sync: check the ACTIVE scene's
  // reveal-state flag whenever the canvas becomes ready.
  Hooks.on("canvasReady", () => {
    teardownReveal();
    const activeFlag = canvas.scene?.getFlag(MODULE_ID, "activeState");
    if (activeFlag?.active) {
      buildReveal(activeFlag.tokenId, canvas.scene.id, activeFlag.config);
    }
  });

  const mod = game.modules.get(MODULE_ID);
  mod.api = {
    /**
     * Set (or update) the True Map configuration for the CURRENT scene.
     * Run this once per scene. Safe to re-run to change the image/settings.
     */
    async setSceneConfig({ trueMapPath, revealRadius, softEdge, followSpeed } = {}) {
      if (!game.user.isGM) {
        ui.notifications.warn("Only the GM can configure the True Map Reveal.");
        return;
      }
      if (!canvas.scene) {
        ui.notifications.warn("No active scene.");
        return;
      }
      if (!trueMapPath) {
        ui.notifications.error("You must provide a trueMapPath.");
        return;
      }

      const config = {
        trueMapPath,
        revealRadius: revealRadius ?? game.settings.get(MODULE_ID, "defaultRevealRadius"),
        softEdge: softEdge ?? game.settings.get(MODULE_ID, "defaultSoftEdge"),
        followSpeed: followSpeed ?? game.settings.get(MODULE_ID, "defaultFollowSpeed")
      };

      await canvas.scene.setFlag(MODULE_ID, "sceneConfig", config);
      ui.notifications.info(`True Map config saved for scene "${canvas.scene.name}".`);
    },

    /** Get the current scene's True Map config, if any. */
    getSceneConfig() {
      return canvas.scene?.getFlag(MODULE_ID, "sceneConfig") ?? null;
    },

    /**
     * Enable the reveal for the currently controlled token, using
     * THIS SCENE's saved True Map config (set via setSceneConfig first).
     */
    async enableForControlledToken() {
      if (!game.user.isGM) {
        ui.notifications.warn("Only the GM can toggle the True Map Reveal.");
        return;
      }
      const token = canvas.tokens.controlled[0];
      if (!token) {
        ui.notifications.warn("Select a token first.");
        return;
      }

      const config = canvas.scene.getFlag(MODULE_ID, "sceneConfig");
      if (!config?.trueMapPath) {
        ui.notifications.error(
          `No True Map configured for scene "${canvas.scene.name}" yet. Run the "Set True Map for This Scene" macro first.`
        );
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
      await canvas.scene.setFlag(MODULE_ID, "activeState", { active: true, tokenId: token.id, config });

      ui.notifications.info("True Map Reveal enabled for all clients.");
    },

    async disable() {
      if (!game.user.isGM) {
        ui.notifications.warn("Only the GM can toggle the True Map Reveal.");
        return;
      }
      game.socket.emit(SOCKET_CHANNEL, { action: "disable" });
      teardownReveal();
      await canvas.scene.setFlag(MODULE_ID, "activeState", { active: false });
      ui.notifications.info("True Map Reveal disabled for all clients.");
    }
  };
});
