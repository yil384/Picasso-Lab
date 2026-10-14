// src/moderation.js - words an outside agent puts where viewers read them (its why and plan, its goal, its client's
// name, the arguments the stream's console shows), with offensive words replaced by "[removed]" before anything keeps
// or shows them. The list is LDNOOBW's English list (CC BY 4.0, credit in src/moderation/NOTICE.md). Words match whole
// (never inside another word: "assess", "Scunthorpe" pass), and through the usual disguises: letters for digits and
// symbols ("sh1t", "a$$"), letters spaced or dotted apart ("f u c k", "f.u.c.k"), letters drawn out ("fuuuck"), and
// masks ("f*ck"). A few slurs and the strongest word also match inside longer words ("fuckyou"). Numbers alone are
// never read as letters (a coordinate such as 455 stays).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REMOVED = '[removed]';
const HERE = path.dirname(fileURLToPath(import.meta.url));

/** The list's entries, each as its normalized words (one word, or a phrase of several). */
function loadList(file = path.join(HERE, 'moderation', 'ldnoobw-en.txt')) {
  const lines = fs.readFileSync(file, 'utf8').split('\n').map((l) => l.trim().toLowerCase()).filter(Boolean);
  return lines.map((l) => l.split(/[\s-]+/).map((w) => fold(w)).filter(Boolean)).filter((ws) => ws.length);
}

/** Lower case, accents off ("fück" -> "fuck"). */
function fold(s) {
  return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// digits and symbols written for letters, read only in a word that has a letter too
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', 9: 'g', '@': 'a', $: 's', '!': 'i', '|': 'l', '+': 't', '€': 'e' };
// the strongest word and a few slurs: also inside longer words (none of them is part of an ordinary English word)
const INSIDE = ['fuck', 'nigger', 'nigga', 'faggot', 'motherfuck'];

/** The forms a token may stand for: as written, with symbols read as letters, and with drawn-out letters shortened. */
function formsOf(token) {
  const t = fold(token).replace(/^[!|+]+|[!|+]+$/g, '');
  if (!t) return [];
  const forms = new Set([t]);
  if (/\p{L}/u.test(t)) forms.add([...t].map((c) => LEET[c] ?? c).join(''));
  for (const f of [...forms]) {
    forms.add(f.replace(/(.)\1{2,}/g, '$1')); // "fuuuck" -> "fuck"
    forms.add(f.replace(/(.)\1+/g, '$1')); // "shiit" -> "shit"
  }
  return [...forms].filter((f) => /^[\p{L}\p{N}&*]+$/u.test(f));
}

/**
 * A moderator over a word list: clean(text) -> {text, removed} with every offensive word or phrase replaced by
 * REMOVED; removed is how many were.
 */
export function createModerator({ list = loadList() } = {}) {
  const single = new Set(list.filter((ws) => ws.length === 1).map((ws) => ws[0]));
  const phrases = list.filter((ws) => ws.length > 1);
  const masked = [...single].filter((w) => w.length >= 3);
  const isWord = (forms) => forms.some((f) => single.has(f) || INSIDE.some((w) => f.includes(w)));
  // a mask: "f*ck", "sh*t", "f**k" (at least 2 letters, the * standing for one letter each)
  const isMasked = (token) => {
    const t = fold(token);
    if (!/\*/.test(t) || t.replace(/\*/g, '').length < 2 || t.length < 3) return false;
    const re = new RegExp(`^${t.split('').map((c) => (c === '*' ? '[a-z]' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('')}$`);
    return masked.some((w) => w.length === t.length && re.test(w));
  };

  function clean(input) {
    const text = String(input ?? '');
    if (!text) return { text, removed: 0 };
    // the words, with where they stand
    const tokens = [];
    const re = /[\p{L}\p{N}@$*!&|+€]+/gu;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      // a "!" or "|" before or after a word is punctuation, not a letter: not part of the word's span
      const lead = /^[!|+]*/.exec(m[0])[0].length;
      const w = m[0].slice(lead).replace(/[!|+]+$/, '');
      if (w) tokens.push({ s: m.index + lead, e: m.index + lead + w.length, w });
    }
    const spans = [];
    // single letters spaced or dotted apart, three or more in a row: read as one word ("f u c k", "f.u.c.k")
    for (let i = 0; i < tokens.length;) {
      let j = i;
      while (j < tokens.length && tokens[j].w.length === 1 && (j === i || /^[\s._\-,/]{1,2}$/.test(text.slice(tokens[j - 1].e, tokens[j].s)))) j += 1;
      if (j - i >= 3) {
        const joined = tokens.slice(i, j).map((t) => t.w).join('');
        if (isWord(formsOf(joined))) spans.push([tokens[i].s, tokens[j - 1].e]);
        i = j;
      } else i += 1;
    }
    // whole words, and the phrases of several
    const formsAt = tokens.map((t) => formsOf(t.w));
    for (let i = 0; i < tokens.length; i++) {
      if (isWord(formsAt[i]) || isMasked(tokens[i].w)) { spans.push([tokens[i].s, tokens[i].e]); continue; }
      for (const ws of phrases) {
        if (i + ws.length > tokens.length) continue;
        if (ws.every((w, k) => formsAt[i + k].includes(w))) spans.push([tokens[i].s, tokens[i + ws.length - 1].e]);
      }
    }
    if (!spans.length) return { text, removed: 0 };
    // replaced from the end, overlapping spans as one
    spans.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const sp of spans) {
      const last = merged.at(-1);
      if (last && sp[0] <= last[1]) last[1] = Math.max(last[1], sp[1]); else merged.push([...sp]);
    }
    let out = text;
    for (let k = merged.length - 1; k >= 0; k--) out = out.slice(0, merged[k][0]) + REMOVED + out.slice(merged[k][1]);
    return { text: out, removed: merged.length };
  }

  /**
   * Every string in a value (an MCP call's arguments), cleaned: {value, removed, fields} with the same shape; fields
   * names where words went (e.g. "why", "steps[2].args.text").
   */
  function cleanValue(value, at = '') {
    if (typeof value === 'string') {
      const r = clean(value);
      return { value: r.text, removed: r.removed, fields: r.removed ? [at || 'text'] : [] };
    }
    if (Array.isArray(value)) {
      let removed = 0;
      const fields = [];
      const out = value.map((v, i) => { const r = cleanValue(v, `${at}[${i}]`); removed += r.removed; fields.push(...r.fields); return r.value; });
      return { value: removed ? out : value, removed, fields };
    }
    if (value && typeof value === 'object') {
      let removed = 0;
      const fields = [];
      const out = {};
      for (const [k, v] of Object.entries(value)) { const r = cleanValue(v, at ? `${at}.${k}` : k); removed += r.removed; fields.push(...r.fields); out[k] = r.value; }
      return { value: removed ? out : value, removed, fields };
    }
    return { value, removed: 0, fields: [] };
  }

  return { clean, cleanValue };
}

let shared = null;
/** The moderator over LDNOOBW's English list, made once. */
export function moderator() {
  shared ??= createModerator();
  return shared;
}
