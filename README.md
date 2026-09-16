# 🚀 AstroDock: Cosmic Fleet — Flexbox Learning Game

> **Interactive Single-Page Application for mastering CSS Flexbox layout mechanics.**  
> Course Assignment #2: *תרגיל מספר 2 - משחק ללימוד Flexbox*  
> **Architecture Role:** Developer 1 (Data & Logic Layer / Core Engine)

---

## 📌 Project Overview
**AstroDock** is an educational puzzle game designed to teach CSS Flexbox through an engaging space-docking theme. Players navigate fleets of specialized starships into orbital docking stations by configuring CSS Flexbox properties on dynamic containers.

### Core Constraints & Assignment Compliance:
- **Pure Vanilla JavaScript:** 100% dependency-free, zero runtime libraries, zero build tools.
- **Pure CSS Flexbox:** Absolutely NO CSS Grid used for puzzle layouts.
- **True SPA:** Smooth dynamic DOM transitions with zero page reloads.
- **Fixed Board Geometry:** Standardized `480px × 480px` game board ensuring deterministic solutions across all device resolutions.
- **10 Progressive Levels:** Exceeds the mandatory 6-level minimum requirement:
  - 6 multi-property combination levels (Levels 4, 6, 7, 8, 9, 10).
  - 2 wrapping levels using `flex-wrap` and `wrap-reverse` (Levels 8 & 9).
- **Bonus Features Implemented:**
  - Dynamic 1–3 star scoring system based on attempt efficiency.
  - Persistent progress tracking with `localStorage` and automatic in-memory fallback.
  - Stage navigation permitting replay of previously completed stages.
  - Single-stage reset to default styles (`resetCurrentLevel`).
  - Total progress reset (`resetAllProgress`).

---

## 🏗️ Architecture & Work Division

Development is strictly divided between two decoupled layers:

| Layer | Responsibility | Owner | Status |
| :--- | :--- | :---: | :---: |
| **Data & Logic Layer** | State machine, validation engine, curriculum dataset, persistence, event bus, input sanitization | **Developer 1** | **Complete & Hardened** |
| **Presentation Layer** | Semantic HTML5, responsive outer layout, CSS visuals/animations, DOM event wiring, audio feedback | **Developer 2** | Ready for Handover |

*Detailed architectural contracts and schemas are documented in:*
- [`docs/api-contract.md`](docs/api-contract.md): Complete API methods, data interfaces, event signatures, and DOM contracts.
- [`docs/roles.md`](docs/roles.md): Division of responsibilities and scope boundaries.

---

## 🚀 Developer 2 Quickstart (How to Use the Engine)

### 1. Inclusion in HTML
Because the engine uses modern ES Module exports with browser global fallback, include it using `type="module"`:

```html
<!-- Load Levels Dataset & GameEngine -->
<script type="module" src="js/levels.js"></script>
<script type="module" src="js/engine.js"></script>

<!-- Your UI Controller Script -->
<script type="module" src="js/app.js"></script>
```

### 2. Initializing & Rendering in `js/app.js`
```javascript
import { GameEngine } from './js/engine.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize engine (restores saved progress from localStorage)
  const initialState = GameEngine.init();
  
  // 2. Render initial level
  renderLevel(GameEngine.getCurrentLevel(), initialState);

  // 3. Listen to reactive engine events
  GameEngine.on('level:change', ({ level, state }) => {
    renderLevel(level, state);
  });

  GameEngine.on('style:change', ({ property, value, currentStyles }) => {
    // Apply live style to player container
    playerContainer.style[property] = value;
  });

  GameEngine.on('level:success', ({ result, state }) => {
    // Play docking animation & show victory banner
    showSuccessBanner(result.earnedStars);
  });

  GameEngine.on('level:fail', ({ result, state }) => {
    // Play thruster misfire shake animation
    playErrorShake();
  });
});
```

### 3. Critical CSS Board Contract
```css
/* Mandatory: Board container dimensions and LTR isolation */
.board-container {
  width: 480px;
  height: 480px;
  position: relative;
  overflow: hidden;
  direction: ltr !important; /* CRITICAL: Prevents RTL language tags from inverting Flexbox axes! */
}

/* Mandatory: Starship box-model for deterministic flex-wrap */
.game-item {
  width: 130px;
  height: 130px;
  margin: 10px; /* 130px + 20px = 150px outer width */
  flex: 0 0 130px;
  box-sizing: border-box;
}
```

---

## 🛡️ Enterprise Security & Hardening

The engine includes enterprise-grade defenses tested against adversarial attacks:
1. **Prototype Pollution Protection:** Blocks `__proto__`, `constructor`, and `prototype` in `cloneData()`, `SafeStorage`, and property setters.
2. **CSS Injection & XSS Neutralization:** Enforces strict regex validation (`/^[a-z0-9-]+$/`) on all CSS values and caps length to 32 characters, neutralizing `<script>`, `url()`, or injection escapes.
3. **Storage Tampering Sanitization:** Hydrated storage payloads are clamped and schema-sanitized against out-of-bounds levels or corrupted JSON.
4. **Fault-Isolated Event Bus:** Subscriber crashes in UI code are caught and isolated in `try...catch` blocks, preventing UI rendering errors from crashing the game loop.

---

## 🧪 Running the Test Suite

Run the full automated test suite using native Node.js:

```powershell
# Run primary unit, security, and geometry test suites (58 tests)
npm test

# Run the complete test matrix (Unit, Security, E2E Solver, Contracts, Memory Stress)
npm run test:all
```

---

## 📄 License
MIT © 2026 AstroDock Team
