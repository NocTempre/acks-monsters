/* global foundry, game, ui, CONST */
/**
 * Action handlers for the Full Monster sheet. Each function is registered in the
 * sheet's DEFAULT_OPTIONS.actions and invoked by ApplicationV2 with `this` bound
 * to the sheet instance (so `this.actor` is the monster).
 *
 * Where the core acks system already implements behavior we call through to it
 * (rollHP, rollReaction, rollAppearing) rather than reinventing it. Saves are
 * generated from the module's own MONSTER_SAVES_LUT and written to the reused
 * core `system.saves.*` fields.
 */
import { MODULE_ID, FLAG_EXTRAS } from "./constants.mjs";
import MonsterExtras from "./monster-extras.mjs";
import { savesForLevel } from "./config.mjs";

/** Default blank row for each array-valued extras path. */
function defaultRow(path) {
  switch (path) {
    case "speeds":
      return { type: "land", combat: null, run: null, hover: false };
    case "otherSenses":
      return { type: "acuteHearing", range: null, note: "" };
    case "secondary.trainedValue":
      return { role: "guard", value: null, note: "" };
    case "variants":
      return { label: "", uuid: null };
    default:
      return {};
  }
}

/** Persist a mutated copy of the extras object back to the actor flag. */
async function mutateExtras(actor, mutator) {
  const extras = MonsterExtras.fromActor(actor).toObject();
  mutator(extras);
  return actor.setFlag(MODULE_ID, FLAG_EXTRAS, extras);
}

/* -------------------------------------------- */
/*  Array row management                        */
/* -------------------------------------------- */

async function addRow(event, target) {
  const path = target.dataset.path;
  await mutateExtras(this.actor, (extras) => {
    const arr = foundry.utils.getProperty(extras, path) ?? [];
    arr.push(defaultRow(path));
    foundry.utils.setProperty(extras, path, arr);
  });
}

async function removeRow(event, target) {
  const path = target.dataset.path;
  const index = Number(target.dataset.index);
  await mutateExtras(this.actor, (extras) => {
    const arr = foundry.utils.getProperty(extras, path) ?? [];
    if (index >= 0 && index < arr.length) arr.splice(index, 1);
    foundry.utils.setProperty(extras, path, arr);
  });
}

/* -------------------------------------------- */
/*  Embedded items (attacks / abilities / spoils)*/
/* -------------------------------------------- */

const NEW_ITEM_DEFAULTS = {
  weapon: { key: "ACKS-MONSTERS.new.attack", flags: { melee: true } },
  ability: { key: "ACKS-MONSTERS.new.ability" },
  item: { key: "ACKS-MONSTERS.new.spoil" },
};

async function createItem(event, target) {
  const type = target.dataset.itemType;
  const def = NEW_ITEM_DEFAULTS[type] ?? { key: "ACKS-MONSTERS.new.item" };
  const data = { name: game.i18n.localize(def.key), type };
  if (def.flags) data.system = def.flags;
  const [item] = await this.actor.createEmbeddedDocuments("Item", [data]);
  item?.sheet?.render(true);
}

function getItem(sheet, target) {
  const id = target.closest("[data-item-id]")?.dataset.itemId;
  return id ? sheet.actor.items.get(id) : null;
}

function editItem(event, target) {
  getItem(this, target)?.sheet?.render(true);
}

async function deleteItem(event, target) {
  const item = getItem(this, target);
  if (!item) return;
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize("ACKS-MONSTERS.confirm.deleteItemTitle") },
    content: `<p>${game.i18n.format("ACKS-MONSTERS.confirm.deleteItem", { name: item.name })}</p>`,
  });
  if (confirmed) await item.delete();
}

/* -------------------------------------------- */
/*  Saves                                       */
/* -------------------------------------------- */

async function generateSaves() {
  const extras = MonsterExtras.fromActor(this.actor);
  const level = extras.saveAs?.level ?? extras.hd?.count ?? 0;
  const s = savesForLevel(Math.floor(level));
  await this.actor.update({
    "system.saves.paralysis.value": s.paralysis,
    "system.saves.death.value": s.death,
    "system.saves.blast.value": s.blast,
    "system.saves.implements.value": s.implements,
    "system.saves.spell.value": s.spell,
  });
  ui.notifications.info(game.i18n.format("ACKS-MONSTERS.notify.savesGenerated", { band: s.band }));
}

/* -------------------------------------------- */
/*  Henchman attachment (core blocks the built-in path for monsters) */
/* -------------------------------------------- */

async function serveAsHenchman() {
  const managers = game.actors.filter((a) => a.type === "character");
  if (!managers.length) {
    ui.notifications.warn(game.i18n.localize("ACKS-MONSTERS.notify.noManagers"));
    return;
  }
  const current = this.actor.system?.retainer?.managerid ?? "";
  const options = managers
    .map((m) => `<option value="${m.id}" ${m.id === current ? "selected" : ""}>${foundry.utils.escapeHTML(m.name)}</option>`)
    .join("");
  const managerId = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("ACKS-MONSTERS.henchman.serveTitle") },
    content: `<p>${game.i18n.localize("ACKS-MONSTERS.henchman.servePrompt")}</p>
      <select name="managerId" style="width:100%">${options}</select>`,
    ok: {
      label: game.i18n.localize("ACKS-MONSTERS.henchman.serve"),
      callback: (_event, button) => button.form.elements.managerId.value,
    },
  });
  if (!managerId) return;
  const manager = game.actors.get(managerId);
  if (!manager) return;

  await this.actor.update({ "system.retainer.enabled": true, "system.retainer.managerid": managerId });

  // Reuse the core data structure the built-in henchman flow uses.
  const list = foundry.utils.deepClone(manager.system?.henchmenList ?? []);
  if (!list.includes(this.actor.id)) {
    list.push(this.actor.id);
    await manager.update({ "system.henchmenList": list });
  }
  ui.notifications.info(game.i18n.format("ACKS-MONSTERS.notify.henchmanSet", { name: manager.name }));
}

/* -------------------------------------------- */
/*  Roll passthroughs to core AcksActor methods  */
/* -------------------------------------------- */

function rollHp() {
  this.actor.rollHP?.();
}

function rollReaction(event) {
  this.actor.rollReaction?.({ event });
}

function rollAppearing(event, target) {
  const check = target.dataset.check; // "dungeon" | "wilderness"
  this.actor.rollAppearing?.({ event, check });
}

async function treasureDelete() {
  await this.actor.update({ "system.details.treasure.table": "", "system.details.treasure.type": "" });
}

export const ACTIONS = {
  addRow,
  removeRow,
  createItem,
  editItem,
  deleteItem,
  generateSaves,
  serveAsHenchman,
  rollHp,
  rollReaction,
  rollAppearing,
  treasureDelete,
};
