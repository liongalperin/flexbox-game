# Flexbox Learning Game - API Contract & Interface Specification

**Target Audience:** Developer 2 (UI / DOM / Presentation Layer)  
**Provider:** Developer 1 (Game Engine / State / Data Layer)  
**Version:** 1.0.0  
**Status:** Approved for Implementation  

---

## 1. Architectural Overview

To adhere to the project constraints (Vanilla JS, no external libraries, zero page reloads), the Game Engine is exposed as a single decoupled ES6 module (or globally attached to `window.GameEngine`).

```
┌─────────────────────────────────────────────────────────────────┐
│              Developer 2: Presentation Layer                    │
│      (DOM Events, User Controls, Rendering, CSS Animations)     │
└──────────────┬───────────────────────────────────▲──────────────┘
               │ Calls API Methods                 │ Dispatches Events
               ▼                                   │ or Returns Data
┌──────────────────────────────────────────────────┴──────────────┐
│              Developer 1: Data & Engine Layer                   │
│   (Levels Data, Validation Engine, State Manager, LocalStorage) │
└─────────────────────────────────────────────────────────────────┘
```

### Module Export & Consumption
Developer 1 will export the engine singleton from `js/engine.js`:

```javascript
// Example import by Developer 2 in js/app.js:
import { GameEngine } from './engine.js';

// Or via window object if using traditional scripts:
// const engine = window.GameEngine;
```

---

## 2. Core Data Models & Schemas

### 2.1 `Level` Object Schema
Represents all configuration and metadata for a single game level.

```typescript
interface Level {
  id: number;                          // Unique level number (1, 2, 3...)
  title: string;                       // Short descriptive title (e.g., "Aligning the Ducks")
  instructions: string;                // Educational prompt and task description
  hint?: string;                       // Optional hint for the user
  targetContainerStyles: Record<string, string>; // Expected CSS rules on the container
  initialContainerStyles: Record<string, string>; // Default starting CSS rules
  targetItemStyles?: Record<number, Record<string, string>>; // Expected item-level CSS rules (for advanced levels: order, align-self)
  availableProperties: PropertyControl[]; // Which CSS properties are editable in this level
  items: GameItem[];                   // Items displayed on the board
}

interface PropertyControl {
  property: string;                    // e.g. "justify-content", "align-items", "flex-direction"
  options: string[];                   // Allowed CSS values e.g. ["flex-start", "center", "flex-end", "space-between"]
  defaultValue?: string;               // Optional default selected value
}

interface GameItem {
  id: string;                          // Unique item ID within the level (e.g. "item-1")
  type: string;                        // Visual type identifier (e.g. "frog-green", "target-lilypad")
  label?: string;                      // Optional display text inside the element (e.g. "1", "A")
}
```

#### JSON Example:
```json
{
  "id": 1,
  "title": "Centering Items",
  "instructions": "Use <code>justify-content</code> to move the frog horizontally to the center of the pond.",
  "hint": "Try setting justify-content to center.",
  "targetContainerStyles": {
    "justify-content": "center"
  },
  "initialContainerStyles": {
    "justify-content": "flex-start"
  },
  "availableProperties": [
    {
      "property": "justify-content",
      "options": ["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"]
    }
  ],
  "items": [
    { "id": "frog-1", "type": "player-frog" }
  ]
}
```

---

### 2.2 `GameState` Schema
Represents the current live snapshot of the game.

```typescript
interface GameState {
  currentLevelIndex: number;           // 0-indexed current level index
  currentLevelNumber: number;          // 1-indexed current level number (currentLevelIndex + 1)
  totalLevels: number;                 // Total number of stages
  currentStyles: Record<string, string>; // Currently applied container CSS properties
  attempts: number;                    // Failed attempts count for current level
  isLevelCompleted: boolean;           // True if current level is already marked solved
  isGameFinished: boolean;             // True if all levels in the game have been completed
}
```

---

### 2.3 `ValidationResult` Schema
Returned when validating the user's submitted styles.

```typescript
interface ValidationResult {
  isCorrect: boolean;                  // Did the user solve the level?
  message: string;                     // Human-friendly feedback message
  mismatches: StyleMismatch[];         // Details of any mismatched CSS properties
}

interface StyleMismatch {
  property: string;                    // e.g. "justify-content"
  expected: string;                    // Target value e.g. "center"
  actual: string;                      // User selected value e.g. "flex-end"
}
```

---

### 2.4 `UserProgress` Schema (Local Storage)
Returned when querying historical saved progress.

```typescript
interface UserProgress {
  highestLevelUnlocked: number;        // e.g. 5
  completedLevelIds: number[];         // List of completed level numbers e.g. [1, 2, 3, 4]
  totalAttempts: number;               // Global attempts counter across all levels
}
```

---

## 3. Game Engine API Reference

All methods below are methods on `GameEngine`.

### 3.1 `init(): GameState`
Initializes the engine, retrieves saved progress from `localStorage` (if any), and sets the active level.

* **Returns:** `GameState` - The initial state of the game.
* **Example:**
```javascript
const initialState = GameEngine.init();
console.log(`Starting at Level ${initialState.currentLevelNumber} of ${initialState.totalLevels}`);
```

---

### 3.2 `getCurrentLevel(): Level`
Gets the full configuration object for the currently active level.

* **Returns:** `Level`
* **Example:**
```javascript
const level = GameEngine.getCurrentLevel();
renderLevelTitle(level.title);
renderInstructions(level.instructions);
renderControls(level.availableProperties);
renderGameBoard(level.items);
```

---

### 3.3 `getAllLevels(): Array<{ id: number, title: string, isUnlocked: boolean, isCompleted: boolean }>`
Returns metadata for all levels. Ideal for rendering a level selection menu or navigation dropdown.

* **Returns:** Array of level summaries.
* **Example:**
```javascript
const levels = GameEngine.getAllLevels();
populateLevelSelector(levels);
```

---

### 3.4 `setUserStyle(property: string, value: string): Record<string, string>`
Updates the user's current CSS style selection for a given Flexbox property.

* **Parameters:**
  * `property` *(string)*: CSS property name (e.g. `"justify-content"`).
  * `value` *(string)*: CSS property value (e.g. `"center"`).
* **Returns:** `Record<string, string>` - The entire updated `currentStyles` map.
* **Behavior:** Updates internal state. Developer 2 should apply these styles directly to the live preview board container.
* **Example:**
```javascript
selectElement.addEventListener('change', (e) => {
  const updatedStyles = GameEngine.setUserStyle('justify-content', e.target.value);
  applyStylesToBoard(updatedStyles);
});
```

---

### 3.5 `validate(): ValidationResult`
Evaluates the currently applied `currentStyles` against the level's `targetContainerStyles`.

* **Returns:** `ValidationResult`
* **Side Effects:**
  * Increments `attempts` counter.
  * If `isCorrect === true`: Marks the level as completed, unlocks the next level, and updates `localStorage`.
  * Dispatches appropriate events (`level:success` or `level:fail`).
* **Example:**
```javascript
submitButton.addEventListener('click', () => {
  const result = GameEngine.validate();
  if (result.isCorrect) {
    showSuccessModal(result.message);
    triggerVictoryAnimation();
  } else {
    showErrorMessage(result.message);
    triggerErrorShake();
  }
});
```

---

### 3.6 `nextLevel(): { level: Level, state: GameState } | null`
Navigates to the next level. Only allowed if current level is completed or next level is unlocked.

* **Returns:** Object with the new `Level` and `GameState`, or `null` if already on the final level.
* **Side Effects:** Resets `currentStyles` to the new level's `initialContainerStyles`.
* **Example:**
```javascript
nextButton.addEventListener('click', () => {
  const next = GameEngine.nextLevel();
  if (next) {
    loadLevelView(next.level, next.state);
  } else {
    showGameCompletionScreen();
  }
});
```

---

### 3.7 `prevLevel(): { level: Level, state: GameState } | null`
Navigates to the previous level.

* **Returns:** Object with the previous `Level` and `GameState`, or `null` if on Level 1.
* **Example:**
```javascript
prevButton.addEventListener('click', () => {
  const prev = GameEngine.prevLevel();
  if (prev) {
    loadLevelView(prev.level, prev.state);
  }
});
```

---

### 3.8 `goToLevel(levelNumber: number): { level: Level, state: GameState } | false`
Jumps to a specific level (e.g., from a level picker dropdown).

* **Parameters:**
  * `levelNumber` *(number)*: 1-indexed level number to jump to.
* **Returns:** Level and state object if navigation was permitted, or `false` if the level is locked.
* **Example:**
```javascript
function onSelectLevel(num) {
  const target = GameEngine.goToLevel(num);
  if (target) {
    loadLevelView(target.level, target.state);
  } else {
    alert("This level is locked! Complete previous levels first.");
  }
}
```

---

### 3.9 `resetCurrentLevel(): { level: Level, state: GameState }`
Resets the user's choices on the current level back to `initialContainerStyles`.

* **Returns:** `{ level: Level, state: GameState }` with default styles restored.
* **Example:**
```javascript
resetButton.addEventListener('click', () => {
  const { level, state } = GameEngine.resetCurrentLevel();
  syncUIControls(level, state);
  applyStylesToBoard(state.currentStyles);
});
```

---

### 3.10 `resetAllProgress(): void`
Wipes all progress from `localStorage` and resets the game back to Level 1.

* **Example:**
```javascript
restartGameBtn.addEventListener('click', () => {
  if (confirm("Reset all game progress?")) {
    GameEngine.resetAllProgress();
    const state = GameEngine.init();
    loadLevelView(GameEngine.getCurrentLevel(), state);
  }
});
```

---

### 3.11 `getState(): GameState`
Returns a read-only copy of the current `GameState`.

* **Returns:** `GameState`

---

## 4. Event & Subscription System

To allow reactive UI updates without tight coupling, `GameEngine` implements an event listener pattern:

```javascript
GameEngine.on(eventName, callback);
GameEngine.off(eventName, callback);
```

### Supported Events:

| Event Name | Callback Payload | Description |
| :--- | :--- | :--- |
| `level:change` | `{ level: Level, state: GameState }` | Fired whenever the active level changes |
| `level:success` | `{ result: ValidationResult, state: GameState }` | Fired when validation passes |
| `level:fail` | `{ result: ValidationResult, state: GameState }` | Fired when validation fails |
| `style:change` | `{ property: string, value: string, currentStyles: Record<string, string> }` | Fired when any style is updated |
| `game:complete` | `{ progress: UserProgress }` | Fired when the final stage of the game is beaten |

#### Example Usage:
```javascript
// Developer 2 can simply register UI reactions:
GameEngine.on('level:change', ({ level, state }) => {
  updateLevelHeader(state.currentLevelNumber, state.totalLevels);
  renderInstructions(level.instructions);
  buildControlInputs(level.availableProperties);
});

GameEngine.on('level:success', () => {
  playSuccessSound();
  showNextLevelButton();
});

GameEngine.on('level:fail', ({ result }) => {
  highlightMismatchedControls(result.mismatches);
});
```

---

## 5. UI & DOM Guidelines for Developer 2

### 5.1 Game Board Layout (Flexbox Container)
* The board container should have a dedicated ID or class: `#game-board` / `.game-board`.
* Developer 2 applies `display: flex;` in CSS.
* When applying styles dynamically:
  ```javascript
  function applyStylesToBoard(styles) {
    const board = document.getElementById('game-board');
    // Clear previously applied dynamic flex properties
    Object.keys(styles).forEach((prop) => {
      board.style.setProperty(prop, styles[prop]);
    });
  }
  ```

### 5.2 Target Layer vs. Player Layer
To visually compare target positions against user positions:
* **Target Layer (`.target-layer`):** Has `display: flex;` with `targetContainerStyles` applied. Shows target ghost items (e.g., lilypads).
* **Player Layer (`.player-layer`):** Has `display: flex;` with `currentStyles` applied. Shows controllable items (e.g., frogs).
* Both layers share the exact same dimensions and sit superimposed inside the fixed-dimension game board wrapper.

### 5.3 Level Progression (SPA Rule)
* **Zero Page Reloads:** All transitions between levels must occur by re-rendering the dynamic components inside the DOM without invoking `location.reload()` or form submissions.

---

## 6. End-to-End Execution Lifecycle

```
[Page Load]
    │
    ▼
GameEngine.init()
    │
    ├──> Fetches active level from LocalStorage (or Level 1)
    └──> Returns GameState
    │
    ▼
Dev 2 renders DOM:
    ├── Board items (Target Layer & Player Layer)
    ├── Level description & progress indicator ("Level 1 of 10")
    └── Dropdown / Button controls for availableProperties
    │
    ▼
[User changes a control (e.g., justify-content = center)]
    │
    ├──> Dev 2 calls GameEngine.setUserStyle('justify-content', 'center')
    └──> Dev 2 updates player layer element style directly
    │
    ▼
[User clicks "Check Solution" / "Submit"]
    │
    ├──> Dev 2 calls GameEngine.validate()
    │
    ├── If Correct:
    │     ├── GameEngine updates progress & localStorage
    │     ├── Fires 'level:success'
    │     └── Dev 2 shows success animation & enables "Next Level" button
    │
    └── If Incorrect:
          ├── GameEngine increments attempt count
          ├── Fires 'level:fail'
          └── Dev 2 shows error feedback / hints
```
