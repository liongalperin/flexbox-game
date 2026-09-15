# Flexbox Learning Game - Official API Contract & Specification

**Target Audience:** Developer 2 (UI, DOM Manipulation & Design - Presentation Layer)  
**Provider:** Developer 1 (Game Engine, Logic & State - Data Layer)  
**Source Specification:** Assignment #2 - Flexbox Learning Game (`תרגיל מספר 2 - משחק ללימוד Flexbox`)  
**Version:** 2.0.0 (Corrected & Aligned with PDF Requirements)  
**Status:** Approved for Implementation  

---

## 📌 1. Project Overview & Mandatory Constraints

This document defines the strict API contract between **Developer 1 (Data/Logic)** and **Developer 2 (UI/Presentation)**. All interfaces in this contract comply with the official assignment requirements:

1. **Vanilla JavaScript Only:** Absolutely NO external JS libraries (no jQuery, React, Lodash, etc.).
2. **NO CSS Grid:** Tasks and game solutions must rely exclusively on CSS Flexbox.
3. **Single Page Application (SPA):** Transitions between levels must happen dynamically in the DOM with **zero page reloads**.
4. **Mandatory Flexbox Properties:**
   - `display: flex` (active on container by default)
   - `flex-direction` (`row`, `row-reverse`, `column`, `column-reverse`)
   - `justify-content` (`flex-start`, `flex-end`, `center`, `space-between`, `space-around`, `space-evenly`)
   - `align-items` (`flex-start`, `flex-end`, `center`, `baseline`, `stretch`)
   - `flex-wrap` (`nowrap`, `wrap`, `wrap-reverse`) — **★ Required on at least one level**
5. **Level Design Diversity:**
   - Minimum **6 unique levels** (8 provided out of the box).
   - At least **3 levels must require combining 2 or more Flexbox properties** simultaneously to reach the correct solution.
   - Solutions must not merely alternate between `center` and `flex-start`.
6. **Fixed Game Board Dimensions:**
   - The game board container **must have a fixed width and height (e.g. 480px × 480px)** on all screen sizes so that Flexbox positioning calculations remain deterministic and identical across desktop and mobile devices.
7. **Original Theme (Anti-Copying Rule):**
   - Strictly forbidden from copying Flexbox Froggy characters or assets.
   - Default theme: **AstroDock / Cosmic Fleet** (Spaceships docking at Orbital Stations).

---

## 🏗️ 2. Architecture & Module Integration

```
┌────────────────────────────────────────────────────────────────────────┐
│               Developer 2: UI / Presentation Layer                     │
│   (HTML5 Skeleton, Theme CSS, Controls/Inputs, Sound/Visual Effects)   │
└───────────────────┬────────────────────────────────▲───────────────────┘
                    │ 1. Calls Engine Methods         │ 2. Subscribes to Events
                    ▼                                │    or Receives State
┌───────────────────┴────────────────────────────────┴───────────────────┐
│               Developer 1: Game Engine & Data Layer                    │
│      (Levels Database, Validation Engine, State, LocalStorage)         │
└────────────────────────────────────────────────────────────────────────┘
```

### Module Consumption
Developer 1 exports a singleton instance named `GameEngine` from `./js/engine.js`:

```javascript
// In js/app.js (Developer 2's entry point)
import { GameEngine } from './engine.js';

// Initialize the game on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const state = GameEngine.init();
  renderGame(state);
});
```

---

## 📦 3. Core Data Schemas

### 3.1 `Level` Schema
Defines each level's metadata, educational goal, expected Flexbox styles, and board items.

```typescript
interface Level {
  id: number;                          // Level number: 1, 2, 3...
  title: string;                       // Short level title (e.g., "Docking the Scout")
  instruction: string;                 // Clear Hebrew/English instructions
  hint?: string;                       // Optional hint if user struggles
  availableProperties: PropertyControl[]; // Which CSS properties are controllable in this level
  initialContainerStyles: Record<string, string>; // Starting CSS rules
  targetContainerStyles: Record<string, string>;  // Target CSS rules that solve the level
  requiresMultipleProperties: boolean; // True if this level requires >= 2 properties
  usesFlexWrap: boolean;               // True if this level tests flex-wrap
  items: GameItem[];                   // Items placed inside the container
}

interface PropertyControl {
  property: 'flex-direction' | 'justify-content' | 'align-items' | 'flex-wrap';
  label: string;                       // Display label for the control
  controlType: 'select' | 'buttons';   // Recommended HTML input element
  options: string[];                   // Allowed CSS values
  defaultValue: string;                // Initial value
}

interface GameItem {
  id: string;                          // Unique identifier (e.g. "ship-1")
  type: string;                        // Visual type class (e.g. "scout-blue", "cruiser-gold")
  label?: string;                      // Optional badge number or letter
}
```

---

### 3.2 `GameState` Schema
Represents the current dynamic state of the application.

```typescript
interface GameState {
  currentLevelIndex: number;           // 0-indexed level position
  currentLevelNumber: number;          // 1-indexed (e.g. 3) -> "שלב 3 מתוך 8"
  totalLevels: number;                 // Total count of levels (e.g. 8)
  currentStyles: Record<string, string>; // Currently applied Flexbox styles
  attemptsCurrentLevel: number;        // Attempts count for active level
  isCurrentLevelCompleted: boolean;    // Is current level marked solved?
  isGameCompleted: boolean;            // Have all levels been completed?
  unlockedLevelMax: number;            // Highest level reached (for level select)
  scores: LevelScoreSummary;           // Scoring and stars breakdown
}

interface LevelScoreSummary {
  totalAttempts: number;
  completedLevels: number[];           // Array of solved level IDs [1, 2, 3]
  starsPerLevel: Record<number, number>; // Level ID -> Stars earned (1-3 stars)
}
```

---

### 3.3 `ValidationResult` Schema
Returned when Developer 2 calls `GameEngine.validate()`.

```typescript
interface ValidationResult {
  isCorrect: boolean;                  // True if user solution matches target
  message: string;                     // Feedback message for user
  mismatches: MismatchDetail[];        // List of mismatched properties (if any)
  earnedStars?: number;                // 3 stars (1-2 attempts), 2 stars (3-4), 1 star (5+)
}

interface MismatchDetail {
  property: string;                    // e.g. "align-items"
  expected: string;                    // Target value e.g. "center"
  actual: string;                      // Current user value e.g. "flex-start"
}
```

---

### 3.4 `UserProgress` Schema (`localStorage`)
Stored under key `'FLEXBOX_GAME_PROGRESS'`. Handled entirely by Developer 1.

```typescript
interface UserProgress {
  version: string;
  unlockedLevel: number;               // Highest level unlocked
  completedLevels: number[];           // Array of finished level IDs
  attemptsPerLevel: Record<number, number>; // levelId -> attempts count
  savedStyles: Record<number, Record<string, string>>; // levelId -> last saved styles
  lastActiveLevel: number;             // Resumes where user left off
}
```

---

## 🛠️ 4. GameEngine API Methods (Developer 1 -> Developer 2)

All interaction from Developer 2 into the Game Engine occurs via the methods below:

### 4.1 Initialization & Progression

#### `GameEngine.init(): GameState`
* **Purpose:** Loads saved progress from `localStorage` (or initializes defaults) and sets active level.
* **Returns:** `GameState`
* **Dev 2 Action:** Call once on page load to render UI headers, level select options, and the board.

#### `GameEngine.getCurrentLevel(): Level`
* **Purpose:** Returns the complete level definition for the active stage.
* **Returns:** `Level`
* **Dev 2 Action:** Build the instruction box, generate the interactive controls (`<select>` or buttons), and render the target & player game items.

#### `GameEngine.getAllLevels(): LevelSummary[]`
* **Purpose:** Returns high-level metadata for every level in the game for building the level navigation menu / drawer.
* **Returns:** 
  ```typescript
  Array<{
    id: number;
    title: string;
    isUnlocked: boolean;
    isCompleted: boolean;
    stars: number;
  }>
  ```
* **Dev 2 Action:** Populate the level selector dropdown/grid with locked/unlocked indicators.

#### `GameEngine.goToLevel(levelNumber: number): { success: boolean, level?: Level, state?: GameState, error?: string }`
* **Purpose:** Allows navigating to any previously unlocked or completed level.
* **Returns:** Object with status and new level/state if allowed.
* **Constraint:** Prevent jumping to locked levels ahead of user's highest progress.

#### `GameEngine.nextLevel(): { level: Level, state: GameState } | null`
* **Purpose:** Advances to the next level following a successful solution.
* **Returns:** Next level data, or `null` if the final level was beaten.
* **SPA Rule:** Updates state internally; Dev 2 updates the DOM in-place without page reload.

#### `GameEngine.prevLevel(): { level: Level, state: GameState } | null`
* **Purpose:** Moves back one level (if `currentLevelNumber > 1`).

---

### 4.2 Style Manipulation & Validation

#### `GameEngine.setUserStyle(property: string, value: string): Record<string, string>`
* **Parameters:**
  * `property`: CSS property name (`"justify-content"`, `"flex-direction"`, etc.)
  * `value`: Selected CSS value (`"center"`, `"space-between"`, etc.)
* **Returns:** Updated `currentStyles` map.
* **Dev 2 Action:** Hook this to the `change` event of inputs. Immediately apply returned styles to the player layer element in the DOM for real-time visual feedback.

#### `GameEngine.validate(): ValidationResult`
* **Purpose:** Evaluates `currentStyles` against `targetContainerStyles`.
* **Side Effects:**
  * Increments `attemptsCurrentLevel` and updates overall score.
  * If valid: marks level as completed, unlocks next level, and saves to `localStorage`.
  * Triggers event: `'level:success'` or `'level:fail'`.
* **Returns:** `ValidationResult` (includes `isCorrect`, `message`, `mismatches`, `earnedStars`).
* **Dev 2 Action:**
  * If `isCorrect`: display success banner, trigger victory animation, enable "Next Level" button.
  * If incorrect: display error message, trigger shake animation on the player items, leave controls editable.

---

### 4.3 Reset Functions (Assignment Requirement)

#### `GameEngine.resetCurrentLevel(): { level: Level, state: GameState }`
* **Purpose:** Fulfills assignment requirement: *"יש לממש אפשרות לאיפוס השלב הנוכחי לערכי ברירת המחדל"*.
* **Behavior:** Reverts `currentStyles` back to `initialContainerStyles`. Does not clear historical completion status.
* **Dev 2 Action:** Triggered by the "Reset Level" button; re-syncs input dropdowns and resets player item positions.

#### `GameEngine.resetAllProgress(): GameState`
* **Purpose:** Clears `localStorage` and resets the entire game to Level 1.
* **Dev 2 Action:** Bound to "Start Over" / "Reset All" button in settings.

---

## 🔔 5. Reactive Event System

Developer 2 can subscribe to state events instead of manual polling:

```javascript
GameEngine.on(eventName: string, handler: Function): void
GameEngine.off(eventName: string, handler: Function): void
```

### Event Registry:

| Event | Payload | When it fires | UI Reaction |
| :--- | :--- | :--- | :--- |
| `level:change` | `{ level: Level, state: GameState }` | Level changed (via next, prev, or picker) | Re-render instructions, controls, board items |
| `style:change` | `{ property, value, currentStyles }` | User adjusts any Flexbox control | Animate player fleet into new position |
| `level:success` | `{ result: ValidationResult, state: GameState }` | Level validated successfully | Play sound, show success banner, open next button |
| `level:fail` | `{ result: ValidationResult, state: GameState }` | Validation failed | Highlight mismatched controls, play error shake |
| `game:completed` | `{ state: GameState, summary: LevelScoreSummary }` | All 8 levels finished | Display Victory Screen, total score, and replay option |

---

## 📐 6. DOM & Board Layout Guidelines for Developer 2

### 6.1 Fixed Dimension Board Requirement
As mandated by the assignment:
> *"לוח המשחק יהיה בעל רוחב וגובה קבועים בכל גדלי המסך, כדי שהפתרון לכל שלב יישאר זהה ואינו תלוי ברזולוציית המסך."*

* The game board container **must have fixed dimensions**:
  ```css
  .board-container {
    width: 480px;
    height: 480px;
    position: relative;
    overflow: hidden;
    border-radius: 12px;
  }
  ```
* On mobile screens smaller than 480px, the page wrapper handles responsiveness using `overflow-x: auto` or CSS scale: `transform: scale(...)` to preserve exact relative layout.

### 6.2 The Dual-Layer Board Pattern
To achieve deterministic visual matching:
```html
<div class="board-container">
  <!-- Target Layer: Shows landing pods/docks with targetContainerStyles -->
  <div id="target-layer" class="flex-layer target-layer">
    <!-- Rendered target docks -->
  </div>

  <!-- Player Layer: Controllable ships with currentStyles applied -->
  <div id="player-layer" class="flex-layer player-layer">
    <!-- Rendered ships -->
  </div>
</div>
```

```css
.flex-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex; /* Flexbox active on both layers */
}
```

When user selects styles:
```javascript
function applyStylesToPlayerLayer(styles) {
  const layer = document.getElementById('player-layer');
  // Reset previous inline styles and apply current styles
  layer.style.cssText = 'display: flex;';
  for (const [prop, val] of Object.entries(styles)) {
    layer.style.setProperty(prop, val);
  }
}
```

---

## 🎮 7. Official Default 8-Level Dataset Specification

Developer 1 will include the following 8 curriculum stages meeting all PDF criteria:

| Level # | Title | Core Properties | Criteria Satisfied | Items Count |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Main Thrusters: Center | `justify-content: center` | Single property introduction | 1 ship |
| **2** | Fleet Separation | `justify-content: space-between` | Spacing along main axis | 3 ships |
| **3** | Vertical Alignment | `align-items: flex-end` | Cross axis alignment | 2 ships |
| **4** | Orbital Shift (Combined) | `justify-content: flex-end` + `align-items: center` | **★ Multi-property (1 of 3)** | 2 ships |
| **5** | Reverse Vector | `flex-direction: row-reverse` | Changing axis orientation | 3 ships |
| **6** | Column Formation (Combined)| `flex-direction: column` + `justify-content: space-around` | **★ Multi-property (2 of 3)** | 3 ships |
| **7** | Grid Overflow: Hyper-Wrap | `flex-wrap: wrap` + `justify-content: center` | **★ Mandatory flex-wrap requirement + Multi-property (3 of 3)** | 6 ships |
| **8** | Master Commander | `flex-direction: column-reverse` + `align-items: flex-end` + `justify-content: space-between` | Capstone 3-property challenge | 4 ships |

---

## 🔄 8. Typical Frontend Execution Flow

```
[Page Loaded]
    │
    ▼
GameEngine.init()
    │
    ├──> Loads progress from LocalStorage
    └──> Returns GameState (e.g. Level 1 of 8)
    │
    ▼
Dev 2 renders DOM:
    ├── Header: "שלב 1 מתוך 8"
    ├── Instructions & hint
    ├── Dynamic Controls (<select> with availableProperties)
    ├── Target Layer (docking pads positioned with targetContainerStyles)
    └── Player Layer (ships positioned with initialContainerStyles)
    │
    ▼
[User interacts with controls]
    │
    ├──> Dev 2 calls GameEngine.setUserStyle(prop, val)
    └──> Dev 2 applies updated style to #player-layer
    │
    ▼
[User clicks "Check Solution" / "בדוק פתרון"]
    │
    ├──> Dev 2 calls GameEngine.validate()
    │
    ├── If Valid:
    │     ├── Play success chime & show success banner
    │     ├── Animate ships locking into dock
    │     └── Enable "Next Level" button
    │
    └── If Invalid:
          ├── Increment attempts counter in UI
          ├── Play shake animation on #player-layer
          └── Display constructive feedback / hint
```
