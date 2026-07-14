/* global foundry, game, ui */
/**
 * Actions added by the Full Monster sheet on top of the system's monster sheet.
 * Item CRUD, active effects, Generate Saves, and reaction/HP/encounter rolls are
 * all inherited from the base sheet — we only add the array-row editors and the
 * henchman-attach helper.
 *
 * Each is invoked by ApplicationV2 with `this` bound to the sheet instance.
 */
import { MODULE_ID, FLAG_EXTRAS } from "./constants.mjs";
import MonsterExtras from "./monster-extras.mjs";

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

/**
 * Attach this monster as a henchman of a chosen character. The core system's
 * built-in addHenchman rejects non-character actors, so we set the reused
 * retainer fields and append to the manager's henchmenList directly.
 */
async function serveAsHenchman() {
  const managers = game.actors.filter((a) => a.type === "character");
  if (!managers.length) {
    ui.notifications.warn(game.i18n.localize("ACKS-MONSTERS.notify.noManagers"));
    return;
  }
  const current = this.actor.system?.retainer?.managerid ?? "";
  const optionsHtml = managers
    .map((m) => `<option value="${m.id}" ${m.id === current ? "selected" : ""}>${foundry.utils.escapeHTML(m.name)}</option>`)
    .join("");
  const managerId = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("ACKS-MONSTERS.henchman.serveTitle") },
    content: `<p>${game.i18n.localize("ACKS-MONSTERS.henchman.servePrompt")}</p>
      <select name="managerId" style="width:100%">${optionsHtml}</select>`,
    ok: {
      label: game.i18n.localize("ACKS-MONSTERS.henchman.serve"),
      callback: (_event, button) => button.form.elements.managerId.value,
    },
  });
  if (!managerId) return;
  const manager = game.actors.get(managerId);
  if (!manager) return;

  await this.actor.update({ "system.retainer.enabled": true, "system.retainer.managerid": managerId });
  const list = foundry.utils.deepClone(manager.system?.henchmenList ?? []);
  if (!list.includes(this.actor.id)) {
    list.push(this.actor.id);
    await manager.update({ "system.henchmenList": list });
  }
  ui.notifications.info(game.i18n.format("ACKS-MONSTERS.notify.henchmanSet", { name: manager.name }));
}

export const ACTIONS = { addRow, removeRow, serveAsHenchman };
