/**
 * AstroDock - Game Engine
 * Manages game state, level progression, validation, and storage.
 */

import { LEVELS, deepFreeze } from './levels.js';

const STORAGE_KEY = 'FLEXBOX_GAME_PROGRESS';
const STORAGE_VERSION = '2.0.0';

/**
 * Storage wrapper with in-memory fallback if localStorage is unavailable.
 */
class SafeStorage {
  constructor() {
    this._memory = new Map();
    this._isStorageAvailable = this._probeStorage();
  }

  _probeStorage() {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return false;
      }
      const canary = '__astrodock_canary__';
      window.localStorage.setItem(canary, canary);
      window.localStorage.removeItem(canary);
      return true;
    } catch {
      return false;
    }
  }

  get(key, fallback = null) {
    try {
      if (this._isStorageAvailable) {
        const raw = window.localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw, (k, v) => {
          // Ignore prototype pollution keys
          if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
            return undefined;
          }
          return v;
        });
      }
    } catch {
      // Fall back to memory on error
    }
    return this._memory.has(key) ? this._memory.get(key) : fallback;
  }

  set(key, value) {
    try {
      if (this._isStorageAvailable) {
        window.localStorage.setItem(key, JSON.stringify(value));
        return true;
      }
    } catch {
      // Storage unavailable or full, fall back to memory
      this._isStorageAvailable = false;
    }
    this._memory.set(key, value);
    return true;
  }

  remove(key) {
    try {
      if (this._isStorageAvailable) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignore error
    }
    this._memory.delete(key);
  }

  clear() {
    try {
      if (this._isStorageAvailable) {
        window.localStorage.clear();
      }
    } catch {
      // Ignore error
    }
    this._memory.clear();
  }
}

/**
 * Deep clone helper that drops prototype pollution keys
 */
function cloneData(data) {
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => cloneData(item));
  }
  const copy = {};
  for (const [key, val] of Object.entries(data)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    copy[key] = cloneData(val);
  }
  return copy;
}

/**
 * Normalizes CSS property names (camelCase to kebab-case) and validates them
 */
function normalizeProperty(prop) {
  if (typeof prop !== 'string') return '';
  const cleaned = prop
    .trim()
    .replace(/[:;]+$/, '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

  // Validate property name
  if (
    cleaned === '__proto__' ||
    cleaned === 'constructor' ||
    cleaned === 'prototype' ||
    cleaned.length > 32 ||
    !/^[a-z0-9-]+$/.test(cleaned)
  ) {
    return '';
  }
  return cleaned;
}

function normalizeValue(val) {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim().toLowerCase().replace(/[:;]+$/, '').trim();

  // Flexbox alias support
  if (trimmed === 'start') return 'flex-start';
  if (trimmed === 'end') return 'flex-end';

  // Allow only safe tokens
  if (trimmed.length > 32 || !/^[a-z0-9-]+$/.test(trimmed)) {
    return '';
  }
  return trimmed;
}

/**
 * GameEngine Class
 */
class Engine {
  constructor(levelsDataset = LEVELS) {
    this._levels = levelsDataset;
    this._storage = new SafeStorage();
    this._listeners = new Map();

    this._state = {
      currentLevelIndex: 0,
      currentStyles: {},
      attemptsCurrentLevel: 0,
      unlockedLevelMax: 1,
      completedLevels: [],
      attemptsPerLevel: {},
      starsPerLevel: {},
      savedStyles: {}
    };

    this._initialized = false;
  }

  // ==========================================
  // Public Event Emitter
  // ==========================================

  on(eventName, handler) {
    if (typeof handler !== 'function') return () => {};
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, new Set());
    }
    this._listeners.get(eventName).add(handler);

    // Return unsubscribe function for clean cleanup
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    if (!this._listeners.has(eventName)) return;
    this._listeners.get(eventName).delete(handler);
    if (this._listeners.get(eventName).size === 0) {
      this._listeners.delete(eventName);
    }
  }

  clearListeners(eventName = null) {
    if (eventName) {
      this._listeners.delete(eventName);
    } else {
      this._listeners.clear();
    }
  }

  _ensureInitialized() {
    if (!this._initialized) {
      this.init();
    }
  }

  _dispatch(eventName, payload) {
    if (!this._listeners.has(eventName)) return;
    const handlers = Array.from(this._listeners.get(eventName));
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        // Prevent subscriber error from breaking engine loop
        if (typeof console !== 'undefined' && console.error) {
          console.error(`[GameEngine Event Error in '${eventName}']`, err);
        }
      }
    });
  }

  _emit(eventName, payload) {
    this._dispatch(eventName, payload);

    // Event aliases for compatibility
    if (eventName === 'level:change') {
      this._dispatch('level:load', payload);
      this._dispatch('state:change', payload ? payload.state : null);
    } else if (eventName === 'level:success') {
      this._dispatch('level:complete', payload);
      this._dispatch('state:change', payload ? payload.state : null);
    } else if (eventName === 'game:completed') {
      this._dispatch('game:complete', payload);
      this._dispatch('state:change', payload ? payload.state : null);
    } else if (eventName === 'style:change') {
      this._dispatch('state:change', this.getState());
    } else if (eventName === 'level:fail') {
      this._dispatch('state:change', payload ? payload.state : null);
    }
  }

  // ==========================================
  // Lifecycle & Persistence
  // ==========================================

  init() {
    this._loadProgress();

    // Ensure valid current level index within unlocked bounds
    const maxIndex = this._levels.length - 1;
    if (this._state.currentLevelIndex < 0 || this._state.currentLevelIndex > maxIndex) {
      this._state.currentLevelIndex = 0;
    }

    const currentLevel = this._levels[this._state.currentLevelIndex];

    // Check if there are previously saved styles for this level
    const savedForThisLevel = this._state.savedStyles[currentLevel.id];
    if (savedForThisLevel && typeof savedForThisLevel === 'object') {
      this._state.currentStyles = cloneData(savedForThisLevel);
    } else {
      this._state.currentStyles = cloneData(currentLevel.initialContainerStyles);
    }

    this._state.attemptsCurrentLevel = this._state.attemptsPerLevel[currentLevel.id] || 0;
    this._initialized = true;

    this._emit('level:change', {
      level: this.getCurrentLevel(),
      state: this.getState()
    });

    return this.getState();
  }

  _loadProgress() {
    const saved = this._storage.get(STORAGE_KEY, null);
    if (!saved || typeof saved !== 'object') {
      this._state.unlockedLevelMax = 1;
      this._state.completedLevels = [];
      this._state.attemptsPerLevel = {};
      this._state.starsPerLevel = {};
      this._state.savedStyles = {};
      this._state.currentLevelIndex = 0;
      return;
    }

    // Validate stored progress values
    const unlocked = parseInt(saved.unlockedLevel, 10);
    this._state.unlockedLevelMax = Number.isInteger(unlocked) && unlocked >= 1
      ? Math.min(unlocked, this._levels.length)
      : 1;

    // Completed levels
    const rawCompleted = Array.isArray(saved.completedLevels) ? saved.completedLevels : [];
    const validCompleted = new Set();
    rawCompleted.forEach((id) => {
      const num = parseInt(id, 10);
      if (Number.isInteger(num) && num >= 1 && num <= this._levels.length && num <= this._state.unlockedLevelMax) {
        validCompleted.add(num);
      }
    });
    this._state.completedLevels = Array.from(validCompleted).sort((a, b) => a - b);

    // Attempts per level
    const safeAttempts = {};
    if (saved.attemptsPerLevel && typeof saved.attemptsPerLevel === 'object') {
      for (const [lvl, count] of Object.entries(saved.attemptsPerLevel)) {
        if (lvl === '__proto__' || lvl === 'constructor' || lvl === 'prototype') continue;
        const lvlNum = parseInt(lvl, 10);
        const countNum = parseInt(count, 10);
        if (Number.isInteger(lvlNum) && lvlNum >= 1 && lvlNum <= this._levels.length && Number.isInteger(countNum) && countNum >= 0) {
          safeAttempts[lvlNum] = Math.min(countNum, 9999);
        }
      }
    }
    this._state.attemptsPerLevel = safeAttempts;

    // Stars per level
    const safeStars = {};
    if (saved.starsPerLevel && typeof saved.starsPerLevel === 'object') {
      for (const [lvl, stars] of Object.entries(saved.starsPerLevel)) {
        if (lvl === '__proto__' || lvl === 'constructor' || lvl === 'prototype') continue;
        const lvlNum = parseInt(lvl, 10);
        const starsNum = parseInt(stars, 10);
        if (Number.isInteger(lvlNum) && lvlNum >= 1 && lvlNum <= this._levels.length && Number.isInteger(starsNum) && starsNum >= 1 && starsNum <= 3) {
          safeStars[lvlNum] = starsNum;
        }
      }
    }
    this._state.starsPerLevel = safeStars;

    // Saved styles per level
    const safeStyles = {};
    if (saved.savedStyles && typeof saved.savedStyles === 'object') {
      for (const [lvl, stylesMap] of Object.entries(saved.savedStyles)) {
        if (lvl === '__proto__' || lvl === 'constructor' || lvl === 'prototype') continue;
        const lvlNum = parseInt(lvl, 10);
        if (Number.isInteger(lvlNum) && lvlNum >= 1 && lvlNum <= this._levels.length && stylesMap && typeof stylesMap === 'object') {
          const levelDef = this._levels[lvlNum - 1];
          const allowedProps = levelDef.availableProperties.map((p) => normalizeProperty(p.property));
          const levelStyles = {};
          for (const [prop, val] of Object.entries(stylesMap)) {
            const normP = normalizeProperty(prop);
            const normV = normalizeValue(val);
            if (allowedProps.includes(normP) && normV) {
              levelStyles[normP] = normV;
            }
          }
          if (Object.keys(levelStyles).length > 0) {
            safeStyles[lvlNum] = levelStyles;
          }
        }
      }
    }
    this._state.savedStyles = safeStyles;

    const lastActive = parseInt(saved.lastActiveLevel, 10);
    if (Number.isInteger(lastActive) && lastActive >= 1 && lastActive <= this._state.unlockedLevelMax) {
      this._state.currentLevelIndex = lastActive - 1;
    } else {
      this._state.currentLevelIndex = 0;
    }
  }

  _saveProgress() {
    const currentLevelId = this._levels[this._state.currentLevelIndex].id;
    const payload = {
      version: STORAGE_VERSION,
      unlockedLevel: this._state.unlockedLevelMax,
      completedLevels: Array.from(new Set(this._state.completedLevels)),
      attemptsPerLevel: this._state.attemptsPerLevel,
      starsPerLevel: this._state.starsPerLevel,
      savedStyles: this._state.savedStyles,
      lastActiveLevel: currentLevelId
    };
    this._storage.set(STORAGE_KEY, payload);
  }

  // ==========================================
  // State Accessors (Immutable Copies)
  // ==========================================

  getState() {
    this._ensureInitialized();
    const currentLevel = this._levels[this._state.currentLevelIndex];
    const isCompleted = this._state.completedLevels.includes(currentLevel.id);
    const totalAttempts = Object.values(this._state.attemptsPerLevel).reduce((a, b) => a + b, 0);

    const snapshot = {
      currentLevelIndex: this._state.currentLevelIndex,
      currentLevelNumber: currentLevel.id,
      totalLevels: this._levels.length,
      currentStyles: cloneData(this._state.currentStyles),
      attemptsCurrentLevel: this._state.attemptsCurrentLevel,
      isCurrentLevelCompleted: isCompleted,
      isGameCompleted: this._state.completedLevels.length === this._levels.length,
      unlockedLevelMax: this._state.unlockedLevelMax,
      scores: {
        totalAttempts,
        completedLevels: [...this._state.completedLevels],
        starsPerLevel: cloneData(this._state.starsPerLevel)
      }
    };

    return deepFreeze(snapshot);
  }

  getCurrentLevel() {
    this._ensureInitialized();
    return deepFreeze(cloneData(this._levels[this._state.currentLevelIndex]));
  }

  getAllLevels() {
    this._ensureInitialized();
    return this._levels.map((lvl) => ({
      id: lvl.id,
      title: lvl.title,
      isUnlocked: lvl.id <= this._state.unlockedLevelMax,
      isCompleted: this._state.completedLevels.includes(lvl.id),
      stars: this._state.starsPerLevel[lvl.id] || 0
    }));
  }

  // ==========================================
  // Style Manipulation & Whitelist Validation
  // ==========================================

  setUserStyle(property, value) {
    this._ensureInitialized();
    const normProp = normalizeProperty(property);
    const normVal = normalizeValue(value);
    const currentLevel = this._levels[this._state.currentLevelIndex];

    // Whitelist check: only properties defined in availableProperties are allowed
    const isAllowed = currentLevel.availableProperties.some(
      (ctrl) => normalizeProperty(ctrl.property) === normProp
    );

    if (!isAllowed) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(`[GameEngine] Property "${property}" is not permitted for Level ${currentLevel.id}.`);
      }
      return cloneData(this._state.currentStyles);
    }

    // Update style in state
    this._state.currentStyles[normProp] = normVal;

    // Cache updated style for persistence
    if (!this._state.savedStyles[currentLevel.id]) {
      this._state.savedStyles[currentLevel.id] = {};
    }
    this._state.savedStyles[currentLevel.id][normProp] = normVal;
    this._saveProgress();

    this._emit('style:change', {
      property: normProp,
      value: normVal,
      currentStyles: cloneData(this._state.currentStyles)
    });

    return cloneData(this._state.currentStyles);
  }

  // ==========================================
  // Solution Validation Engine
  // ==========================================

  validate() {
    this._ensureInitialized();
    const currentLevel = this._levels[this._state.currentLevelIndex];
    const targetStyles = currentLevel.targetContainerStyles;
    const isAlreadyCompleted = this._state.completedLevels.includes(currentLevel.id);

    // If level is already completed, return cached result without altering attempts
    if (isAlreadyCompleted) {
      const mismatches = this._findMismatches(targetStyles, this._state.currentStyles);
      const isCorrect = mismatches.length === 0;
      return {
        isCorrect,
        message: isCorrect
          ? 'Level already solved! Excellent work commander.'
          : 'Styles were modified after completion. Re-align to match target.',
        mismatches,
        earnedStars: this._state.starsPerLevel[currentLevel.id] || 3,
        alreadyCompleted: true
      };
    }

    // Increment attempt counter
    this._state.attemptsCurrentLevel += 1;
    this._state.attemptsPerLevel[currentLevel.id] = this._state.attemptsCurrentLevel;

    const mismatches = this._findMismatches(targetStyles, this._state.currentStyles);
    const isCorrect = mismatches.length === 0;

    if (isCorrect) {
      // Mark solved
      if (!this._state.completedLevels.includes(currentLevel.id)) {
        this._state.completedLevels.push(currentLevel.id);
      }

      // Unlock next level
      const nextLevelNum = currentLevel.id + 1;
      if (nextLevelNum <= this._levels.length) {
        this._state.unlockedLevelMax = Math.max(this._state.unlockedLevelMax, nextLevelNum);
      }

      // Calculate earned stars (1-2 attempts: 3 stars, 3-4 attempts: 2 stars, 5+: 1 star)
      const attempts = this._state.attemptsCurrentLevel;
      const stars = attempts <= 2 ? 3 : attempts <= 4 ? 2 : 1;
      this._state.starsPerLevel[currentLevel.id] = Math.max(
        this._state.starsPerLevel[currentLevel.id] || 0,
        stars
      );

      this._saveProgress();

      const result = {
        isCorrect: true,
        message: 'Docking sequence confirmed! Vector parameters locked.',
        mismatches: [],
        earnedStars: stars,
        alreadyCompleted: false
      };

      this._emit('level:success', {
        result,
        state: this.getState()
      });

      // Check if entire game completed
      if (this._state.completedLevels.length === this._levels.length) {
        const totalAttempts = Object.values(this._state.attemptsPerLevel).reduce((a, b) => a + b, 0);
        this._emit('game:completed', {
          state: this.getState(),
          summary: {
            totalAttempts,
            completedLevels: [...this._state.completedLevels],
            starsPerLevel: cloneData(this._state.starsPerLevel)
          }
        });
      }

      return result;
    }

    // Failed validation
    this._saveProgress();

    const result = {
      isCorrect: false,
      message: 'Thrusters misaligned. Docking trajectory does not match targets.',
      mismatches,
      earnedStars: 0,
      alreadyCompleted: false
    };

    this._emit('level:fail', {
      result,
      state: this.getState()
    });

    return result;
  }

  _findMismatches(targetStyles, currentStyles) {
    const mismatches = [];
    for (const [rawProp, rawTargetVal] of Object.entries(targetStyles)) {
      const prop = normalizeProperty(rawProp);
      const expected = normalizeValue(rawTargetVal);
      const actual = normalizeValue(currentStyles[prop] || '');

      if (actual !== expected) {
        mismatches.push({
          property: prop,
          expected,
          actual
        });
      }
    }
    return mismatches;
  }

  // ==========================================
  // Level Navigation
  // ==========================================

  goToLevel(levelNumber) {
    this._ensureInitialized();
    if (typeof levelNumber !== 'number' && typeof levelNumber !== 'string') {
      return {
        success: false,
        level: this.getCurrentLevel(),
        state: this.getState(),
        error: `Invalid level number: ${levelNumber}.`
      };
    }
    const num = Number(levelNumber);
    if (!Number.isInteger(num) || num < 1 || num > this._levels.length) {
      return {
        success: false,
        level: this.getCurrentLevel(),
        state: this.getState(),
        error: `Invalid level number: ${levelNumber}.`
      };
    }
    const targetId = num;

    if (targetId > this._state.unlockedLevelMax) {
      return {
        success: false,
        level: this.getCurrentLevel(),
        state: this.getState(),
        error: `Level ${targetId} is locked. Complete previous stages first.`
      };
    }

    this._transitionToLevel(targetId - 1);

    return {
      success: true,
      level: this.getCurrentLevel(),
      state: this.getState()
    };
  }

  nextLevel() {
    this._ensureInitialized();
    const currentLevel = this._levels[this._state.currentLevelIndex];
    const isCompleted = this._state.completedLevels.includes(currentLevel.id);

    if (!isCompleted && this._state.unlockedLevelMax <= currentLevel.id) {
      return {
        success: false,
        level: this.getCurrentLevel(),
        state: this.getState(),
        error: 'Complete the current level before proceeding.'
      };
    }

    if (this._state.currentLevelIndex >= this._levels.length - 1) {
      return {
        success: false,
        level: this.getCurrentLevel(),
        state: this.getState(),
        error: 'Already on the final level.'
      };
    }

    this._transitionToLevel(this._state.currentLevelIndex + 1);

    return {
      success: true,
      level: this.getCurrentLevel(),
      state: this.getState()
    };
  }

  prevLevel() {
    this._ensureInitialized();
    if (this._state.currentLevelIndex <= 0) {
      return {
        success: false,
        level: this.getCurrentLevel(),
        state: this.getState(),
        error: 'Already on Level 1.'
      };
    }

    this._transitionToLevel(this._state.currentLevelIndex - 1);

    return {
      success: true,
      level: this.getCurrentLevel(),
      state: this.getState()
    };
  }

  _transitionToLevel(newIndex) {
    this._state.currentLevelIndex = newIndex;
    const destinationLevel = this._levels[newIndex];

    const savedForThisLevel = this._state.savedStyles[destinationLevel.id];
    if (savedForThisLevel && typeof savedForThisLevel === 'object') {
      this._state.currentStyles = cloneData(savedForThisLevel);
    } else {
      this._state.currentStyles = cloneData(destinationLevel.initialContainerStyles);
    }

    this._state.attemptsCurrentLevel = this._state.attemptsPerLevel[destinationLevel.id] || 0;
    this._saveProgress();

    this._emit('level:change', {
      level: this.getCurrentLevel(),
      state: this.getState()
    });
  }

  // ==========================================
  // Reset Handlers
  // ==========================================

  resetCurrentLevel() {
    this._ensureInitialized();
    const currentLevel = this._levels[this._state.currentLevelIndex];

    // Revert to initialContainerStyles strictly
    this._state.currentStyles = cloneData(currentLevel.initialContainerStyles);

    if (this._state.savedStyles[currentLevel.id]) {
      delete this._state.savedStyles[currentLevel.id];
    }
    this._saveProgress();

    this._emit('level:change', {
      level: this.getCurrentLevel(),
      state: this.getState()
    });

    return {
      success: true,
      level: this.getCurrentLevel(),
      state: this.getState()
    };
  }

  resetAllProgress() {
    this._storage.remove(STORAGE_KEY);
    this._state = {
      currentLevelIndex: 0,
      currentStyles: cloneData(this._levels[0].initialContainerStyles),
      attemptsCurrentLevel: 0,
      unlockedLevelMax: 1,
      completedLevels: [],
      attemptsPerLevel: {},
      starsPerLevel: {},
      savedStyles: {}
    };

    const stateSnapshot = this.getState();

    this._emit('level:change', {
      level: this.getCurrentLevel(),
      state: stateSnapshot
    });

    return stateSnapshot;
  }
}

// Singleton Instance
const GameEngine = new Engine(LEVELS);

// Dual Export: ES Modules and browser window global
if (typeof window !== 'undefined') {
  window.GameEngine = GameEngine;
}

export { GameEngine, Engine, SafeStorage };
