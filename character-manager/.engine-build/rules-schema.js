"use strict";
/**
 * Abstract LARP ruleset schema.
 *
 * A "Project" in the app is one Ruleset. Nothing here is specific to any
 * single game -- Eldritch is encoded in ./rulesets/eldritch.ts to prove the
 * model holds against a real published system.
 *
 * The generality rests on two choices:
 *
 *   1. `Condition` is a boolean expression tree rather than a flat list of
 *      prerequisites. Compound prereqs, archetype gates, rank gates and
 *      per-tag caps are all expressible without adding fields.
 *
 *   2. `Grant` includes a `choice` variant. Published rulesets are full of
 *      "you get A or B"; flattening that away loses the player's decision.
 */
Object.defineProperty(exports, "__esModule", { value: true });
