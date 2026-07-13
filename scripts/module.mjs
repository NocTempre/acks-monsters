/* global game, foundry, Hooks, CONFIG */
/**
 * ACKS II — Full Monster Sheet.
 *
 * Registers an alternate (non-default) sheet for the core `monster` actor type
 * — no new document sub-type — and an item-sheet annotator. All extended
 * storage lives in `flags["acks-monsters"]`; nothing here mutates the acks
 * system. Toggle the sheet per-actor from the actor's Sheet Configuration.
 */
import { MODULE_ID, FLAG_EXTRAS, MONSTER_TYPE } from "./constants.mjs";
import FullMonsterSheet from "./monster-sheet.mjs";
import MonsterExtras from "./monster-extras.mjs";
import { registerItemAnnotations } from "./item-annotations.mjs";
import * as config from "./config.mjs";

/** Register the module's Handlebars helpers. */
function registerHelpers() {
  const Handlebars = globalThis.Handlebars;
  if (!Handlebars) return;
  // Value-or-dash that treats a real 0 as a value (only null/""/undefined dash).
  Handlebars.registerHelper("acksmVal", (value, dash) => {
    const fallback = typeof dash === "string" ? dash : "—";
    return value === null || value === undefined || value === "" ? fallback : value;
  });
}

Hooks.once("init", () => {
  registerHelpers();

  // Alternate sheet for the core monster type (user toggles via Sheet Config).
  foundry.applications.apps.DocumentSheetConfig.registerSheet(Actor, MODULE_ID, FullMonsterSheet, {
    types: [MONSTER_TYPE],
    makeDefault: false,
    label: "ACKS-MONSTERS.sheet.full",
  });

  registerItemAnnotations();

  // Public API for consumer modules (which add behavior on this stored data).
  const api = {
    MODULE_ID,
    FLAG_EXTRAS,
    FullMonsterSheet,
    MonsterExtras,
    config,
    /** Read the extended stat block for an actor (a MonsterExtras instance). */
    getExtras: (actor) => MonsterExtras.fromActor(actor),
  };
  const module = game.modules.get(MODULE_ID);
  if (module) module.api = api;
  globalThis.acksMonsters = api;

  // Best-effort template preload.
  try {
    const T = `modules/${MODULE_ID}/templates`;
    foundry.applications.handlebars.loadTemplates([
      `${T}/header.hbs`,
      `${T}/tab-statblock.hbs`,
      `${T}/tab-attacks.hbs`,
      `${T}/tab-abilities.hbs`,
      `${T}/tab-ecology.hbs`,
      `${T}/tab-encounter.hbs`,
      `${T}/tab-henchman.hbs`,
      `${T}/tab-spoils.hbs`,
      `${T}/tab-description.hbs`,
      `${T}/tab-effects.hbs`,
    ]);
  } catch (err) {
    console.warn(`${MODULE_ID} | template preload skipped`, err);
  }
});

Hooks.once("ready", () => {
  if (game.system?.id !== "acks") {
    console.warn(`${MODULE_ID} | Active system is not "acks"; the Full Monster sheet expects acks monster actors.`);
  }
});

/* Actor-directory convenience: open the Full Monster sheet directly. */
Hooks.on("getActorContextOptions", (_directory, options) => {
  const findActor = (li) => {
    const el = li instanceof HTMLElement ? li : li?.[0];
    const id = el?.dataset?.entryId ?? el?.dataset?.documentId;
    return id ? game.actors.get(id) : null;
  };
  options.push({
    name: "ACKS-MONSTERS.context.openFull",
    icon: '<i class="fa-solid fa-dragon"></i>',
    condition: (li) => findActor(li)?.type === MONSTER_TYPE,
    callback: (li) => {
      const actor = findActor(li);
      if (actor) new FullMonsterSheet({ document: actor }).render(true);
    },
  });
});
