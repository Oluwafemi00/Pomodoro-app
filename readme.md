# Smart Pomodoro Timer ⏱️

> A premium focus timer with SVG ring countdown, IndexedDB task persistence, multi-session tracking, and a warm charcoal/amber design system.

![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![IndexedDB](https://img.shields.io/badge/IndexedDB-persistence-blue)
![No Dependencies](https://img.shields.io/badge/dependencies-none-brightgreen)

---

## Overview

A Pomodoro-style productivity timer that goes well beyond a basic countdown. Tasks are created with custom focus time, break time, and session count. An SVG ring visualises progress, and the app automatically transitions between focus and break rounds — prompting the user at each stage via a styled modal.

---

## Features

| Feature                    | Details                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------- |
| **Custom Tasks**           | Each task has its own focus duration, break duration, and round count                  |
| **SVG Ring Timer**         | Circular progress ring animates smoothly with `stroke-dashoffset`                      |
| **Focus / Break Mode**     | Automatically switches between modes with a custom modal prompt                        |
| **Multi-session Tracking** | Session pip indicators show completed vs remaining rounds per task                     |
| **High-Precision Timer**   | Uses `Date.now()` and `expectedEndTime` — never drifts even if the tab is backgrounded |
| **Task Queue**             | Multiple tasks can be queued; load any into the timer with one click                   |
| **IndexedDB Persistence**  | Tasks and session progress survive page reloads                                        |
| **Keyboard Shortcuts**     | `Space` to start/pause, `Esc` to reset                                                 |
| **Active Task Indicator**  | Visual dot highlights the currently loaded task                                        |
| **Responsive Layout**      | Works cleanly on mobile and desktop                                                    |

---

## Technical Highlights

- **High-precision countdown** — `setInterval` polls every 250ms but calculates remaining time from `expectedEndTime - Date.now()`, eliminating drift when the browser throttles background tabs
- **IndexedDB** — used instead of localStorage for structured data with proper transaction handling via a Promise wrapper
- **SVG ring** — `stroke-dasharray` set to circumference (`2πr`), `stroke-dashoffset` driven by `(1 - pct) * circumference` for clean linear mapping
- **Custom modal** replaces `window.confirm/alert` for a consistent in-app experience
- **Session pips** rendered as small coloured bars — green for done, surface3 for pending — directly in the task list

---

## Project Structure

```
Pomodoro-App /
├── index.html       ← App shell, header, task list, modals
├── style.css        ← Warm dark design system, animations, accessible custom inputs
├── script.js        ← IndexedDB CRUD, ring logic, filter/sort, keyboard shortcuts
├── sw.js            ← Cache-first service worker
└── manifest.json    ← PWA metadata, icons, theme colour
```

---

## Design Decisions

- **Instrument Serif + Instrument Sans** — editorial serif/sans pairing for a focused, calm workspace feel
- **Amber accent** (`#E8963C`) — warm, energising colour that signals focus without being aggressive
- **Break mode** shifts the ring and button to violet — clear visual signal that you're in rest mode
- **Sticky topbar** keeps navigation accessible while scrolling through a long task list

---

## Run Locally

```bash
open pomodoro-timer.html
# IndexedDB requires a browsing context — serve it if opening from filesystem causes issues
npx serve .
```

---

## What This Demonstrates

- Working with the IndexedDB API directly (no Dexie or wrapper libraries)
- High-precision timers resistant to browser tab throttling
- SVG as a first-class UI component for data visualisation
- Complex multi-state UI management (focus/break mode, active task, session count) without a framework
