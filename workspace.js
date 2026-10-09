const workspaceCard = document.getElementById("workspaceCard");
const workspaceTitle = document.getElementById("workspaceTitle");
const workspaceProgress = document.getElementById("workspaceProgress");
const workspaceProgressBar = document.getElementById("workspaceProgressBar");
const workspaceTasks = document.getElementById("workspaceTasks");
const workspacePlanPreview = document.getElementById("workspacePlanPreview");
const workspaceIdea = document.getElementById("workspaceIdea");
const workspaceName = document.getElementById("workspaceName");
const workspaceStatus = document.getElementById("workspaceStatus");
const workspaceNotes = document.getElementById("workspaceNotes");
const workspaceKey = "nexaAiStudioWorkspace";

const defaultTasks = [
  "Define the problem and target users",
  "Choose the three most important first-version features",
  "Build a small working prototype",
  "Test the prototype with a few users",
  "Improve the biggest issue and prepare the next release"
];

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
        tasks: stored.tasks.map(task => ({ text: String(task.text || ""), done: Boolean(task.done) })).filter(task => task.text)
      };
    }
  } catch { /* Use a fresh workspace when storage is unavailable. */ }
  return {
    idea,
    name: idea,
    status: "planning",
    notes: "",
    tasks: defaultTasks.map(text => ({ text, done: false }))
  };
}

function saveWorkspace(workspace) {
  try {
    localStorage.setItem(workspaceStorageKey(workspace.idea), JSON.stringify(workspace));
  } catch { /* Workspace still works for this page view. */ }
}

function renderWorkspace(workspace, plan) {
  if (!workspaceCard || !workspaceTasks) return;
  workspaceCard.hidden = false;
  workspaceIdea.textContent = workspace.idea;
  workspaceTitle.textContent = "Project Workspace";
  if (workspaceName) workspaceName.value = workspace.name || workspace.idea;
  if (workspaceStatus) workspaceStatus.value = workspace.status || "planning";
  if (workspaceNotes) workspaceNotes.value = workspace.notes || "";
  workspaceTasks.replaceChildren();

  workspace.tasks.forEach((task, index) => {
    const row = document.createElement("label");
    row.className = "workspace-task";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(task.done);
    checkbox.addEventListener("change", () => {
      workspace.tasks[index].done = checkbox.checked;
      saveWorkspace(workspace);
      renderWorkspace(workspace, plan);
    });
    const text = document.createElement("span");
    text.textContent = task.text;
    if (task.done) text.className = "workspace-task-done";
    row.append(checkbox, text);
    workspaceTasks.append(row);
  });

  const completed = workspace.tasks.filter(task => task.done).length;
  const percent = workspace.tasks.length ? Math.round((completed / workspace.tasks.length) * 100) : 0;
  workspaceProgress.textContent = `${completed}/${workspace.tasks.length} tasks complete · ${percent}%`;
  workspaceProgressBar.value = percent;
  workspacePlanPreview.textContent = plan || "Generate a project plan to see it here.";
}

function createWorkspaceFromPlan() {
  const ideaInput = document.getElementById("ideaInput");
  const result = document.getElementById("result");
  const idea = ideaInput?.value.trim();
  const plan = result?.textContent.trim();
  if (!idea || !plan || plan === "Your next project begins with an idea." || plan.includes("preparing your project plan")) return;

  const workspace = readWorkspace(idea);
  saveWorkspace(workspace);
  renderWorkspace(workspace, plan);
  document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const createWorkspaceButton = document.getElementById("createWorkspaceButton");
if (createWorkspaceButton) createWorkspaceButton.addEventListener("click", createWorkspaceFromPlan);

if (workspaceName) {
  workspaceName.addEventListener("input", () => {
    const idea = document.getElementById("ideaInput")?.value.trim();
    if (!idea) return;
    const workspace = readWorkspace(idea);
    workspace.name = workspaceName.value.trim() || idea;
    saveWorkspace(workspace);
  });
}

if (workspaceStatus) {
  workspaceStatus.addEventListener("change", () => {
    const idea = document.getElementById("ideaInput")?.value.trim();
    if (!idea) return;
    const workspace = readWorkspace(idea);
    workspace.status = workspaceStatus.value;
    saveWorkspace(workspace);
  });
}

if (workspaceNotes) {
  workspaceNotes.addEventListener("input", () => {
    const idea = document.getElementById("ideaInput")?.value.trim();
    if (!idea) return;
    const workspace = readWorkspace(idea);
    workspace.notes = workspaceNotes.value;
    saveWorkspace(workspace);
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
    }, 50);
  });
}
