const themeButton = document.getElementById("themeButton");
const ideaForm = document.getElementById("ideaForm");
const ideaInput = document.getElementById("ideaInput");
const result = document.getElementById("result");
const savedIdeas = document.getElementById("savedIdeas");
const clearButton = document.getElementById("clearButton");

const STORAGE_KEY = "nexaAiStudioIdeas";

function readIdeas() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(stored) ? stored.filter(item => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function saveIdeas(ideas) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
    return true;
  } catch {
    result.textContent = "Your browser could not save this idea. Check your browser storage settings.";
    return false;
  }
}

function renderIdeas() {
  const ideas = readIdeas();
  savedIdeas.replaceChildren();
  clearButton.hidden = ideas.length === 0;

  ideas.forEach((idea, index) => {
    const row = document.createElement("div");
    row.className = "saved-idea";

    const text = document.createElement("span");
    text.textContent = idea;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove idea: ${idea}`);
    remove.addEventListener("click", () => {
      const updated = readIdeas();
      updated.splice(index, 1);
      if (saveIdeas(updated)) renderIdeas();
    });

    row.append(text, remove);
    savedIdeas.append(row);
  });
}

themeButton.addEventListener("click", () => {
  const enabled = document.body.classList.toggle("alternate-glow");
  themeButton.textContent = enabled ? "Blue glow" : "Change glow";
});

ideaForm.addEventListener("submit", event => {
  event.preventDefault();
  const idea = ideaInput.value.trim();

  if (!idea) {
    result.textContent = "Please enter an idea first.";
    ideaInput.focus();
    return;
  }

  const ideas = readIdeas();
  if (!ideas.includes(idea)) {
    ideas.unshift(idea);
    if (ideas.length > 10) ideas.length = 10;
    if (!saveIdeas(ideas)) return;
  }

  result.textContent =
    `Your starter plan for: “${idea}”\n\n` +
    `1. Define the main problem your project will solve.\n` +
    `2. Identify who will use it and what they need.\n` +
    `3. Sketch a simple first version with only essential features.\n` +
    `4. Build and test the first version with real users.\n` +
    `5. Improve it using feedback and decide how it could be sustained.\n\n` +
    `This is a starter plan, not a live AI response. An AI backend can be connected in a later step.`;

  renderIdeas();
});

clearButton.addEventListener("click", () => {
  if (confirm("Clear all saved Nexa ideas from this browser?")) {
    try {
      localStorage.removeItem(STORAGE_KEY);
      result.textContent = "Saved ideas cleared.";
      renderIdeas();
    } catch {
      result.textContent = "Your browser did not allow saved ideas to be cleared.";
    }
  }
});

renderIdeas();