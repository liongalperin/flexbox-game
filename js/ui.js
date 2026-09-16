/* ============================================================================
 * ui.js — Presentation layer (Developer 2)
 * ----------------------------------------------------------------------------
 * Consumes the GameEngine singleton (docs/api-contract.md §4-§5) and binds it
 * to the DOM. Owns rendering, animation and input handling only — all level
 * data, validation and persistence belong to Developer 1's engine.
 *
 * Supporting modules, kept separate because none of them touch the DOM:
 *   ./css-parser.js    strict parsing of the rule the player types
 *   ./sound.js         synthesised Web Audio feedback
 *   ./environments.js  which scene each level is flown over
 *   ./i18n.js          every readable string, in Hebrew and English
 *
 * Vanilla JavaScript. No libraries, no build step, no external requests.
 * ==========================================================================*/

import { GameEngine } from './engine.js';
import { sfx, setMuted } from './sound.js';
import { environmentForLevel } from './environments.js';
import { parseDeclarations } from './css-parser.js';
import { t, UI, LEVEL_EN, LANGS } from './i18n.js';

/* ========================================================================== *
 * 1. Constants and element cache
 * ========================================================================== */

/** The only container properties this layer ever writes to #player-layer. */
const FLEX_PROPS = ['flex-direction', 'justify-content', 'align-items', 'flex-wrap'];

const BOARD_SIZE = 480;
const PREFS_KEY = 'FLEXBOX_GAME_UI_PREFS'; /* deliberately NOT the engine's key */


const el = {};
[
  'boot-error', 'boot-error-msg',
  'hud-current', 'hud-total', 'hud-title', 'hud-attempts',
  'board-host', 'board-wrapper', 'board', 'target-layer', 'player-layer',
  'banner', 'banner-title', 'banner-text', 'feedback',
  'instruction', 'hint', 'btn-hint',
  'prop-chips', 'code-input', 'code-gutter', 'code-msg', 'code-selector', 'hud-env',
  'btn-check', 'btn-reset', 'btn-prev', 'btn-next',
  'levels-nav', 'levels-list',
  'victory', 'victory-text', 'btn-replay', 'btn-close-victory',
  'btn-lang', 'btn-sound', 'sound-icon',
  'tpl-heli',
].forEach((id) => { el[id] = document.getElementById(id); });

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Current-language lookup. */
function tr(key, vars) { return t(prefs.lang, key, vars); }

/** Level text for the active language; Hebrew comes from the data layer. */
function levelText(lvl) {
  if (!lvl) return { title: '', instruction: '', hint: '' };
  const en = LEVEL_EN[lvl.id] || {};
  if (prefs.lang === 'en') {
    return {
      title: en.title || lvl.title || '',
      instruction: lvl.instructionEn || lvl.instructionHe || '',
      hint: en.hint || lvl.hint || '',
    };
  }
  return {
    title: lvl.title || '',
    instruction: lvl.instructionHe || lvl.instructionEn || '',
    hint: lvl.hint || '',
  };
}

/**
 * Swap every statically-marked string.
 *
 * The page stays right-to-left in both languages: English is a reading aid, not
 * a different edition of the site, and mirroring the whole layout on a toggle
 * is disorienting. Only the prose blocks — the instruction and its hint — get
 * their own direction, so English sentences still read left to right.
 */
function applyLanguage() {
  document.documentElement.lang = prefs.lang;
  document.documentElement.dir = 'rtl';

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    node.textContent = tr(node.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-attr]').forEach((node) => {
    node.dataset.i18nAttr.split(',').forEach((pair) => {
      const [attr, key] = pair.split(':');
      if (attr && key) node.setAttribute(attr.trim(), tr(key.trim()));
    });
  });
}

/** Store a writable copy of an engine state snapshot. Returns the copy. */
function adoptState(next) {
  if (!next) return state;
  const scores = next.scores || {};
  state = Object.assign({}, next, {
    currentStyles: Object.assign({}, next.currentStyles),
    scores: Object.assign({}, scores, {
      completedLevels: Array.isArray(scores.completedLevels) ? scores.completedLevels.slice() : [],
      starsPerLevel: Object.assign({}, scores.starsPerLevel),
    }),
  });
  return state;
}

/* Mutable UI state.
   The engine hands back deep-frozen snapshots (api-contract §4.1), and modules
   run in strict mode, so writing to one throws a TypeError. Everything the
   engine returns is therefore copied through adoptState() before the UI keeps
   it, and engine-owned objects are only ever read. */
let state = null;
let level = null;
let boardScale = 1;
let renderSeq = 0;   /* bumped by every full render — see ensureRendered() */
let resultSeq = 0;   /* bumped by every validation outcome handled */
let prefs = { muted: false, lang: 'he', code: {} };

/* ========================================================================== *
 * 2. Engine safety wrapper
 * --------------------------------------------------------------------------
 * Developer 1's implementation may lag behind or drift from the contract.
 * Every call goes through here so a missing or throwing method degrades into
 * a console warning and a graceful fallback instead of a blank page.
 * ========================================================================== */

const warned = new Set();

function callEngine(name, fallback, ...args) {
  const fn = GameEngine && GameEngine[name];
  if (typeof fn !== 'function') {
    if (!warned.has(name)) {
      warned.add(name);
      console.warn(`[ui] GameEngine.${name}() is not available — feature disabled.`);
    }
    return fallback;
  }
  try {
    return fn.apply(GameEngine, args);
  } catch (err) {
    console.error(`[ui] GameEngine.${name}() threw`, err);
    return fallback;
  }
}

function engineHas(name) {
  return !!(GameEngine && typeof GameEngine[name] === 'function');
}

function showEngineError(message) {
  if (el['boot-error-msg']) el['boot-error-msg'].textContent = message;
  if (el['boot-error']) el['boot-error'].hidden = false;
}

/* ========================================================================== *
 * 3. Preferences (UI-only; never touches the engine's storage key)
 * ========================================================================== */

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) prefs = Object.assign(prefs, JSON.parse(raw));
    if (!prefs.code || typeof prefs.code !== 'object') prefs.code = {};
    setMuted(prefs.muted);
  } catch (err) {
    console.warn('[ui] preferences unavailable', err);
  }
}

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (err) { /* private browsing — not worth surfacing */ }
}

/* ========================================================================== *
 * 4. Board scaling
 * --------------------------------------------------------------------------
 * REQUIREMENT: the board keeps fixed 480x480 dimensions at every screen size
 * so a level's solution never depends on resolution. We therefore never touch
 * width/height — only a paint-time transform: scale(). Because transforms do
 * not affect layout, the wrapper is resized to the scaled footprint so no
 * empty space is left underneath.
 * ========================================================================== */

function fitBoard() {
  if (!el['board-host'] || !el.board) return;
  const available = el['board-host'].clientWidth;
  boardScale = Math.min(1, available / BOARD_SIZE) || 1;
  const size = `${Math.round(BOARD_SIZE * boardScale)}px`;
  el.board.style.transform = `scale(${boardScale})`;
  el['board-wrapper'].style.width = size;
  el['board-wrapper'].style.height = size;
}

let resizeTimer = 0;
function onResize() {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(fitBoard, 60);
}

/* ========================================================================== *
 * 5. Item rendering
 * ========================================================================== */

const KNOWN_COLORS = ['blue', 'green', 'yellow', 'gold', 'red', 'cyan', 'purple', 'orange', 'pink', 'star'];


/* Every helicopter in a squadron shares one type, and therefore one colour.
   That is fine when the solution only moves the group as a whole, but it hides
   what is actually being taught on levels where the *order* or the *line* an
   item lands on changes — a reversal of three identical red helicopters looks
   like nothing happened. Those levels get one distinct hue per position, so
   1-2-3 visibly becomes 3-2-1 and a wrapped item can be traced to its row. */
const ORDER_HUES = ['#38bdf8', '#facc15', '#f472b6', '#4ade80', '#fb923c', '#c084fc'];

function needsSequenceColors(lvl) {
  const target = (lvl && lvl.targetContainerStyles) || {};
  return Object.keys(target).some((prop) => {
    const value = String(target[prop]);
    /* reversals change the order; wrapping changes which line an item is on */
    return /-reverse$/.test(value) || value === 'wrap';
  });
}

/**
 * Resolve a GameItem.type to a palette colour. Every type ends in its colour —
 * 'scout-blue', 'gunship-pink' — so the trailing token is the answer. Parsing
 * rather than keeping a lookup table means a type the data layer adds later
 * still renders, and anything unrecognised falls back to slate instead of
 * rendering nothing at all.
 */
function colorOf(type) {
  const token = String(type || '').toLowerCase().replace(/-\d+$/, '').split('-').pop();
  return KNOWN_COLORS.indexOf(token) !== -1 ? token : 'default';
}

function makePad(item, position) {
  const slot = document.createElement('div');
  slot.className = 'slot slot--pad';

  const disc = document.createElement('div');
  disc.className = 'pad__disc';
  disc.style.animationDelay = `${position * 0.18}s`;

  const h = document.createElement('span');
  h.className = 'pad__h';
  h.textContent = 'H';

  disc.appendChild(h);
  slot.appendChild(disc);
  return slot;
}

function makeHeli(item, position, sequenced) {
  const slot = document.createElement('div');
  slot.className = `slot slot--player heli heli--${colorOf(item.type)}`;
  slot.dataset.itemId = item.id || '';

  if (sequenced) {
    slot.classList.add('heli--seq');
    slot.style.setProperty('--heli-color', ORDER_HUES[position % ORDER_HUES.length]);
  }

  const tpl = el['tpl-heli'];
  if (tpl && tpl.content.firstElementChild) {
    slot.appendChild(tpl.content.firstElementChild.cloneNode(true));
  }

  /* No badge: the engine's ad-hoc labels ('α', 'P1', 'CMD', '01') were clutter
     and inconsistent between levels, and on the levels where order matters the
     colours carry it on their own. */
  return slot;
}

/* ========================================================================== *
 * 6. Style application + FLIP animation
 * ========================================================================== */

function writeStyles(node, styles) {
  if (!node) return;
  FLEX_PROPS.forEach((prop) => node.style.removeProperty(prop));
  node.style.display = 'flex'; /* the mandatory display:flex container */
  Object.keys(styles || {}).forEach((prop) => {
    if (FLEX_PROPS.indexOf(prop) !== -1) node.style.setProperty(prop, styles[prop]);
  });
}

/**
 * Flexbox container properties are not transitionable — items would teleport.
 * FLIP (First, Last, Invert, Play) records each helicopter's position before
 * and after the change, inverts the delta with a transform, then releases it
 * so the browser animates a real flight path.
 */
function applyPlayerStyles(styles, animate) {
  const layer = el['player-layer'];
  if (!layer) return;

  const shouldAnimate = animate && !reduceMotion.matches;
  const items = Array.prototype.slice.call(layer.children);

  if (!shouldAnimate || items.length === 0) {
    writeStyles(layer, styles);
    return;
  }

  const first = items.map((node) => node.getBoundingClientRect());
  writeStyles(layer, styles);
  const last = items.map((node) => node.getBoundingClientRect());

  items.forEach((node, i) => {
    /* Rects are in screen pixels. The board may be visually scaled, and the
       transform we set is applied inside that scaled space, so divide it out
       or the helicopters overshoot on small screens. */
    const dx = (first[i].left - last[i].left) / boardScale;
    const dy = (first[i].top - last[i].top) / boardScale;
    if (!dx && !dy) return;

    const bank = Math.max(-16, Math.min(16, dx * 0.1));
    node.style.transition = 'none';
    node.style.transform = `translate(${dx}px, ${dy}px) rotate(${bank}deg)`;
  });

  void layer.offsetWidth; /* force reflow so the inverted position is committed */

  items.forEach((node) => {
    node.style.transition = '';
    node.style.transform = '';
  });
}

/* ========================================================================== *
 * 7. Render
 * ========================================================================== */

function renderHud() {
  if (!state) return;
  el['hud-current'].textContent = state.currentLevelNumber;
  el['hud-total'].textContent = state.totalLevels;
  el['hud-attempts'].textContent = state.attemptsCurrentLevel || 0;
  el['hud-title'].textContent = level ? levelText(level).title : '';
}

function renderInstruction() {
  if (!level) return;
  const text = levelText(level);
  const dir = prefs.lang === 'en' ? 'ltr' : 'rtl';
  el.instruction.textContent = text.instruction;
  el.instruction.setAttribute('dir', dir);

  el['btn-hint'].hidden = !text.hint;
  el.hint.textContent = text.hint;
  el.hint.setAttribute('dir', dir);
  el.hint.hidden = true;
  el['btn-hint'].setAttribute('aria-expanded', 'false');
}

function renderBoard() {
  if (!level) return;
  const target = el['target-layer'];
  const player = el['player-layer'];

  target.textContent = '';
  player.textContent = '';
  player.classList.remove('is-landed', 'is-wrong');

  const list = Array.isArray(level.items) ? level.items : [];
  const sequenced = needsSequenceColors(level);
  list.forEach((item, i) => target.appendChild(makePad(item, i)));
  list.forEach((item, i) => player.appendChild(makeHeli(item, i, sequenced)));

  /* The target layer shows where the helicopters must end up. */
  writeStyles(target, level.targetContainerStyles);
  applyPlayerStyles(state ? state.currentStyles : level.initialContainerStyles, false);
  updateLandedState();
}

function levelControls() {
  return Array.isArray(level && level.availableProperties) ? level.availableProperties : [];
}

function controlFor(property) {
  return levelControls().filter((c) => c.property === property)[0] || null;
}

function optionsFor(property) {
  const control = controlFor(property);
  return control && Array.isArray(control.options) ? control.options : [];
}

function shakeCode() {
  const pane = el['code-input'].closest('.code');
  if (!pane) return;
  pane.classList.remove('is-shake');
  void pane.offsetWidth;
  pane.classList.add('is-shake');
}

function setCodeMessage(problems) {
  const box = el['code-msg'];
  const pane = el['code-input'].closest('.code');
  if (!problems.length) {
    box.textContent = '';
    box.className = 'code__msg';
    if (pane) pane.classList.remove('is-error');
    return;
  }
  box.textContent = problems[0];
  box.className = 'code__msg code__msg--bad';
  if (pane) pane.classList.add('is-error');
}

function refreshGutter() {
  const typed = el['code-input'].value.split('\n').length;
  /* Show exactly as many editable lines as the level needs, so the player can
     see at a glance that (say) level 4 wants two declarations, not one. */
  const needed = Math.max(1, levelControls().length);
  const rows = Math.max(needed, typed);
  el['code-input'].rows = rows;
  /* 1: selector, 2: display:flex, then the editable rows, then the brace */
  const total = 2 + rows + 1;
  let out = '';
  for (let i = 1; i <= total; i += 1) out += i + '\n';
  el['code-gutter'].textContent = out.trim();
}

/* Result of the most recent parse, consulted by the Check button. */
let editorProblems = [];
let editorDeclCount = 0;

/** Read the editor, push the result through the engine, animate the board. */
function syncFromEditor(animate) {
  if (!level) return;
  const parsed = parseDeclarations(el['code-input'].value);
  const allowed = levelControls().map((c) => c.property);
  const problems = [];

  parsed.errors.forEach((e) => problems.push(tr(e.key, e.vars)));
  Object.keys(parsed.decls).forEach((property) => {
    if (allowed.indexOf(property) === -1) {
        problems.push(tr('err.unavailable', { property }));
    } else if (optionsFor(property).indexOf(parsed.decls[property]) === -1) {
      problems.push(tr('err.badValue', { value: parsed.decls[property], property }));
    }
  });

  /* Anything the player did not type falls back to the level's default, so
     deleting a line really does undo it. */
  const next = {};
  allowed.forEach((property) => {
    const typed = parsed.decls[property];
    const valid = typed !== undefined && optionsFor(property).indexOf(typed) !== -1;
    const fallback = level.initialContainerStyles ? level.initialContainerStyles[property] : undefined;
    const value = valid ? typed : fallback;
    if (value !== undefined) next[property] = value;
  });

  /* Mark which properties have been written correctly so far — useful on the
     levels that need two or three declarations. */
  levelControls().forEach((control) => {
    const chip = el['prop-chips'].querySelector(`[data-property="${control.property}"]`);
    if (!chip) return;
    const typed = parsed.decls[control.property];
    const good = typed !== undefined && optionsFor(control.property).indexOf(typed) !== -1;
    chip.classList.toggle('is-set', good);
    if (good) chip.classList.remove('is-mismatch');
  });

  Object.keys(next).forEach((property) => callEngine('setUserStyle', null, property, next[property]));
  if (state) state.currentStyles = Object.assign({}, state.currentStyles, next);

  editorProblems = problems;
  editorDeclCount = Object.keys(parsed.decls).length;

  applyPlayerStyles(state ? state.currentStyles : next, animate);
  setCodeMessage(problems);
  refreshGutter();
  hideBanner();
  el['player-layer'].classList.remove('is-wrong');

  /* Remember what was typed so a solved level can be reopened as it was left. */
  if (level) {
    prefs.code[level.id] = el['code-input'].value;
    savePrefs();
  }
  updateLandedState();
}

/** True when the board currently matches the level's target arrangement. */
function stylesMatchTarget() {
  if (!level || !state) return false;
  const target = level.targetContainerStyles || {};
  const current = state.currentStyles || {};
  const keys = Object.keys(target);
  return keys.length > 0 && keys.every((prop) => current[prop] === target[prop]);
}

/**
 * Helicopters keep their "landed" look on a level that has been solved, for as
 * long as the code still produces the winning arrangement. Editing the rule
 * afterwards behaves normally: fly out of the solution and they lift off again,
 * fly back into it and they settle.
 */
function updateLandedState() {
  const completed = !!(state && state.isCurrentLevelCompleted);
  el['player-layer'].classList.toggle('is-landed', completed && stylesMatchTarget());
}

/** Insert or replace one declaration — used by the tooltip value chips. */
function setDeclaration(property, value) {
  const lines = el['code-input'].value.split('\n').filter((l) => l.trim() !== '');
  let replaced = false;
  const out = lines.map((line) => {
    const match = line.match(/^\s*([a-zA-Z-]+)\s*:/);
    if (match && match[1].toLowerCase() === property) {
      replaced = true;
      return `${property}: ${value};`;
    }
    return line;
  });
  if (!replaced) out.push(`${property}: ${value};`);
  el['code-input'].value = out.join('\n');
  syncFromEditor(true);
}

function closeAllTips(except) {
  Array.prototype.forEach.call(el['prop-chips'].querySelectorAll('.prop'), (node) => {
    if (node === except) return;
    node.querySelector('.prop__tip').hidden = true;
    node.querySelector('.prop__btn').setAttribute('aria-expanded', 'false');
  });
}

function renderEditor() {
  const chips = el['prop-chips'];
  chips.textContent = '';
  if (!level) return;

  /* The rule's selector names the current level, so the code reads like CSS
     written for this specific board. */
  el['code-selector'].textContent = `#deck-${level.id} {`;

  levelControls().forEach((control) => {
    const property = control.property;
    const wrap = document.createElement('div');
    wrap.className = 'prop';
    wrap.dataset.property = property;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'prop__btn';
    btn.dataset.prop = property;
    btn.textContent = property;
    btn.setAttribute('aria-expanded', 'false');

    const tip = document.createElement('div');
    tip.className = 'prop__tip';
    tip.hidden = true;
    tip.setAttribute('role', 'tooltip');

    const desc = document.createElement('p');
    desc.className = 'prop__desc';
    desc.textContent = tr(`prop.${property}`) || control.label || property;
    tip.appendChild(desc);

    const values = document.createElement('div');
    values.className = 'prop__values';
    (control.options || []).forEach((option) => {
      const v = document.createElement('button');
      v.type = 'button';
      v.className = 'val';
      v.dataset.prop = property;
      v.dataset.value = option;
      v.textContent = option;
      if (option === control.defaultValue) {
        const note = document.createElement('span');
        note.className = 'val__note';
        note.textContent = tr('val.default');
        v.appendChild(note);
      }
      values.appendChild(v);
    });
    tip.appendChild(values);

    wrap.appendChild(btn);
    wrap.appendChild(tip);
    chips.appendChild(wrap);
  });

  /* A level that has already been solved reopens exactly as it was left — the
     code the player wrote, and the helicopters still on their pads. An unsolved
     level starts from an empty rule body, which means "level defaults". */
  const saved = prefs.code ? prefs.code[level.id] : '';
  const restore = !!(state && state.isCurrentLevelCompleted && saved);

  el['code-input'].value = restore ? saved : '';

  if (restore) {
    syncFromEditor(false);
    return;
  }

  levelControls().forEach((control) => {
    const fallback = level.initialContainerStyles
      ? level.initialContainerStyles[control.property]
      : undefined;
    if (fallback !== undefined) callEngine('setUserStyle', null, control.property, fallback);
  });
  if (state) {
    state.currentStyles = Object.assign({}, state.currentStyles, level.initialContainerStyles);
  }
  setCodeMessage([]);
  refreshGutter();
}

/* --------------------------------------------------------------------------
 * Operating environment — a different scene behind every level
 * ------------------------------------------------------------------------ */

function renderEnvironment() {
  if (!state) return;
  const env = environmentForLevel(state.currentLevelNumber);
  el.board.dataset.env = env.id;
  el['hud-env'].textContent = `${tr('hud.zone')} ${prefs.lang === 'en' ? env.en : env.he}`;
}

function renderLevelPicker() {
  const list = el['levels-list'];
  if (!engineHas('getAllLevels')) {
    el['levels-nav'].hidden = true;
    return;
  }
  const summaries = callEngine('getAllLevels', []);
  if (!Array.isArray(summaries) || summaries.length === 0) {
    el['levels-nav'].hidden = true;
    return;
  }

  el['levels-nav'].hidden = false;
  list.textContent = '';
  summaries.forEach((summary) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lvl';
    btn.textContent = summary.id;
    btn.dataset.level = summary.id;
    const named = levelText(summary).title || summary.title;
    btn.title = named ? `${tr('levels.level')} ${summary.id} — ${named}` : `${tr('levels.level')} ${summary.id}`;

    if (summary.isCompleted) btn.classList.add('is-done');
    if (state && summary.id === state.currentLevelNumber) btn.classList.add('is-current');
    if (summary.isUnlocked === false) {
      btn.disabled = true;
      btn.setAttribute('aria-label', `${tr('levels.level')} ${summary.id} — ${tr('levels.locked')}`);
    }
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function renderNav() {
  if (!state) return;
  el['btn-prev'].disabled = state.currentLevelNumber <= 1 || !engineHas('prevLevel');
  el['btn-next'].disabled = !state.isCurrentLevelCompleted
    || state.currentLevelNumber >= state.totalLevels;
}

function setFeedback(text, tone) {
  el.feedback.textContent = text || '';
  el.feedback.className = 'feedback' + (tone ? ` feedback--${tone}` : '');
}

function hideBanner() { el.banner.hidden = true; }

function showBanner(title, text, isFail) {
  el.banner.className = 'banner' + (isFail ? ' banner--fail' : '');
  el['banner-title'].textContent = title;
  el['banner-text'].textContent = text || '';
  el.banner.hidden = false;
}

/** One full re-render of everything derived from (level, state). */
function renderAll(nextLevel, nextState) {
  if (nextLevel) level = nextLevel;
  if (nextState) adoptState(nextState);
  if (!level || !state) return;

  hideBanner();
  setFeedback('');
  renderHud();
  renderInstruction();
  renderEditor();
  renderEnvironment();
  renderBoard();
  renderLevelPicker();
  renderNav();
  fitBoard();
  renderSeq += 1;
}

/**
 * The engine is supposed to emit 'level:change' after every navigation, and the
 * subscription below renders in response. If Developer 1's build does not emit
 * it, renderSeq will not have moved and we render from the returned payload
 * instead — correct against both a compliant and a silent engine.
 */
function ensureRendered(seq, payload) {
  if (renderSeq !== seq || !payload) return;
  renderAll(payload.level, payload.state);
}

/* ========================================================================== *
 * 8. Validation outcomes
 * ========================================================================== */

function markMismatches(mismatches) {
  Array.prototype.forEach.call(el['prop-chips'].children, (node) => node.classList.remove('is-mismatch'));
  (mismatches || []).forEach((miss) => {
    const node = el['prop-chips'].querySelector(`[data-property="${miss.property}"]`);
    if (node) node.classList.add('is-mismatch');
  });
}

function handleResult(result, nextState) {
  if (!result) return;
  resultSeq += 1;
  if (nextState) adoptState(nextState);

  const player = el['player-layer'];

  if (result.isCorrect) {
    markMismatches([]);
    player.classList.remove('is-wrong');
    const done = tr(result.alreadyCompleted ? 'result.already' : 'result.success');
    showBanner(tr('banner.done'), done);
    setFeedback(done, 'ok');
    sfx.success();
  } else {
    player.classList.remove('is-landed', 'is-wrong');
    void player.offsetWidth;             /* restart the shake animation */
    player.classList.add('is-wrong');
    markMismatches(result.mismatches);
    const count = (result.mismatches || []).length;
    const detail = count === 1 ? tr('banner.wrongOne')
      : count > 1 ? tr('banner.wrongMany', { n: count }) : '';
    showBanner(tr('banner.failed'), detail, true);
    setFeedback(count === 1 ? tr('result.failOne')
      : count > 1 ? tr('result.failMany', { n: count }) : tr('result.fail'), 'bad');
    sfx.fail();
    window.setTimeout(hideBanner, 2200);
  }

  /* Keep the attempt counter truthful even if the engine exposes no state. */
  if (!nextState) {
    const fresh = callEngine('getState', null);
    if (fresh) adoptState(fresh);
    else if (state) state.attemptsCurrentLevel = (state.attemptsCurrentLevel || 0) + 1;
    if (state && result.isCorrect) state.isCurrentLevelCompleted = true;
  }

  updateLandedState();
  renderHud();
  renderNav();
  renderLevelPicker();
}

function showVictory(nextState) {
  const s = nextState || state;
  const attempts = s && s.scores ? s.scores.totalAttempts : 0;
  const done = s && s.scores ? s.scores.completedLevels.length : 0;
  el['victory-text'].textContent = tr('victory.text', { done, attempts });
  el.victory.hidden = false;
  sfx.victory();
}

/* ========================================================================== *
 * 9. Event handlers
 * ========================================================================== */

let editorTimer = 0;

function bindEditor() {
  /* Live preview on every keystroke, debounced with a timer rather than
     requestAnimationFrame: rAF is throttled or suspended in background tabs
     and other non-painting contexts, which would silently stop the editor
     from updating. A timer always fires, and 60ms is imperceptible. */
  el['code-input'].addEventListener('input', () => {
    window.clearTimeout(editorTimer);
    editorTimer = window.setTimeout(() => syncFromEditor(true), 60);
  });

  /* Enter should add a line, not submit anything; Escape closes a tooltip. */
  el['code-input'].addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAllTips(null);
  });

  el['prop-chips'].addEventListener('click', (event) => {
    const valueBtn = event.target.closest('.val');
    if (valueBtn) {
      sfx.click();
      setDeclaration(valueBtn.dataset.prop, valueBtn.dataset.value);
      closeAllTips(null);
      return;
    }
    const chip = event.target.closest('.prop__btn');
    if (!chip) return;
    const wrap = chip.closest('.prop');
    const tip = wrap.querySelector('.prop__tip');
    const opening = tip.hidden;
    closeAllTips(wrap);
    tip.hidden = !opening;
    chip.setAttribute('aria-expanded', String(opening));
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.prop')) closeAllTips(null);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAllTips(null);
  });
}

function bindActions() {
  el['btn-check'].addEventListener('click', () => {
    syncFromEditor(true);   /* make sure the latest keystrokes are applied */

    /* Refuse to grade code that does not compile. A malformed rule is a syntax
       problem, not a wrong answer, so it is reported rather than counted as an
       attempt — the player fixes the CSS and checks again. */
    if (editorProblems.length) {
      setFeedback(editorProblems[0], 'bad');
      shakeCode();
      sfx.fail();
      return;
    }
    if (editorDeclCount === 0) {
      setFeedback(tr('msg.writeSomething'), 'bad');
      shakeCode();
      return;
    }

    const seq = resultSeq;
    const result = callEngine('validate', null);
    if (!result) { setFeedback(tr('msg.cannotCheck'), 'bad'); return; }
    if (resultSeq === seq) handleResult(result, null); /* engine emitted no event */
  });

  el['btn-reset'].addEventListener('click', () => {
    sfx.click();
    if (level && prefs.code) { delete prefs.code[level.id]; savePrefs(); }
    const seq = renderSeq;
    const payload = callEngine('resetCurrentLevel', null);
    ensureRendered(seq, payload);
    setFeedback(tr('msg.reset'), null);
  });

  el['btn-next'].addEventListener('click', () => {
    sfx.click();
    const seq = renderSeq;
    const payload = callEngine('nextLevel', null);
    if (!payload) { setFeedback(tr('msg.last'), null); return; }
    ensureRendered(seq, payload);
  });

  el['btn-prev'].addEventListener('click', () => {
    sfx.click();
    const seq = renderSeq;
    const payload = callEngine('prevLevel', null);
    ensureRendered(seq, payload);
  });

  el['levels-list'].addEventListener('click', (event) => {
    const btn = event.target.closest('.lvl');
    if (!btn || btn.disabled) return;
    sfx.click();
    const seq = renderSeq;
    const res = callEngine('goToLevel', null, Number(btn.dataset.level));
    if (res && res.success === false) { setFeedback(tr('msg.locked'), 'bad'); return; }
    ensureRendered(seq, res);
  });

  el['btn-hint'].addEventListener('click', () => {
    const open = el.hint.hidden;
    el.hint.hidden = !open;
    el['btn-hint'].setAttribute('aria-expanded', String(open));
  });

  el['btn-replay'].addEventListener('click', () => {
    el.victory.hidden = true;
    prefs.code = {};
    savePrefs();
    const seq = renderSeq;
    callEngine('resetAllProgress', null);
    if (renderSeq === seq) {
      renderAll(callEngine('getCurrentLevel', null), callEngine('getState', null));
    }
  });

  el['btn-close-victory'].addEventListener('click', () => { el.victory.hidden = true; });

  el['btn-lang'].addEventListener('click', () => {
    prefs.lang = prefs.lang === 'he' ? 'en' : 'he';
    savePrefs();
    el['btn-lang'].firstElementChild.textContent = prefs.lang === 'he' ? 'EN' : 'עב';
    el['btn-lang'].setAttribute('aria-pressed', String(prefs.lang === 'en'));
    applyLanguage();
    if (level && state) renderAll(level, state);   /* redraw everything, not just the brief */
  });

  el['btn-sound'].addEventListener('click', () => {
    prefs.muted = !prefs.muted;
    setMuted(prefs.muted);
    savePrefs();
    el['sound-icon'].textContent = prefs.muted ? '🔇' : '🔊';
    el['btn-sound'].setAttribute('aria-pressed', String(!prefs.muted));
    if (!prefs.muted) sfx.click();
  });

  window.addEventListener('resize', onResize);
}

function subscribeToEngine() {
  if (!engineHas('on')) return;
  callEngine('on', null, 'level:change', (payload) => {
    if (payload) renderAll(payload.level, payload.state);
  });
  callEngine('on', null, 'level:success', (payload) => {
    if (payload) handleResult(payload.result, payload.state);
  });
  callEngine('on', null, 'level:fail', (payload) => {
    if (payload) handleResult(payload.result, payload.state);
  });
  callEngine('on', null, 'game:completed', (payload) => {
    showVictory(payload && payload.state);
  });
}

/* ========================================================================== *
 * 10. Boot
 * ========================================================================== */

function boot() {
  window.__gameBooted = true;

  const missing = ['init', 'getCurrentLevel', 'setUserStyle', 'validate']
    .filter((name) => !engineHas(name));
  if (missing.length) {
    showEngineError(tr('engine.missing', { names: missing.join(', ') }));
    return;
  }

  loadPrefs();
  el['sound-icon'].textContent = prefs.muted ? '🔇' : '🔊';
  el['btn-sound'].setAttribute('aria-pressed', String(!prefs.muted));
  el['btn-lang'].firstElementChild.textContent = prefs.lang === 'he' ? 'EN' : 'עב';
  el['btn-lang'].setAttribute('aria-pressed', String(prefs.lang === 'en'));
  applyLanguage();

  subscribeToEngine();
  bindEditor();
  bindActions();

  const initialState = callEngine('init', null);
  const initialLevel = callEngine('getCurrentLevel', null);
  if (!initialState || !initialLevel) {
    showEngineError(tr('engine.initFailed'));
    return;
  }
  renderAll(initialLevel, initialState);

  if (initialState.isGameCompleted) showVictory(initialState);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
