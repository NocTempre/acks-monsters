/**
 * Example-compendium source data: document factories plus every sample monster,
 * spoil, and table. Consumed by tools/build-packs.mjs (Node only, never loaded
 * by Foundry). Stat blocks are transcribed from the ACKS II Monstrous Manual
 * listings recorded in docs/RULES.md — each monster demonstrates a different
 * slice of the storage model:
 *
 *   Rock Baboon (+Juv/Baby) — animal baseline, variants linking
 *   Hydra (12 Heads)        — HD/save ranges, per-head attacks, rich spoils
 *   Elementals (4 × Minor)  — incarnations: immunities, senses, movement modes
 *   Cave Bear               — proficiency-heavy animal, hug, trained-value roles
 *   Red Dragon (Adult)      — spellcasting, breath weapon, defenses, hoarder
 *   Heavy Horse             — domestic mount, "None" dungeon encounter
 *   Lizardman (+Champion)   — multi-type beastman, weapons + natural attacks, oviparous
 *   Orc                     — warband humanoid, lightless-only vision
 *   Brigand                 — human veteran, class proficiencies
 */

const MODULE_ID = "acks-monsters";
const SV = 3; // acks CURRENT_SCHEMA_VERSION
const now = Date.now();
const STATS = { coreVersion: "14", createdTime: now, modifiedTime: now };
const uuid = (id) => `Compendium.${MODULE_ID}.bestiary.Actor.${id}`;

/* -------------------------------------------- */
/*  Document factories                          */
/* -------------------------------------------- */

export function weapon(id, name, { damage, natural, dmgType, extra = false, count = 1, missile = false, img }) {
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
      melee: !missile,
      missile,
      equipped: true,
      pattern: "transparent",
      tags: [],
      counter: { value: count, max: count },
      cost: 0,
      weight: 0,
      weight6: 0,
    },
    effects: [],
    flags: {
      [MODULE_ID]: {
        ...(natural ? { naturalWeapon: natural } : {}),
        ...(dmgType ? { damageType: dmgType } : {}),
        extraordinary: extra,
      },
    },
    ownership: { default: 0 },
    sort: 0,
    _stats: { ...STATS },
  };
}

export function ability(id, name, { target = 0, type = "general", desc = "", category, usage, img }) {
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
    flags: {
      [MODULE_ID]: {
        ...(category ? { abilityCategory: category } : {}),
        ...(usage ? { usage } : {}),
      },
    },
    ownership: { default: 0 },
    sort: 0,
    _stats: { ...STATS },
  };
}

export function spoil(id, name, { weight6, cost, component = false, effects = [], desc = "", img }) {
  return {
    _id: id,
    name,
    type: "item",
    img: img ?? "icons/svg/item-bag.svg",
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
    flags: { [MODULE_ID]: { spoil: true, component, researchEffects: effects } },
    ownership: { default: 0 },
    sort: 0,
    _stats: { ...STATS },
  };
}

/** Assemble the core `monster` system block, filling the fields acks touches. */
export function monsterSystem({
  hpFormula,
  hp,
  ac,
  saves,
  morale = 0,
  xp = 0,
  alignment = "Neutral",
  treasureType = "none",
  appearing = {},
  biography = "",
}) {
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

export function monster({ id, name, img, system, extras, items = [] }) {
  // Embedded documents are packed as their own LevelDB entries and need a
  // compound _key (parent collection.embedded!parentId.childId).
  const keyedItems = items.map((it) => ({ ...it, _key: `!actors.items!${id}.${it._id}` }));
  return {
    _id: id,
    _key: `!actors!${id}`,
    name,
    type: "monster",
    img: img ?? "icons/svg/mystery-man.svg",
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

/* Saving-throw bands (paralysis/death/blast/implements/spell). */
const SAVES_NH = { paralysis: 14, death: 15, blast: 16, implements: 17, spell: 18 }; // 0-level
const SAVES_F1 = { paralysis: 13, death: 14, blast: 15, implements: 16, spell: 17 };
const SAVES_F2 = { paralysis: 12, death: 13, blast: 14, implements: 15, spell: 16 }; // 2-3
const SAVES_F8 = { paralysis: 8, death: 9, blast: 10, implements: 11, spell: 12 }; // 8-9
const SAVES_F10 = { paralysis: 7, death: 8, blast: 9, implements: 10, spell: 11 };
const SAVES_F12 = { paralysis: 6, death: 7, blast: 8, implements: 9, spell: 10 }; // 11-12

/* -------------------------------------------- */
/*  Rock Baboon family (MM p.33)                */
/* -------------------------------------------- */

function rockBaboons() {
  const adult = monster({
    id: "acksmBaboonAdlt0",
    name: "Rock Baboon",
    system: monsterSystem({
      hpFormula: "2d8",
      hp: 9,
      ac: 3,
      saves: SAVES_F2,
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
      hd: { count: 2, asterisks: 0, dieType: 8 },
      saveAs: { class: "fighter", level: 2 },
      scores: { dex: 18 },
      speeds: [{ type: "land", combat: 40, run: 120, hover: false }],
      vision: ["night"],
      load: { normal: 14, capacity: 28 },
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
        notes: "<p>Monstrous Manual p.33.</p>",
      },
    },
    items: [
      weapon("acksmBabBite0000", "Bite", { damage: "1d3", natural: "bite", dmgType: "piercing", img: "icons/svg/pawprint.svg" }),
      weapon("acksmBabClub0000", "Club", { damage: "1d6", natural: "weapon", dmgType: "bludgeoning" }),
      ability("acksmBabClimb000", "Climbing", {
        target: 4,
        type: "class",
        category: "classPowers",
        desc: "Climbs as a 5th-level thief (Climbing proficiency throw 4+).",
      }),
      spoil("acksmBabSkull000", "Rock Baboon Skull", {
        weight6: 2,
        cost: 20,
        component: true,
        effects: ["frighten beast", "speak with beasts"],
        desc: "A special component useful in magic research (2/6 st).",
        img: "icons/svg/skull.svg",
      }),
      spoil("acksmBabPelt0000", "Rock Baboon Pelt", {
        weight6: 4,
        cost: 25,
        desc: "A rock baboon's pelt fetches 25gp and weighs 4/6 st.",
      }),
    ],
  });

  const juvenile = monster({
    id: "acksmBaboonJuv00",
    name: "Juvenile Rock Baboon",
    system: monsterSystem({
      hpFormula: "1d8",
      hp: 4,
      ac: 1,
      saves: SAVES_NH,
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
      hd: { count: 1, asterisks: 0, dieType: 8 },
      saveAs: { class: "fighter", level: 0 },
      speeds: [{ type: "land", combat: 30, run: 90, hover: false }],
      vision: ["night"],
      secondary: { intelligence: "semiSapient" },
      variants: [{ label: "Rock Baboon (adult)", uuid: uuid("acksmBaboonAdlt0") }],
    },
    items: [weapon("acksmBabJBite000", "Bite", { damage: "1", natural: "bite", dmgType: "piercing", img: "icons/svg/pawprint.svg" })],
  });

  const baby = monster({
    id: "acksmBaboonBaby0",
    name: "Baby Rock Baboon",
    system: monsterSystem({
      hpFormula: "1d4",
      hp: 1,
      ac: 0,
      saves: SAVES_NH,
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
      saveAs: { class: "fighter", level: 0 },
      speeds: [{ type: "land", combat: 30, run: 90, hover: false }],
      vision: ["night"],
      noncombatant: true,
      secondary: { intelligence: "semiSapient" },
      variants: [{ label: "Rock Baboon (adult)", uuid: uuid("acksmBaboonAdlt0") }],
      description: { combat: "<p>Infant baboons do not fight.</p>" },
    },
  });

  return [adult, juvenile, baby];
}

/* -------------------------------------------- */
/*  Hydra, 12 Heads (MM p.187)                  */
/* -------------------------------------------- */

function hydra() {
  return monster({
    id: "acksmHydra000000",
    name: "Hydra (12 Heads)",
    system: monsterSystem({
      hpFormula: "12d8",
      hp: 96, // maximum hit points on each Hit Die
      ac: 4,
      saves: SAVES_F12,
      morale: 2,
      xp: 2100,
      alignment: "Neutral",
      treasureType: "I (5-7 HD), K (8-9 HD), or M (10-12 HD)",
      appearing: { d: "1", w: "1" },
      biography: "<p>Vicious semi-sapient monstrosities with up to 12 heads, dwelling in bogs, marshes, and swamps.</p>",
    }),
    extras: {
      types: ["monstrosity"],
      subtype: "bestial",
      size: "huge",
      mass: { stone: 480, lbs: 4800 },
      hd: { count: 5, countMax: 12, asterisks: 1, dieType: 8 }, // HD equals current heads
      saveAs: { class: "fighter", level: 5, levelMax: 12 },
      speeds: [
        { type: "land", combat: 40, run: 120, hover: false },
        { type: "swim", combat: 20, run: 60, hover: false },
      ],
      vision: ["lightless", "night"],
      lightlessRange: 60,
      load: { normal: 96, capacity: 192 }, // 68-96 st by heads
      secondary: {
        expeditionSpeed: 24,
        supplyCost: 48,
        trainingMonths: 4,
        intelligence: "semiSapient",
        trainingModifier: 3,
        battleRating: { individual: 0.536, unit: 10 }, // 0.178-0.536 / 3.5-10 by heads
        lifespan: { baby: 0, juvenile: 1.5, adolescent: 9, adult: 20, maximum: 1000 }, // -/-/- for the middle ages
        reproduction: { count: "1", youngType: "spawn", interval: 20, intervalUnit: "year" },
        untrainedValue: { adult: 5325, juvenile: 1600, baby: 1000 },
        trainedValue: [{ role: "guard", value: 12150, note: "12-headed specimen" }],
      },
      encounter: {
        lairChance: 20,
        dungeon: { wandering: { noun: "Solitary", number: "1" }, lair: { noun: "Lair", number: "1" } },
        wilderness: { wandering: { noun: "Solitary", number: "1" }, lair: { noun: "Lair", number: "1" } },
      },
      description: {
        appearance:
          "<p>Gray-brown to dark brown skin with a light yellow or tan underbelly, amber eyes, and yellow-white teeth. An average hydra is 20' long and weighs 3,400 to 4,800 lbs depending on its heads.</p>",
        combat:
          "<p>1d8+4 heads when encountered; HD equal to current heads with maximum hit points per die; saves as a fighter of level equal to HD. Each head bites once per round. Every 8 damage destroys one head (no cleave); the hydra dies when all heads are destroyed.</p>",
        ecology:
          "<p>Solitary. Reproduces by budding: one hydralet buds every two decades (5% chance a bud is visible). Statistics, spoils, and values here are for a 12-headed specimen; fewer heads give proportionately less.</p>",
      },
    },
    items: [
      weapon("acksmHydBite0000", "Bite (per head)", {
        damage: "1d10",
        natural: "bite",
        dmgType: "piercing",
        extra: true,
        count: 12,
        img: "icons/svg/pawprint.svg",
      }),
      ability("acksmHydHeads000", "Multiple Heads", {
        category: "unusual",
        desc: "Each 8 damage suffered destroys one head (destroying a head does not trigger a cleave). When all heads are destroyed the hydra dies.",
      }),
      ability("acksmHydRegen000", "Regenerating Heads", {
        category: "regeneration",
        desc: "At the end of its next initiative after losing heads, the hydra grows 2 new heads per head lost (max 12). Heads destroyed by fire do not regenerate; stumps can be cauterized with fire or acid (attack throw at -4, no cleave after).",
      }),
      spoil("acksmHydBlood000", "Hydra Blood", {
        weight6: 70,
        cost: 700,
        component: true,
        effects: ["cure injury", "longevity", "trollblood", "water breathing"],
        desc: "Harvest with Animal Husbandry and/or Healing 3 (combined ranks). 11 4/6 st.",
      }),
      spoil("acksmHydScale000", "Hydra Scales", {
        weight6: 70,
        cost: 700,
        component: true,
        effects: ["repair disability & disfigurement", "restore life & limb"],
        desc: "Harvest with Animal Husbandry and/or Healing 3 (combined ranks). 11 4/6 st.",
      }),
      spoil("acksmHydSkull000", "Hydra Skulls (set)", {
        weight6: 70,
        cost: 700,
        component: true,
        effects: ["swift sword"],
        desc: "The full set of a hydra's skulls. 11 4/6 st.",
        img: "icons/svg/skull.svg",
      }),
    ],
  });
}

/* -------------------------------------------- */
/*  Elementals, Minor tier (MM pp.117-118)      */
/* -------------------------------------------- */

function elemental({ idSuffix, element, dmgType, speeds, vision, senses, immuneNote, residue }) {
  const name = `${element} Elemental (Minor)`;
  return monster({
    id: `acksmElem${idSuffix}`,
    name,
    system: monsterSystem({
      hpFormula: "8d8",
      hp: 36,
      ac: 7,
      saves: SAVES_F8,
      morale: 4,
      xp: 1100,
      alignment: "Neutral",
      treasureType: "none",
      appearing: { d: "1", w: "1" },
      biography: `<p>A fragment of the living element of the Sphere of ${element}, torn from its collective and instantiated by conjuration.</p>`,
    }),
    extras: {
      types: ["incarnation"],
      subtype: "elemental",
      size: "huge",
      hd: { count: 8, asterisks: 1, dieType: 8 },
      saveAs: { class: "fighter", level: 8 },
      speeds,
      vision: ["lightless"],
      lightlessRange: vision,
      otherSenses: senses,
      defenses: {
        immunities: {
          damage: [dmgType],
          mundane: true,
          extraordinary: true,
          effects: "enchantment; necrotic; poisonous; mundane bludgeoning, piercing, and slashing damage",
          note: immuneNote,
        },
      },
      secondary: {
        trainingMonths: 1,
        intelligence: "sapient",
        // lifespan indefinite, no reproduction, no market values — all unspecified
      },
      encounter: {
        dungeon: { wandering: { noun: "Solitary", number: "1" }, lair: { noun: "", number: "" } },
        wilderness: { wandering: { noun: "Solitary", number: "1" }, lair: { noun: "", number: "" } },
      },
      description: {
        combat:
          "<p>As incarnations, elementals can be held at bay by <em>holy circle</em> and dispelled with <em>counterspell</em> or <em>dispel magic</em>. They understand the languages of their summoner. Minor tier: Huge, AC 7, 8* HD, 1d8 damage, saves F8, XP 1,100.</p>",
        ecology: "<p>Elementals endure until destroyed (indefinite lifespan) and do not reproduce. They cannot be bought or sold.</p>",
      },
    },
    items: [
      weapon(`acksmElm${idSuffix}Slam`, "Elemental Strike", { damage: "1d8", dmgType, extra: true }),
      ability(`acksmElm${idSuffix}Mstr`, `${element} Mastery`, {
        category: "unusual",
        desc: {
          Air: "Deals double damage dice against flying targets. A damaged creature smaller than the elemental must make a size-adjusted Paralysis save or be spun off in a random direction a distance equal to the elemental's height, landing prone (the elemental can cleave after).",
          Earth: "Deals double damage dice against targets standing on the ground. A damaged creature smaller than the elemental must save vs Paralysis (-2 per size difference) or be knocked prone and flung 1' per point of damage (cleave after). Cannot cross water wider than its height.",
          Fire: "Deals double damage dice against burning targets or those carrying open flames. A damaged creature must make a Blast save or start burning (1d8 fire at the start of its next initiative, ends after 2 rounds, on immersion, or when the elemental is destroyed). Cannot cross water wider than its diameter.",
          Water: "Deals double damage dice against targets standing or submerged in water. A damaged creature smaller than the elemental must save vs Paralysis (-2 per size difference) or begin drowning. May move on land at swim speed but never further than 60' from a water source.",
        }[element],
      }),
      spoil(`acksmElm${idSuffix}Resi`, residue.name, {
        weight6: 110,
        cost: 1100,
        component: true,
        effects: [residue.effect],
        desc: "Harvest from a destroyed elemental with Alchemy 2. 18 2/6 st.",
      }),
    ],
  });
}

function elementals() {
  return [
    elemental({
      idSuffix: "Air00000",
      element: "Air",
      dmgType: "electrical",
      speeds: [{ type: "fly", combat: 120, run: 360, hover: true }],
      vision: 60,
      senses: [{ type: "mechAerial", range: 360, note: "range equals movement" }],
      immuneNote: "A twirling mass of air crackling with lightning; 6\" diameter and 2' height per HD.",
      residue: { name: "Gaseous Residue", effect: "all air effects" },
    }),
    elemental({
      idSuffix: "Earth000",
      element: "Earth",
      dmgType: "seismic",
      speeds: [{ type: "land", combat: 20, run: 60, hover: false }],
      vision: 60,
      senses: [{ type: "mechTerrestrial", range: null, note: "line of sight through ground" }],
      immuneNote: "A giant humanoid of earth; 1' height and 6\" width per HD.",
      residue: { name: "Solid Residue", effect: "all earth effects" },
    }),
    elemental({
      idSuffix: "Fire0000",
      element: "Fire",
      dmgType: "fire",
      speeds: [{ type: "land", combat: 40, run: 120, hover: false }],
      vision: 120,
      senses: [],
      immuneNote: "A giant pillar of flame; 1' diameter and 1' height per HD.",
      residue: { name: "Burning Residue", effect: "all fire effects" },
    }),
    elemental({
      idSuffix: "Water000",
      element: "Water",
      dmgType: "cold",
      speeds: [{ type: "swim", combat: 60, run: 180, hover: false }],
      vision: 60,
      senses: [{ type: "mechAquatic", range: 180, note: "range equals movement" }],
      immuneNote: "A large mass of watery waves; 2' diameter and 6\" height per HD.",
      residue: { name: "Wet Residue", effect: "all water effects" },
    }),
  ];
}

/* -------------------------------------------- */
/*  Cave Bear (MM p.45)                         */
/* -------------------------------------------- */

function caveBear() {
  return monster({
    id: "acksmCaveBear000",
    name: "Cave Bear",
    system: monsterSystem({
      hpFormula: "6d8",
      hp: 27,
      ac: 3,
      saves: SAVES_F2, // F3 falls in the 2-3 band
      morale: 0,
      xp: 320,
      alignment: "Neutral",
      treasureType: "none",
      appearing: { d: "1", w: "1d2" },
      biography: "<p>Immense bears of the Jutting and Meniri Mountains, up to 10' tall and 1,100 lbs or more.</p>",
    }),
    extras: {
      types: ["animal"],
      subtype: "wild",
      size: "large",
      bodyForm: "ursine",
      mass: { stone: 110, lbs: 1100 },
      hd: { count: 6, asterisks: 0, dieType: 8 },
      saveAs: { class: "fighter", level: 3 },
      speeds: [{ type: "land", combat: 40, run: 120, hover: false }],
      vision: ["night"],
      otherSenses: [{ type: "acuteOlfaction", range: null, note: "tracks scents up to 6 miles (Tracking 3 ranks)" }],
      load: { normal: 36, capacity: 72 },
      secondary: {
        expeditionSpeed: 24,
        supplyCost: 4,
        trainingMonths: 3,
        intelligence: "bestial",
        trainingModifier: 1,
        battleRating: { individual: 0.096, unit: 5.5 },
        lifespan: { baby: 0, juvenile: 2, adolescent: 4, adult: 8, middleAged: 14, old: 21, ancient: 28, maximum: 35 },
        reproduction: { count: "1d2+1", youngType: "litter", interval: 3, intervalUnit: "year" },
        untrainedValue: { adult: 850, juvenile: 830, baby: 440 },
        trainedValue: [
          { role: "hunter", value: 1850, note: "" },
          { role: "warMount", value: 2550, note: "" },
        ],
      },
      encounter: {
        lairChance: 25,
        dungeon: { wandering: { noun: "Solitary", number: "1" }, lair: { noun: "Den", number: "1d2" } },
        wilderness: { wandering: { noun: "Sloth", number: "1d2" }, lair: { noun: "Den", number: "1d2" } },
      },
      description: {
        combat:
          "<p>Cave bears savor human and demi-human flesh: humans and demi-humans suffer a -2 reaction roll penalty. +1 to avoid surprise in their natural habitat (acute olfaction).</p>",
        ecology:
          "<p>66% chance a wilderness den holds cubs (1d4: 1-2 = 1d2+1 babies, 3-4 = 1d3-1 juveniles). Juveniles: AC 1, Spd 90', HD 3, 2 claws (1d2) and bite (1d4). Babies: AC 0, Spd 90', HD 2.</p>",
      },
    },
    items: [
      weapon("acksmBearClaw000", "Claw", { damage: "1d6", natural: "claw", dmgType: "slashing", count: 2 }),
      weapon("acksmBearBite000", "Bite", { damage: "1d10", natural: "bite", dmgType: "piercing", img: "icons/svg/pawprint.svg" }),
      ability("acksmBearHug0000", "Hug", {
        category: "hug",
        desc: "If both claws strike the same target in one attack routine, the bear immediately hugs it for an additional 2d8 bludgeoning damage. If the hug kills the target, the bear can cleave with its claw.",
      }),
      ability("acksmBearBlindF0", "Blind Fighting", { type: "class", category: "classPowers", desc: "Fights unimpaired in lightless caverns." }),
      ability("acksmBearCaving0", "Caving", { target: 11, category: "classPowers", desc: "Rarely gets lost navigating lightless caverns (11+)." }),
      ability("acksmBearClimb00", "Climbing", { target: 6, type: "class", category: "classPowers", desc: "Ascends sheer surfaces as a thief (6+)." }),
      ability("acksmBearTrack00", "Tracking", { target: 3, category: "classPowers", desc: "Tracks scents up to 6 miles (3 ranks, throw 3+)." }),
      spoil("acksmBearClaws00", "Cave Bear Claws", {
        weight6: 16,
        cost: 160,
        component: true,
        effects: ["iron maiden", "swift sword"],
        desc: "Harvest with Animal Husbandry, Labor (Butchery), or Trapping. 2 4/6 st.",
      }),
      spoil("acksmBearStomch0", "Cave Bear Stomach", {
        weight6: 16,
        cost: 160,
        component: true,
        effects: ["call of the wild bear", "locate animal or plant", "slumber"],
        desc: "Harvest with Animal Husbandry, Labor (Butchery), or Trapping. 2 4/6 st.",
      }),
      spoil("acksmBearPelt000", "Cave Bear Pelt", { weight6: 18, cost: 160, desc: "A cave bear's pelt fetches 160gp and weighs 3 st." }),
    ],
  });
}

/* -------------------------------------------- */
/*  Red Dragon, Adult, winged drake (MM pp.105-111) */
/* -------------------------------------------- */

function redDragon() {
  return monster({
    id: "acksmRedDragon00",
    name: "Red Dragon (Adult)",
    system: monsterSystem({
      hpFormula: "10d8",
      hp: 45,
      ac: 7,
      saves: SAVES_F10,
      morale: 1,
      xp: 3650, // speaking/spellcasting adult
      alignment: "Chaotic",
      treasureType: "Q, N",
      appearing: { d: "1d4", w: "1d4" },
      biography:
        "<p>An adult winged drake of the fire-scarred wastes: flaming red hide, a 90'×30' cone of dragon-flame, and a hoard worth killing for.</p>",
    }),
    extras: {
      types: ["monstrosity"],
      subtype: "red dragon (winged drake)",
      size: "gigantic",
      bodyForm: "draconine",
      mass: { stone: 900, lbs: 9000 },
      hd: { count: 10, asterisks: 3, dieType: 8 },
      saveAs: { class: "fighter", level: 10 },
      speeds: [
        { type: "land", combat: 30, run: 90, hover: false },
        { type: "fly", combat: 80, run: 240, hover: false },
      ],
      vision: ["acute", "lightless"],
      lightlessRange: 90,
      otherSenses: [
        { type: "acuteHearing", range: null, note: "" },
        { type: "acuteOlfaction", range: null, note: "" },
      ],
      load: { normal: 180, capacity: 360 },
      defenses: {
        immunities: { damage: ["fire"], mundane: true, extraordinary: false, effects: "its own breath weapon", note: "" },
        resistances: { damage: ["fire"], mundane: false, extraordinary: true, effects: "", note: "" },
      },
      spellcasting: {
        class: "Arcane (innate)",
        level: 5,
        note: "2/2/1 spells per day; repertoire is innate (no formula or study); speaks Common, Draconic, and one other language per age category",
      },
      secondary: {
        expeditionSpeed: 48,
        trainingMonths: 1,
        intelligence: "sapient",
        reproduction: { count: "1d4", youngType: "egg", intervalUnit: "" },
        oviparous: true,
        // lifespan indefinite — dragons grow through age categories until slain
      },
      encounter: {
        lairChance: 40,
        dungeon: { wandering: { noun: "Solitary", number: "1d4" }, lair: { noun: "Lair", number: "1d4" } },
        wilderness: { wandering: { noun: "Solitary", number: "1d4" }, lair: { noun: "Lair", number: "1d4" } },
      },
      description: {
        appearance: "<p>Gigantic (900 st.). Hide of flaming red, burnt orange, or charcoal.</p>",
        combat:
          "<p>40% chance caught asleep in its lair (surprised the first round). Natural weapons always deal extraordinary damage. Speech chance 20% at adult age — this specimen speaks and casts spells (counts as one additional special ability for XP).</p>",
        ecology:
          "<p>Dragons live indefinitely, growing through ten age categories. A mated pair without offspring incubates 1d4 eggs (600gp, 8 st, 2 hp each; hatch in 1d4×12 months).</p>",
        lore: "<p>\"The last dwarf to truly rule the Meniri Mountains was King Orik Kairn, who died in 225 BE to the dragon-flame of Orm.\" — Sürcaneus of Cyfaraun</p>",
      },
    },
    items: [
      weapon("acksmDrgClaw0000", "Claw", { damage: "2d3", natural: "claw", dmgType: "slashing", extra: true, count: 2 }),
      weapon("acksmDrgBite0000", "Bite", { damage: "2d10", natural: "bite", dmgType: "piercing", extra: true, img: "icons/svg/pawprint.svg" }),
      ability("acksmDrgBreath00", "Flame Breath", {
        category: "breathWeapon",
        usage: "thricePerDay",
        desc: "90'×30' cone of flame dealing 10d6 extraordinary fire damage (Blast save for half). Ignites combustibles; deals full damage to wood and one-tenth to stone. The dragon is immune to its own breath.",
        img: "icons/svg/fire.svg",
      }),
      ability("acksmDrgClutch00", "Clutching Claws", {
        category: "diveAttack",
        desc: "Dive attack with claws for double damage dice. If both claws hit a smaller creature during a dive, it must make a size-adjusted Paralysis save or be grabbed and carried off.",
      }),
      ability("acksmDrgSpells00", "Innate Spellcasting", {
        category: "spellcasting",
        desc: "Casts arcane spells as a caster of level 5 (half HD): 2 first-, 2 second-, and 1 third-level spell per day. Its repertoire is innate.",
      }),
      spoil("acksmDrgGizzard0", "Dragon Gizzard (Adult)", {
        weight6: 48,
        cost: 480,
        component: true,
        effects: ["locate treasure"],
        desc: "Harvest with Animal Husbandry and/or Healing 3 (combined ranks). 8 st.",
      }),
      spoil("acksmDrgGland000", "Pyrrhous Gland", {
        weight6: 48,
        cost: 480,
        component: true,
        effects: ["conflagration", "fireball", "energy invulnerability - fire"],
        desc: "The fire-gland of a red dragon. 8 st.",
        img: "icons/svg/fire.svg",
      }),
      spoil("acksmDrgClaws000", "Dragon Front Claws", {
        weight6: 48,
        cost: 480,
        component: true,
        effects: ["swift sword"],
        desc: "8 st.",
      }),
      spoil("acksmDrgHide0000", "Armored Dragon Hide", { weight6: 144, cost: 400, desc: "An adult dragon's armored hide: 400gp, 24 st." }),
    ],
  });
}

/* -------------------------------------------- */
/*  Heavy Horse (MM p.122)                      */
/* -------------------------------------------- */

function heavyHorse() {
  return monster({
    id: "acksmHvyHorse000",
    name: "Heavy Horse",
    system: monsterSystem({
      hpFormula: "3d8+3",
      hp: 17,
      ac: 2,
      saves: SAVES_F2,
      morale: -2,
      xp: 65,
      alignment: "Neutral",
      treasureType: "none",
      appearing: { w: "1d10*10" },
      biography: "<p>The largest of all equines, bred to be big, strong laborers.</p>",
    }),
    extras: {
      types: ["animal"],
      subtype: "domestic",
      size: "large",
      bodyForm: "equine",
      mass: { stone: 200, lbs: 2000 },
      hd: { count: 3, bonus: 3, asterisks: 0, dieType: 8 },
      saveAs: { class: "fighter", level: 2 },
      speeds: [{ type: "land", combat: 50, run: 150, hover: false }],
      vision: ["night"],
      load: { normal: 40, capacity: 80 },
      secondary: {
        expeditionSpeed: 30,
        supplyCost: 4,
        trainingMonths: 2,
        intelligence: "bestial",
        trainingModifier: 0,
        battleRating: { individual: 0.029, unit: 1.5 },
        lifespan: { baby: 0, juvenile: 0.5, adolescent: 2, adult: 5, middleAged: 12, old: 18, ancient: 24, maximum: 30 },
        reproduction: { count: "1", youngType: "live", interval: 2, intervalUnit: "year" },
        untrainedValue: { adult: 20, juvenile: 10, baby: 8 },
        trainedValue: [
          { role: "warMount", value: 315, note: "war-trained: +2 morale, extra hoof attack" },
          { role: "workbeast", value: 40, note: "" },
        ],
      },
      encounter: {
        lairChance: null,
        dungeon: { wandering: { noun: "None", number: "" }, lair: { noun: "", number: "" } },
        wilderness: { wandering: { noun: "Herd", number: "1d10*10" }, lair: { noun: "", number: "" } },
      },
      description: {
        combat:
          "<p>Most heavy horses are easily frightened (-2 morale). War-trained heavy horses gain +2 morale and one extra hoof attack, and can attack with their hooves during a charge while the rider deals double lance damage.</p>",
        ecology:
          "<p>50% chance a herd is matriarchal with 1d6 juveniles and 1d2 babies. Finely-bred specimens often have exceptional attributes: DEX 13+ adjusts exploration speed by 12.5' × DEX bonus; STR 13+ adjusts maximum load by STR bonus × 4 st.</p>",
      },
    },
    items: [
      weapon("acksmHrsHoof0000", "Hoof", { damage: "1d8", natural: "hoof", dmgType: "bludgeoning", count: 2 }),
      spoil("acksmHrsHooves00", "Horse Hooves", {
        weight6: 6,
        cost: 65,
        component: true,
        effects: ["call of the galloping herd", "safe travels", "vigor"],
        desc: "From an exceptional specimen. 1 st.",
      }),
    ],
  });
}

/* -------------------------------------------- */
/*  Lizardman + Champion (MM p.207)             */
/* -------------------------------------------- */

function lizardmanExtras(overrides = {}) {
  return {
    types: ["humanoid", "beastman"],
    size: "man",
    mass: { stone: 25, lbs: 250 },
    speeds: [
      { type: "land", combat: 20, run: 60, hover: false },
      { type: "swim", combat: 40, run: 120, hover: false },
    ],
    vision: ["lightless", "night"],
    lightlessRange: 60,
    load: { normal: 8, capacity: 16 },
    secondary: {
      expeditionSpeed: 24,
      supplyCost: 0.5,
      trainingMonths: 1,
      intelligence: "sapient",
      battleRating: { individual: 0.047, unit: 5.5 },
      lifespan: { baby: 0, juvenile: 1, adolescent: 13, adult: 17.5, middleAged: 32, old: 48, ancient: 64, maximum: 80 },
      oviparous: true,
      reproduction: { count: "1", youngType: "egg", interval: 2, intervalUnit: "year" },
      untrainedValue: { adult: 65, juvenile: 12, baby: 8 },
      trainedValue: [{ role: "other", value: 1125, note: "or more" }],
    },
    encounter: {
      lairChance: 30,
      dungeon: { wandering: { noun: "Gang", number: "2d4" }, lair: { noun: "Lair", number: "1 warband" } },
      wilderness: { wandering: { noun: "Warband (gangs)", number: "1d8" }, lair: { noun: "Village (warbands)", number: "1d10" } },
    },
    description: {
      appearance:
        "<p>Scaly beastmen crossbred from men and giant lizards; 6' to 7' tall with the heads, claws, scales, and tails of lizards. They speak a degenerate form of Ancient Thrassian.</p>",
      combat:
        "<p>Scaly hides grant +3 AC; shields raise it to AC 4 (dropped on entering melee to fight with claws and bite, -1 AC). +1 damage bonus with weapons. Can hold their breath up to 1 turn. Warriors carry shield, stone hand axe, and 5 barbed darts or 3 javelins.</p>",
      ecology:
        "<p>Gangs are led by a champion, warbands by a sub-chieftain (6 AC, 4+1 HD, 21 hp, +3/+2 damage), lairs by a chieftain (7 AC, 6+2 HD, 30 hp; +2 morale to all while alive). Lairs hold drudges and eggs each equal to 100% of warriors. Villages may add giant lizards, captives, a shaman, and a witch doctor.</p>",
    },
    ...overrides,
  };
}

function lizardmen() {
  const warrior = monster({
    id: "acksmLizardman00",
    name: "Lizardman Warrior",
    system: monsterSystem({
      hpFormula: "2d8+1",
      hp: 10,
      ac: 4,
      saves: SAVES_F2,
      morale: 2,
      xp: 35,
      alignment: "Chaotic",
      treasureType: "J (per warband)",
      appearing: { d: "2d4", w: "1d8" },
    }),
    extras: lizardmanExtras({
      subtype: "warrior",
      hd: { count: 2, bonus: 1, asterisks: 0, dieType: 8 },
      saveAs: { class: "fighter", level: 2 },
      variants: [{ label: "Lizardman Champion", uuid: uuid("acksmLizChamp000") }],
    }),
    items: [
      weapon("acksmLizAxe00000", "Stone Hand Axe", { damage: "1d6+1", natural: "weapon", dmgType: "slashing" }),
      weapon("acksmLizJavelin0", "Javelin", { damage: "1d6+1", natural: "weapon", dmgType: "piercing", missile: true, count: 3 }),
      weapon("acksmLizClaw0000", "Claw", { damage: "1d3", natural: "claw", dmgType: "slashing", count: 2 }),
      weapon("acksmLizBite0000", "Bite", { damage: "1d8", natural: "bite", dmgType: "piercing", img: "icons/svg/pawprint.svg" }),
      ability("acksmLizHide0000", "Scaly Hide", { category: "tough", desc: "Natural scales grant a +3 bonus to AC." }),
      ability("acksmLizBreath00", "Hold Breath", { category: "unusual", desc: "Not truly amphibious, but can hold its breath for up to 1 turn." }),
      spoil("acksmLizScales00", "Lizardman Scales", {
        weight6: 3,
        cost: 35,
        component: true,
        effects: ["swimming", "armor +1"],
        desc: "Harvest with Animal Husbandry and/or Healing 2. 3/6 st.",
      }),
    ],
  });

  const champion = monster({
    id: "acksmLizChamp000",
    name: "Lizardman Champion",
    system: monsterSystem({
      hpFormula: "3d8+1",
      hp: 17,
      ac: 5,
      saves: SAVES_F2,
      morale: 2,
      xp: 65,
      alignment: "Chaotic",
      treasureType: "J (per warband)",
    }),
    extras: lizardmanExtras({
      subtype: "champion (leads each gang)",
      hd: { count: 3, bonus: 1, asterisks: 0, dieType: 8 },
      saveAs: { class: "fighter", level: 3 },
      variants: [{ label: "Lizardman Warrior", uuid: uuid("acksmLizardman00") }],
    }),
    items: [
      weapon("acksmLzcAxe00000", "Stone Hand Axe", { damage: "1d6+2", natural: "weapon", dmgType: "slashing" }),
      weapon("acksmLzcClaw0000", "Claw", { damage: "1d3+1", natural: "claw", dmgType: "slashing", count: 2 }),
      weapon("acksmLzcBite0000", "Bite", { damage: "1d8+1", natural: "bite", dmgType: "piercing", img: "icons/svg/pawprint.svg" }),
      ability("acksmLzcHide0000", "Scaly Hide", { category: "tough", desc: "Natural scales grant a +3 bonus to AC." }),
    ],
  });

  return [warrior, champion];
}

/* -------------------------------------------- */
/*  Orc (MM p.53)                               */
/* -------------------------------------------- */

function orc() {
  return monster({
    id: "acksmOrcWarrior0",
    name: "Orc Warrior",
    system: monsterSystem({
      hpFormula: "1d8",
      hp: 4,
      ac: 3,
      saves: SAVES_F1,
      morale: 0,
      xp: 10,
      alignment: "Chaotic",
      treasureType: "G (per warband)",
      appearing: { d: "2d4", w: "2d6" },
      biography: "<p>Grotesque beastmen bred as warriors from men and wild boars by the ancient Zaharans.</p>",
    }),
    extras: {
      types: ["humanoid", "beastman"],
      subtype: "warrior",
      size: "man",
      mass: { stone: 20, lbs: 200 },
      hd: { count: 1, asterisks: 0, dieType: 8 },
      saveAs: { class: "fighter", level: 1 },
      speeds: [{ type: "land", combat: 40, run: 120, hover: false }],
      vision: ["lightless"], // no night vision — lightless only, 30'
      lightlessRange: 30,
      load: { normal: 7, capacity: 14 },
      secondary: {
        expeditionSpeed: 24,
        supplyCost: 0.5,
        trainingMonths: 1,
        intelligence: "sapient",
        battleRating: { individual: 0.01, unit: 1 },
        lifespan: { baby: 0, juvenile: 1, adolescent: 12, adult: 16, middleAged: 30, old: 45, ancient: 60, maximum: 75 },
        reproduction: { count: "1", youngType: "infant", interval: 1, intervalUnit: "year" },
        untrainedValue: { adult: 58, juvenile: 16, baby: 12 },
        trainedValue: [{ role: "other", value: 225, note: "or more" }],
      },
      encounter: {
        lairChance: 35,
        dungeon: { wandering: { noun: "Gang", number: "2d4" }, lair: { noun: "Lair", number: "1 warband" } },
        wilderness: { wandering: { noun: "Warband (gangs)", number: "2d6" }, lair: { noun: "Village (warbands)", number: "1d10" } },
      },
      description: {
        appearance:
          "<p>Just over 6' tall and around 200 lbs, with pig-like faces, reddish eyes, black hair, and ochre to olive skin, dressed in vivid, clashing colors.</p>",
        combat:
          "<p>Warriors wear leather armor with spear, short sword, and shield; archers wear scale with short bow, 20 arrows, and short sword (50% of gangs are archers). Lightless Vision only (30') — orcs cannot see in normal darkness beyond it.</p>",
        ecology:
          "<p>Gangs are led by a champion (4 AC, 1+1 HD, 8 hp, +1 damage), warbands by a sub-chieftain (5 AC, 2 HD, 12 hp), lairs by a chieftain (6 AC, 4 HD, 20 hp, +2 damage; +2 morale to all while alive). Lairs hold drudges and whelps equal to 100% / 200% of warriors; villages may add ogres, giant boars, captives, a shaman, and a witch doctor.</p>",
      },
    },
    items: [
      weapon("acksmOrcSpear000", "Spear", { damage: "1d6", natural: "weapon", dmgType: "piercing" }),
      weapon("acksmOrcSword000", "Short Sword", { damage: "1d6", natural: "weapon", dmgType: "slashing" }),
      spoil("acksmOrcTeeth000", "Orc Canine Teeth", {
        weight6: 1,
        cost: 10,
        component: true,
        effects: ["beguile humanoid"],
        desc: "Harvest with Animal Husbandry and/or Healing 2. 1/6 st.",
      }),
    ],
  });
}

/* -------------------------------------------- */
/*  Man, Brigand (MM p.219)                     */
/* -------------------------------------------- */

function brigand() {
  return monster({
    id: "acksmBrigand0000",
    name: "Brigand (Bowman)",
    system: monsterSystem({
      hpFormula: "1d8",
      hp: 4,
      ac: 2,
      saves: SAVES_F1,
      morale: 1,
      xp: 10,
      alignment: "Chaotic",
      treasureType: "G (per band)",
      appearing: { d: "2d4", w: "1d10" },
      biography: "<p>Veteran sellswords turned outlaw, banded together to steal and pillage.</p>",
    }),
    extras: {
      types: ["humanoid"],
      subtype: "veteran bowman",
      size: "man",
      mass: { stone: 15, lbs: 150 },
      hd: { count: 1, asterisks: 0, dieType: 8 },
      saveAs: { class: "fighter", level: 1 },
      speeds: [{ type: "land", combat: 40, run: 120, hover: false }],
      vision: ["standard"],
      load: { normal: 5, capacity: 10 },
      secondary: {
        expeditionSpeed: 24,
        supplyCost: 0.5,
        trainingMonths: 1,
        intelligence: "sapient",
        battleRating: { individual: 0.029, unit: 3.5 },
        lifespan: { baby: 0, juvenile: 2, adolescent: 13, adult: 18, middleAged: 38, old: 57, ancient: 76, maximum: 95 },
        reproduction: { count: "1", youngType: "live", interval: 3, intervalUnit: "year" },
        untrainedValue: { adult: 40, juvenile: 8, baby: 4.25 },
        trainedValue: [{ role: "other", value: 700, note: "or 3,000gp (sapient)" }],
      },
      encounter: {
        lairChance: 20,
        dungeon: { wandering: { noun: "Gang", number: "2d4" }, lair: { noun: "Outpost (band)", number: "1" } },
        wilderness: { wandering: { noun: "Band (gangs)", number: "1d10" }, lair: { noun: "Camp (bands)", number: "2d6" } },
      },
      description: {
        combat:
          "<p>AC by armor (leather for bowmen; lamellar and shield for cavalry). 67% of gangs are bowmen (short bow, short sword, dagger); 33% medium cavalry (lance, sword, shield, barded warhorse). Veterans gain +1 damage and +1 to initiative and surprise (Combat Reflexes).</p>",
        ecology:
          "<p>Gangs are led by 2nd-level fighters, bands by 3rd-level fighters, and camps by a 6th-level fighter captain (+2 morale while alive), attended by scouts, crusaders, and mages. Brigand leaders carry magic items per the JJ treasure rules rather than by treasure type.</p>",
        notes:
          "<p>This listing is an example: it assumes veteran (1st-level) bowmen and medium cavalry. Judges should stock brigands trained and equipped for their own campaigns.</p>",
      },
    },
    items: [
      weapon("acksmBrgBow00000", "Short Bow", { damage: "1d6", natural: "weapon", dmgType: "piercing", missile: true }),
      weapon("acksmBrgSword000", "Short Sword", { damage: "1d6+1", natural: "weapon", dmgType: "slashing" }),
      weapon("acksmBrgDagger00", "Dagger", { damage: "1d4+1", natural: "weapon", dmgType: "piercing" }),
      ability("acksmBrgReflex00", "Combat Reflexes", {
        type: "class",
        category: "classPowers",
        desc: "+1 bonus to initiative and to surprise rolls.",
      }),
      ability("acksmBrgManual00", "Manual of Arms", { category: "classPowers", desc: "Trained soldier: drilled in formation fighting." }),
      ability("acksmBrgRiding00", "Riding", { category: "classPowers", desc: "Rides and fights from horseback." }),
      spoil("acksmBrgHeart000", "Brigand's Heart", {
        weight6: 1,
        cost: 10,
        component: true,
        effects: ["beguile humanoid"],
        desc: "Harvest with Healing 1. 1/6 st.",
      }),
    ],
  });
}

/* -------------------------------------------- */
/*  Pack assembly                               */
/* -------------------------------------------- */

export function buildBestiary() {
  return [...rockBaboons(), hydra(), ...elementals(), caveBear(), redDragon(), heavyHorse(), ...lizardmen(), orc(), brigand()];
}

/** Standalone copies of notable harvestable parts (draggable onto any monster). */
export function buildSpoils() {
  const standalone = (doc) => ({ ...doc, _key: `!items!${doc._id}` });
  return [
    standalone(
      spoil("acksmSpoilSkull0", "Rock Baboon Skull", {
        weight6: 2,
        cost: 20,
        component: true,
        effects: ["frighten beast", "speak with beasts"],
        desc: "A special component useful in magic research (2/6 st).",
        img: "icons/svg/skull.svg",
      }),
    ),
    standalone(
      spoil("acksmSpoilPelt00", "Rock Baboon Pelt", {
        weight6: 4,
        cost: 25,
        desc: "A rock baboon's pelt fetches 25gp and weighs 4/6 st.",
      }),
    ),
    standalone(
      spoil("acksmSpHydBlood0", "Hydra Blood", {
        weight6: 70,
        cost: 700,
        component: true,
        effects: ["cure injury", "longevity", "trollblood", "water breathing"],
        desc: "Harvest with Animal Husbandry and/or Healing 3 (combined ranks). 11 4/6 st.",
      }),
    ),
    standalone(
      spoil("acksmSpHydScale0", "Hydra Scales", {
        weight6: 70,
        cost: 700,
        component: true,
        effects: ["repair disability & disfigurement", "restore life & limb"],
        desc: "Harvest with Animal Husbandry and/or Healing 3 (combined ranks). 11 4/6 st.",
      }),
    ),
    standalone(
      spoil("acksmSpHydSkull0", "Hydra Skulls (set)", {
        weight6: 70,
        cost: 700,
        component: true,
        effects: ["swift sword"],
        desc: "The full set of a hydra's skulls. 11 4/6 st.",
        img: "icons/svg/skull.svg",
      }),
    ),
    standalone(
      spoil("acksmSpBearClaw0", "Cave Bear Claws", {
        weight6: 16,
        cost: 160,
        component: true,
        effects: ["iron maiden", "swift sword"],
        desc: "Harvest with Animal Husbandry, Labor (Butchery), or Trapping. 2 4/6 st.",
      }),
    ),
    standalone(
      spoil("acksmSpBearStom0", "Cave Bear Stomach", {
        weight6: 16,
        cost: 160,
        component: true,
        effects: ["call of the wild bear", "locate animal or plant", "slumber"],
        desc: "Harvest with Animal Husbandry, Labor (Butchery), or Trapping. 2 4/6 st.",
      }),
    ),
    standalone(
      spoil("acksmSpBearPelt0", "Cave Bear Pelt", {
        weight6: 18,
        cost: 160,
        desc: "A cave bear's pelt fetches 160gp and weighs 3 st.",
      }),
    ),
    standalone(
      spoil("acksmSpDrgGizz00", "Dragon Gizzard (Adult)", {
        weight6: 48,
        cost: 480,
        component: true,
        effects: ["locate treasure"],
        desc: "Harvest with Animal Husbandry and/or Healing 3 (combined ranks). 8 st.",
      }),
    ),
    standalone(
      spoil("acksmSpDrgGland0", "Pyrrhous Gland", {
        weight6: 48,
        cost: 480,
        component: true,
        effects: ["conflagration", "fireball", "energy invulnerability - fire"],
        desc: "The fire-gland of a red dragon. 8 st.",
        img: "icons/svg/fire.svg",
      }),
    ),
    standalone(
      spoil("acksmSpDrgHide00", "Armored Dragon Hide", {
        weight6: 144,
        cost: 400,
        desc: "An adult dragon's armored hide: 400gp, 24 st.",
      }),
    ),
    standalone(
      spoil("acksmSpLizScale0", "Lizardman Scales", {
        weight6: 3,
        cost: 35,
        component: true,
        effects: ["swimming", "armor +1"],
        desc: "Harvest with Animal Husbandry and/or Healing 2. 3/6 st.",
      }),
    ),
  ];
}

export function buildTreasure() {
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
