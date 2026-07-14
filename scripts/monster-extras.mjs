/* global foundry */
/**
 * MonsterExtras — the extended, structured stat-block data that the core ACKS
 * `monster` schema does not carry. It is a standalone in-memory DataModel
 * persisted at `actor.flags["acks-monsters"].extras`, NOT a document sub-type:
 * this lets us reuse the system's own `monster` actor (and its henchman /
 * hp / aac / saves / details fields) while still getting DataModel defaults,
 * `choices` validation, and — crucially — nullable numerics so that a blank
 * field is stored as `null` (unspecified) and is never confused with a real 0.
 *
 * Anything the core monster already stores (hp, aac, saves, details.morale,
 * details.xp, details.alignment, details.appearing, details.treasure,
 * retainer.*) is READ FROM `actor.system` and is deliberately absent here.
 */
import { MODULE_ID, FLAG_EXTRAS } from "./constants.mjs";
import {
  MONSTER_TYPES,
  SIZES,
  BODY_FORMS,
  SAVE_CLASSES,
  MOVEMENT_TYPES,
  VISION_TYPES,
  SENSE_TYPES,
  INTELLIGENCE,
  YOUNG_TYPES,
  INTERVAL_UNITS,
  TRAINED_ROLES,
  DAMAGE_TYPES,
  choicesOf,
} from "./config.mjs";

const fields = foundry.data.fields;

/** Nullable number — blank means "unspecified", distinct from a real 0. */
const num = (opts = {}) => new fields.NumberField({ required: false, nullable: true, initial: null, ...opts });
/** Free-text string (blank allowed) — only for truly unique data. */
const str = (opts = {}) => new fields.StringField({ required: false, blank: true, initial: "", ...opts });
/** Enumerated single choice; blank = unspecified. */
const choice = (enumObj, opts = {}) =>
  new fields.StringField({ required: false, blank: true, initial: "", choices: choicesOf(enumObj), ...opts });
/** Enumerated multi choice (a Set). */
const choiceSet = (enumObj) => new fields.SetField(new fields.StringField({ choices: choicesOf(enumObj) }));
const html = () => new fields.HTMLField({ required: false, blank: true, initial: "" });
const bool = (initial = false) => new fields.BooleanField({ initial });

export default class MonsterExtras extends foundry.abstract.DataModel {
  /** Array-valued paths, reconstructed from FormDataExtended's numeric-keyed objects. */
  static ARRAY_PATHS = ["speeds", "otherSenses", "variants", "secondary.trainedValue"];

  static defineSchema() {
    const { SchemaField, ArrayField, DocumentUUIDField } = fields;

    const encSide = () =>
      new SchemaField({
        wandering: new SchemaField({ noun: str(), number: str() }),
        lair: new SchemaField({ noun: str(), number: str() }),
      });

    return {
      // --- Identity / classification ---
      types: choiceSet(MONSTER_TYPES),
      subtype: str(), // open qualifier, e.g. "wild", "Demon"
      size: choice(SIZES),
      bodyForm: choice(BODY_FORMS),
      mass: new SchemaField({ stone: num(), lbs: num() }),

      // --- Hit Dice rating (core hp.hd stays the roll formula). countMax lets
      //     variable-HD monsters store a range, e.g. a hydra's "5 to 12". ---
      hd: new SchemaField({
        count: num({ integer: false }),
        countMax: num({ integer: false }),
        bonus: num({ integer: true }),
        asterisks: num({ integer: true }),
        dieType: new fields.NumberField({ required: false, nullable: true, integer: true, initial: 8 }),
      }),

      // --- Saves-as class/level (live values reuse core system.saves.*).
      //     levelMax covers ranges like "F5 to F12". ---
      saveAs: new SchemaField({
        class: choice(SAVE_CLASSES),
        level: num({ integer: true }),
        levelMax: num({ integer: true }),
      }),

      // --- Defenses: type & special immunities/resistances/susceptibilities.
      //     `damage` is a set of damage types; `effects` is free text (open
      //     keywords like "enchantment", "all death effects"). ---
      defenses: new SchemaField({
        immunities: new SchemaField({
          damage: choiceSet(DAMAGE_TYPES),
          mundane: bool(false),
          extraordinary: bool(false),
          effects: str(),
          note: str(),
        }),
        resistances: new SchemaField({
          damage: choiceSet(DAMAGE_TYPES),
          mundane: bool(false),
          extraordinary: bool(false),
          effects: str(),
          note: str(),
        }),
        susceptibilities: new SchemaField({
          damage: choiceSet(DAMAGE_TYPES),
          mundane: bool(false),
          extraordinary: bool(false),
          effects: str(),
          note: str(),
        }),
      }),

      // --- Spellcasting (repertoire uses core spell items + system.spells slots). ---
      spellcasting: new SchemaField({
        class: str(),
        level: num({ integer: true }),
        note: str(),
      }),

      // --- Monster attributes (MM Rules p.349; default 9 if left blank) ---
      scores: new SchemaField({
        str: num({ integer: true }),
        int: num({ integer: true }),
        wis: num({ integer: true }),
        dex: num({ integer: true }),
        con: num({ integer: true }),
        cha: num({ integer: true }),
      }),

      // --- Multi-row speed table ---
      speeds: new ArrayField(
        new SchemaField({
          type: choice(MOVEMENT_TYPES, { initial: "land" }),
          combat: num({ integer: true }),
          run: num({ integer: true }),
          hover: bool(false),
        }),
      ),

      // --- Senses ---
      vision: choiceSet(VISION_TYPES),
      lightlessRange: num({ integer: true }),
      otherSenses: new ArrayField(
        new SchemaField({ type: choice(SENSE_TYPES, { initial: "acuteHearing" }), range: num({ integer: true }), note: str() }),
      ),

      // --- Carrying ---
      load: new SchemaField({ normal: num(), capacity: num() }),

      // --- Combatant status (MM Rules p.352) ---
      noncombatant: bool(false),

      // --- Secondary characteristics (economic / military) ---
      secondary: new SchemaField({
        expeditionSpeed: num(),
        supplyCost: num(), // gp/week, may be fractional
        trainingMonths: num(),
        intelligence: choice(INTELLIGENCE),
        trainingModifier: num({ integer: true }),
        battleRating: new SchemaField({ individual: num(), unit: num() }),
        lifespan: new SchemaField({
          baby: num(),
          juvenile: num(),
          adolescent: num(),
          adult: num(),
          middleAged: num(),
          old: num(),
          ancient: num(),
          maximum: num(),
        }),
        oviparous: bool(false),
        reproduction: new SchemaField({
          count: str(), // formula/qty, e.g. "1", "1d4"
          youngType: choice(YOUNG_TYPES),
          interval: num({ integer: true }),
          intervalUnit: choice(INTERVAL_UNITS),
        }),
        untrainedValue: new SchemaField({ adult: num(), juvenile: num(), baby: num() }),
        trainedValue: new ArrayField(
          new SchemaField({ role: choice(TRAINED_ROLES, { initial: "guard" }), value: num(), note: str() }),
        ),
      }),

      // --- Encounter characteristics (richer than core details.appearing) ---
      encounter: new SchemaField({
        lairChance: num({ integer: true }), // % ; 0 = never in lair (meaningful) vs null = unspecified
        dungeon: encSide(),
        wilderness: encSide(),
      }),

      // --- Related stat-line variants (juveniles, babies, leaders) ---
      variants: new ArrayField(
        new SchemaField({
          label: str(),
          uuid: new DocumentUUIDField({ type: "Actor", required: false, blank: true, nullable: true, initial: null }),
        }),
      ),

      // --- Entry prose ---
      description: new SchemaField({
        appearance: html(),
        combat: html(),
        ecology: html(),
        encounterText: html(),
        lore: html(),
        notes: html(),
      }),
    };
  }

  /* -------------------------------------------- */

  /** Build from an actor's stored flag (lenient: never throws on stale data). */
  static fromActor(actor) {
    const raw = actor?.getFlag(MODULE_ID, FLAG_EXTRAS) ?? {};
    try {
      return MonsterExtras.fromSource(foundry.utils.deepClone(raw), { strict: false });
    } catch (err) {
      console.warn(`${MODULE_ID} | could not parse monster extras; using defaults`, err);
      return new MonsterExtras({});
    }
  }

  /**
   * Normalize raw form/flag input into a complete, cleaned extras object:
   * reconstructs arrays from FormDataExtended's numeric-keyed objects and runs
   * the whole thing through the schema (defaults + type coercion, null-safe).
   */
  static normalize(raw) {
    const data = foundry.utils.deepClone(raw ?? {});
    for (const path of MonsterExtras.ARRAY_PATHS) {
      const value = foundry.utils.getProperty(data, path);
      if (value && !Array.isArray(value) && typeof value === "object") {
        foundry.utils.setProperty(data, path, Object.values(value));
      }
    }
    return MonsterExtras.fromSource(data, { strict: false }).toObject();
  }
}
