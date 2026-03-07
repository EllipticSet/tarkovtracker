# PvP Prestige Integration Plan (2026-03-05)

## Goal

Add a real PvP prestige flow that archives completed run data before reset, so users can compare current progression against previous prestige runs.

## Current State Review

- Prestige is currently a direct numeric setter in settings.
- PvP reset exists but permanently wipes current PvP data.
- Merge logic is max/sticky and can reintroduce old progress after resets across devices.
- `user_progress` mode payload is sanitized to an allowlist, so run history cannot be reliably stored inside `pvp_data`.

## EFT Prestige Facts (live query on 2026-03-05)

- Source: `https://api.tarkov.dev/graphql` query `prestige(lang: en, gameMode: regular)`.
- Prestige levels available: `1` through `6`.
- Shared requirement shape per tier:
  - Player level: `47`
  - Quest completion: `Collector` (and `New Beginning` for tiers 1-4)
  - Skills: `Strength 20`, `Endurance 20`, `Charisma 15/20`
  - Hideout stations: `Intelligence Center 2`, `Security 3`, `Rest Space 3`
  - Item payment: `20,000,000 Roubles`
- Transfer settings scale by prestige tier:
  - Skill transfer rate: `0.05` → `0.30`
  - Weapon mastering transfer rate: `0.05` → `0.30`
  - Stash carryover footprint: `8x3` → `8x8` with allowed item/category filters.

## Phase 1 (Implement Now)

1. Add persistent run history table:
   - `user_prestige_runs`
   - store `user_id`, mode, from/to prestige level, archived progress snapshot, summary payload, timestamp
2. Add progress epoch support:
   - `progressEpoch` in mode data
   - bump epoch on destructive resets and prestige
   - make merge logic epoch-aware so newer epoch wins over stale-device data
3. Add store action:
   - `prestigePvP()`
   - validate mode and max prestige
   - archive current PvP state into `user_prestige_runs`
   - reset PvP state and increment prestige level
4. Add UI action:
   - new `Prestige PvP` button in data management reset section
   - confirmation modal requiring typed confirmation word

## Phase 2 (Next)

1. Add Prestige History UI (list latest archived runs)
2. Add run-to-run comparison cards/charts on profile
3. Extend shared profile API for optional history snapshots (read-only)

## Risks

- Cross-device stale sync resurrecting old data if epoch is not respected everywhere.
- Locale key coverage across all supported languages.
- Migration consistency with existing sanitize trigger/function overrides.

## Validation Checklist

- Prestige action archives a run row before resetting PvP state.
- PvP prestige increments by exactly one and caps at 6.
- PvE data remains untouched.
- Old-device sync does not overwrite newly prestiged state.
- Existing reset actions continue working.
