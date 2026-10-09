const themeButton = document.getElementById("themeButton");
const ideaForm = document.getElementById("ideaForm");
const ideaInput = document.getElementById("ideaInput");
const result = document.getElementById("result");
const savedIdeas = document.getElementById("savedIdeas");
const clearButton = document.getElementById("clearButton");
const checkBackendButton = document.getElementById("checkBackendButton");
const connectionStatus = document.getElementById("connectionStatus");
const chatMode = document.getElementById("chatMode");
const exportIdeasButton = document.getElementById("exportIdeasButton");
const clearChatButton = document.getElementById("clearChatButton");
const chatCounter = document.getElementById("chatCounter");

const STORAGE_KEY = "nexaAiStudioIdeas";
const THEME_KEY = "nexaAiStudioTheme";
const CHAT_KEY = "nexaAiStudioChat";
const MAX_CHAT_MESSAGES = 50;
// Deployed Flask backend. Keep this URL in sync with your Render service.
const API_BASE_URL = "https://nexa-ai-studio-api.onrender.com";

function safeReadJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

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
  if (exportIdeasButton) exportIdeasButton.hidden = ideas.length === 0;

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

function setAlternateGlow(enabled) {
  document.body.classList.toggle("alternate-glow", enabled);
  themeButton.textContent = enabled ? "Light mode" : "Dark mode";
  themeButton.setAttribute("aria-pressed", String(enabled));
  try { localStorage.setItem(THEME_KEY, enabled ? "alternate" : "blue"); } catch { /* Theme still works for this page view. */ }
}

try {
  setAlternateGlow(localStorage.getItem(THEME_KEY) === "alternate");
} catch {
  themeButton.setAttribute("aria-pressed", "false");
}

themeButton.addEventListener("click", () => {
  setAlternateGlow(!document.body.classList.contains("alternate-glow"));
});

if (exportIdeasButton) {
  exportIdeasButton.addEventListener("click", () => {
    const ideas = readIdeas();
    if (!ideas.length) return;
    const contents = "Nexa AI Studio — Saved Ideas\n\n" + ideas.map((idea, index) => `${index + 1}. ${idea}`).join("\n");
    const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "nexa-saved-ideas.txt";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  });
}

function makeLocalIdeaPlan(idea) {
  return `Your starter plan for: “${idea}”\n\n` +
    `1. Problem: Write the main problem this project solves.\n` +
    `2. Audience: Describe the people who would use it.\n` +
    `3. First version: Choose three essential features, not every possible feature.\n` +
    `4. Validation: Show a simple demo to a few potential users and collect feedback.\n` +
    `5. Next steps: Improve the most important issue, estimate costs, and decide how to sustain the project.\n\n` +
    `Local starter plan — live AI was unavailable for this request.`;
}

async function generateIdeaPlan(idea) {
  const base = API_BASE_URL.trim().replace(/\/$/, "");
  if (!base) return makeLocalIdeaPlan(idea);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    let response;
    try {
      response = await fetch(`${base}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Create a practical starter plan for this project idea: "${idea}". Use clear headings for the problem, target users, core features for a first version, steps to build and test it, likely costs or resources, and a realistic way to sustain it. Keep the advice beginner-friendly and specific. If the idea is unclear, state your assumptions.`
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("The AI returned an empty plan.");
    }
    if (chatMode) chatMode.textContent = "Live AI backend connected";
    return `AI-generated plan for: “${idea}”\n\n${data.reply.trim()}`;
  } catch (error) {
    if (connectionStatus) {
      connectionStatus.textContent = error.name === "AbortError"
        ? "The idea planner timed out. Showing a local starter plan instead."
        : "Live AI is unavailable for the idea planner. Showing a local starter plan instead.";
      connectionStatus.dataset.state = "warning";
    }
    return makeLocalIdeaPlan(idea);
  }
}

ideaForm.addEventListener("submit", async event => {
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

  const submitButton = ideaForm.querySelector('button[type="submit"]');
  const originalSubmitText = submitButton ? submitButton.textContent : "";
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Creating plan...";
  }
  result.textContent = "Nexa is preparing your project plan...";
  result.setAttribute("aria-busy", "true");

  try {
    result.textContent = await generateIdeaPlan(idea);
  } finally {
    result.setAttribute("aria-busy", "false");
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalSubmitText;
    }
    renderIdeas();
  }
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

let chatHistory = [];
function saveChatHistory() {
  try { localStorage.setItem(CHAT_KEY, JSON.stringify(chatHistory.slice(-MAX_CHAT_MESSAGES))); } catch { /* Chat remains usable when storage is unavailable. */ }
}

function addChatMessage(message, role, persist = true) {
  const bubble = document.createElement("div");
  bubble.className = `chat-message ${role === "user" ? "user-message" : "assistant-message"}`;
  bubble.textContent = message;
  chatMessages.append(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  if (persist) {
    chatHistory.push({ message, role });
    chatHistory = chatHistory.slice(-MAX_CHAT_MESSAGES);
    saveChatHistory();
  }
}

function restoreChatHistory() {
  const stored = safeReadJSON(CHAT_KEY, []);
  if (!Array.isArray(stored)) return;
  chatHistory = stored.filter(item =>
    item && typeof item.message === "string" &&
    (item.role === "user" || item.role === "assistant")
  ).slice(-MAX_CHAT_MESSAGES);
  if (!chatHistory.length) return;
  chatMessages.replaceChildren();
  chatHistory.forEach(item => addChatMessage(item.message, item.role, false));
}

restoreChatHistory();

if (clearChatButton) {
  clearChatButton.addEventListener("click", () => {
    chatHistory = [];
    try { localStorage.removeItem(CHAT_KEY); } catch { /* The visible conversation can still be cleared. */ }
    chatMessages.replaceChildren();
    addChatMessage("Conversation cleared. Tell me what you want to build next.", "assistant");
    if (chatCounter) updateChatCounter();
  });
}

function updateChatCounter() {
  if (!chatCounter || !chatInput) return;
  const length = chatInput.value.length;
  chatCounter.textContent = `${length.toLocaleString()} / 2,000 characters`;
  chatCounter.classList.toggle("near-limit", length >= 1600 && length < 2000);
  chatCounter.classList.toggle("at-limit", length >= 2000);
}
if (chatInput) {
  chatInput.addEventListener("input", updateChatCounter);
  updateChatCounter();
}

async function getAssistantReply(message) {
  if (API_BASE_URL.trim()) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      let response;
      try {
        response = await fetch(`${API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
      if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("The AI returned an empty reply.");
      return data.reply.trim();
    } catch (error) {
      if (error.name === "AbortError") return "The AI request took too long. Please try again in a moment.";

      // If the backend is online but has no provider key yet, keep the chat useful
      // with a clearly labelled local response instead of showing a raw server error.
      if (error.message.includes("AI backend is not configured yet")) {
        if (chatMode) chatMode.textContent = "Local demo · AI setup needed";
        if (connectionStatus) {
          connectionStatus.textContent = "Backend is online, but live AI is not configured. Showing a local demo reply for now.";
          connectionStatus.dataset.state = "warning";
        }
        return makeLocalReply(message) + "\n\nLive AI is not configured yet, so this reply comes from Nexa's local demo.";
      }

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
  updateChatCounter();
  const pending = document.createElement("div");
  pending.className = "chat-message assistant-message";
  pending.textContent = API_BASE_URL.trim() ? "Thinking..." : "Preparing a local demo response...";
  chatMessages.append(pending);
  chatMessages.setAttribute("aria-busy", "true");
  chatMessages.scrollTop = chatMessages.scrollHeight;
  chatInput.disabled = true;
  chatForm.querySelector("button[type=submit]").disabled = true;
  getAssistantReply(message).then(reply => {
    pending.textContent = reply;
    chatHistory.push({ message: reply, role: "assistant" });
    chatHistory = chatHistory.slice(-MAX_CHAT_MESSAGES);
    saveChatHistory();
  }).catch(() => {
    pending.textContent = "Something went wrong. Please try again.";
    chatHistory.push({ message: pending.textContent, role: "assistant" });
    chatHistory = chatHistory.slice(-MAX_CHAT_MESSAGES);
    saveChatHistory();
  }).finally(() => {
    chatMessages.setAttribute("aria-busy", "false");
    chatInput.disabled = false;
    chatForm.querySelector("button[type=submit]").disabled = false;
    chatInput.focus();
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
});

document.querySelectorAll("[data-prompt]").forEach(button => {
  button.addEventListener("click", () => {
    chatInput.value = button.dataset.prompt || "";
    updateChatCounter();
    chatInput.focus();
  });
});

if (checkBackendButton && connectionStatus) {
  checkBackendButton.addEventListener("click", async () => {
    if (!API_BASE_URL.trim()) {
      connectionStatus.textContent = "Backend not connected: deploy the Flask API, then set API_BASE_URL near the top of script.js.";
      connectionStatus.dataset.state = "warning";
      return;
    }

    checkBackendButton.disabled = true;
    checkBackendButton.textContent = "Checking...";
    connectionStatus.textContent = "Checking the backend health endpoint...";
    connectionStatus.dataset.state = "checking";
    try {
      const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      let response;
      try {
        response = await fetch(`${base}/api/health`, { method: "GET", signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.status !== "ok") {
        throw new Error(data.error || `Health check failed (${response.status})`);
      }
      connectionStatus.textContent = data.ai_configured
        ? `Backend is online. AI is configured with model: ${data.model || "configured model"}.`
        : "Backend is online, but OPENAI_API_KEY is not configured in the hosting service.";
      connectionStatus.dataset.state = data.ai_configured ? "success" : "warning";
      chatMode.textContent = data.ai_configured ? "Live AI backend connected" : "Backend online · AI setup needed";
    } catch (error) {
      const reason = error.name === "AbortError" ? "The health check timed out" : error.message;
      connectionStatus.textContent = `Could not reach the backend: ${reason}. Check the service URL and CORS_ORIGINS.`;
      connectionStatus.dataset.state = "error";
    } finally {
      checkBackendButton.disabled = false;
      checkBackendButton.textContent = "Check connection";
    }
  });
}
