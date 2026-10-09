const themeButton = document.getElementById("themeButton");
const ideaForm = document.getElementById("ideaForm");
const ideaInput = document.getElementById("ideaInput");
const result = document.getElementById("result");
const savedIdeas = document.getElementById("savedIdeas");
const clearButton = document.getElementById("clearButton");

const STORAGE_KEY = "nexaAiStudioIdeas";
// After deploying the Flask backend, replace the empty string with its HTTPS base URL.
// Example: https://nexa-ai-studio-api.onrender.com
const API_BASE_URL = "";

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

// Browser-only assistant preview. Replace this reply function with a protected backend API
// when a real AI provider is connected; never put an API key in frontend code.
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");

function addChatMessage(message, role) {
  const bubble = document.createElement("div");
  bubble.className = `chat-message ${role === "user" ? "user-message" : "assistant-message"}`;
  bubble.textContent = message;
  chatMessages.append(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function getAssistantReply(message) {
  if (API_BASE_URL.trim()) {
    try {
      const response = await fetch(`${API_BASE_URL.replace(/\\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
      if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("The AI returned an empty reply.");
      return data.reply.trim();
    } catch (error) {
      return `I could not reach the live AI backend: ${error.message}. Check that the backend is deployed and API_BASE_URL is correct.`;
    }
  }
  return makeLocalReply(message);
}

function makeLocalReply(message) {
  const text = message.toLowerCase();
  if (text.includes("business") || text.includes("earn") || text.includes("paying") || text.includes("money")) {
    return "A practical starting point is a website that solves one clear problem for local businesses.\n\n1. Choose one audience, such as shops, food sellers, or tutors.\n2. Ask a few potential customers what they struggle with.\n3. Build one useful feature, such as a contact form or simple product catalogue.\n4. Show a demo and ask for feedback before charging.\n\nThis is planning guidance from the local demo, not live AI advice.";
  }
  if (text.includes("checklist") || text.includes("beginner") || text.includes("steps")) {
    return "Beginner website checklist:\n\n1. Write down the site's purpose and audience.\n2. Sketch the homepage on paper.\n3. Build semantic HTML sections.\n4. Style for phone and desktop with CSS.\n5. Add and test interactions with JavaScript.\n6. Check every link and form.\n7. Publish with GitHub Pages and test the live URL.";
  }
  if (text.includes("website") || text.includes("idea") || text.includes("build")) {
    return "Try this plan:\n\n1. Describe the problem your website solves in one sentence.\n2. Name the people who would use it.\n3. Start with a homepage, one core feature, and a contact method.\n4. Test it with two or three people.\n5. Improve it based on what they find confusing.\n\nTell me who the website is for, and I can help narrow the feature list.";
  }
  return "Let's break your idea into small steps. Describe who it is for and the main problem it should solve. Then we can outline the first page, the core feature, and how to test it.\n\nNote: this is a local demo response. A live AI model is not connected yet.";
}

chatForm.addEventListener("submit", event => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;
  addChatMessage(message, "user");
  chatInput.value = "";
  const pending = document.createElement("div");
  pending.className = "chat-message assistant-message";
  pending.textContent = API_BASE_URL.trim() ? "Thinking..." : "Preparing a local demo response...";
  chatMessages.append(pending);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  chatInput.disabled = true;
  chatForm.querySelector("button[type=submit]").disabled = true;
  getAssistantReply(message).then(reply => { pending.textContent = reply; }).catch(() => {
    pending.textContent = "Something went wrong. Please try again.";
  }).finally(() => {
    chatInput.disabled = false;
    chatForm.querySelector("button[type=submit]").disabled = false;
    chatInput.focus();
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
});

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    chatInput.value = button.dataset.prompt || "";
    chatInput.focus();
  });
});
