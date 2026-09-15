# Flexbox Learning Game - Project Workspace

## 📌 Project Overview
This project is an interactive, browser-based game designed to teach and practice CSS Flexbox concepts. It is built as a Single Page Application (SPA) where users solve layout challenges by applying the correct Flexbox properties to progress through various stages.

## 🛠️ Tech Stack & Constraints
*   **Core:** HTML5, CSS3, Vanilla JavaScript.
*   **Strict Rules:** 
    *   Absolutely NO external JavaScript libraries.
    *   NO CSS Grid usage for solving the game tasks.
    *   Transitions between levels must happen dynamically without reloading the HTML page.

---

## 👨💻 Work Division (Architecture & Roles)

To ensure efficient parallel development with minimal merge conflicts, the workload is divided strictly between the Logic/State (Data) and the UI/DOM (Presentation).

### Developer 1: Game Engine, Logic & State (Data Layer)
**Focus:** Vanilla JavaScript, Data Structures, and Application State.
*   **Data Architecture:** Define and manage the core data structure (JSON/Objects) containing all level configurations, instructions, initial states, and correct solutions.
*   **Validation Engine:** Implement the logic that compares the user's selected Flexbox properties against the required solution to determine success or failure.
*   **State Management:** Handle level progression, update the current level tracker (e.g., "Level X of Y"), and build the level reset functionality.
*   **Advanced Features (Bonus):** Develop the logic for saving progress (using Local Storage), managing attempt counters, and allowing users to navigate to previously completed stages.

### Developer 2: UI, DOM Manipulation & Design (Presentation Layer)
**Focus:** HTML/CSS Architecture, Responsive Layouts, and DOM Event Handling.
*   **Layout & Responsive Design:** Build the semantic HTML skeleton and CSS. Ensure the game board maintains fixed dimensions across all screen sizes while the overall site remains fully responsive.
*   **Thematic Styling:** Design the unique visual theme of the game, ensuring a clean, professional, and consistent UI without copying existing games.
*   **User Controls (Inputs):** Build and style the interactive elements (e.g., select menus, buttons) that allow the user to modify the Flexbox properties.
*   **Visual Feedback & DOM Updates:** Write the JS event listeners that inject the user's choices into the DOM, and create CSS animations/visual cues for success or error states.
