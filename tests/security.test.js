/**
 * Tests for input sanitization, prototype pollution prevention, and error recovery.
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

test('Security: Blocks prototype pollution via setUserStyle', () => {
  const engine = createEngine();

  const pollutionPayloads = [
    '__proto__',
    'constructor',
    'prototype',
    '__PROTO__',
    '__proto__;',
    'constructor:'
  ];

  for (const prop of pollutionPayloads) {
    const res = engine.setUserStyle(prop, 'polluted');
    assert.equal(Object.prototype.polluted, undefined);
    assert.equal(Object.hasOwn(res, prop), false);
  }
});

test('Security: Ignores prototype keys during SafeStorage JSON parsing', () => {
  const storage = new SafeStorage();
  const maliciousJSON = '{"__proto__":{"admin":true},"constructor":{"prototype":{"hacked":true}},"validKey":"safe"}';

  storage.set('TEST_KEY', JSON.parse(maliciousJSON));
  
  assert.equal(Object.prototype.admin, undefined);
  assert.equal(Object.prototype.hacked, undefined);
  assert.equal({}.admin, undefined);
  assert.equal({}.hacked, undefined);
});

test('Security: cloneData ignores prototype keys', () => {
  const engine = createEngine();
  const state = engine.getState();

  assert.equal(Object.prototype.isAdmin, undefined);
  assert.equal({}.isAdmin, undefined);
  assert.ok(!Object.hasOwn(state, '__proto__'));
});

test('Security: Rejects injection strings in setUserStyle', () => {
  const engine = createEngine();

  const attackPayloads = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    'url(javascript:alert(1))',
    'expression(alert(1))',
    '"; background: red; --evil: "',
    '" onmouseover="alert(1)"',
    'center; background: red',
    'center; behavior: url(xss.htc);',
    '\\0063\\0065\\006e\\0074\\0065\\0072'
  ];

  for (const payload of attackPayloads) {
    engine.resetCurrentLevel();
    engine.setUserStyle('justify-content', payload);
    const styles = engine.getState().currentStyles;

    assert.notEqual(styles['justify-content'], payload);
    const valRes = engine.validate();
    assert.equal(valRes.isCorrect, false);
  }
});

test('Security: Rejects excessively long input strings', () => {
  const engine = createEngine();
  const hugePayload = 'center'.repeat(200000);
  
  engine.resetCurrentLevel();
  engine.setUserStyle('justify-content', hugePayload);
  
  const currentVal = engine.getState().currentStyles['justify-content'];
  assert.ok(currentVal === '' || currentVal === 'flex-start');
  assert.ok(currentVal.length <= 32);
});

test('Security: Sanitizes corrupted or out-of-bounds storage data on init', () => {
  const storage = new SafeStorage();
  
  const tamperedPayload = {
    version: '2.0.0',
    unlockedLevel: 9999,
    completedLevels: [-10, 0, 1, 2, 'DROP TABLE', null, 50, 9999],
    attemptsPerLevel: {
      '1': -500,
      '2': 'not-a-number',
      '999': 100,
      '__proto__': { 'hacked': true }
    },
    starsPerLevel: {
      '1': 9999,
      '2': -3,
      '3': 2,
      'constructor': 123
    },
    savedStyles: {
      '1': {
        'justify-content': 'center',
        'evil-injected-prop': 'red',
        '__proto__': { 'polluted': true }
      }
    },
    lastActiveLevel: -5
  };

  storage.set('FLEXBOX_GAME_PROGRESS', tamperedPayload);

  const engine = new Engine(LEVELS);
  engine._storage = storage;
  const state = engine.init();

  assert.ok(state.unlockedLevelMax <= 10);
  assert.ok(state.currentLevelNumber >= 1 && state.currentLevelNumber <= 10);
  assert.ok(state.scores.completedLevels.every((lvl) => Number.isInteger(lvl) && lvl >= 1 && lvl <= 10));
  assert.ok(!state.scores.completedLevels.includes(-10));
  assert.ok(!state.scores.completedLevels.includes('DROP TABLE'));

  assert.equal(engine._state.starsPerLevel['1'], undefined);
  assert.equal(engine._state.starsPerLevel['2'], undefined);
  assert.equal(engine._state.starsPerLevel['3'], 2);

  assert.equal(Object.prototype.hacked, undefined);
  assert.equal(Object.prototype.polluted, undefined);
});

test('Security: Prevents skipping forward to locked levels', () => {
  const engine = createEngine();

  for (let lvl = 2; lvl <= 10; lvl++) {
    const res = engine.goToLevel(lvl);
    assert.equal(res.success, false);
    assert.match(res.error, /locked/i);
    assert.equal(engine.getState().currentLevelNumber, 1);
  }
});

test('Security: nextLevel cannot advance before completing current level', () => {
  const engine = createEngine();

  const res = engine.nextLevel();
  assert.equal(res.success, false);
  assert.match(res.error, /complete/i);
  assert.equal(engine.getState().currentLevelNumber, 1);
});

test('Security: goToLevel rejects non-integer or malformed inputs', () => {
  const engine = createEngine();

  const invalidInputs = [
    NaN,
    Infinity,
    -Infinity,
    1.5,
    'abc',
    null,
    undefined,
    {},
    [],
    true
  ];

  for (const input of invalidInputs) {
    const res = engine.goToLevel(input);
    assert.equal(res.success, false);
    assert.equal(engine.getState().currentLevelNumber, 1);
  }
});

test('Security: Event bus isolates listener errors without stopping execution', () => {
  const engine = createEngine();

  engine.on('level:change', () => {
    throw new Error('Listener error');
  });
  engine.on('style:change', () => {
    throw new TypeError('Listener error');
  });

  assert.doesNotThrow(() => {
    engine.setUserStyle('justify-content', 'center');
  });
  assert.doesNotThrow(() => {
    engine.validate();
  });
  assert.doesNotThrow(() => {
    engine.nextLevel();
  });

  assert.equal(engine.getState().currentLevelNumber, 2);
});
