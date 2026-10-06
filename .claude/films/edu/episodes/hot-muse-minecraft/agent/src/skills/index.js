// src/skills/index.js - the skill whitelist: one function per tool in contracts.js, nothing else. A skill is
// (ctx, args) => Promise<{ok, result}> and only ever receives arguments that passed validateArgs.

import { TOOL_NAMES } from '../contracts.js';
import { getState, eat, say } from './basic.js';
import { goTo } from './move.js';
import { collect } from './collect.js';
import { craft } from './craft.js';
import { smelt } from './smelt.js';
import { place } from './place.js';
import { build } from './build.js';
import { attack } from './attack.js';

export const SKILLS = Object.freeze({
  get_state: getState,
  go_to: goTo,
  collect,
  craft,
  smelt,
  place,
  build,
  attack,
  eat,
  say,
});

for (const name of TOOL_NAMES) {
  if (typeof SKILLS[name] !== 'function') throw new Error(`skills: no skill for tool "${name}"`);
}
for (const name of Object.keys(SKILLS)) {
  if (!TOOL_NAMES.includes(name)) throw new Error(`skills: "${name}" is not a tool in contracts.js`);
}
