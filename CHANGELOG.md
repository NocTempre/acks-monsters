# Changelog

## 0.6.1

- **Field-builders and the movement / senses / vision shapes consumed from
  acks-lib.** The nullable leaf builders (`num` / `str` / `bool` / `html` /
  `choice` / `choiceSet`) and the Speed / Senses / Vision field shapes are now
  imported from acks-lib's `fields.mjs` instead of defined inline. The resulting
  schema is byte-identical, so stored monster extras are unaffected. This also
  corrects 0.6.0's note that the leaf builders "stay local": acks-lib's `num` /
  `str` are the same nullable "unspecified" builders (not required-with-zero),
  so they fold cleanly. acks-lib's `speedsField` was extended to the full ACKS
  Speed row (`combat` / `hover`) to match this sheet before adoption.
- **`defenses` stays local, deliberately.** A monster's immunity / resistance
  `effects` is open Monstrous-Manual prose ("all death effects") with a free
  `note`; acks-lib's `defensesField` models the closed `EFFECT_KEYS` /
  `CONDITION_KEYS` an ability grants (its consumer, acks-abilities, needs the
  enum). Different models on purpose — not folded.
- Requires acks-lib >= 0.14.0 (the release that completed the shared Speed row).

## 0.6.0

- **Shared enums consumed from acks-lib.** The six enums this sheet held that
  duplicated the family's vocabulary — damage / natural-weapon / vision / sense
  / movement types and alignment — plus the `choicesOf` choices-map helper are
  now re-exported from acks-lib's `vocab.mjs` instead of defined locally.
  `config.mjs` re-exports them, so every consumer (`monster-extras`,
  `item-annotations`) keeps importing from `./config.mjs` unchanged; the
  monster-specific enums (types, sizes, body forms, saves LUT, special
  abilities, …) stay local. Behaviour-neutral — the enums were already
  value-identical, and acks-lib's `NATURAL_WEAPONS` was extended to the superset
  (adding this sheet's `sting` / `feeler` / `envelopment`) so nothing is lost.
  The nullable `num` / `str` field-builders in `monster-extras` stay local: a
  blank monster field means "unspecified", which acks-lib's required-with-zero
  builders deliberately do not model.
- Adds a hard dependency on **acks-lib** (>= 0.13.0, the release that carries
  the extended natural-weapons list).

Releases up to and including 0.5.3 predate this file; see the git history
and GitHub releases for earlier changes.
