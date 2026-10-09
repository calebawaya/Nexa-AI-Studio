const workspaceCard = document.getElementById("workspaceCard");
const savedWorkspacesList = document.getElementById("savedWorkspacesList");
const savedWorkspaceSearch = document.getElementById("savedWorkspaceSearch");
const workspaceTitle = document.getElementById("workspaceTitle");
const workspaceProgress = document.getElementById("workspaceProgress");
const workspaceProgressBar = document.getElementById("workspaceProgressBar");
const workspaceTasks = document.getElementById("workspaceTasks");
const workspacePlanPreview = document.getElementById("workspacePlanPreview");
const workspaceIdea = document.getElementById("workspaceIdea");
const workspaceName = document.getElementById("workspaceName");
const workspaceStatus = document.getElementById("workspaceStatus");
const workspaceNotes = document.getElementById("workspaceNotes");
const customTaskForm = document.getElementById("customTaskForm");
const customTaskInput = document.getElementById("customTaskInput");
const exportWorkspaceButton = document.getElementById("exportWorkspaceButton");
const importWorkspaceButton = document.getElementById("importWorkspaceButton");
const importWorkspaceInput = document.getElementById("importWorkspaceInput");
const workspaceKey = "nexaAiStudioWorkspace";

const defaultTasks = [
  "Define the problem and target users",
  "Choose the three most important first-version features",
  "Build a small working prototype",
  "Test the prototype with a few users",
  "Improve the biggest issue and prepare the next release"
];

let activeWorkspace = null;
let activePlan = "";

function workspaceStorageKey(idea) {
  return `${workspaceKey}:${idea}`;
}

function readWorkspace(idea) {
  try {
    const stored = JSON.parse(localStorage.getItem(workspaceStorageKey(idea)) || "null");
    if (stored && Array.isArray(stored.tasks)) {
      return {
        idea,
        name: typeof stored.name === "string" ? stored.name : idea,
        status: ["planning", "building", "testing", "ready"].includes(stored.status) ? stored.status : "planning",
        notes: typeof stored.notes === "string" ? stored.notes : "",
        plan: typeof stored.plan === "string" ? stored.plan.slice(0, 20000) : "",
        tasks: stored.tasks.map(task => ({ text: String(task.text || ""), done: Boolean(task.done) })).filter(task => task.text).slice(0, 100)
      };
    }
  } catch { /* Use a fresh workspace when storage is unavailable. */ }
  return {
    idea,
    name: idea,
    status: "planning",
    notes: "",
    plan: "",
    tasks: defaultTasks.map(text => ({ text, done: false }))
  };
}

function listSavedWorkspaces() {
  if (!savedWorkspacesList) return;
  savedWorkspacesList.replaceChildren();
  const entries = [];
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !key.startsWith(`${workspaceKey}:`)) continue;
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "null");
        if (saved && typeof saved.idea === "string" && saved.idea.trim() && Array.isArray(saved.tasks)) {
          entries.push({ key, idea: saved.idea, name: typeof saved.name === "string" && saved.name.trim() ? saved.name : saved.idea, status: saved.status || "planning" });
        }
      } catch { /* Ignore malformed entries and keep listing other workspaces. */ }
    }
  } catch { /* Browser storage may be disabled. */ }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "saved-workspaces-empty";
    empty.textContent = "No saved workspaces yet. Create a project workspace to get started.";
    savedWorkspacesList.append(empty);
    return;
  }

  const query = savedWorkspaceSearch?.value.trim().toLocaleLowerCase() || "";
  const visibleEntries = entries.filter(entry =>
    (entry.name + " " + entry.idea + " " + entry.status).toLocaleLowerCase().includes(query)
  );
  if (!visibleEntries.length) {
    const empty = document.createElement("p");
    empty.className = "saved-workspaces-empty";
    empty.textContent = "No saved workspaces match your search.";
    savedWorkspacesList.append(empty);
    return;
  }

  visibleEntries.forEach(entry => {
    const row = document.createElement("div");
    row.className = "saved-workspace-row";
    const details = document.createElement("div");
    details.className = "saved-workspace-details";
    const name = document.createElement("strong");
    name.textContent = entry.name;
    const idea = document.createElement("span");
    idea.textContent = entry.idea;
    const status = document.createElement("small");
    status.textContent = `Status: ${entry.status}`;
    details.append(name, idea, status);
    const open = document.createElement("button");
    open.type = "button";
    open.className = "clear-button";
    open.textContent = "Open";
    open.addEventListener("click", () => {
      const workspace = readWorkspace(entry.idea);
      renderWorkspace(workspace, workspace.plan || "");
      showWorkspaceNotice("Saved workspace opened.");
      document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    const duplicate = document.createElement("button");
    duplicate.type = "button";
    duplicate.className = "saved-workspace-duplicate";
    duplicate.textContent = "Duplicate";
    duplicate.setAttribute("aria-label", `Duplicate saved workspace: ${entry.name}`);
    duplicate.addEventListener("click", () => {
      const original = readWorkspace(entry.idea);
      let copyIdea = `${entry.idea} (copy)`;
      let copyNumber = 2;
      while (localStorage.getItem(workspaceStorageKey(copyIdea)) !== null && copyNumber < 1000) {
        copyIdea = `${entry.idea} (copy ${copyNumber})`;
        copyNumber += 1;
      }
      if (localStorage.getItem(workspaceStorageKey(copyIdea)) !== null) {
        showWorkspaceNotice("Could not create another copy. Rename or remove an existing copy first.");
        return;
      }
      const copy = {
        ...original,
        idea: copyIdea,
        name: `${entry.name} (copy)`.slice(0, 80),
        tasks: original.tasks.map(task => ({ ...task }))
      };
      if (!saveWorkspace(copy)) {
        showWorkspaceNotice("Could not duplicate this workspace. Browser storage may be full.");
        return;
      }
      renderWorkspace(copy, copy.plan || "");
      showWorkspaceNotice("Workspace duplicated. You are now editing the copy.");
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "saved-workspace-delete";
    remove.textContent = "Delete";
    remove.setAttribute("aria-label", `Delete saved workspace: ${entry.name}`);
    remove.addEventListener("click", () => {
      if (!window.confirm(`Delete the saved workspace "${entry.name}"? This cannot be undone.`)) return;
      try {
        localStorage.removeItem(entry.key);
        if (activeWorkspace && activeWorkspace.idea === entry.idea) {
          activeWorkspace = null;
          activePlan = "";
          if (workspaceCard) workspaceCard.hidden = true;
        }
        listSavedWorkspaces();
      } catch {
        showWorkspaceNotice("Could not delete this workspace from browser storage.");
      }
    });
    row.append(details, open, duplicate, remove);
    savedWorkspacesList.append(row);
  });
}

function saveWorkspace(workspace) {
  try {
    localStorage.setItem(workspaceStorageKey(workspace.idea), JSON.stringify(workspace));
    listSavedWorkspaces();
    return true;
  } catch {
    return false;
  }
}

function downloadTextFile(filename, contents, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function renderWorkspace(workspace, plan = workspace.plan || activePlan) {
  if (!workspaceCard || !workspaceTasks) return;
  activeWorkspace = workspace;
  activePlan = typeof plan === "string" ? plan : "";
  workspace.plan = activePlan;
  workspaceCard.hidden = false;
  workspaceIdea.textContent = workspace.idea;
  workspaceTitle.textContent = "Project Workspace";
  if (workspaceName && document.activeElement !== workspaceName) workspaceName.value = workspace.name || workspace.idea;
  if (workspaceStatus) workspaceStatus.value = workspace.status || "planning";
  if (workspaceNotes && document.activeElement !== workspaceNotes) workspaceNotes.value = workspace.notes || "";
  workspaceTasks.replaceChildren();

  workspace.tasks.forEach((task, index) => {
    const row = document.createElement("div");
    row.className = "workspace-task";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(task.done);
    checkbox.setAttribute("aria-label", `Mark task complete: ${task.text}`);
    checkbox.addEventListener("change", () => {
      workspace.tasks[index].done = checkbox.checked;
      if (!saveWorkspace(workspace)) showWorkspaceNotice("Browser storage is full. Export your workspace to keep a backup.");
      renderWorkspace(workspace, activePlan);
    });

    const text = document.createElement("span");
    text.className = task.done ? "workspace-task-done" : "";
    text.textContent = task.text;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "workspace-remove-task";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove task: ${task.text}`);
    remove.addEventListener("click", () => {
      workspace.tasks.splice(index, 1);
      saveWorkspace(workspace);
      renderWorkspace(workspace, activePlan);
    });

    row.append(checkbox, text, remove);
    workspaceTasks.append(row);
  });

  const completed = workspace.tasks.filter(task => task.done).length;
  const percent = workspace.tasks.length ? Math.round((completed / workspace.tasks.length) * 100) : 0;
  workspaceProgress.textContent = `${completed}/${workspace.tasks.length} tasks complete · ${percent}%`;
  workspaceProgressBar.value = percent;
  workspaceProgressBar.setAttribute("aria-label", `${percent}% of project tasks completed`);
  workspacePlanPreview.textContent = activePlan || "Generate a project plan to see it here.";
}

function showWorkspaceNotice(message) {
  let notice = document.getElementById("workspaceNotice");
  if (!notice) {
    notice = document.createElement("p");
    notice.id = "workspaceNotice";
    notice.className = "workspace-notice";
    notice.setAttribute("role", "status");
    workspaceCard?.prepend(notice);
  }
  notice.textContent = message;
}

function createWorkspaceFromPlan() {
  const ideaInput = document.getElementById("ideaInput");
  const result = document.getElementById("result");
  const idea = ideaInput?.value.trim();
  const plan = result?.textContent.trim();
  if (!idea || !plan || plan === "Your next project begins with an idea." || plan.includes("preparing your project plan")) {
    const result = document.getElementById("result");
    if (result) result.textContent = "Enter an idea and generate a plan before opening its workspace.";
    return;
  }

  const workspace = readWorkspace(idea);
  renderWorkspace(workspace, plan);
  listSavedWorkspaces();
  if (!saveWorkspace(workspace)) showWorkspaceNotice("Workspace opened, but your browser could not save it. Export a backup.");
  document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

listSavedWorkspaces();
if (savedWorkspaceSearch) savedWorkspaceSearch.addEventListener("input", listSavedWorkspaces);

const createWorkspaceButton = document.getElementById("createWorkspaceButton");
if (createWorkspaceButton) createWorkspaceButton.addEventListener("click", createWorkspaceFromPlan);

if (workspaceName) {
  workspaceName.addEventListener("input", () => {
    if (!activeWorkspace) return;
    activeWorkspace.name = workspaceName.value.trim() || activeWorkspace.idea;
    saveWorkspace(activeWorkspace);
  });
}

if (workspaceStatus) {
  workspaceStatus.addEventListener("change", () => {
    if (!activeWorkspace) return;
    activeWorkspace.status = workspaceStatus.value;
    saveWorkspace(activeWorkspace);
  });
}

if (workspaceNotes) {
  workspaceNotes.addEventListener("input", () => {
    if (!activeWorkspace) return;
    activeWorkspace.notes = workspaceNotes.value;
    saveWorkspace(activeWorkspace);
  });
}

if (customTaskForm && customTaskInput) {
  customTaskForm.addEventListener("submit", event => {
    event.preventDefault();
    if (!activeWorkspace) return;
    const text = customTaskInput.value.trim();
    if (!text) return;
    if (activeWorkspace.tasks.length >= 100) {
      showWorkspaceNotice("This workspace has reached the 100-task limit.");
      return;
    }
    activeWorkspace.tasks.push({ text, done: false });
    if (!saveWorkspace(activeWorkspace)) showWorkspaceNotice("Task added for this session, but browser storage could not save it.");
    renderWorkspace(activeWorkspace, activePlan);
    customTaskInput.value = "";
    customTaskInput.focus();
  });
}

if (exportWorkspaceButton) {
  exportWorkspaceButton.addEventListener("click", () => {
    if (!activeWorkspace) return;
    const backup = {
      app: "Nexa AI Studio",
      exportedAt: new Date().toISOString(),
      project: activeWorkspace,
      plan: activePlan
    };
    const safeName = (activeWorkspace.name || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "project";
    downloadTextFile(`nexa-workspace-${safeName}.json`, JSON.stringify(backup, null, 2), "application/json;charset=utf-8");
    showWorkspaceNotice("Workspace backup exported as JSON.");
  });
}


if (importWorkspaceButton && importWorkspaceInput) {
  importWorkspaceButton.addEventListener("click", () => {
    importWorkspaceInput.value = "";
    importWorkspaceInput.click();
  });

  importWorkspaceInput.addEventListener("change", async () => {
    const file = importWorkspaceInput.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showWorkspaceNotice("Backup is too large. Choose a JSON file smaller than 1 MB.");
      return;
    }
    try {
      const backup = JSON.parse(await file.text());
      const project = backup?.project;
      if (
        backup?.app !== "Nexa AI Studio" ||
        !project ||
        typeof project.idea !== "string" ||
        !project.idea.trim() ||
        !Array.isArray(project.tasks) ||
        project.tasks.length > 100 ||
        !project.tasks.every(task => task && typeof task.text === "string" && task.text.trim() && typeof task.done === "boolean")
      ) {
        throw new Error("invalid backup");
      }
      const restored = {
        idea: project.idea.trim(),
        name: typeof project.name === "string" && project.name.trim() ? project.name.trim().slice(0, 80) : project.idea.trim(),
        status: ["planning", "building", "testing", "ready"].includes(project.status) ? project.status : "planning",
        notes: typeof project.notes === "string" ? project.notes.slice(0, 2000) : "",
        plan: typeof backup.plan === "string" ? backup.plan.slice(0, 20000) : "",
        tasks: project.tasks.map(task => ({ text: task.text.trim().slice(0, 120), done: task.done })).filter(task => task.text)
      };
      const plan = restored.plan;
      if (!saveWorkspace(restored)) {
        showWorkspaceNotice("Could not save the imported workspace in this browser. Check available storage and try again.");
        return;
      }
      renderWorkspace(restored, plan);
      showWorkspaceNotice("Workspace backup imported successfully.");
      document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      showWorkspaceNotice("That file is not a valid Nexa AI Studio workspace backup. Choose a JSON backup exported from Nexa.");
    }
  });
}

const ideaForm = document.getElementById("ideaForm");
const result = document.getElementById("result");
if (ideaForm && result) {
  ideaForm.addEventListener("submit", () => {
    setTimeout(() => {
      const idea = document.getElementById("ideaInput")?.value.trim();
      if (!idea || result.textContent.includes("preparing your project plan")) return;
      const workspace = readWorkspace(idea);
      renderWorkspace(workspace, result.textContent.trim());
    }, 100);
  });
}
