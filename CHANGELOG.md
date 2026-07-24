# Changelog

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
