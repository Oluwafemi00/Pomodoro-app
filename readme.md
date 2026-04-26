# Smart Pomodoro Tasker

A sleek, feature-rich Pomodoro web application built with Vanilla JavaScript. Designed to help you stay focused, manage tasks, and track your study/work sessions with seamless transitions between focus and break modes.

Fully offline-capable and installable right to your home screen!

## Features

- **Progressive Web App (PWA):** Install the app seamlessly on your desktop or mobile device using the built-in Install button. Works 100% offline!
- **IndexedDB Persistence:** Robust, browser-based database storage. Your tasks, timer settings, and completed sessions survive browser restarts and page refreshes.
- **Smart Session Tracking:** Set a target number of sessions for each task. The UI dynamically crosses out sessions as you complete them.
- **Automated Workflow:** Seamlessly flows from _Focus Mode_ ➡️ _Modal Prompt_ ➡️ _Break Mode_ ➡️ _Next Session_.
- **Audio Notifications:** Gentle notification chimes alert you exactly when your focus or break sessions end.
- **Customizable Intervals:** Independently set focus minutes, break minutes, and total sessions per task.
- **Sleek UI:** Clean, tomato-themed interface with custom modal popups (no ugly default browser alerts) and visual mode switching (Red for Focus, Blue for Break).

<!-- ## 🚀 Demo / Screenshots

_(You can add a link to your live demo here, or place screenshots of your app inside a `/docs` or `/assets` folder and link them below.)_

> ![App Screenshot](placeholder-for-screenshot.png) -->

## 🛠️ Technologies Used

- **HTML5 & CSS3:** For a responsive, accessible, and clean user interface.
- **Vanilla JavaScript (ES6+):** Core application logic, DOM manipulation, and dynamic `Audio` object handling without the overhead of heavy frameworks.
- **IndexedDB API:** For asynchronous, large-scale offline data persistence.
- **Service Workers & Web App Manifest:** To power the PWA features, offline caching, and device installation.
