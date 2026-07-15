/* global foundry, game */
/**
 * The Full Monster sheet is created at init time as a SUBCLASS of the system's
 * own registered monster sheet (resolved from CONFIG.Actor.sheetClasses). It
 * inherits the compact header, item/effect/save actions, Generate Saves, and
 * CSS, and REPLACES the tab set with a cleaner one:
 *
 *   Classification · Attacks · Abilities · Inventory · Defenses & Magic ·
 *   Ecology · Henchman · Spells (system) · Description · Effects (system)
 *
 * Attacks (weapons), Abilities (ability items), and Inventory (items/armor)
 * are deliberately separate lists. Header and the Spells/Effects tabs reuse the
 * system's own templates so they stay pixel-identical to the default sheet.
 */
import { MODULE_ID, FLAG_EXTRAS } from "./constants.mjs";
import MonsterExtras from "./monster-extras.mjs";
import { ACTIONS } from "./monster-actions.mjs";
import * as CFG from "./config.mjs";

const T = `modules/${MODULE_ID}/templates`;

/** { key: label } choices maps consumed by templates. */
function choices() {
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
    alignment: { Lawful: "Lawful", Neutral: "Neutral", Chaotic: "Chaotic" },
    category: { henchman: "Henchman", mercenary: "Mercenary", specialist: "Specialist" },
  };
}

/**
 * Build the Full Monster sheet class extending the system's monster sheet.
 * @param {typeof foundry.applications.api.ApplicationV2} Base  The system's monster sheet class.
 */
export function createFullMonsterSheet(Base) {
  const P = Base.PARTS ?? {};
  const OWN = {
    classification: { template: `${T}/tab-classification.hbs`, scrollable: [""] },
    attacks: { template: `${T}/tab-attacks.hbs`, scrollable: [""] },
    abilities: { template: `${T}/tab-abilities.hbs`, scrollable: [""] },
    inventory: { template: `${T}/tab-inventory.hbs`, scrollable: [""] },
    spoils: { template: `${T}/tab-spoils.hbs`, scrollable: [""] },
    defenses: { template: `${T}/tab-defenses.hbs`, scrollable: [""] },
    ecology: { template: `${T}/tab-ecology.hbs`, scrollable: [""] },
    henchman: { template: `${T}/tab-henchman.hbs`, scrollable: [""] },
    description: { template: `${T}/tab-description.hbs`, scrollable: [""] },
  };

  // Reuse the system's header/tabs/spells/effects parts; drop its mixed
  // "attributes" and "notes" parts (their content now lives in our tabs).
  const parts = { header: P.header, tabs: P.tabs, ...OWN };
  if (P.spells) parts.spells = P.spells;
  if (P.effects) parts.effects = P.effects;

  const tabList = [
    { id: "classification", icon: "fa-solid fa-dragon", label: "ACKS-MONSTERS.tab.classification" },
    { id: "attacks", icon: "fa-solid fa-khanda", label: "ACKS-MONSTERS.tab.attacks" },
    { id: "abilities", icon: "fa-solid fa-star", label: "ACKS-MONSTERS.tab.abilities" },
    { id: "inventory", icon: "fa-solid fa-sack", label: "ACKS-MONSTERS.tab.inventory" },
    { id: "spoils", icon: "fa-solid fa-bone", label: "ACKS-MONSTERS.tab.spoils" },
    { id: "defenses", icon: "fa-solid fa-shield-halved", label: "ACKS-MONSTERS.tab.defenses" },
    { id: "ecology", icon: "fa-solid fa-leaf", label: "ACKS-MONSTERS.tab.ecology" },
    { id: "henchman", icon: "fa-solid fa-handshake", label: "ACKS-MONSTERS.tab.henchman" },
  ];
  if (P.spells) tabList.push({ id: "spells", icon: "fa-solid fa-wand-sparkles", label: "ACKS.category.spells" });
  tabList.push({ id: "description", icon: "fa-solid fa-scroll", label: "ACKS-MONSTERS.tab.description" });
  if (P.effects) tabList.push({ id: "effects", icon: "fa-solid fa-sparkles", label: "ACKS.category.effects" });

  return class FullMonsterSheet extends Base {
    static DEFAULT_OPTIONS = {
      classes: ["acks", "actor-v2", "monster-v2", "acks-monsters"],
      actions: { ...ACTIONS },
    };

    static PARTS = parts;

    static TABS = { primary: { tabs: tabList, initial: "classification" } };

    tabGroups = { primary: "classification" };

    /** @override */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const extras = MonsterExtras.fromActor(this.actor);
      context.extras = extras;
      // Split generic items into carried inventory vs. flagged spoils so the
      // two lists live on separate tabs (a monster can carry gear AND drop parts).
      const items = context.owned?.items ?? [];
      context.spoilItems = items.filter((i) => i.getFlag(MODULE_ID, "spoil"));
      context.carriedItems = items.filter((i) => !i.getFlag(MODULE_ID, "spoil"));
      context.choices = choices();
      context.scores = CFG.ABILITY_SCORES;
      context.ages = CFG.AGE_CATEGORIES;
      context.x = `flags.${MODULE_ID}.${FLAG_EXTRAS}`;
      // Pre-localized save rows (roll link + value) for the Classification tab.
      const sysSaves = this.actor.system?.saves ?? {};
      context.saveRows = ["paralysis", "death", "blast", "implements", "spell"].map((k) => ({
        key: k,
        value: sysSaves[k]?.value,
        label: game.i18n.localize(`ACKS-MONSTERS.save.${k}`),
        tip: game.i18n.localize(`ACKS.saves.${k}.long`),
      }));
      const def = extras.defenses ?? {};
      context.selected = {
        types: Array.from(extras.types ?? []),
        vision: Array.from(extras.vision ?? []),
        immDamage: Array.from(def.immunities?.damage ?? []),
        resDamage: Array.from(def.resistances?.damage ?? []),
        susDamage: Array.from(def.susceptibilities?.damage ?? []),
      };
      return context;
    }

    /**
     * Merge submitted extras over the stored flag (unrendered fields survive;
     * arrays replace), run through the schema (null-safe), and mirror the
     * primary number-appearing formulas into the reused core details.appearing.
     * @override
     */
    _prepareSubmitData(event, form, formData, updateData) {
      const submitData = super._prepareSubmitData(event, form, formData, updateData);
      const path = `flags.${MODULE_ID}.${FLAG_EXTRAS}`;
      const raw = foundry.utils.getProperty(submitData, path);
      if (raw && typeof raw === "object") {
        const stored = foundry.utils.deepClone(this.actor.getFlag(MODULE_ID, FLAG_EXTRAS) ?? {});
        const merged = foundry.utils.mergeObject(stored, raw, { inplace: false, overwrite: true, insertKeys: true });
        let cleaned;
        try {
          cleaned = MonsterExtras.normalize(merged);
        } catch (err) {
          console.error(`${MODULE_ID} | extras normalization failed; saving merged data as-is`, err);
          cleaned = merged;
        }
        foundry.utils.setProperty(submitData, path, cleaned);

        const firstOf = (enc, side) => enc?.[side]?.wandering?.number || enc?.[side]?.lair?.number || "";
        for (const [side, key] of [["dungeon", "d"], ["wilderness", "w"]]) {
          const next = firstOf(cleaned.encounter, side);
          if (next && next !== firstOf(stored.encounter, side)) {
            foundry.utils.setProperty(submitData, `system.details.appearing.${key}`, next);
          }
        }
      }
      return submitData;
    }
  };
}
