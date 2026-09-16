/**
 * Unit tests for the AstroDock game engine.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../js/levels.js';
import { Engine, SafeStorage } from '../js/engine.js';

function createEngine() {
  const engine = new Engine(LEVELS);
  engine.init();
  return engine;
}

// ==========================================
// 1. Lifecycle and State
// ==========================================

test('Engine: init() returns valid initial state for Level 1', () => {
  const engine = new Engine(LEVELS);
  const state = engine.init();

  assert.equal(state.currentLevelNumber, 1);
  assert.equal(state.currentLevelIndex, 0);
  assert.equal(state.totalLevels, 10);
  assert.equal(state.isCurrentLevelCompleted, false);
  assert.equal(state.isGameCompleted, false);
  assert.equal(state.unlockedLevelMax, 1);
  assert.equal(state.scores.totalAttempts, 0);
  assert.deepEqual(state.currentStyles, { 'justify-content': 'flex-start' });
});

test('Engine: Outbound state snapshot is deep-frozen', () => {
  const engine = createEngine();
  const state = engine.getState();

  assert.throws(() => {
    state.currentStyles['justify-content'] = 'mutated';
  });
});

// ==========================================
// 2. Navigation
// ==========================================

test('Engine: Cannot navigate to locked levels', () => {
  const engine = createEngine();

  const nextRes = engine.nextLevel();
  assert.equal(nextRes.success, false);
  assert.match(nextRes.error, /complete/i);

  const goToRes = engine.goToLevel(5);
  assert.equal(goToRes.success, false);
  assert.match(goToRes.error, /locked/i);
});

test('Engine: prevLevel() fails at Level 1', () => {
  const engine = createEngine();

  const prevRes = engine.prevLevel();
  assert.equal(prevRes.success, false);
  assert.match(prevRes.error, /Level 1/i);
});

test('Engine: goToLevel() rejects out-of-bounds numbers', () => {
  const engine = createEngine();

  assert.equal(engine.goToLevel(0).success, false);
  assert.equal(engine.goToLevel(11).success, false);
  assert.equal(engine.goToLevel(-1).success, false);
  assert.equal(engine.goToLevel('xyz').success, false);
});

test('Engine: Navigation methods return consistent result objects', () => {
  const engine = createEngine();

  const assertNavResult = (res, expectedSuccess, desc) => {
    assert.equal(typeof res.success, 'boolean', `${desc}: success must be boolean`);
    assert.equal(res.success, expectedSuccess, `${desc}: success match`);
    assert.ok(res.level !== undefined, `${desc}: level must be present`);
    assert.ok(res.state !== undefined, `${desc}: state must be present`);
    if (!expectedSuccess) {
      assert.equal(typeof res.error, 'string', `${desc}: error must be string on failure`);
    } else {
      assert.equal(res.error, undefined, `${desc}: error must be undefined on success`);
    }
  };

  assertNavResult(engine.goToLevel(99), false, 'goToLevel(99)');
  assertNavResult(engine.goToLevel(1), true, 'goToLevel(1)');
  assertNavResult(engine.nextLevel(), false, 'nextLevel() when incomplete');

  engine.setUserStyle('justify-content', 'center');
  engine.validate();
  assertNavResult(engine.nextLevel(), true, 'nextLevel() when complete');
  assertNavResult(engine.prevLevel(), true, 'prevLevel() to level 1');
  assertNavResult(engine.prevLevel(), false, 'prevLevel() at level 1');
  assertNavResult(engine.resetCurrentLevel(), true, 'resetCurrentLevel()');
});

// ==========================================
// 3. Style Manipulation & Input Normalization
// ==========================================

test('Engine: setUserStyle normalizes casing and whitespace', () => {
  const engine = createEngine();

  const permutations = [
    'justify-content',
    'justifyContent',
    'JUSTIFY-CONTENT',
    'JustifyContent',
    '  justify-content  ',
    '\tjustifyContent\n'
  ];

  for (const prop of permutations) {
    engine.resetCurrentLevel();
    const updated = engine.setUserStyle(prop, 'center');
    assert.equal(updated['justify-content'], 'center');
    assert.equal(engine.getState().currentStyles['justify-content'], 'center');
  }
});

test('Engine: Strips trailing punctuation from property and values', () => {
  const engine = createEngine();

  engine.setUserStyle('justify-content:', 'center;');
  assert.equal(engine.getState().currentStyles['justify-content'], 'center');

  const res = engine.validate();
  assert.equal(res.isCorrect, true);
});

test('Engine: Supports flexbox value aliases (start/flex-start, end/flex-end)', () => {
  const engine = createEngine();

  // Advance to Level 3 where target is align-items: flex-end
  engine.setUserStyle('justify-content', 'center');
  engine.validate();
  engine.nextLevel();
  engine.setUserStyle('justify-content', 'space-between');
  engine.validate();
  engine.nextLevel();
  assert.equal(engine.getState().currentLevelNumber, 3);

  const endAliases = ['flex-end', 'FLEX-END', ' flex-end ', 'end', 'END', ' end; '];
  for (const val of endAliases) {
    engine.resetCurrentLevel();
    engine.setUserStyle('align-items', val);
    const res = engine.validate();
    assert.equal(res.isCorrect, true, `Alias "${val}" should validate`);
  }
});

test('Engine: Rejects unauthorized properties for the active level', () => {
  const engine = createEngine();

  // Level 1 only permits justify-content
  engine.setUserStyle('align-items', 'center');
  assert.equal(engine.getState().currentStyles['align-items'], undefined);

  engine.setUserStyle('color', 'red');
  assert.equal(engine.getState().currentStyles['color'], undefined);
});

// ==========================================
// 4. Validation Engine
// ==========================================

test('Engine: validate() tracks attempts and awards stars based on count', () => {
  const engine = createEngine();

  // Attempt 1: incorrect
  engine.setUserStyle('justify-content', 'flex-end');
  const failRes = engine.validate();
  assert.equal(failRes.isCorrect, false);
  assert.equal(failRes.mismatches.length, 1);
  assert.equal(failRes.mismatches[0].property, 'justify-content');
  assert.equal(failRes.mismatches[0].actual, 'flex-end');
  assert.equal(failRes.mismatches[0].expected, 'center');
  assert.equal(engine.getState().attemptsCurrentLevel, 1);

  // Attempt 2: correct (1-2 attempts = 3 stars)
  engine.setUserStyle('justify-content', 'center');
  const passRes = engine.validate();
  assert.equal(passRes.isCorrect, true);
  assert.equal(passRes.earnedStars, 3);
  assert.equal(engine.getState().isCurrentLevelCompleted, true);
  assert.equal(engine.getState().unlockedLevelMax, 2);
});

test('Engine: validate() does not inflate attempts once level is completed', () => {
  const engine = createEngine();

  engine.setUserStyle('justify-content', 'center');
  engine.validate(); // Attempt 1 -> Solved

  assert.equal(engine.getState().attemptsCurrentLevel, 1);

  const repeat1 = engine.validate();
  const repeat2 = engine.validate();

  assert.equal(repeat1.isCorrect, true);
  assert.equal(repeat1.alreadyCompleted, true);
  assert.equal(repeat2.isCorrect, true);
  assert.equal(engine.getState().attemptsCurrentLevel, 1);
});

test('Engine: validate() provides detailed mismatch objects on multi-property levels', () => {
  const engine = createEngine();

  // Jump to Level 4 (justify-content: center, align-items: center)
  engine.setUserStyle('justify-content', 'center');
  engine.validate();
  engine.nextLevel();
  engine.setUserStyle('justify-content', 'space-between');
  engine.validate();
  engine.nextLevel();
  engine.setUserStyle('align-items', 'flex-end');
  engine.validate();
  engine.nextLevel();
  assert.equal(engine.getState().currentLevelNumber, 4);

  engine.resetCurrentLevel();

  // Both wrong initially
  const initialFail = engine.validate();
  assert.equal(initialFail.isCorrect, false);
  assert.equal(initialFail.mismatches.length, 2);

  // Fix justify-content only
  engine.setUserStyle('justify-content', 'center');
  const partialFail = engine.validate();
  assert.equal(partialFail.isCorrect, false);
  assert.equal(partialFail.mismatches.length, 1);
  assert.equal(partialFail.mismatches[0].property, 'align-items');

  // Fix align-items as well
  engine.setUserStyle('align-items', 'center');
  const success = engine.validate();
  assert.equal(success.isCorrect, true);
  assert.equal(success.mismatches.length, 0);
});

// ==========================================
// 5. Level Transitions & Reset
// ==========================================

test('Engine: Transitions do not leak properties from previous levels', () => {
  const engine = createEngine();

  // Navigate to Level 7 (defines flex-direction and align-items)
  for (let i = 1; i <= 6; i++) {
    const lvl = engine.getCurrentLevel();
    for (const [p, v] of Object.entries(lvl.targetContainerStyles)) {
      engine.setUserStyle(p, v);
    }
    engine.validate();
    engine.nextLevel();
  }

  assert.equal(engine.getState().currentLevelNumber, 7);
  engine.setUserStyle('flex-direction', 'column-reverse');
  engine.setUserStyle('align-items', 'flex-end');
  engine.validate();

  // Move to Level 8 (defines flex-wrap and justify-content)
  engine.nextLevel();
  assert.equal(engine.getState().currentLevelNumber, 8);

  const styles = engine.getState().currentStyles;
  assert.equal(styles['flex-direction'], undefined);
  assert.equal(styles['align-items'], undefined);
  assert.equal(styles['flex-wrap'], 'nowrap');
  assert.equal(styles['justify-content'], 'flex-start');
});

test('Engine: resetCurrentLevel() restores initialContainerStyles', () => {
  const engine = createEngine();

  engine.setUserStyle('justify-content', 'center');
  assert.equal(engine.getState().currentStyles['justify-content'], 'center');

  const resetRes = engine.resetCurrentLevel();
  assert.equal(resetRes.success, true);
  assert.equal(resetRes.state.currentStyles['justify-content'], 'flex-start');
});

test('Engine: resetAllProgress() clears completions and resets to Level 1', () => {
  const engine = createEngine();

  engine.setUserStyle('justify-content', 'center');
  engine.validate();
  engine.nextLevel();
  assert.equal(engine.getState().currentLevelNumber, 2);

  const resetState = engine.resetAllProgress();
  assert.equal(resetState.currentLevelNumber, 1);
  assert.equal(resetState.scores.completedLevels.length, 0);
  assert.equal(resetState.unlockedLevelMax, 1);
});

// ==========================================
// 6. Event System
// ==========================================

test('Engine: Dispatches events and supports unsubscription', () => {
  const engine = new Engine(LEVELS);
  let styleChangeFired = 0;
  let successFired = 0;

  const unsubStyle = engine.on('style:change', () => {
    styleChangeFired++;
  });

  engine.on('level:success', () => {
    successFired++;
  });

  engine.init();

  engine.setUserStyle('justify-content', 'center');
  assert.equal(styleChangeFired, 1);

  unsubStyle();
  engine.setUserStyle('justify-content', 'flex-start');
  assert.equal(styleChangeFired, 1);

  engine.setUserStyle('justify-content', 'center');
  engine.validate();
  assert.equal(successFired, 1);
});

test('Engine: Supports event aliases', () => {
  const engine = createEngine();
  let loadFired = false;
  let completeFired = false;

  engine.on('level:load', () => { loadFired = true; });
  engine.on('level:complete', () => { completeFired = true; });

  engine.setUserStyle('justify-content', 'center');
  engine.validate();

  assert.equal(completeFired, true);

  engine.nextLevel();
  assert.equal(loadFired, true);
});

test('Engine: Event listener unsubscription is idempotent and leak-free', () => {
  const engine = createEngine();

  const unsubs = [];
  for (let i = 0; i < 20; i++) {
    unsubs.push(engine.on('style:change', () => {}));
  }
  assert.equal(engine._listeners.get('style:change').size, 20);

  unsubs.forEach((u) => u());
  assert.equal(engine._listeners.has('style:change'), false);

  // Calling unsub again should not throw
  assert.doesNotThrow(() => {
    unsubs[0]();
    unsubs[0]();
  });
});

test('Engine: Listener removing itself during emit does not skip subsequent listeners', () => {
  const engine = createEngine();
  let unsubSelf;
  let selfFired = 0;
  let otherFired = 0;

  unsubSelf = engine.on('test:event', () => {
    selfFired++;
    unsubSelf();
  });

  engine.on('test:event', () => {
    otherFired++;
  });

  engine._emit('test:event', {});
  assert.equal(selfFired, 1);
  assert.equal(otherFired, 1);

  engine._emit('test:event', {});
  assert.equal(selfFired, 1);
  assert.equal(otherFired, 2);
});

// ==========================================
// 7. SafeStorage
// ==========================================

test('SafeStorage: Falls back to in-memory storage if localStorage is unavailable', () => {
  const storage = new SafeStorage();
  storage.set('test_key', { foo: 'bar' });
  assert.deepEqual(storage.get('test_key'), { foo: 'bar' });
  storage.remove('test_key');
  assert.equal(storage.get('test_key', 'default'), 'default');
});

test('Engine: Gracefully handles corrupted JSON in storage without throwing', () => {
  const engine = new Engine(LEVELS);
  engine._storage.get = () => 'CORRUPTED_NOT_OBJECT';

  assert.doesNotThrow(() => {
    const state = engine.init();
    assert.equal(state.currentLevelNumber, 1);
  });
});
