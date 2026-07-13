/**
 * Build the module's example compendium packs (source JSON in packs/_source/*,
 * compiled LevelDB in packs/*) using the official Foundry CLI.
 *
 * Contents (a worked example of the full schema, per docs/RULES.md):
 *   - bestiary:  Rock Baboon (adult) + Juvenile + Baby, as core `monster`
 *                actors carrying flags["acks-monsters"].extras and embedded
 *                weapon (attacks) / ability (proficiency) / item (spoils).
 *   - spoils:    standalone Rock Baboon Skull + Pelt items.
 *   - treasure:  one blank example RollTable.
 *
 * Usage:  node tools/build-packs.mjs   (requires dev deps, see package.json)
 */
import { compilePack } from "@foundryvtt/foundryvtt-cli";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const ROOT = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const MODULE_ID = "acks-monsters";
const SV = 3; // acks CURRENT_SCHEMA_VERSION
const now = Date.now();
const STATS = { coreVersion: "13", createdTime: now, modifiedTime: now };
const uuid = (id) => `Compendium.${MODULE_ID}.bestiary.Actor.${id}`;

/* -------------------------------------------- */
/*  Embedded document builders                  */
/* -------------------------------------------- */

function weapon(id, name, { damage, natural, dmgType, extra = false, count = 1, img }) {
  return {
    _id: id,
    name,
    type: "weapon",
    img: img ?? "icons/svg/sword.svg",
    system: {
      _schemaVersion: SV,
      description: "",
      damage,
      bonus: 0,
      melee: true,
      missile: false,
      equipped: true,
      pattern: "transparent",
      tags: [],
      counter: { value: count, max: count },
      cost: 0,
      weight: 0,
      weight6: 0,
    },
    effects: [],
    flags: { [MODULE_ID]: { naturalWeapon: natural, damageType: dmgType, extraordinary: extra } },
    ownership: { default: 0 },
    sort: 0,
    _stats: { ...STATS },
  };
}

function ability(id, name, { target = 0, type = "general", desc = "", category, img }) {
  return {
    _id: id,
    name,
    type: "ability",
    img: img ?? "icons/svg/book.svg",
    system: {
      _schemaVersion: SV,
      description: desc ? `<p>${desc}</p>` : "",
      proficiencytype: type,
      favorite: false,
      pattern: "white",
      requirements: "",
      roll: target > 0 ? "1d20" : "",
      rollType: "above",
      rollTarget: target,
      blindroll: false,
      save: "",
    },
    effects: [],
    flags: category ? { [MODULE_ID]: { abilityCategory: category } } : {},
    ownership: { default: 0 },
    sort: 0,
    _stats: { ...STATS },
  };
}

function spoil(id, name, { weight6, cost, component = false, effects = [], desc = "", img }) {
  return {
    _id: id,
    name,
    type: "item",
    img: img ?? "icons/svg/bones.svg",
    system: {
      _schemaVersion: SV,
      description: desc ? `<p>${desc}</p>` : "",
      subtype: "item",
      quantity: { value: 1, max: 0 },
      cost,
      weight: 0,
      weight6,
    },
    effects: [],
    flags: { [MODULE_ID]: { component, researchEffects: effects } },
    ownership: { default: 0 },
    sort: 0,
    _stats: { ...STATS },
  };
}

/** Assemble the core `monster` system block, filling the fields acks touches. */
function monsterSystem({ hpFormula, hp, ac, saves, morale = 0, xp = 0, alignment = "Neutral", treasureType = "none", appearing = {}, biography = "" }) {
  return {
    _schemaVersion: SV,
    isNew: false,
    hp: { hd: hpFormula, value: hp, max: hp, bhr: "1d3" },
    aac: { value: ac, mod: 0 },
    thac0: { value: 19, bba: 0, throw: 10, mod: { missile: 0, melee: 0 } },
    damage: { mod: { missile: 0, melee: 0 } },
    movement: { base: 120, mod: 0, value: "" },
    initiative: { value: 0, mod: 0 },
    surprise: { mod: 0, surpriseothers: 0, avoidsurprise: 0 },
    saves: {
      paralysis: { value: saves.paralysis },
      death: { value: saves.death },
      blast: { value: saves.blast },
      implements: { value: saves.implements },
      spell: { value: saves.spell },
    },
    save: { mod: 0 },
    retainer: { enabled: false, loyalty: 0, wage: "", managerid: "", category: "henchman", quantity: 1 },
    details: {
      biography,
      alignment,
      xp,
      treasure: { table: "", type: treasureType },
      appearing: { d: appearing.d ?? "", w: appearing.w ?? "" },
      morale,
    },
    attacks: "",
  };
}

function monster({ id, name, img, system, extras, items = [] }) {
  // Embedded documents are packed as their own LevelDB entries and need a
  // compound _key (parent collection.embedded!parentId.childId).
  const keyedItems = items.map((it) => ({ ...it, _key: `!actors.items!${id}.${it._id}` }));
  return {
    _id: id,
    _key: `!actors!${id}`,
    name,
    type: "monster",
    img,
    system,
    items: keyedItems,
    effects: [],
    flags: { [MODULE_ID]: { extras } },
    prototypeToken: {
      name,
      actorLink: false,
      disposition: -1,
      sight: { enabled: true },
    },
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    _stats: { ...STATS },
  };
}

/* -------------------------------------------- */
/*  Rock Baboon (ACKS II Monstrous Manual p.33) */
/* -------------------------------------------- */

const BABOON_IMG = "icons/creatures/mammals/monkey-shaman-glow-purple.webp";

function buildBestiary() {
  const adult = monster({
    id: "acksmBaboonAdlt0",
    name: "Rock Baboon",
    img: BABOON_IMG,
    system: monsterSystem({
      hpFormula: "2d8",
      hp: 9,
      ac: 3,
      saves: { paralysis: 12, death: 13, blast: 14, implements: 15, spell: 16 },
      morale: 0,
      xp: 20,
      alignment: "Neutral",
      treasureType: "none",
      appearing: { d: "2d6", w: "5d6" },
      biography:
        "<p>Black-haired, black-eyed baboons found throughout Ulruk and as far north as the Dark Wall in Southern Argollë.</p>",
    }),
    extras: {
      types: ["animal"],
      subtype: "wild",
      size: "man",
      bodyForm: "simian",
      mass: { stone: 23, lbs: 230 },
      hd: { count: 2, bonus: null, asterisks: 0, dieType: 8 },
      saveAs: { class: "fighter", level: 2 },
      scores: { str: null, int: null, wis: null, dex: 18, con: null, cha: null },
      speeds: [{ type: "land", combat: 40, run: 120, hover: false }],
      vision: ["night"],
      lightlessRange: null,
      otherSenses: [],
      load: { normal: 14, capacity: 28 },
      noncombatant: false,
      secondary: {
        expeditionSpeed: 24,
        supplyCost: 0.5,
        trainingMonths: 1,
        intelligence: "semiSapient",
        trainingModifier: 3,
        battleRating: { individual: 0.017, unit: 2 },
        lifespan: { baby: 0, juvenile: 4, adolescent: 7.5, adult: 12, middleAged: 18, old: 27, ancient: 36, maximum: 45 },
        oviparous: false,
        reproduction: { count: "1", youngType: "infant", interval: 2, intervalUnit: "year" },
        untrainedValue: { adult: 110, juvenile: 50, baby: 15 },
        trainedValue: [{ role: "guard", value: 280, note: "" }],
      },
      encounter: {
        lairChance: 10,
        dungeon: { wandering: { noun: "Troop", number: "2d6" }, lair: { noun: "Den", number: "6d10" } },
        wilderness: { wandering: { noun: "Band", number: "5d6" }, lair: { noun: "Den", number: "6d10" } },
      },
      variants: [
        { label: "Juvenile Rock Baboon", uuid: uuid("acksmBaboonJuv00") },
        { label: "Baby Rock Baboon", uuid: uuid("acksmBaboonBaby0") },
      ],
      description: {
        appearance:
          "<p>These black-haired black-eyed baboons stand 4'6\" tall and weigh 230lbs, though the largest strongest males can reach 6' in height. They are highly intelligent animals capable of forming plans and using tools.</p>",
        combat:
          "<p>Unlike most apes, rock baboons are highly aggressive and easily stimulated to fight (-1 penalty to reaction rolls). In combat they both bite and use sticks as clubs. They can climb as if they were 5th level thieves and jump as if they had 18 DEX.</p>",
        ecology:
          "<p>When encountered in their den, the adults raise 3d6-3 juvenile and 2d6-2 baby baboons. They are omnivores that often hunt for meat.</p>",
        encounterText:
          "<p>High atop the trees of a rugged, broken landscape, 15 rock baboons keep watch for intruders to their den. The seven largest attack, leaping down from the upper branches; the rest hang back to protect 5 juveniles and 7 babies.</p>",
        lore: "",
        notes: "<p>Monstrous Manual p.33.</p>",
      },
    },
    items: [
      weapon("acksmBabBite0000", "Bite", { damage: "1d3", natural: "bite", dmgType: "piercing", img: "icons/creatures/abilities/mouth-teeth-long-red.webp" }),
      weapon("acksmBabClub0000", "Club", { damage: "1d6", natural: "weapon", dmgType: "bludgeoning", img: "icons/weapons/clubs/club-simple-brown.webp" }),
      ability("acksmBabClimb000", "Climbing", {
        target: 4,
        type: "class",
        category: "classPowers",
        desc: "Climbs as a 5th-level thief (Climbing proficiency throw 4+).",
        img: "icons/skills/movement/figure-running-gray.webp",
      }),
      spoil("acksmBabSkull000", "Rock Baboon Skull", {
        weight6: 2,
        cost: 20,
        component: true,
        effects: ["frighten beast", "speak with beasts"],
        desc: "A special component useful in magic research (2/6 st).",
        img: "icons/commodities/bones/skull-orange.webp",
      }),
      spoil("acksmBabPelt0000", "Rock Baboon Pelt", {
        weight6: 4,
        cost: 25,
        component: false,
        desc: "A rock baboon's pelt fetches 25gp and weighs 4/6 st.",
        img: "icons/commodities/leather/fur-black.webp",
      }),
    ],
  });

  const juvenile = monster({
    id: "acksmBaboonJuv00",
    name: "Juvenile Rock Baboon",
    img: BABOON_IMG,
    system: monsterSystem({
      hpFormula: "1d8",
      hp: 4,
      ac: 1,
      saves: { paralysis: 14, death: 15, blast: 16, implements: 17, spell: 18 },
      morale: 0,
      xp: 10,
      alignment: "Neutral",
      treasureType: "none",
    }),
    extras: {
      types: ["animal"],
      subtype: "wild",
      size: "small",
      bodyForm: "simian",
      hd: { count: 1, bonus: null, asterisks: 0, dieType: 8 },
      saveAs: { class: "fighter", level: 0 },
      speeds: [{ type: "land", combat: 30, run: 90, hover: false }],
      vision: ["night"],
      secondary: { intelligence: "semiSapient" },
    },
    items: [
      weapon("acksmBabJBite000", "Bite", { damage: "1", natural: "bite", dmgType: "piercing", img: "icons/creatures/abilities/mouth-teeth-long-red.webp" }),
    ],
  });

  const baby = monster({
    id: "acksmBaboonBaby0",
    name: "Baby Rock Baboon",
    img: BABOON_IMG,
    system: monsterSystem({
      hpFormula: "1d4",
      hp: 1,
      ac: 0,
      saves: { paralysis: 14, death: 15, blast: 16, implements: 17, spell: 18 },
      morale: -4,
      xp: 0,
      alignment: "Neutral",
      treasureType: "none",
    }),
    extras: {
      types: ["animal"],
      subtype: "wild",
      size: "small",
      bodyForm: "simian",
      hd: { count: null, bonus: null, asterisks: 0, dieType: 8 },
      saveAs: { class: "fighter", level: 0 },
      speeds: [{ type: "land", combat: 30, run: 90, hover: false }],
      vision: ["night"],
      noncombatant: true,
      secondary: { intelligence: "semiSapient" },
      description: { combat: "<p>Infant baboons do not fight.</p>" },
    },
  });

  return [adult, juvenile, baby];
}

/* -------------------------------------------- */
/*  Standalone spoils + blank treasure table    */
/* -------------------------------------------- */

function buildSpoils() {
  return [
    {
      ...spoil("acksmSpoilSkull0", "Rock Baboon Skull", {
        weight6: 2,
        cost: 20,
        component: true,
        effects: ["frighten beast", "speak with beasts"],
        desc: "A special component useful in magic research (2/6 st).",
        img: "icons/commodities/bones/skull-orange.webp",
      }),
      _key: "!items!acksmSpoilSkull0",
    },
    {
      ...spoil("acksmSpoilPelt00", "Rock Baboon Pelt", {
        weight6: 4,
        cost: 25,
        component: false,
        desc: "A rock baboon's pelt fetches 25gp and weighs 4/6 st.",
        img: "icons/commodities/leather/fur-black.webp",
      }),
      _key: "!items!acksmSpoilPelt00",
    },
  ];
}

function buildTreasure() {
  return [
    {
      _id: "acksmTreasBlank0",
      _key: "!tables!acksmTreasBlank0",
      name: "Example Treasure Table (blank)",
      img: "icons/svg/chest.svg",
      description: "<p>Blank example — drop this table onto a Full Monster's Treasure tab and add results.</p>",
      formula: "1d100",
      replacement: true,
      displayRoll: true,
      folder: null,
      sort: 0,
      ownership: { default: 0 },
      flags: {},
      results: [],
      _stats: { ...STATS },
    },
  ];
}

/* -------------------------------------------- */
/*  Builder                                     */
/* -------------------------------------------- */

async function buildPack(packName, docs) {
  const srcDir = path.join(ROOT, "packs", "_source", packName);
  const dbDir = path.join(ROOT, "packs", packName);

  fs.mkdirSync(srcDir, { recursive: true });
  for (const f of fs.readdirSync(srcDir).filter((f) => f.endsWith(".json"))) fs.rmSync(path.join(srcDir, f));
  for (const doc of docs) {
    const slug = doc.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    fs.writeFileSync(path.join(srcDir, `${slug}.json`), JSON.stringify(doc, null, 2) + "\n");
  }

  fs.rmSync(dbDir, { recursive: true, force: true });
  await compilePack(srcDir, dbDir, { recursive: false, log: false });
  console.log(`Built pack "${packName}": ${docs.length} document(s) -> ${dbDir}`);
}

await buildPack("bestiary", buildBestiary());
await buildPack("spoils", buildSpoils());
await buildPack("treasure", buildTreasure());
