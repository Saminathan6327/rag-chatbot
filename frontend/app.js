/* =====================================================
   RAG Chatbot — app.js
   Backend: FastAPI at http://127.0.0.1:8000
   ===================================================== */

const API_BASE_URL = "http://127.0.0.1:8000";

// ── DOM References ─────────────────────────────────────
const dropZone          = document.getElementById("drop-zone");
const fileInput         = document.getElementById("file-input");
const progressContainer = document.getElementById("progress-container");
const uploadingFilename = document.getElementById("uploading-filename");
const progressPercent   = document.getElementById("progress-percent");
const progressBar       = document.getElementById("progress-bar");
const uploadedFilesList = document.getElementById("uploaded-files-list");
const filesListHeader   = document.getElementById("files-list-header");
const fileCountBadge    = document.getElementById("file-count-badge");

const chatForm          = document.getElementById("chat-form");
const userInput         = document.getElementById("user-input");
const messagesArea      = document.getElementById("messages-area");
const sendBtn           = document.getElementById("send-btn");
const clearChatBtn      = document.getElementById("clear-chat-btn");
const sidebarToggle     = document.getElementById("sidebar-toggle");
const sidebar           = document.getElementById("sidebar");
const statusDot         = document.getElementById("status-dot");
const statusLabel       = document.getElementById("status-label");
const toastContainer    = document.getElementById("toast-container");
const welcomeCard       = document.getElementById("welcome-card");
const charCounter       = document.getElementById("char-counter");

// ── State ──────────────────────────────────────────────
let fileCount  = 0;
let isWaiting  = false;
let sidebarOpen = true;

// ── Configure Marked.js ────────────────────────────────
if (typeof marked !== "undefined") {
    marked.setOptions({
        breaks: true,
        gfm:    true,
    });
}

function renderMarkdown(text) {
    if (typeof marked !== "undefined") {
        return marked.parse(text);
    }
    // Fallback: plain text with newlines
    return `<p>${text.replace(/\n/g, "<br>")}</p>`;
}

// ── API Status Check ───────────────────────────────────
async function checkAPIStatus() {
    try {
        const res = await fetch(`${API_BASE_URL}/`, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
            statusDot.className   = "status-dot online";
            statusLabel.textContent = "Backend Online";
        } else {
            throw new Error("Non-OK status");
        }
    } catch {
        statusDot.className   = "status-dot offline";
        statusLabel.textContent = "Backend Offline";
    }
}

checkAPIStatus();
// Recheck every 30 seconds
setInterval(checkAPIStatus, 30_000);

// ── Sidebar Toggle ─────────────────────────────────────
sidebarToggle.addEventListener("click", () => {
    sidebarOpen = !sidebarOpen;
    sidebar.classList.toggle("collapsed", !sidebarOpen);
});

// ── File Upload — Drag & Drop ──────────────────────────
dropZone.addEventListener("click",    () => fileInput.click());
dropZone.addEventListener("keydown",  (e) => { if (e.key === "Enter" || e.key === " ") fileInput.click(); });

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) handleFiles(fileInput.files);
    fileInput.value = ""; // reset so same file can be re-uploaded
});

async function handleFiles(files) {
    for (const file of files) {
        await uploadFile(file);
    }
}

// ── File Upload with XHR Progress ─────────────────────
function uploadFile(file) {
    return new Promise((resolve) => {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE_URL}/upload/`, true);

        // Show progress
        progressContainer.style.display = "block";
        uploadingFilename.textContent   = file.name;
        progressBar.style.width         = "0%";
        progressPercent.textContent     = "0%";

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width   = `${pct}%`;
                progressPercent.textContent = `${pct}%`;
            }
        };

        xhr.onload = () => {
            progressContainer.style.display = "none";

            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    addFileToUI(file.name, true);
                    appendSystemMessage(`"${file.name}" uploaded and indexed successfully.`);
                    showToast(`${file.name} indexed! ✓`, "success");
                } else {
                    addFileToUI(file.name, false, response.status);
                    appendSystemMessage(`Failed to process "${file.name}": ${response.status}`, true);
                    showToast(`Upload failed: ${response.status}`, "error");
                }
            } else {
                addFileToUI(file.name, false, "Server Error");
                appendSystemMessage(`Server error ${xhr.status} when uploading "${file.name}".`, true);
                showToast(`Server error ${xhr.status}`, "error");
            }
            resolve();
        };

        xhr.onerror = () => {
            progressContainer.style.display = "none";
            addFileToUI(file.name, false, "Connection Error");
            appendSystemMessage(`Network error while uploading "${file.name}".`, true);
            showToast("Network error — is the backend running?", "error");
            resolve();
        };

        xhr.send(formData);
    });
}

// ── File List UI ───────────────────────────────────────
function addFileToUI(name, success, errorText = "") {
    fileCount++;
    fileCountBadge.textContent = fileCount;
    filesListHeader.style.display = "flex";

    const item = document.createElement("div");
    item.className = "file-item";

    const icon = document.createElement("i");
    const isPDF = name.toLowerCase().endsWith(".pdf");
    icon.className = isPDF
        ? "fa-solid fa-file-pdf file-icon pdf"
        : "fa-solid fa-file-lines file-icon";

    const nameSpan = document.createElement("span");
    nameSpan.className   = "file-name";
    nameSpan.textContent = name;
    nameSpan.title       = name;

    const statusIcon = document.createElement("i");
    if (success) {
        statusIcon.className = "fa-solid fa-circle-check file-status-icon success";
    } else {
        statusIcon.className = "fa-solid fa-circle-xmark file-status-icon error";
        statusIcon.title     = errorText;
    }

    item.append(icon, nameSpan, statusIcon);
    uploadedFilesList.appendChild(item);

    // Scroll to the new item
    item.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// ── Chat Message Builders ──────────────────────────────
function getTimestamp() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function buildAvatar(isUser, isSystem = false) {
    const div = document.createElement("div");
    div.className = "message-avatar";
    if (isSystem) {
        div.innerHTML = `<i class="fa-solid fa-circle-info"></i>`;
        div.style.fontSize = "15px";
    } else if (isUser) {
        div.innerHTML = `<i class="fa-solid fa-user"></i>`;
    } else {
        div.innerHTML = `<i class="fa-solid fa-robot"></i>`;
    }
    return div;
}

function appendMessage(sender, text, isUser = false) {
    // Hide welcome card once user starts chatting
    if (welcomeCard) welcomeCard.style.display = "none";

    const msgDiv = document.createElement("div");
    msgDiv.className = isUser ? "message user-message" : "message bot-message";

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";

    if (isUser) {
        const p = document.createElement("p");
        p.textContent = text;  // user input: plain text
        contentDiv.appendChild(p);
    } else {
        contentDiv.innerHTML = renderMarkdown(text);  // bot: markdown
    }

    const timeDiv = document.createElement("div");
    timeDiv.className   = "message-time";
    timeDiv.textContent = getTimestamp();
    contentDiv.appendChild(timeDiv);

    const avatar = buildAvatar(isUser);

    if (isUser) {
        msgDiv.append(avatar, contentDiv);
    } else {
        msgDiv.append(avatar, contentDiv);
    }

    messagesArea.appendChild(msgDiv);
    smoothScrollToBottom();
}

function appendSystemMessage(text, isError = false) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "message system-message";

    const avatarDiv = document.createElement("div");
    avatarDiv.className = "message-avatar";
    avatarDiv.innerHTML = isError
        ? `<i class="fa-solid fa-circle-exclamation" style="color:var(--accent-red)"></i>`
        : `<i class="fa-solid fa-circle-info"></i>`;

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    if (isError) {
        contentDiv.style.borderColor = "rgba(248,113,113,0.2)";
        contentDiv.style.background  = "rgba(248,113,113,0.04)";
    }

    const p = document.createElement("p");
    p.textContent  = text;
    p.style.color  = isError ? "var(--accent-red)" : "var(--text-secondary)";
    p.style.fontStyle = "italic";
    p.style.fontSize  = "13px";
    contentDiv.appendChild(p);

    msgDiv.append(avatarDiv, contentDiv);
    messagesArea.appendChild(msgDiv);
    smoothScrollToBottom();
}

// ── Typing Indicator ───────────────────────────────────
function appendTypingIndicator() {
    const msgDiv = document.createElement("div");
    msgDiv.className = "message bot-message";
    msgDiv.id        = "typing-indicator-bubble";

    const avatar = buildAvatar(false);

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";

    const dots = document.createElement("div");
    dots.className = "typing-indicator";
    dots.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    contentDiv.appendChild(dots);

    msgDiv.append(avatar, contentDiv);
    messagesArea.appendChild(msgDiv);
    smoothScrollToBottom();
}

function removeTypingIndicator() {
    document.getElementById("typing-indicator-bubble")?.remove();
}

// ── Scroll helper ──────────────────────────────────────
function smoothScrollToBottom() {
    messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior: "smooth" });
}

// ── Auto-resize textarea ───────────────────────────────
userInput.addEventListener("input", () => {
    userInput.style.height = "auto";
    userInput.style.height = `${Math.min(userInput.scrollHeight, 160)}px`;

    const len = userInput.value.length;
    charCounter.textContent = len > 0 ? `${len}` : "";
});

// ── Submit on Enter (Shift+Enter = newline) ────────────
userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!isWaiting) chatForm.requestSubmit();
    }
});

// ── Chat Form Submit ───────────────────────────────────
chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = userInput.value.trim();
    if (!query || isWaiting) return;

    isWaiting = true;
    sendBtn.disabled = true;

    // Show user message
    appendMessage("You", query, true);

    // Clear input
    userInput.value        = "";
    userInput.style.height = "auto";
    charCounter.textContent = "";

    // Show typing indicator
    appendTypingIndicator();

    try {
        const response = await fetch(`${API_BASE_URL}/chat/`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ query }),
        });

        removeTypingIndicator();

        if (response.ok) {
            const data = await response.json();
            appendMessage("AI", data.response);
        } else {
            appendMessage("AI", `⚠️ Server responded with status **${response.status}**. Please check if the backend is running correctly.`);
        }
    } catch {
        removeTypingIndicator();
        appendMessage("AI", "⚠️ Could not reach the backend. Make sure `main.py` is running on port **8000**.");
        showToast("Backend unreachable — start main.py", "error");
    } finally {
        isWaiting        = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
});

// ── Clear Chat ─────────────────────────────────────────
clearChatBtn.addEventListener("click", () => {
    // Remove all messages
    messagesArea.innerHTML = "";
    // Restore welcome card
    const newCard = document.createElement("div");
    newCard.className = "welcome-card";
    newCard.id        = "welcome-card";
    newCard.innerHTML = `
        <div class="welcome-icon"><i class="fa-solid fa-robot"></i></div>
        <h3>Hello! I'm your RAG Assistant</h3>
        <p>I can answer questions about documents you've uploaded to the knowledge base. Try uploading a PDF or TXT file, then ask me anything!</p>
        <div class="suggestion-chips">
            <button class="chip" data-query="What topics are covered in the uploaded documents?">
                <i class="fa-solid fa-magnifying-glass"></i> Summarize documents
            </button>
            <button class="chip" data-query="Give me a brief overview of the knowledge base content.">
                <i class="fa-solid fa-list"></i> Knowledge overview
            </button>
            <button class="chip" data-query="What are the key takeaways from the uploaded files?">
                <i class="fa-solid fa-lightbulb"></i> Key takeaways
            </button>
        </div>
    `;
    messagesArea.appendChild(newCard);

    // Re-attach chip listeners
    attachChipListeners();
    showToast("Conversation cleared", "info");
});

// ── Suggestion Chips ───────────────────────────────────
function attachChipListeners() {
    document.querySelectorAll(".chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            const query = chip.dataset.query;
            if (query) {
                userInput.value = query;
                userInput.dispatchEvent(new Event("input"));
                userInput.focus();
            }
        });
    });
}

attachChipListeners();

// ── Toast Notifications ────────────────────────────────
function showToast(message, type = "info", duration = 3500) {
    const iconMap = {
        success: "fa-circle-check",
        error:   "fa-circle-xmark",
        info:    "fa-circle-info",
    };

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${iconMap[type] || iconMap.info} toast-icon"></i>
        <span class="toast-text">${message}</span>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("fade-out");
        toast.addEventListener("animationend", () => toast.remove(), { once: true });
    }, duration);
}
