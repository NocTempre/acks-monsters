/* global foundry, game, fromUuid */
/**
 * FullMonsterSheet — an ALTERNATE sheet registered (non-default) for the core
 * acks `monster` actor type. Toggle it per-actor from the actor's Sheet
 * Configuration. It reuses the core monster document wholesale (system.hp/aac/
 * saves/details/retainer + weapon/ability/item embedded documents) and layers
 * the extended, structured stat block from MonsterExtras (flags) on top.
 */
import { MODULE_ID, FLAG_EXTRAS } from "./constants.mjs";
import MonsterExtras from "./monster-extras.mjs";
import { ACTIONS } from "./monster-actions.mjs";
import * as CFG from "./config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const T = () => `modules/${MODULE_ID}/templates`;

/* -------------------------------------------- */
/*  Active-effect helpers (self-contained)      */
/* -------------------------------------------- */

function categorizeEffects(effects) {
  const categories = {
    temporary: { label: "ACKS-MONSTERS.effects.temporary", effects: [] },
    passive: { label: "ACKS-MONSTERS.effects.passive", effects: [] },
    inactive: { label: "ACKS-MONSTERS.effects.inactive", effects: [] },
  };
  for (const e of effects) {
    if (e.disabled) categories.inactive.effects.push(e);
    else if (e.isTemporary) categories.temporary.effects.push(e);
    else categories.passive.effects.push(e);
  }
  return categories;
}

function getEffect(sheet, target) {
  const id = target.closest("[data-effect-id]")?.dataset.effectId;
  return id ? sheet.actor.effects.get(id) : null;
}

const EFFECT_ACTIONS = {
  async createEffect() {
    await this.actor.createEmbeddedDocuments("ActiveEffect", [
      { name: game.i18n.localize("ACKS-MONSTERS.new.effect"), img: "icons/svg/aura.svg", origin: this.actor.uuid },
    ]);
  },
  editEffect(event, target) {
    getEffect(this, target)?.sheet?.render(true);
  },
  async deleteEffect(event, target) {
    await getEffect(this, target)?.delete();
  },
  async toggleEffect(event, target) {
    const effect = getEffect(this, target);
    if (effect) await effect.update({ disabled: !effect.disabled });
  },
};

/* -------------------------------------------- */

export default class FullMonsterSheet extends HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["acks", "acks-monsters", "full-monster", "sheet", "actor"],
    position: { width: 760, height: 820 },
    window: { resizable: true, contentClasses: ["standard-form"] },
    form: { submitOnChange: true, closeOnSubmit: false },
    actions: { ...ACTIONS, ...EFFECT_ACTIONS },
    dragDrop: [{ dragSelector: "[data-drag]", dropSelector: null }],
  };

  /** @override */
  static PARTS = {
    header: { template: `${T()}/header.hbs` },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    statblock: { template: `${T()}/tab-statblock.hbs`, scrollable: [""] },
    attacks: { template: `${T()}/tab-attacks.hbs`, scrollable: [""] },
    abilities: { template: `${T()}/tab-abilities.hbs`, scrollable: [""] },
    ecology: { template: `${T()}/tab-ecology.hbs`, scrollable: [""] },
    encounter: { template: `${T()}/tab-encounter.hbs`, scrollable: [""] },
    henchman: { template: `${T()}/tab-henchman.hbs`, scrollable: [""] },
    spoils: { template: `${T()}/tab-spoils.hbs`, scrollable: [""] },
    description: { template: `${T()}/tab-description.hbs`, scrollable: [""] },
    effects: { template: `${T()}/tab-effects.hbs`, scrollable: [""] },
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [
        { id: "statblock", icon: "fa-solid fa-dragon", label: "ACKS-MONSTERS.tab.statblock" },
        { id: "attacks", icon: "fa-solid fa-khanda", label: "ACKS-MONSTERS.tab.attacks" },
        { id: "abilities", icon: "fa-solid fa-star", label: "ACKS-MONSTERS.tab.abilities" },
        { id: "ecology", icon: "fa-solid fa-leaf", label: "ACKS-MONSTERS.tab.ecology" },
        { id: "encounter", icon: "fa-solid fa-dice-d20", label: "ACKS-MONSTERS.tab.encounter" },
        { id: "henchman", icon: "fa-solid fa-handshake", label: "ACKS-MONSTERS.tab.henchman" },
        { id: "spoils", icon: "fa-solid fa-bone", label: "ACKS-MONSTERS.tab.spoils" },
        { id: "description", icon: "fa-solid fa-scroll", label: "ACKS-MONSTERS.tab.description" },
        { id: "effects", icon: "fa-solid fa-sparkles", label: "ACKS-MONSTERS.tab.effects" },
      ],
      initial: "statblock",
    },
  };

  /** @override */
  tabGroups = { primary: "statblock" };

  /** Choices maps consumed by the {{selectOptions}} Handlebars helper. */
  #choices() {
    return {
      types: CFG.choicesOf(CFG.MONSTER_TYPES),
      size: CFG.choicesOf(CFG.SIZES),
      bodyForm: CFG.choicesOf(CFG.BODY_FORMS),
      saveClass: CFG.choicesOf(CFG.SAVE_CLASSES),
      movement: CFG.choicesOf(CFG.MOVEMENT_TYPES),
      vision: CFG.choicesOf(CFG.VISION_TYPES),
      sense: CFG.choicesOf(CFG.SENSE_TYPES),
      intelligence: CFG.choicesOf(CFG.INTELLIGENCE),
      youngType: CFG.choicesOf(CFG.YOUNG_TYPES),
      intervalUnit: CFG.choicesOf(CFG.INTERVAL_UNITS),
      trainedRole: CFG.choicesOf(CFG.TRAINED_ROLES),
      treasure: CFG.choicesOf(CFG.TREASURE_TYPES),
      damage: CFG.choicesOf(CFG.DAMAGE_TYPES),
      natural: CFG.choicesOf(CFG.NATURAL_WEAPONS),
      alignment: { Lawful: "Lawful", Neutral: "Neutral", Chaotic: "Chaotic" },
      category: { henchman: "Henchman", mercenary: "Mercenary", specialist: "Specialist" },
    };
  }

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actor = this.actor;

    context.actor = actor;
    context.system = actor.system;
    context.extras = MonsterExtras.fromActor(actor);
    // Sets → arrays for the {{selectOptions}} `selected` argument.
    context.selected = {
      types: Array.from(context.extras.types ?? []),
      vision: Array.from(context.extras.vision ?? []),
    };
    context.choices = this.#choices();
    context.scores = CFG.ABILITY_SCORES;
    context.ages = CFG.AGE_CATEGORIES;
    context.x = `flags.${MODULE_ID}.${FLAG_EXTRAS}`;
    context.isEditable = this.isEditable;

    context.tabs = this._prepareTabs("primary");

    context.weapons = actor.itemTypes.weapon ?? [];
    context.abilities = actor.itemTypes.ability ?? [];
    context.spoils = actor.itemTypes.item ?? [];

    context.managerName = game.actors.get(actor.system?.retainer?.managerid ?? "")?.name ?? "";

    const TE = foundry.applications.ux.TextEditor.implementation;
    context.treasureLink = await TE.enrichHTML(actor.system?.details?.treasure?.table ?? "", { relativeTo: actor });

    return context;
  }

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = (await super._preparePartContext?.(partId, context, options)) ?? context;
    context.tab = context.tabs?.[partId];
    if (partId === "effects") {
      context.effectCategories = categorizeEffects(this.actor.allApplicableEffects());
    }
    return context;
  }

  /**
   * Normalize the extended stat block on submit: reconstruct arrays, run through
   * the MonsterExtras schema (defaults + null-safe coercion), and mirror the
   * primary number-appearing formulas into the core details.appearing fields so
   * the system's rollAppearing keeps working.
   * @override
   */
  _prepareSubmitData(event, form, formData, updateData) {
    const submitData = super._prepareSubmitData(event, form, formData, updateData);
    const path = `flags.${MODULE_ID}.${FLAG_EXTRAS}`;
    const raw = foundry.utils.getProperty(submitData, path);
    if (raw && typeof raw === "object") {
      // Merge the submitted fields over the stored extras first so that any
      // field not present on the current form is preserved (arrays still
      // replace wholesale), then run the whole thing through the schema.
      const existing = foundry.utils.deepClone(this.actor.getFlag(MODULE_ID, FLAG_EXTRAS) ?? {});
      const merged = foundry.utils.mergeObject(existing, raw, { inplace: false, overwrite: true, insertKeys: true });
      const cleaned = MonsterExtras.normalize(merged);
      foundry.utils.setProperty(submitData, path, cleaned);
      const enc = cleaned.encounter ?? {};
      const d = enc.dungeon?.wandering?.number || enc.dungeon?.lair?.number || "";
      const w = enc.wilderness?.wandering?.number || enc.wilderness?.lair?.number || "";
      if (d) foundry.utils.setProperty(submitData, "system.details.appearing.d", d);
      if (w) foundry.utils.setProperty(submitData, "system.details.appearing.w", w);
    }
    return submitData;
  }

  /** Accept dropped Items (embed) and RollTables (treasure link). @override */
  async _onDrop(event) {
    const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
    if (data?.type === "Item") {
      const item = await getDocumentClass("Item").fromDropData(data);
      if (item && item.parent?.id !== this.actor.id) {
        await this.actor.createEmbeddedDocuments("Item", [item.toObject()]);
      }
      return;
    }
    if (data?.type === "RollTable") {
      const table = await fromUuid(data.uuid);
      if (table) await this.actor.update({ "system.details.treasure.table": table.link });
      return;
    }
    return super._onDrop?.(event);
  }
}
