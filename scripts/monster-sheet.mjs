/* global foundry */
/**
 * The Full Monster sheet is created at init time as a SUBCLASS of the system's
 * own registered monster sheet (resolved from CONFIG.Actor.sheetClasses). That
 * way it inherits the exact compact header, the Attributes / Spells / Notes /
 * Effects tabs, item handling, Generate Saves, reaction/HP/encounter rolls, and
 * CSS — and we merely ADD tabs for the extended, structured stat block.
 *
 * We can't `import` the system class (the system ships as a single bundle), so
 * the base is passed in from module.mjs and we return the subclass from a
 * factory.
 */
import { MODULE_ID, FLAG_EXTRAS } from "./constants.mjs";
import MonsterExtras from "./monster-extras.mjs";
import { ACTIONS } from "./monster-actions.mjs";
import * as CFG from "./config.mjs";

const T = `modules/${MODULE_ID}/templates`;

/** Additional sheet PARTS (one per added tab). */
const EXTRA_PARTS = {
  classification: { template: `${T}/tab-classification.hbs`, scrollable: [""] },
  defenses: { template: `${T}/tab-defenses.hbs`, scrollable: [""] },
  ecology: { template: `${T}/tab-ecology.hbs`, scrollable: [""] },
  encounter: { template: `${T}/tab-encounter.hbs`, scrollable: [""] },
  henchman: { template: `${T}/tab-henchman.hbs`, scrollable: [""] },
  lore: { template: `${T}/tab-lore.hbs`, scrollable: [""] },
};

/** Added tabs, inserted right after the system's "attributes" tab. */
const EXTRA_TABS = [
  { id: "classification", icon: "fa-solid fa-dragon", label: "ACKS-MONSTERS.tab.classification" },
  { id: "defenses", icon: "fa-solid fa-shield-halved", label: "ACKS-MONSTERS.tab.defenses" },
  { id: "ecology", icon: "fa-solid fa-leaf", label: "ACKS-MONSTERS.tab.ecology" },
  { id: "encounter", icon: "fa-solid fa-dice-d20", label: "ACKS-MONSTERS.tab.encounter" },
  { id: "henchman", icon: "fa-solid fa-handshake", label: "ACKS-MONSTERS.tab.henchman" },
  { id: "lore", icon: "fa-solid fa-scroll", label: "ACKS-MONSTERS.tab.lore" },
];

/** { key: label } choices maps consumed by the {{selectOptions}} helper. */
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
    category: { henchman: "Henchman", mercenary: "Mercenary", specialist: "Specialist" },
  };
}

/**
 * Build the Full Monster sheet class extending the system's monster sheet.
 * @param {typeof foundry.applications.api.ApplicationV2} Base  The system's monster sheet class.
 */
export function createFullMonsterSheet(Base) {
  const baseTabs = Base.TABS?.primary?.tabs ?? [];
  const attrIdx = baseTabs.findIndex((t) => t.id === "attributes");
  const mergedTabs = [...baseTabs];
  mergedTabs.splice(attrIdx >= 0 ? attrIdx + 1 : mergedTabs.length, 0, ...EXTRA_TABS);

  return class FullMonsterSheet extends Base {
    /** @override — classes are unioned across the chain; actions deep-merge. */
    static DEFAULT_OPTIONS = {
      classes: ["acks", "actor-v2", "monster-v2", "acks-monsters"],
      actions: { ...ACTIONS },
    };

    /** @override — static PARTS/TABS are NOT auto-merged; include the base's. */
    static PARTS = { ...Base.PARTS, ...EXTRA_PARTS };

    static TABS = {
      ...Base.TABS,
      primary: { ...(Base.TABS?.primary ?? {}), tabs: mergedTabs },
    };

    /** @override */
    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const extras = MonsterExtras.fromActor(this.actor);
      context.extras = extras;
      context.choices = choices();
      context.scores = CFG.ABILITY_SCORES;
      context.ages = CFG.AGE_CATEGORIES;
      context.x = `flags.${MODULE_ID}.${FLAG_EXTRAS}`;
      // Sets → arrays for {{selectOptions ... selected=…}}.
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
        // Fail-safe: one bad value must never block the whole sheet from saving.
        let cleaned;
        try {
          cleaned = MonsterExtras.normalize(merged);
        } catch (err) {
          console.error(`${MODULE_ID} | extras normalization failed; saving merged data as-is`, err);
          cleaned = merged;
        }
        foundry.utils.setProperty(submitData, path, cleaned);

        // Mirror the number-appearing formulas into the core details.appearing
        // fields — but ONLY when the encounter-tab value itself changed. The
        // form always serializes both sides, so an unconditional mirror would
        // clobber direct edits made to the header D.E. / W.E. inputs.
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
