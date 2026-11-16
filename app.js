let config = null;

// DOM Elements
const taskForm = document.getElementById("task-form");
const taskTitleInput = document.getElementById("task-title");
const taskDescInput = document.getElementById("task-description");
const taskSubmitBtn = document.getElementById("task-submit");
const cancelEditBtn = document.getElementById("cancel-edit");
const editTaskIdInput = document.getElementById("edit-task-id");
const taskList = document.getElementById("task-list");
const statusMessage = document.getElementById("status-message");

// Helper to show status/error notifications
function showStatus(message, isError = false) {
  if (!statusMessage) return;
  statusMessage.textContent = message;
  statusMessage.className = "status-msg " + (isError ? "error" : "success");
  if (!isError) {
    setTimeout(() => {
      if (statusMessage.textContent === message) {
        statusMessage.textContent = "";
        statusMessage.className = "status-msg";
      }
    }, 4000);
  }
}

// Get API Headers for Supabase REST
function getHeaders() {
  return {
    "apikey": config.supabasePublishableKey,
    "Authorization": `Bearer ${config.supabasePublishableKey}`,
    "Content-Type": "application/json",
    "Prefer": "return=representation"
  };
}

// Load Supabase configuration from config.json
async function loadConfig() {
  try {
    const res = await fetch("config.json");
    if (!res.ok) throw new Error("Failed to load config.json");
    config = await res.json();
    if (!config.supabaseUrl || !config.supabasePublishableKey || !config.tableName) {
      throw new Error("Invalid config.json: check supabaseUrl, supabasePublishableKey, and tableName.");
    }
    await fetchTasks();
  } catch (err) {
    showStatus("Configuration error: " + err.message, true);
  }
}

// Fetch all tasks (GET /tasks?select=*)
async function fetchTasks() {
  try {
    const endpoint = `${config.supabaseUrl}/rest/v1/${config.tableName}?select=*&order=id.asc`;
    const res = await fetch(endpoint, {
      method: "GET",
      headers: getHeaders()
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch tasks: ${res.status} ${errText}`);
    }

    const tasks = await res.json();
    renderTasks(tasks);
  } catch (err) {
    showStatus(err.message, true);
  }
}

// Render tasks matching exact class and data-id specifications
function renderTasks(tasks) {
  taskList.innerHTML = "";

  if (tasks.length === 0) {
    taskList.innerHTML = "<p>No tasks found. Add a task above!</p>";
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement("div");
    item.className = "task-item" + (task.completed ? " completed" : "");
    item.setAttribute("data-id", task.id);

    const titleEl = document.createElement("h3");
    titleEl.className = "task-title";
    titleEl.textContent = task.title;

    const descEl = document.createElement("p");
    descEl.className = "task-description";
    descEl.textContent = task.description || "";

    const statusEl = document.createElement("span");
    statusEl.className = "task-status";
    statusEl.textContent = task.completed ? "Completed" : "Incomplete";

    const actions = document.createElement("div");
    actions.className = "task-actions";

    // Complete / Incomplete toggle button
    const toggleBtn = document.createElement("button");
    toggleBtn.className = "toggle-task";
    toggleBtn.textContent = task.completed ? "Mark Incomplete" : "Mark Complete";
    toggleBtn.addEventListener("click", () => toggleTaskStatus(task.id, !task.completed));

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.className = "edit-task";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEditTask(task));

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-task";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteTask(task.id));

    actions.appendChild(toggleBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(titleEl);
    item.appendChild(descEl);
    item.appendChild(statusEl);
    item.appendChild(actions);

    taskList.appendChild(item);
  });
}

// Handle Form Submission: Create or Update Task
taskForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = taskTitleInput.value.trim();
  const description = taskDescInput.value.trim();
  const editId = editTaskIdInput.value;

  if (!title) {
    showStatus("Task title is required", true);
    return;
  }

  try {
    if (editId) {
      // Update existing task (PATCH /tasks?id=eq.X)
      const endpoint = `${config.supabaseUrl}/rest/v1/${config.tableName}?id=eq.${editId}`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ title, description })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to update task: ${errText}`);
      }

      showStatus("Task updated successfully!");
      resetForm();
    } else {
      // Create new task (POST /tasks)
      const endpoint = `${config.supabaseUrl}/rest/v1/${config.tableName}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          title,
          description: description || null,
          completed: false
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to add task: ${errText}`);
      }

      showStatus("Task added successfully!");
      resetForm();
    }

    await fetchTasks();
  } catch (err) {
    showStatus(err.message, true);
  }
});

// Toggle Task Status
async function toggleTaskStatus(id, newStatus) {
  try {
    const endpoint = `${config.supabaseUrl}/rest/v1/${config.tableName}?id=eq.${id}`;
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ completed: newStatus })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to toggle status: ${errText}`);
    }

    showStatus("Task status updated!");
    await fetchTasks();
  } catch (err) {
    showStatus(err.message, true);
  }
}

// Delete Task (DELETE /tasks?id=eq.X)
async function deleteTask(id) {
  try {
    const endpoint = `${config.supabaseUrl}/rest/v1/${config.tableName}?id=eq.${id}`;
    const res = await fetch(endpoint, {
      method: "DELETE",
      headers: getHeaders()
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to delete task: ${errText}`);
    }

    showStatus("Task deleted!");
    await fetchTasks();
  } catch (err) {
    showStatus(err.message, true);
  }
}

// Start Edit Mode
function startEditTask(task) {
  editTaskIdInput.value = task.id;
  taskTitleInput.value = task.title;
  taskDescInput.value = task.description || "";
  taskSubmitBtn.textContent = "Save Changes";
  cancelEditBtn.style.display = "inline-block";
  taskTitleInput.focus();
}

// Cancel Edit Mode
cancelEditBtn.addEventListener("click", () => {
  resetForm();
});

function resetForm() {
  taskForm.reset();
  editTaskIdInput.value = "";
  taskSubmitBtn.textContent = "Add Task";
  cancelEditBtn.style.display = "none";
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", loadConfig);
