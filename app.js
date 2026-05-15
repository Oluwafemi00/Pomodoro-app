// --- STATE ---
let tasks = [];
let activeTimerId = null;
let currentSecondsLeft = 0;
let initialSeconds = 0;
let activeTaskId = null;
let currentMode = "focus";
let expectedEndTime = null;
let isMuted = false;

// --- CIRC = 2πr = 2 * π * 85 ≈ 534 ---
const CIRC = 2 * Math.PI * 85;

// --- DOM ---
const timerDisplay = document.getElementById("timer-display");
const sessionSub = document.getElementById("session-sub");
const taskLabel = document.getElementById("task-label");
const timerSection = document.getElementById("timer-section");
const modePill = document.getElementById("mode-pill");
const modePillTxt = document.getElementById("mode-pill-text");
const ringFill = document.getElementById("ring-fill");
const startBtn = document.getElementById("start-btn");
const pauseBtn = document.getElementById("pause-btn");
const resetBtn = document.getElementById("reset-btn");
const taskInput = document.getElementById("task-input");
const timeInput = document.getElementById("time-input");
const breakInput = document.getElementById("break-input");
const sessionsInput = document.getElementById("sessions-input");
const addTaskBtn = document.getElementById("add-task-btn");
const taskListEl = document.getElementById("task-list");
const tasksCount = document.getElementById("tasks-count");
const modalOverlay = document.getElementById("modal-overlay");
const modalIcon = document.getElementById("modal-icon");
const modalTitle = document.getElementById("modal-title");
const modalMsg = document.getElementById("modal-msg");
const modalBtn = document.getElementById("modal-btn");
const toastEl = document.getElementById("toast");
const volumeBtn = document.getElementById("volume-btn");
const volIcon = document.getElementById("vol-icon");

// --- AUDIO ---
const alertSound = new Audio(
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
);
alertSound.volume = 0.55;

volumeBtn.addEventListener("click", () => {
  isMuted = !isMuted;
  alertSound.muted = isMuted;
  volumeBtn.classList.toggle("muted", isMuted);
  if (isMuted) {
    volIcon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`;
  } else {
    volIcon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>`;
  }
});

// --- INDEXEDDB ---
const DB_NAME = "FocusPomoDB",
  STORE = "tasks";
let db;

function initDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = (e) => rej(e);
    req.onsuccess = (e) => {
      db = e.target.result;
      res(db);
    };
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE))
        d.createObjectStore(STORE, { keyPath: "id" });
    };
  });
}

function saveTasks() {
  if (!db) return;
  const tx = db.transaction(STORE, "readwrite"),
    st = tx.objectStore(STORE);
  st.clear();
  tasks.forEach((t) => st.put(t));
}

function loadTasksFromDB() {
  if (!db) return;
  const tx = db.transaction(STORE, "readonly"),
    st = tx.objectStore(STORE);
  const req = st.getAll();
  req.onsuccess = () => {
    tasks = req.result || [];
    renderTasks();
  };
}

// --- TOAST ---
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toastEl.classList.remove("show"), 2400);
}

// --- MODAL ---
function showModal(icon, title, msg, btnText, onConfirm) {
  modalIcon.textContent = icon;
  modalTitle.textContent = title;
  modalMsg.textContent = msg;
  modalBtn.textContent = btnText;
  modalOverlay.classList.add("show");
  modalBtn.onclick = () => {
    modalOverlay.classList.remove("show");
    if (onConfirm) onConfirm();
  };
}

// --- RING ---
function updateRing(secondsLeft, total) {
  const pct = total > 0 ? secondsLeft / total : 0;
  const offset = CIRC * (1 - pct);
  ringFill.style.strokeDasharray = CIRC;
  ringFill.style.strokeDashoffset = offset;
}

// --- TIMER DISPLAY ---
function renderTime(s) {
  const m = Math.floor(s / 60),
    sec = Math.ceil(s % 60);
  timerDisplay.textContent = `${String(m).padStart(2, "0")}:${String(Math.min(sec, 59)).padStart(2, "0")}`;
}

function updateLabels() {
  const task = tasks.find((t) => t.id === activeTaskId);
  if (!task) return;
  const isFocus = currentMode === "focus";
  modePillTxt.textContent = isFocus ? "Focus" : "Break";
  modePill.className = "mode-pill" + (isFocus ? "" : " break");
  timerSection.classList.toggle("break-mode", !isFocus);
  ringFill.classList.toggle("break", !isFocus);
  startBtn.classList.toggle("break-accent", !isFocus);
  taskLabel.innerHTML = isFocus
    ? `Focusing on <strong>${task.name}</strong>`
    : `Break after <strong>${task.name}</strong>`;
  const done = task.completedSessions,
    total = task.totalSessions;
  sessionSub.textContent = isFocus
    ? `Round ${done + 1} of ${total}`
    : `Rest up…`;
}

// --- ADD TASK ---
addTaskBtn.addEventListener("click", addTask);
[taskInput, timeInput, breakInput, sessionsInput].forEach((el) =>
  el.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTask();
    }
  }),
);

function addTask() {
  const name = taskInput.value.trim();
  const focus = parseInt(timeInput.value),
    brk = parseInt(breakInput.value),
    rounds = parseInt(sessionsInput.value);
  if (
    !name ||
    isNaN(focus) ||
    isNaN(brk) ||
    isNaN(rounds) ||
    focus < 1 ||
    brk < 1 ||
    rounds < 1
  ) {
    showToast("Please fill all fields correctly");
    return;
  }
  tasks.push({
    id: Date.now(),
    name,
    durationMinutes: focus,
    breakMinutes: brk,
    totalSessions: rounds,
    completedSessions: 0,
  });
  saveTasks();
  renderTasks();
  taskInput.value = "";
  taskInput.focus();
  showToast("Task added");
}

// --- DELETE TASK ---
function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  if (activeTaskId === id) {
    pauseTimer();
    activeTaskId = null;
    currentMode = "focus";
    timerSection.classList.remove("break-mode");
    modePillTxt.textContent = "Ready";
    modePill.className = "mode-pill";
    taskLabel.textContent = "Add a task below to get started";
    sessionSub.textContent = "";
    timerDisplay.textContent = "00:00";
    ringFill.style.strokeDashoffset = CIRC;
    startBtn.disabled = true;
    resetBtn.disabled = true;
  }
  renderTasks();
  showToast("Task removed");
}

// --- LOAD TASK ---
function loadTask(id) {
  pauseTimer();
  const task = tasks.find((t) => t.id === id);
  if (!task) return;
  activeTaskId = id;
  currentMode = "focus";
  initialSeconds = task.durationMinutes * 60;
  currentSecondsLeft = initialSeconds;
  timerSection.classList.remove("break-mode");
  ringFill.classList.remove("break");
  startBtn.classList.remove("break-accent");
  updateLabels();
  renderTime(currentSecondsLeft);
  updateRing(currentSecondsLeft, initialSeconds);
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  resetBtn.disabled = false;
  renderTasks();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// --- RENDER TASKS ---
function renderTasks() {
  taskListEl.innerHTML = "";
  tasksCount.textContent =
    tasks.length === 1 ? "1 task" : `${tasks.length} tasks`;
  if (!tasks.length) {
    taskListEl.innerHTML =
      '<div class="empty-state"><p>Nothing here yet — add your first task</p></div>';
    return;
  }
  tasks.forEach((task) => {
    const done = task.completedSessions >= task.totalSessions;
    const isActive = task.id === activeTaskId;
    const li = document.createElement("li");
    li.className =
      "task-item" + (isActive ? " is-active" : "") + (done ? " is-done" : "");

    // Session pips
    let pips = "";
    for (let i = 0; i < task.totalSessions; i++) {
      pips += `<div class="session-pip${i < task.completedSessions ? " done" : ""}"></div>`;
    }

    li.innerHTML = `
        <div class="task-status-dot"></div>
        <div class="task-main">
          <div class="task-name">${task.name}</div>
          <div class="task-meta">
            <span class="meta-tag">${task.durationMinutes}m focus</span>
            <span class="meta-tag">·</span>
            <span class="meta-tag">${task.breakMinutes}m break</span>
            <span class="meta-tag">·</span>
            <span class="meta-tag">${task.completedSessions}/${task.totalSessions} rounds</span>
          </div>
          <div class="sessions-row">${pips}</div>
        </div>
        <div class="task-actions">
          <button class="btn-task load" ${isActive || done ? "disabled" : ""} data-id="${task.id}">
            ${done ? "Done" : isActive ? "Active" : "Load"}
          </button>
          <button class="btn-task del" data-del="${task.id}">✕</button>
        </div>
      `;
    taskListEl.appendChild(li);
  });

  taskListEl
    .querySelectorAll(".btn-task.load:not(:disabled)")
    .forEach((btn) =>
      btn.addEventListener("click", () => loadTask(parseInt(btn.dataset.id))),
    );
  taskListEl
    .querySelectorAll(".btn-task.del")
    .forEach((btn) =>
      btn.addEventListener("click", () =>
        deleteTask(parseInt(btn.dataset.del)),
      ),
    );
}

// --- TIMER LOGIC ---
startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);

function startTimer() {
  if (activeTimerId !== null || currentSecondsLeft <= 0) return;
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  expectedEndTime = Date.now() + currentSecondsLeft * 1000;
  activeTimerId = setInterval(() => {
    const msLeft = expectedEndTime - Date.now();
    currentSecondsLeft = msLeft / 1000;
    if (currentSecondsLeft <= 0) {
      currentSecondsLeft = 0;
      updateRing(0, initialSeconds);
      renderTime(0);
      handleTimerComplete();
    } else {
      renderTime(currentSecondsLeft);
      updateRing(currentSecondsLeft, initialSeconds);
    }
  }, 250);
}

function pauseTimer() {
  if (activeTimerId !== null) {
    clearInterval(activeTimerId);
    activeTimerId = null;
    expectedEndTime = null;
    currentSecondsLeft = Math.ceil(currentSecondsLeft);
    renderTime(currentSecondsLeft);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
  }
}

function resetTimer() {
  pauseTimer();
  currentSecondsLeft = initialSeconds;
  renderTime(currentSecondsLeft);
  updateRing(currentSecondsLeft, initialSeconds);
  startBtn.disabled = false;
}

function handleTimerComplete() {
  clearInterval(activeTimerId);
  activeTimerId = null;
  alertSound.play().catch(() => {});
  pauseBtn.disabled = true;
  resetBtn.disabled = true;
  const task = tasks.find((t) => t.id === activeTaskId);
  if (!task) return;

  if (currentMode === "focus") {
    task.completedSessions++;
    saveTasks();
    renderTasks();
    if (task.completedSessions >= task.totalSessions) {
      showModal(
        "🎉",
        "All done!",
        `You crushed all ${task.totalSessions} rounds of "${task.name}". Excellent work.`,
        "Finish",
        () => {
          taskLabel.innerHTML = `<strong>${task.name}</strong> — complete`;
          sessionSub.textContent = "All rounds done";
          startBtn.disabled = true;
        },
      );
    } else {
      showModal(
        "☕",
        "Focus complete!",
        `Round ${task.completedSessions} done. Time for a ${task.breakMinutes}-min break.`,
        "Start Break",
        () => {
          currentMode = "break";
          initialSeconds = task.breakMinutes * 60;
          currentSecondsLeft = initialSeconds;
          updateLabels();
          renderTime(currentSecondsLeft);
          updateRing(currentSecondsLeft, initialSeconds);
          resetBtn.disabled = false;
          startTimer();
        },
      );
    }
  } else {
    showModal(
      "💪",
      "Break over",
      `Ready for round ${task.completedSessions + 1} of "${task.name}"?`,
      "Start Focus",
      () => {
        currentMode = "focus";
        initialSeconds = task.durationMinutes * 60;
        currentSecondsLeft = initialSeconds;
        updateLabels();
        renderTime(currentSecondsLeft);
        updateRing(currentSecondsLeft, initialSeconds);
        resetBtn.disabled = false;
        startTimer();
      },
    );
  }
}

// --- KEYBOARD ---
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || modalOverlay.classList.contains("show"))
    return;
  if (e.code === "Space") {
    e.preventDefault();
    activeTimerId ? pauseTimer() : !startBtn.disabled && startTimer();
  }
  if (e.code === "Escape" && !resetBtn.disabled) resetTimer();
});

// --- INIT ---
async function init() {
  try {
    await initDB();
    loadTasksFromDB();
  } catch (e) {
    tasks = [];
    renderTasks();
  }
}
init();
