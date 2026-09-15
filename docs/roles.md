# Flexbox Learning Game - Project Workspace & Roles

## 📌 Project Overview
This project is an interactive, browser-based game designed to teach and practice CSS Flexbox concepts (`תרגיל מספר 2 - משחק ללימוד Flexbox`). It is built as a Single Page Application (SPA) where users solve layout challenges across **10 progressive levels** by selecting the correct Flexbox properties to dock starships into orbital stations without page reloads.

## 🛠️ Tech Stack & Constraints
*   **Core:** HTML5, CSS3, Vanilla JavaScript.
*   **Strict Rules (From Assignment Specification):** 
    *   **NO External JavaScript Libraries:** Pure native DOM and Vanilla JS only.
    *   **NO CSS Grid:** All puzzle challenges must be solved strictly using CSS Flexbox.
    *   **SPA Transitions:** Transitions between levels, resets, and checks must happen dynamically in the DOM with zero page reloads.
    *   **Fixed Game Board Dimensions:** The game board (`.board-container`) must have fixed width and height (`480px × 480px`) across all screen sizes, while the site wrapper remains fully responsive.
    *   **Original Theme:** Original cosmic docking theme (**AstroDock / Cosmic Fleet**) — strictly no copying of Flexbox Froggy assets.
    *   **Deployment:** GitHub Pages ready (clean relative paths, public repository).

---

## 👨‍💻 Work Division (Architecture & Roles)

To ensure efficient parallel development with zero merge conflicts, the workload is divided strictly between the Logic/State (Data Layer) and the UI/DOM (Presentation Layer).

### Developer 1: Game Engine, Logic & State (Data Layer)
**Focus:** Vanilla JavaScript, Data Structures, Application State, and LocalStorage.
*   **Data Architecture:** Define and manage the 10-level curriculum dataset (`js/levels.js`), containing all level metadata, instructions, target styles, and available property controls.
*   **Validation Engine:** Implement `GameEngine.validate()` to compare user-selected CSS flexbox properties against the target solution.
*   **State Management:** Handle level progression (`nextLevel()`, `prevLevel()`, `goToLevel()`), level tracker (`"שלב X מתוך 10"`), and stage reset (`resetCurrentLevel()`).
*   **Scoring & Persistence (Bonus Requirements):** Track attempts per level, compute earned stars (1-3 stars), persist progress via `localStorage`, and unlock previously solved stages for replay.
*   **Event Dispatcher:** Provide a pub/sub event system (`on` / `off`) so Developer 2 can react to state changes without tight coupling.

### Developer 2: UI, DOM Manipulation & Design (Presentation Layer)
**Focus:** Semantic HTML5, CSS3 Styling & Animations, DOM Event Handling, Responsive Layout.
*   **Semantic Skeleton & Responsive Layout:** Build the HTML structure and responsive container around the fixed-size `480px × 480px` game board.
*   **Thematic Styling:** Design the sleek AstroDock cosmic theme (starfield background, glowing orbital docking bays, vector starships).
*   **Dual-Layer Board Implementation:** Implement `#target-layer` (docking stations) and `#player-layer` (user starships), updating `#player-layer` dynamically via JS.
*   **User Controls:** Build clean, intuitive input controls (`<select>` dropdowns and buttons) for selecting Flexbox properties (`justify-content`, `align-items`, `flex-direction`, `flex-wrap`).
*   **Visual & Audio Feedback:** Create CSS animations for success (warp pulse / docking lock) and failure (thruster misfire / shake), plus victory screens.
