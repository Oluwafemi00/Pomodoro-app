// --- State Variables ---
let tasks = [];
let activeTimerId = null;
let currentSecondsLeft = 0;
let initialSeconds = 0;
let activeTaskId = null;
let currentMode = "focus";
let expectedEndTime = null; // NEW: Tracks actual completion time

// --- DOM Elements ---
const dom = {
  inputs: {
    task: document.getElementById("task-input"),
    time: document.getElementById("time-input"),
    break: document.getElementById("break-input"),
    sessions: document.getElementById("sessions-input"),
    addBtn: document.getElementById("add-task-btn"),
  },
  timer: {
    section: document.getElementById("timer-section"),
    display: document.getElementById("timer-display"),
    activeLabel: document.getElementById("active-task-label"),
    progressLabel: document.getElementById("session-progress-label"),
    startBtn: document.getElementById("start-btn"),
    pauseBtn: document.getElementById("pause-btn"),
    resetBtn: document.getElementById("reset-btn"),
  },
  list: document.getElementById("task-list"),
  modal: {
    overlay: document.getElementById("custom-modal"),
    title: document.getElementById("modal-title"),
    message: document.getElementById("modal-message"),
    btn: document.getElementById("modal-btn"),
  },
};

// --- Audio Setup ---
// Using a clean, premium-sounding chime
const alertSound = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
);
alertSound.volume = 0.6; // Keep it slightly muted so it isn't jarring

let isMuted = false;
const volumeBtn = document.getElementById("volume-btn");

volumeBtn.addEventListener("click", () => {
  isMuted = !isMuted;
  alertSound.muted = isMuted;

  // Toggle the SVG visually
  volumeBtn.classList.toggle("muted", isMuted);
  if (isMuted) {
    volumeBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
  } else {
    volumeBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`;
  }
});

// --- Initialization ---
// --- IndexedDB Setup ---
const DB_NAME = "PomodoroDB";
const DB_VERSION = 1;
const STORE_NAME = "tasks";
let db;

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (e) => reject("IndexedDB Error: " + e.target.errorCode);

    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (e) => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

async function saveTasks() {
  if (!db) return;
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  // Clear the store and re-write the current state to keep it perfectly synced
  store.clear();
  tasks.forEach((task) => store.put(task));
}

async function loadTasksFromDB() {
  if (!db) return;
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  request.onsuccess = () => {
    tasks = request.result || [];
    renderTasks();
  };
}

// --- Updated Initialization ---
async function init() {
  try {
    await initDB();
    await loadTasksFromDB();
    setupKeyboardShortcuts();
    setupInputEnterKey();
    registerServiceWorker(); // We will write this next
  } catch (error) {
    console.error("Failed to initialize App:", error);
  }
}

function setupInputEnterKey() {
  const inputs = [
    dom.inputs.task,
    dom.inputs.time,
    dom.inputs.break,
    dom.inputs.sessions,
  ];

  inputs.forEach((input) => {
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // Prevents any default browser behavior
        addTask();
      }
    });
  });
}

// --- Event Listeners ---
dom.inputs.addBtn.addEventListener("click", addTask);
dom.timer.startBtn.addEventListener("click", startTimer);
dom.timer.pauseBtn.addEventListener("click", pauseTimer);
dom.timer.resetBtn.addEventListener("click", resetTimer);
window.addEventListener("DOMContentLoaded", init);

// --- Power User Keyboard Shortcuts ---
function setupKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Ignore if user is typing in an input field or modal is open
    if (
      e.target.tagName === "INPUT" ||
      dom.modal.overlay.classList.contains("show")
    )
      return;

    if (e.code === "Space") {
      e.preventDefault();
      if (activeTimerId) pauseTimer();
      else if (!dom.timer.startBtn.disabled) startTimer();
    }

    if (e.code === "Escape" && !dom.timer.resetBtn.disabled) {
      resetTimer();
    }
  });
}

// --- Task Management ---
function addTask() {
  const name = dom.inputs.task.value.trim();
  const focusMins = parseInt(dom.inputs.time.value, 10);
  const breakMins = parseInt(dom.inputs.break.value, 10);
  const sessions = parseInt(dom.inputs.sessions.value, 10);

  if (!name || isNaN(focusMins) || isNaN(breakMins) || isNaN(sessions)) {
    alert("Please fill out all fields with valid numbers.");
    return;
  }

  const newTask = {
    id: Date.now(),
    name,
    durationMinutes: focusMins,
    breakMinutes: breakMins,
    totalSessions: sessions,
    completedSessions: 0,
  };

  tasks.push(newTask);
  saveTasks();
  dom.inputs.task.value = "";
  renderTasks();
  dom.inputs.task.focus();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  saveTasks();

  if (activeTaskId === id) {
    pauseTimer();
    activeTaskId = null;
    currentMode = "focus";
    dom.timer.section.classList.remove("break-mode");
    dom.timer.activeLabel.textContent = "Ready to Focus?";
    dom.timer.progressLabel.textContent = "";
    dom.timer.display.textContent = "00:00";
    dom.timer.startBtn.disabled = true;
    dom.timer.resetBtn.disabled = true;
  }
  renderTasks();
}

function renderTasks() {
  // Clear the current list
  dom.list.innerHTML = "";

  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";

    const detailsDiv = document.createElement("div");
    detailsDiv.className = "task-details";

    const nameSpan = document.createElement("span");
    nameSpan.className = "task-name";
    nameSpan.textContent = task.name;

    const metaDiv = document.createElement("div");
    metaDiv.className = "task-meta";

    // Generate Session Markers
    let sessionsHTML = `<div class="session-tracker">`;
    for (let i = 1; i <= task.totalSessions; i++) {
      if (i <= task.completedSessions) {
        // Cross out completed sessions
        sessionsHTML += `<span class="session-marker completed-session">Session ${i}</span>`;
      } else {
        // Normal state for pending sessions
        sessionsHTML += `<span class="session-marker">Session ${i}</span>`;
      }
    }
    sessionsHTML += `</div>`;

    metaDiv.innerHTML = `Focus: ${task.durationMinutes}m | Break: ${task.breakMinutes}m ${sessionsHTML}`;

    detailsDiv.appendChild(nameSpan);
    detailsDiv.appendChild(metaDiv);

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "task-actions";

    const loadBtn = document.createElement("button");
    loadBtn.className = "btn-load";
    loadBtn.textContent = "Load";

    // Handle Fully Completed Tasks
    if (task.completedSessions >= task.totalSessions) {
      nameSpan.classList.add("fully-completed");
      loadBtn.disabled = true;
      loadBtn.textContent = "Done";
      loadBtn.style.opacity = "0.5";
      loadBtn.style.cursor = "not-allowed";
    } else if (task.id === activeTaskId) {
      // Prevent reloading the currently active task
      loadBtn.disabled = true;
      loadBtn.textContent = "Active";
      loadBtn.style.opacity = "0.7";
      loadBtn.style.cursor = "not-allowed";
    } else {
      loadBtn.onclick = () => loadTaskIntoTimer(task.id);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn-delete";
    deleteBtn.textContent = "X";
    deleteBtn.title = "Delete Task";
    deleteBtn.onclick = () => deleteTask(task.id);

    actionsDiv.appendChild(loadBtn);
    actionsDiv.appendChild(deleteBtn);

    li.appendChild(detailsDiv);
    li.appendChild(actionsDiv);

    // Append to the DOM using the centralized dom object
    dom.list.appendChild(li);
  });
}

function loadTaskIntoTimer(id) {
  pauseTimer();
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  activeTaskId = id; // State is updated here
  currentMode = "focus";
  dom.timer.section.classList.remove("break-mode");

  initialSeconds = task.durationMinutes * 60;
  currentSecondsLeft = initialSeconds;

  updateTimerLabels();
  updateTimerDisplay();

  dom.timer.startBtn.disabled = false;
  dom.timer.pauseBtn.disabled = true;
  dom.timer.resetBtn.disabled = false;

  // --- NEW ---
  // Force the task list to redraw so the active button disables instantly
  renderTasks();
}

function updateTimerLabels() {
  const task = tasks.find((t) => t.id === activeTaskId);
  if (task) {
    dom.timer.activeLabel.textContent =
      currentMode === "focus"
        ? `🎯 Focusing on: ${task.name}`
        : `☕ Break Time: ${task.name}`;
    dom.timer.progressLabel.textContent = `Session ${task.completedSessions + 1} of ${task.totalSessions}`;
  }
}

// --- High Precision Timer Logic ---
function updateTimerDisplay() {
  const minutes = Math.floor(currentSecondsLeft / 60);
  const seconds = Math.ceil(currentSecondsLeft % 60); // Use ceil to prevent UI jumping to 0 early

  dom.timer.display.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function startTimer() {
  if (activeTimerId !== null || currentSecondsLeft <= 0) return;

  dom.timer.startBtn.disabled = true;
  dom.timer.pauseBtn.disabled = false;

  // Calculate the exact real-world time this timer should end
  expectedEndTime = Date.now() + currentSecondsLeft * 1000;

  activeTimerId = setInterval(() => {
    // Calculate remaining time based on system clock, not interval loops
    const msLeft = expectedEndTime - Date.now();
    currentSecondsLeft = msLeft / 1000;

    if (currentSecondsLeft <= 0) {
      currentSecondsLeft = 0;
      handleTimerComplete();
    } else {
      updateTimerDisplay();
    }
  }, 250); // Run faster than 1s to ensure UI feels instantly responsive
}

function pauseTimer() {
  if (activeTimerId !== null) {
    clearInterval(activeTimerId);
    activeTimerId = null;
    expectedEndTime = null;

    // Snap to nearest whole second on pause
    currentSecondsLeft = Math.ceil(currentSecondsLeft);
    updateTimerDisplay();

    dom.timer.startBtn.disabled = false;
    dom.timer.pauseBtn.disabled = true;
  }
}

function resetTimer() {
  pauseTimer();
  currentSecondsLeft = initialSeconds;
  updateTimerDisplay();
  dom.timer.startBtn.disabled = false;
}

// --- Modal & Flow Logic ---
function showModal(title, message, btnText, onConfirm) {
  dom.modal.title.textContent = title;
  dom.modal.message.textContent = message;
  dom.modal.btn.textContent = btnText;
  dom.modal.overlay.classList.add("show");

  dom.modal.btn.onclick = () => {
    dom.modal.overlay.classList.remove("show");
    if (onConfirm) onConfirm();
  };
}

function handleTimerComplete() {
  clearInterval(activeTimerId);
  activeTimerId = null;

  // The .catch() prevents console errors if the browser blocks autoplay
  alertSound.play().catch((err) => console.log("Audio blocked:", err));

  dom.timer.resetBtn.disabled = true;
  dom.timer.pauseBtn.disabled = true;
  const task = tasks.find((t) => t.id === activeTaskId);
  if (!task) return;

  if (currentMode === "focus") {
    task.completedSessions++;
    saveTasks();
    renderTasks();

    if (task.completedSessions >= task.totalSessions) {
      showModal(
        "🎉 Task Complete!",
        `You finished all ${task.totalSessions} sessions for: ${task.name}. Great job!`,
        "Awesome",
        () => {
          dom.timer.activeLabel.textContent = `✅ Complete: ${task.name}`;
          dom.timer.progressLabel.textContent = "All sessions finished!";
          dom.timer.startBtn.disabled = true;
        },
      );
    } else {
      showModal(
        "☕ Focus Complete",
        `Great job! You finished session ${task.completedSessions}. Time for a short break.`,
        "Start Break",
        () => {
          currentMode = "break";
          dom.timer.section.classList.add("break-mode");
          initialSeconds = task.breakMinutes * 60;
          currentSecondsLeft = initialSeconds;
          updateTimerLabels();
          updateTimerDisplay();

          dom.timer.resetBtn.disabled = false;
          startTimer();
        },
      );
    }
  } else {
    showModal(
      "💪 Break Over",
      "Your break is over. Ready to dive back into focus mode?",
      "Start Next Session",
      () => {
        currentMode = "focus";
        dom.timer.section.classList.remove("break-mode");
        initialSeconds = task.durationMinutes * 60;
        currentSecondsLeft = initialSeconds;
        updateTimerLabels();
        updateTimerDisplay();
        dom.timer.resetBtn.disabled = false;
        startTimer();
      },
    );
  }
  dom.timer.pauseBtn.disabled = true;
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./sw.js")
        .then((reg) => console.log("Service Worker Registered!", reg.scope))
        .catch((err) =>
          console.error("Service Worker Registration Failed:", err),
        );
    });
  }
}

// --- Custom PWA Install Flow ---
let deferredPrompt;
const installBtn = document.getElementById("install-btn");

window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent the default mini-infobar from appearing
  e.preventDefault();

  // Stash the event so it can be triggered later
  deferredPrompt = e;

  // Remove the 'hidden' class to show our custom install button
  installBtn.classList.remove("hidden");
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  // Show the native install prompt
  deferredPrompt.prompt();

  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;

  // Regardless of outcome (accepted or dismissed), hide the button and clear the prompt
  installBtn.classList.add("hidden");
  deferredPrompt = null;
});

// If the user successfully installs the app (even through the browser menu instead of our button)
window.addEventListener("appinstalled", () => {
  installBtn.classList.add("hidden");
  deferredPrompt = null;
  console.log("PWA installed successfully.");
});
