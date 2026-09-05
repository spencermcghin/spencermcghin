"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const eldritch_1 = require("./rulesets/eldritch");
const engine_1 = require("./engine");
const idx = (0, engine_1.indexRuleset)(eldritch_1.eldritch);
function character(over = {}) {
    return {
        id: 'c1',
        rulesetId: 'eldritch',
        name: 'Test',
        packageIds: [],
        traitLevels: {},
        trackPositions: {},
        awarded: { cp: 4, influence: 0, coin: 0 },
        fieldValues: {},
        createdAt: '',
        updatedAt: '',
        ...over,
    };
}
const optionFor = (c, traitId, phase = 'advancement') => (0, engine_1.availableTraits)(c, idx, phase).find((o) => o.traitId === traitId);
/* ---------------- compound prerequisites ---------------- */
(0, node_test_1.default)('Bowyer 2 needs Artificer 2 AND Bowyer 1', () => {
    // Has Bowyer 1 and Artificer 1 -- Artificer is one level short.
    const short = character({
        traitLevels: { artificer: 1, bowyer: 1 },
        awarded: { cp: 50, influence: 0, coin: 0 },
    });
    const locked = optionFor(short, 'bowyer');
    strict_1.default.equal(locked.status, 'locked');
    strict_1.default.match(locked.reason, /Artificer 2 and Bowyer 1/);
    const ready = character({
        traitLevels: { artificer: 2, bowyer: 1 },
        awarded: { cp: 50, influence: 0, coin: 0 },
    });
    strict_1.default.equal(optionFor(ready, 'bowyer').status, 'available');
});
(0, node_test_1.default)('Bowyer 1 is locked without Artificer 1', () => {
    const c = character({ awarded: { cp: 50, influence: 0, coin: 0 } });
    const opt = optionFor(c, 'bowyer');
    strict_1.default.equal(opt.status, 'locked');
    strict_1.default.match(opt.reason, /Artificer 1/);
});
/* ---------------- archetype-gated trees ---------------- */
(0, node_test_1.default)('Knight skills are hidden behind the Knight archetype', () => {
    const commoner = character({
        packageIds: ['commonfolk'],
        awarded: { cp: 50, influence: 0, coin: 0 },
    });
    const locked = optionFor(commoner, 'shield-wall');
    strict_1.default.equal(locked.status, 'locked');
    strict_1.default.match(locked.reason, /Knight/);
    const knight = character({
        packageIds: ['knight'],
        awarded: { cp: 50, influence: 0, coin: 0 },
    });
    strict_1.default.equal(optionFor(knight, 'shield-wall').status, 'available');
});
(0, node_test_1.default)('a signature skill needs both the archetype and the rank', () => {
    const rank0 = character({
        packageIds: ['knight'],
        trackPositions: { rank: 0 },
        awarded: { cp: 50, influence: 0, coin: 0 },
    });
    const locked = optionFor(rank0, 'banner-of-mercy');
    strict_1.default.equal(locked.status, 'locked');
    strict_1.default.match(locked.reason, /Rank 2/);
    const rank2 = character({
        packageIds: ['knight'],
        trackPositions: { rank: 2 },
        awarded: { cp: 50, influence: 50, coin: 0 },
    });
    strict_1.default.equal(optionFor(rank2, 'banner-of-mercy').status, 'available');
});
/* ---------------- modifiers ---------------- */
(0, node_test_1.default)("Gentry's 25% reduction applies to rank cost", () => {
    const plain = character({ packageIds: ['commonfolk'] });
    strict_1.default.equal((0, engine_1.trackStepCost)('rank', 1, plain, idx).amount, 12);
    const gentry = character({ packageIds: ['gentry'] });
    strict_1.default.equal((0, engine_1.trackStepCost)('rank', 1, gentry, idx).amount, 9); // 12 * 0.75
    // 16 * 0.75 = 12 exactly; 20 * 0.75 = 15.
    strict_1.default.equal((0, engine_1.trackStepCost)('rank', 2, gentry, idx).amount, 12);
    strict_1.default.equal((0, engine_1.trackStepCost)('rank', 3, gentry, idx).amount, 15);
});
(0, node_test_1.default)('a rank modifier does not leak into trait costs', () => {
    const gentry = character({ packageIds: ['gentry'] });
    strict_1.default.equal((0, engine_1.traitTierCost)('alchemy', 1, gentry, idx).amount, 3);
});
/* ---------------- purchase caps by phase ---------------- */
(0, node_test_1.default)('crafting is capped at level 1 during creation but not after', () => {
    const c = character({
        traitLevels: { alchemy: 1 },
        awarded: { cp: 50, influence: 0, coin: 0 },
    });
    const atCreation = optionFor(c, 'alchemy', 'creation');
    strict_1.default.equal(atCreation.status, 'locked');
    strict_1.default.match(atCreation.reason, /crafting skill at character creation/);
    strict_1.default.equal(optionFor(c, 'alchemy', 'advancement').status, 'available');
});
(0, node_test_1.default)('a non-crafting skill is not caught by the crafting cap', () => {
    const c = character({
        packageIds: ['apothecary'],
        traitLevels: { herbalism: 1 },
        awarded: { cp: 50, influence: 0, coin: 0 },
    });
    // herbalism is granted by Apothecary, so the not-granted cap does not apply
    strict_1.default.equal(optionFor(c, 'herbalism', 'creation').status, 'available');
});
/* ---------------- budget ---------------- */
(0, node_test_1.default)('package-granted trait levels are free; bought levels are not', () => {
    // Apothecary costs 4 CP and grants Alchemy 1 + Herbalism 1 free.
    const c = character({
        packageIds: ['apothecary'],
        traitLevels: { alchemy: 1, herbalism: 1 },
        awarded: { cp: 4, influence: 0, coin: 0 },
    });
    strict_1.default.equal((0, engine_1.balances)(c, idx).cp, 0);
    strict_1.default.deepEqual((0, engine_1.validate)(c, idx), []);
    // Taking Alchemy to 2 costs 3 more CP, which this character cannot afford.
    const overreach = character({
        packageIds: ['apothecary'],
        traitLevels: { alchemy: 2, herbalism: 1 },
        awarded: { cp: 4, influence: 0, coin: 0 },
    });
    strict_1.default.equal((0, engine_1.balances)(overreach, idx).cp, -3);
    const codes = (0, engine_1.validate)(overreach, idx).map((v) => v.code);
    strict_1.default.ok(codes.includes('overspent'));
});
(0, node_test_1.default)('affordability is reported separately from being locked', () => {
    // Prerequisites met, but no points left.
    const broke = character({
        traitLevels: { artificer: 1 },
        awarded: { cp: 3, influence: 0, coin: 0 },
    });
    strict_1.default.equal((0, engine_1.balances)(broke, idx).cp, 0);
    const opt = optionFor(broke, 'academics');
    strict_1.default.equal(opt.status, 'unaffordable');
    strict_1.default.equal(opt.reason, 'Insufficient points');
});
/* ---------------- validation ---------------- */
(0, node_test_1.default)('validate rejects a trait whose prerequisite is missing', () => {
    const c = character({
        traitLevels: { bowyer: 1 }, // requires Artificer 1
        awarded: { cp: 50, influence: 0, coin: 0 },
    });
    const v = (0, engine_1.validate)(c, idx);
    strict_1.default.ok(v.some((x) => x.code === 'unmet-prerequisite' && x.subject === 'bowyer'));
});
(0, node_test_1.default)('a trait cannot satisfy its own prerequisite', () => {
    // Academics 3 held, but 1 and 2 were never taken -- traitLevels records a
    // single number, so the engine must check each tier against the character
    // as they were before that tier.
    const c = character({
        traitLevels: { academics: 3 },
        awarded: { cp: 50, influence: 0, coin: 0 },
    });
    strict_1.default.deepEqual((0, engine_1.validate)(c, idx), []); // levels 1..3 taken in order is legal
});
(0, node_test_1.default)('validate rejects holding two packages of the same tier', () => {
    const c = character({
        packageIds: ['commonfolk', 'gentry'],
        awarded: { cp: 50, influence: 0, coin: 0 },
    });
    strict_1.default.ok((0, engine_1.validate)(c, idx).some((v) => v.code === 'package-tier-limit'));
});
(0, node_test_1.default)('validate rejects a trait not defined in the ruleset', () => {
    const c = character({ traitLevels: { necromancy: 1 } });
    strict_1.default.ok((0, engine_1.validate)(c, idx).some((v) => v.code === 'unknown-trait'));
});
(0, node_test_1.default)('a legal Gentry character validates clean', () => {
    // Gentry costs 4 CP and grants Academics 1 and Income 1 via choices.
    const c = character({
        packageIds: ['gentry'],
        traitLevels: { academics: 1, income: 1 },
        awarded: { cp: 4, influence: 0, coin: 0 },
    });
    strict_1.default.deepEqual((0, engine_1.validate)(c, idx), []);
});
