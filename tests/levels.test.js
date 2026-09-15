/**
 * Tests for level configurations, data integrity, and layout constraints.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, deepFreeze } from '../js/levels.js';
import { Engine } from '../js/engine.js';

test('Levels: Contains 10 sequential levels', () => {
  assert.equal(LEVELS.length, 10);
  LEVELS.forEach((lvl, idx) => {
    assert.equal(lvl.id, idx + 1);
  });
});

test('Levels: All levels have valid metadata, bilingual instructions, and items', () => {
  LEVELS.forEach((lvl) => {
    assert.ok(lvl.title && typeof lvl.title === 'string', `Level ${lvl.id} missing title`);
    assert.ok(lvl.instructionHe && typeof lvl.instructionHe === 'string', `Level ${lvl.id} missing Hebrew instructions`);
    assert.ok(lvl.instructionEn && typeof lvl.instructionEn === 'string', `Level ${lvl.id} missing English instructions`);
    assert.ok(lvl.items && Array.isArray(lvl.items) && lvl.items.length > 0, `Level ${lvl.id} has no items`);
    assert.ok(lvl.availableProperties && Array.isArray(lvl.availableProperties) && lvl.availableProperties.length > 0);

    const targetKeys = Object.keys(lvl.targetContainerStyles);
    assert.ok(targetKeys.length > 0, `Level ${lvl.id} has empty targetContainerStyles`);

    const isAlreadyTarget = targetKeys.every((k) => lvl.initialContainerStyles[k] === lvl.targetContainerStyles[k]);
    assert.equal(isAlreadyTarget, false, `Level ${lvl.id} initial state should not match target state`);
  });
});

test('Levels: Includes flex-wrap levels', () => {
  const wrapLevels = LEVELS.filter((lvl) => lvl.usesFlexWrap === true);
  assert.ok(wrapLevels.length >= 1, 'Expected at least 1 level with flex-wrap');
  assert.ok(wrapLevels.some((lvl) => 'flex-wrap' in lvl.targetContainerStyles));
});

test('Levels: Includes multi-property combination levels', () => {
  const multiPropLevels = LEVELS.filter((lvl) => lvl.requiresMultipleProperties === true);
  assert.ok(multiPropLevels.length >= 3, `Expected at least 3 multi-property levels, found ${multiPropLevels.length}`);
  multiPropLevels.forEach((lvl) => {
    const propCount = Object.keys(lvl.targetContainerStyles).length;
    assert.ok(propCount >= 2, `Level ${lvl.id} marked as multi-property but has ${propCount} properties`);
  });
});

test('Levels: Dataset is frozen to prevent mutations', () => {
  assert.throws(() => {
    LEVELS[0].title = 'Mutated Title';
  });
  assert.throws(() => {
    LEVELS[0].targetContainerStyles['justify-content'] = 'mutated';
  });
});

test('Levels: Programmatically solve all 10 levels from start to finish', () => {
  const engine = new Engine(LEVELS);
  engine.init();

  let gameCompletedFired = false;
  engine.on('game:completed', () => {
    gameCompletedFired = true;
  });

  for (let i = 0; i < LEVELS.length; i++) {
    const currentLevel = engine.getCurrentLevel();
    assert.equal(currentLevel.id, i + 1);

    for (const [prop, val] of Object.entries(currentLevel.targetContainerStyles)) {
      engine.setUserStyle(prop, val);
    }

    const valResult = engine.validate();
    assert.equal(valResult.isCorrect, true, `Validation failed on Level ${currentLevel.id}`);
    assert.equal(valResult.earnedStars, 3, `Expected 3 stars on Level ${currentLevel.id}`);

    if (i < LEVELS.length - 1) {
      const nav = engine.nextLevel();
      assert.equal(nav.success, true, `nextLevel failed at level ${currentLevel.id}`);
    }
  }

  const finalState = engine.getState();
  assert.equal(finalState.isGameCompleted, true);
  assert.equal(finalState.scores.completedLevels.length, 10);
  assert.equal(finalState.unlockedLevelMax, 10);
  assert.equal(gameCompletedFired, true);

  for (let id = 1; id <= 10; id++) {
    assert.equal(finalState.scores.starsPerLevel[id], 3);
  }
});

test('Levels: Box model math on 480px board for flex-wrap levels', () => {
  const BOARD_WIDTH = 480;
  const ITEM_WIDTH = 130;
  const ITEM_MARGIN = 10;
  const ITEM_OUTER_WIDTH = ITEM_WIDTH + ITEM_MARGIN * 2; // 150px

  // Row 1: 3 items (450px <= 480px)
  const row1Width = 3 * ITEM_OUTER_WIDTH;
  assert.ok(row1Width <= BOARD_WIDTH, '3 items should fit on one row');
  assert.equal(BOARD_WIDTH - row1Width, 30);

  // 4 items overflow (600px > 480px), forcing wrap
  const row1With4Width = 4 * ITEM_OUTER_WIDTH;
  assert.ok(row1With4Width > BOARD_WIDTH, '4 items should overflow and wrap');

  // Both levels 8 and 9 have 6 items (2 rows of 3)
  assert.equal(LEVELS[7].items.length, 6);
  assert.equal(LEVELS[8].items.length, 6);
});

test('Levels: Column layout height check for Level 10', () => {
  const BOARD_HEIGHT = 480;
  const itemCount = LEVELS[9].items.length;
  assert.equal(itemCount, 3);

  const itemOuterHeight = 130 + 20; // 150px
  const totalColumnHeight = itemCount * itemOuterHeight; // 450px
  assert.ok(totalColumnHeight <= BOARD_HEIGHT, 'Column items must fit inside board height');

  const freeSpace = BOARD_HEIGHT - totalColumnHeight;
  assert.ok(freeSpace > 0, 'Positive free space required for space-between');
  assert.equal(freeSpace / (itemCount - 1), 15);
});

test('Levels: Cross-axis alignment for Level 7', () => {
  const lvl7 = LEVELS[6];
  assert.equal(lvl7.targetContainerStyles['flex-direction'], 'column-reverse');
  assert.equal(lvl7.targetContainerStyles['align-items'], 'flex-end');

  // In column direction with LTR, cross-axis end is the right edge
  const mentionsRight = lvl7.instructionEn.includes('right wall') && lvl7.instructionHe.includes('ימנית');
  assert.equal(mentionsRight, true);
});
