# Flexbox Learning Game - Official API Contract & Specification

**Target Audience:** Developer 2 (UI, DOM Manipulation & Design - Presentation Layer)  
**Provider:** Developer 1 (Game Engine, Logic & State - Data Layer)  
**Source Specification:** Assignment #2 - Flexbox Learning Game (`תרגיל מספר 2 - משחק ללימוד Flexbox`)  
**Version:** 2.2.0 (Debate Hardened: Geometry Contracts, RTL Isolation & State Hygiene)  
**Status:** Approved for Implementation  

---

## 📌 1. Project Overview & Mandatory Constraints

This document defines the strict API contract between **Developer 1 (Data/Logic)** and **Developer 2 (UI/Presentation)**. All interfaces in this contract comply with the official assignment requirements:

1. **Vanilla JavaScript Only:** Absolutely NO external JS libraries (no jQuery, React, Lodash, etc.).
2. **NO CSS Grid:** All puzzle challenges must be solved strictly using CSS Flexbox.
3. **Single Page Application (SPA):** Transitions between levels must happen dynamically in the DOM with **zero page reloads**.
4. **Mandatory Flexbox Properties:**
   - `display: flex` (active on container by default)
   - `flex-direction` (`row`, `row-reverse`, `column`, `column-reverse`)
   - `justify-content` (`flex-start`, `flex-end`, `center`, `space-between`, `space-around`, `space-evenly`)
   - `align-items` (`flex-start`, `flex-end`, `center`, `baseline`, `stretch`)
   - `flex-wrap` (`nowrap`, `wrap`, `wrap-reverse`) — **★ Required on at least one level**
5. **Level Design Diversity & Scope:**
   - Total of **10 progressive levels** (exceeds the 6-level minimum for top grading criteria).
   - At least **5 levels require combining 2 or more Flexbox properties** simultaneously to reach the correct solution (exceeds the 3-level minimum).
   - Solutions must not merely alternate between `center` and `flex-start`.
6. **Fixed Game Board Dimensions (`480px × 480px`):**
   - The game board container **must have fixed dimensions (`480px × 480px`)** across all screen sizes so that Flexbox positioning calculations remain deterministic and identical across desktop and mobile devices.
7. **RTL Direction Isolation (`direction: ltr !important;`):**
   - Because the UI features Hebrew instructions, the document body may use `dir="rtl"`. However, CSS Flexbox inverts main and cross axes in RTL mode. Therefore, `.board-container`, `#target-layer`, and `#player-layer` **must enforce `direction: ltr !important;`** so level solutions remain strictly deterministic.
8. **Original Theme (Anti-Copying Rule):**
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
  id: number;                          // Level number: 1 to 10
  title: string;                       // Short level title (e.g., "Main Thrusters: Center")
  instructionHe: string;               // Clear instruction in Hebrew
  instructionEn: string;               // Clear instruction in English
  hint?: string;                       // Educational hint
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
  currentLevelIndex: number;           // 0-indexed level position (0 to 9)
  currentLevelNumber: number;          // 1-indexed (1 to 10) -> "שלב 3 מתוך 10"
  totalLevels: number;                 // Total count of levels (10)
  currentStyles: Record<string, string>; // Currently applied Flexbox styles (strictly scoped to active level)
  attemptsCurrentLevel: number;        // Attempts count for active level
  isCurrentLevelCompleted: boolean;    // Is current level marked solved?
  isGameCompleted: boolean;            // Have all 10 levels been completed?
  unlockedLevelMax: number;            // Highest level reached (for level select navigation)
  scores: LevelScoreSummary;           // Scoring and stars breakdown
}

interface LevelScoreSummary {
  totalAttempts: number;
  completedLevels: number[];           // Array of solved level IDs [1, 2, 3, ...]
  starsPerLevel: Record<number, number>; // Level ID -> Stars earned (1 to 3 stars)
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
  alreadyCompleted?: boolean;          // True if validate was called on already solved level (prevents attempt inflation)
}

interface MismatchDetail {
  property: string;                    // e.g. "align-items"
  expected: string;                    // Target value e.g. "center"
  actual: string;                      // Current user value e.g. "flex-start"
}
```

---

### 3.4 `NavigationResult` Schema
Standardized response object for all level navigation operations (`nextLevel`, `prevLevel`, `goToLevel`).

```typescript
interface NavigationResult {
  success: boolean;                    // Did navigation succeed?
  level: Level | null;                 // The active Level definition (or null if at game bounds)
  state: GameState;                    // The updated GameState snapshot
  error?: string;                      // Error explanation if success is false
}
```

---

## 🛠️ 4. GameEngine API Methods (Developer 1 -> Developer 2)

### 4.1 Initialization & Progression

#### `GameEngine.init(): GameState`
* **Purpose:** Loads saved progress from `localStorage` (or initializes Level 1) and returns initial state snapshot.
* **Storage Resilience:** Features automated fallback to in-memory storage if `localStorage` throws a SecurityError (e.g. private browsing) or quota exception.
* **Dev 2 Action:** Call once on page load to initialize the UI.

#### `GameEngine.getCurrentLevel(): Level`
* **Purpose:** Returns a deep-frozen copy of the current `Level` definition.
* **Dev 2 Action:** Render instructions, build controls, and render `#target-layer` and `#player-layer`.

#### `GameEngine.getAllLevels(): LevelSummary[]`
* **Purpose:** Returns high-level metadata for all 10 levels for building the level navigation menu / dropdown.
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

#### `GameEngine.goToLevel(levelNumber: number): NavigationResult`
* **Purpose:** Allows navigating to any previously unlocked or completed level (1–10).
* **State Hygiene:** Completely wipes `currentStyles` and resets it strictly to `destinationLevel.initialContainerStyles`.
* **Returns:** `NavigationResult`

#### `GameEngine.nextLevel(): NavigationResult`
* **Purpose:** Advances to the next stage following a successful validation.
* **Constraint:** If current level is incomplete, returns `{ success: false, level: currentLevel, state: currentState, error: "Complete current level first." }`.
* **Returns:** `NavigationResult`

#### `GameEngine.prevLevel(): NavigationResult`
* **Purpose:** Moves back one level (if `currentLevelNumber > 1`).
* **Returns:** `NavigationResult`

---

### 4.2 Style Manipulation & Validation

#### `GameEngine.setUserStyle(property: string, value: string): Record<string, string>`
* **Parameters:**
  * `property`: CSS property name (`"justify-content"`, `"flex-direction"`, etc.)
  * `value`: Selected CSS value (`"center"`, `"space-between"`, etc.)
* **Input Normalization & Whitelist:**
  * Property names are normalized to lowercase kebab-case.
  * Property values are trimmed and lowercased.
  * Rejects properties not included in `availableProperties` for the active level.
* **Returns:** Deep copy of updated `currentStyles` map.
* **Dev 2 Action:** Hook this to the `change` event of inputs. Apply returned styles to the `#player-layer` element in the DOM for live preview.

#### `GameEngine.validate(): ValidationResult`
* **Purpose:** Evaluates `currentStyles` against `targetContainerStyles`.
* **Normalization & Alias Equivalence:**
  * Evaluates equality with support for CSS standard aliases (`start` ≡ `flex-start`, `end` ≡ `flex-end`).
  * Only evaluates the properties defined in `targetContainerStyles`.
* **Debounce & Attempt Protection:**
  * If level is already solved (`isCurrentLevelCompleted === true`), `validate()` returns `{ isCorrect: true, alreadyCompleted: true }` without incrementing attempts or altering stars.
* **Side Effects:**
  * Increments `attemptsCurrentLevel` and updates overall score.
  * If valid: marks level as completed, unlocks next level, and saves to `localStorage`.
  * Triggers event: `'level:success'` or `'level:fail'`.
* **Returns:** `ValidationResult`

---

### 4.3 Reset Functions (Mandatory Assignment Requirement)

#### `GameEngine.resetCurrentLevel(): NavigationResult`
* **Purpose:** Fulfills assignment requirement: *"יש לממש אפשרות לאיפוס השלב הנוכחי לערכי ברירת המחדל"*.
* **Behavior:** Reverts `currentStyles` back to `initialContainerStyles`. Does not clear historical completion status.
* **Returns:** `NavigationResult`

#### `GameEngine.resetAllProgress(): GameState`
* **Purpose:** Clears `localStorage` and resets the entire game to Level 1.

---

## 🔔 5. Reactive Event System

```javascript
// Register listener. Returns an unsubscribe function!
const unsubscribe = GameEngine.on(eventName: string, handler: Function): Function;
GameEngine.off(eventName: string, handler: Function): void;
```

### Event Registry:

| Event | Payload | When it fires | UI Reaction |
| :--- | :--- | :--- | :--- |
| `level:change` | `{ level: Level, state: GameState }` | Level changed (next, prev, or picker) | Re-render instructions, controls, board items |
| `style:change` | `{ property, value, currentStyles }` | User adjusts any Flexbox control | Animate player fleet into new position |
| `level:success` | `{ result: ValidationResult, state: GameState }` | Level validated successfully | Play sound, show success banner, open next button |
| `level:fail` | `{ result: ValidationResult, state: GameState }` | Validation failed | Highlight mismatched controls, play error shake |
| `game:completed` | `{ state: GameState, summary: LevelScoreSummary }` | All 10 levels finished | Display Victory Screen, total score, and replay option |

* **Fault Isolation:** The engine wraps all event subscriber callbacks in isolated `try...catch` blocks so that a DOM rendering exception in Dev 2's code will never crash the game engine.

---

## 📐 6. DOM & Board Layout Guidelines for Developer 2

### 6.1 Fixed Dimension Board & Direction Isolation
As mandated by the assignment:
> *"לוח המשחק יהיה בעל רוחב וגובה קבועים בכל גדלי המסך, כדי שהפתרון לכל שלב יישאר זהה ואינו תלוי ברזולוציית המסך."*

```css
/* Board Container: Fixed dimensions + LTR isolation */
.board-container {
  width: 480px;
  height: 480px;
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  direction: ltr !important; /* CRITICAL: Prevents RTL language tags from inverting Flexbox axes! */
}

/* Dual Layers */
.flex-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  direction: ltr !important;
  box-sizing: border-box;
}
```

### 6.2 The Item Dimension Contract (Crucial for `flex-wrap`)
For `flex-wrap: wrap` to behave deterministically on a `480px` container (Levels 8 & 9):
```css
/* Game Item Box Model Contract */
.game-item {
  width: 130px;
  height: 130px;
  flex: 0 0 130px; /* flex-grow: 0, flex-shrink: 0, flex-basis: 130px */
  box-sizing: border-box;
  margin: 10px; /* 130px + 20px = 150px per item */
}
```
**Mathematical Determinism:**
* In a `480px` container, 3 items take `(130px + 20px) * 3 = 450px < 480px` (fits row 1).
* 4 items take `600px > 480px` (forces wrap to row 2).
* 6 items distribute into two clean rows of 3 items each.

### 6.3 State Transition Hygiene (Preventing Zombie Styles)
When switching levels, Developer 2 must reset inline styles on both layers:
```javascript
function loadLevelView(level, state) {
  const targetLayer = document.getElementById('target-layer');
  const playerLayer = document.getElementById('player-layer');

  // 1. Wipe previous inline styles completely
  targetLayer.style.cssText = 'display: flex; direction: ltr;';
  playerLayer.style.cssText = 'display: flex; direction: ltr;';

  // 2. Apply target styles to target-layer
  for (const [prop, val] of Object.entries(level.targetContainerStyles)) {
    targetLayer.style.setProperty(prop, val);
  }

  // 3. Apply current styles to player-layer
  for (const [prop, val] of Object.entries(state.currentStyles)) {
    playerLayer.style.setProperty(prop, val);
  }
}
```

---

## 🎮 7. The 10 Official Curriculum Levels Specification

| Level | Title | Target Properties | Assignment Criteria Satisfied | Items |
| :---: | :--- | :--- | :--- | :---: |
| **1** | Main Thrusters: Center | `justify-content: center` | Core `justify-content` | 1 scout |
| **2** | Fleet Separation | `justify-content: space-between` | Spacing along main axis | 3 ships |
| **3** | Vertical Alignment | `align-items: flex-end` | Core `align-items` (cross axis) | 2 haulers |
| **4** | Orbital Centerpoint | `justify-content: center`<br>`align-items: center` | **★ Multi-Property (1 of 6)** | 1 flagship |
| **5** | Inverted Vector | `flex-direction: row-reverse` | Core `flex-direction` | 3 interceptors |
| **6** | Column Formation | `flex-direction: column`<br>`justify-content: space-around` | **★ Multi-Property (2 of 6)** | 3 probes |
| **7** | Corner Docking | `flex-direction: column-reverse`<br>`align-items: flex-end` | **★ Multi-Property (3 of 6)** | 2 drones |
| **8** | Squadron Hyper-Wrap | `flex-wrap: wrap`<br>`justify-content: center` | **★ Mandatory `flex-wrap` + Multi-Property (4 of 6)** | 6 fighters |
| **9** | Inverted Multi-Deck | `flex-wrap: wrap-reverse`<br>`justify-content: space-between` | **★ `flex-wrap` variation + Multi-Property (5 of 6)** | 6 cruisers |
| **10** | Grand Fleet Admiral | `flex-direction: column`<br>`justify-content: space-between`<br>`align-items: center` | **★ Capstone 3-Property Challenge (6 of 6)** | 3 flagships |

---

### Detailed Level Specifications (Authoritative Dataset in `js/levels.js`)

#### Level 1: Main Thrusters: Center
* **Instruction (HE):** כוונו את חללית הסיור למרכז רציף הנחיתה לאורך הציר הראשי בעזרת `justify-content`.
* **Instruction (EN):** Guide the scout ship to the center of the docking bay along the main axis using `justify-content`.
* **Initial Styles:** `{ "justify-content": "flex-start" }`
* **Target Styles:** `{ "justify-content": "center" }`
* **Available Controls:** `justify-content`
* **Items:** 1 ship (`scout-blue`)

#### Level 2: Fleet Separation
* **Instruction (HE):** פזרו את 3 חלליות הסיור במרווח שווה ביניהן לרוחב הרציף, כך שהחיצוניות ייתקרבו כמה שיותר לדפנות.
* **Instruction (EN):** Disperse the 3 patrol ships with equal space separating them across the bay, pushing outer ships to the edges.
* **Initial Styles:** `{ "justify-content": "flex-start" }`
* **Target Styles:** `{ "justify-content": "space-between" }`
* **Available Controls:** `justify-content`
* **Items:** 3 ships (`patrol-green`)

#### Level 3: Vertical Alignment
* **Instruction (HE):** הנחיתו את 2 ספינות המשא בתחתית הרציף לאורך הציר המשני בעזרת `align-items`.
* **Instruction (EN):** Align the 2 cargo haulers to the bottom floor of the bay along the cross axis using `align-items`.
* **Initial Styles:** `{ "align-items": "flex-start" }`
* **Target Styles:** `{ "align-items": "flex-end" }`
* **Available Controls:** `align-items`
* **Items:** 2 ships (`cargo-yellow`)

#### Level 4: Orbital Centerpoint (Multi-Property)
* **Instruction (HE):** כוונו את ספינת הפיקוד בדיוק למרכז הרציף – הן לאורך הציר הראשי והן לאורך הציר המשני.
* **Instruction (EN):** Center the command flagship in the dead center of the bay along both the main and cross axes.
* **Initial Styles:** `{ "justify-content": "flex-start", "align-items": "flex-start" }`
* **Target Styles:** `{ "justify-content": "center", "align-items": "center" }`
* **Available Controls:** `justify-content`, `align-items`
* **Items:** 1 ship (`flagship-gold`)

#### Level 5: Inverted Vector
* **Instruction (HE):** הפכו את סדר העמידה של 3 המיירטים מימין לשמאל באמצעות שינוי כיוון הציר הראשי.
* **Instruction (EN):** Reverse the order of the 3 interceptors from right to left by changing the main axis direction.
* **Initial Styles:** `{ "flex-direction": "row" }`
* **Target Styles:** `{ "flex-direction": "row-reverse" }`
* **Available Controls:** `flex-direction`
* **Items:** 3 ships (`interceptor-red-1`, `interceptor-red-2`, `interceptor-red-3`)

#### Level 6: Column Formation (Multi-Property)
* **Instruction (HE):** סדרו את 3 הגשושיות בעמודה אנכית מלמעלה למטה, עם רווח שווה מסביב לכל גשושית.
* **Instruction (EN):** Arrange the 3 research probes in a vertical column from top to bottom, with equal space around each probe.
* **Initial Styles:** `{ "flex-direction": "row", "justify-content": "flex-start" }`
* **Target Styles:** `{ "flex-direction": "column", "justify-content": "space-around" }`
* **Available Controls:** `flex-direction`, `justify-content`
* **Items:** 3 ships (`probe-cyan-1`, `probe-cyan-2`, `probe-cyan-3`)

#### Level 7: Corner Docking (Multi-Property)
* **Instruction (HE):** סדרו את 2 הרחפנים בעמודה הפוכה (מלמטה למעלה) והצמידו אותם לדופן הימנית של הרציף.
* **Instruction (EN):** Arrange the 2 drone fighters in an inverted column (bottom-to-top) aligned against the right wall of the bay.
* **Initial Styles:** `{ "flex-direction": "row", "align-items": "flex-start" }`
* **Target Styles:** `{ "flex-direction": "column-reverse", "align-items": "flex-end" }`
* **Available Controls:** `flex-direction`, `align-items`
* **Items:** 2 ships (`drone-purple-1`, `drone-purple-2`)

#### Level 8: Squadron Hyper-Wrap (Mandatory flex-wrap)
* **Instruction (HE):** טייסת של 6 חלליות אינה נכנסת בשורה אחת! אפשרו גלישת פריטים לשורות נוספות ומרכזו אותן.
* **Instruction (EN):** A squadron of 6 fighters cannot fit on a single line! Allow items to wrap into multiple rows and center them.
* **Initial Styles:** `{ "flex-wrap": "nowrap", "justify-content": "flex-start" }`
* **Target Styles:** `{ "flex-wrap": "wrap", "justify-content": "center" }`
* **Available Controls:** `flex-wrap`, `justify-content`
* **Items:** 6 ships (`fighter-orange-1` through `fighter-orange-6`)

#### Level 9: Inverted Multi-Deck (Multi-Property + flex-wrap)
* **Instruction (HE):** סדרו את 6 הסיירות בגלישת שורות הפוכה (מלמטה למעלה), עם מרווח מקסימלי בין הספינות בכל שורה.
* **Instruction (EN):** Arrange the 6 cruisers to wrap in reverse row order (bottom-to-top), with maximum spacing between ships in each row.
* **Initial Styles:** `{ "flex-wrap": "nowrap", "justify-content": "flex-start" }`
* **Target Styles:** `{ "flex-wrap": "wrap-reverse", "justify-content": "space-between" }`
* **Available Controls:** `flex-wrap`, `justify-content`
* **Items:** 6 ships (`cruiser-blue-1` through `cruiser-blue-6`)

#### Level 10: Grand Fleet Admiral (Capstone Multi-Property)
* **Instruction (HE):** המשימה האחרונה! סדרו את 3 ספינות הדגל בעמודה, פזרו אותן מקצה לקצה לאורך העמודה ומרכזו אותן לרוחב הרציף.
* **Instruction (EN):** The ultimate fleet deployment! Arrange the 3 capital flagships in a column, spread them from end to end along the column, and center them across the bay.
* **Initial Styles:** `{ "flex-direction": "row", "justify-content": "flex-start", "align-items": "flex-start" }`
* **Target Styles:** `{ "flex-direction": "column", "justify-content": "space-between", "align-items": "center" }`
* **Available Controls:** `flex-direction`, `justify-content`, `align-items`
* **Items:** 3 ships (`admiral-star-1` through `admiral-star-3`)

---

## 🔄 8. Typical Frontend Execution Flow

```
[Page Loaded]
    │
    ▼
GameEngine.init()
    │
    ├──> Loads progress from LocalStorage (resumes last level or Level 1)
    └──> Returns GameState (e.g. Level 1 of 10)
    │
    ▼
Dev 2 renders DOM:
    ├── Header: "שלב 1 מתוך 10" (Level tracker)
    ├── Instructions & hint
    ├── Dynamic Controls (<select> or buttons for availableProperties)
    ├── Target Layer (docking bays positioned with targetContainerStyles)
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
