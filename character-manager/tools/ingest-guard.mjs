/**
 * What may and may not be ingested into a story map.
 *
 *   node tools/ingest-guard.mjs tools/eldritch-narrative.json
 *
 * The story map is readable by everyone in a project. The documents it is
 * built from are not: a LARP's plot meetings minute the canon and the staffing
 * in the same breath, so the same file that settles what the cannon does also
 * records who was hurt at the last event, whose work was late, who is being
 * kept off shifts, and who left a meeting in tears.
 *
 * IN SCOPE
 *   In-game content and anything needed to build the campaign: story, canon,
 *   characters, places, factions, artifacts, plot threads, encounters, props
 *   and text props, lore, art direction, mechanics and rules decisions.
 *
 * OUT OF SCOPE
 *   Anything about the people running the game: performance, conduct,
 *   conflicts, apologies, injuries and safety incidents, health, burnout,
 *   waitlists, shift assignments, pay, and anything else that would belong in
 *   a private staff channel.
 *
 * This screens the OUTPUT rather than the input. Judgement during extraction
 * is where the real filtering happens; this is the net underneath it, so that
 * a slip lands in a failing check rather than in front of the whole project.
 *
 * It is a review gate, not a censor: it flags and stops the build, and a
 * person decides. It is tuned to over-flag -- an in-game apology or a
 * character with a grievance will trip it -- because a false positive costs a
 * moment's reading and a false negative publishes something about a real
 * colleague.
 */

import { readFileSync } from 'node:fs';

/**
 * Phrases that mark writing about the people running the game rather than
 * about the game. Deliberately about production language, not about subject
 * matter: "stopping bleeding and setting bones" is a first aid skill, while
 * "the player who caused the injury" is an incident report.
 */
const SIGNALS = [
  // Incidents involving real people.
  [/\b(a )?player (named|called)\b/i, 'names a real player'],
  [/\bshield[- ]check(ed|ing)?\b/i, 'safety incident'],
  [/\b(injur(y|ies|ed)|concussion|first aider|medic)\b.*\b(report|follow up|incident|player|npc)\b/i,
    'injury incident'],
  [/\bsafety (violation|protocol|incident)\b/i, 'safety incident'],

  // Conduct, conflict and wellbeing.
  [/\b(apologi[sz]ed?|apolog(y|ies))\b/i, 'apology between staff'],
  [/\b(passive[- ]aggressive|dismissive|defensive communication|gaslighting)\b/i,
    'interpersonal conflict'],
  [/\b(in tears|made .{0,20}cry|felt (devalued|disrespected|ignored))\b/i,
    'interpersonal conflict'],
  [/\b(burn ?out|exhaustion|mental health|personal (life|matters)|work[- ]life balance)\b/i,
    'wellbeing'],
  [/\bweek of joy\b/i, 'staff wellbeing convention'],

  // Staffing and administration.
  [/\bwait ?list\b/i, 'waitlist decision about a person'],
  [/\b(npc|volunteer|marshal) (shift|sign[- ]?up|roster|schedule)\b/i, 'shift assignment'],
  [/\bmiss(ed|ing) (a |the )?deadlines?\b/i, 'performance'],
  [/\b(lack of|poor) (initiative|responsiveness|preparation)\b/i, 'performance'],
  [/\bprevent \w+ from (signing up|taking on)\b/i, 'staffing decision about a person'],
  [/\b(removed from|banned from) (combat|the event)\b/i, 'conduct decision'],

  // Direct identifiers.
  [/[\w.+-]+@[\w-]+\.[\w.]+/, 'email address'],
  [/\bdiscord\b/i, 'internal channel reference'],
];

/** Every flagged phrase in a piece of text. */
export function screen(text) {
  if (!text) return [];
  const found = [];
  for (const [pattern, reason] of SIGNALS) {
    const m = pattern.exec(text);
    if (m) found.push({ reason, matched: m[0] });
  }
  return found;
}

/** Text a reader of the map would actually see. */
function visibleText(map) {
  const out = [];
  for (const e of map.entities ?? []) {
    out.push({
      where: `entity "${e.name}"`,
      text: [e.name, e.summary, e.body, ...(e.aliases ?? []), ...(e.tags ?? [])]
        .filter(Boolean)
        .join('\n'),
    });
    for (const s of e.sources ?? []) {
      out.push({ where: `source on "${e.name}"`, text: [s.label, s.locator].filter(Boolean).join(' ') });
    }
  }
  for (const r of map.relations ?? []) {
    if (r.note) out.push({ where: `connection ${r.id}`, text: r.note });
  }
  for (const k of map.entityKinds ?? []) {
    out.push({ where: `kind "${k.label}"`, text: [k.label, k.plural, k.description].filter(Boolean).join('\n') });
  }
  return out;
}

export function screenMap(map) {
  const findings = [];
  for (const { where, text } of visibleText(map)) {
    for (const hit of screen(text)) findings.push({ where, ...hit });
  }
  return findings;
}

/* Run directly: check a map file and fail the build if anything is flagged. */
const invokedDirectly =
  process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());

if (invokedDirectly) {
  const path = process.argv[2];
  if (!path) {
    console.error('usage: node tools/ingest-guard.mjs <narrative map json>');
    process.exit(2);
  }
  const findings = screenMap(JSON.parse(readFileSync(path, 'utf8')));
  if (findings.length === 0) {
    console.log(`ingest guard: ${path} is clear of personnel content`);
    process.exit(0);
  }
  console.error(`ingest guard: ${findings.length} thing(s) to look at in ${path}\n`);
  for (const f of findings) {
    console.error(`  ${f.where}\n    ${f.reason}: "${f.matched}"`);
  }
  console.error(
    '\nThis is a review gate, not a verdict. Either the text is about the ' +
      'people running the game and should not be in a map everyone can read, ' +
      'or it is in-game and the phrasing needs changing.'
  );
  process.exit(1);
}
