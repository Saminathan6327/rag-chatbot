const API_BASE_URL = "http://127.0.0.1:8000";

// DOM Elements
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const progressContainer = document.getElementById("progress-container");
const uploadingFilename = document.getElementById("uploading-filename");
const progressPercent = document.getElementById("progress-percent");
const progressBar = document.getElementById("progress-bar");
const uploadedFilesList = document.getElementById("uploaded-files-list");

const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const messagesArea = document.getElementById("messages-area");
const sendBtn = document.getElementById("send-btn");

// File Upload Drag & Drop Event Listeners
dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
        handleFiles(fileInput.files);
    }
});

// Process Selected Files
async function handleFiles(files) {
    for (const file of files) {
        await uploadFile(file);
    }
}

// Upload File with Progress Tracking
function uploadFile(file) {
    return new Promise((resolve) => {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE_URL}/upload/`, true);

        // Show Progress Container
        progressContainer.style.display = "block";
        uploadingFilename.textContent = file.name;
        progressBar.style.width = "0%";
        progressPercent.textContent = "0%";

        // Progress Listener
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = `${percent}%`;
                progressPercent.textContent = `${percent}%`;
            }
        };

        // Complete Listener
        xhr.onload = () => {
            progressContainer.style.display = "none";
            
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    addFileToUI(file.name, true);
                    appendSystemMessage(`Document "${file.name}" uploaded and successfully indexed!`);
                } else {
                    addFileToUI(file.name, false, response.status);
                    appendSystemMessage(`Failed to process "${file.name}": ${response.status}`, true);
                }
            } else {
                addFileToUI(file.name, false, "Server Error");
                appendSystemMessage(`Server returned error code ${xhr.status} when uploading "${file.name}".`, true);
            }
            resolve();
        };

        // Error Listener
        xhr.onerror = () => {
            progressContainer.style.display = "none";
            addFileToUI(file.name, false, "Connection Error");
            appendSystemMessage(`Network error occurred while uploading "${file.name}".`, true);
            resolve();
        };

        xhr.send(formData);
    });
}

// Add File Row to Sidebar
function addFileToUI(name, success, errorText = "") {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";

    const fileIcon = document.createElement("i");
    fileIcon.className = name.endsWith(".pdf") ? "fa-solid fa-file-pdf file-icon" : "fa-solid fa-file-lines file-icon";

    const fileNameSpan = document.createElement("span");
    fileNameSpan.className = "file-name";
    fileNameSpan.textContent = name;
    fileNameSpan.title = name;

    const statusIcon = document.createElement("i");
    if (success) {
        statusIcon.className = "fa-solid fa-circle-check file-success";
    } else {
        statusIcon.className = "fa-solid fa-circle-xmark";
        statusIcon.style.color = "#ef4444";
        statusIcon.title = errorText;
    }

    fileItem.appendChild(fileIcon);
    fileItem.appendChild(fileNameSpan);
    fileItem.appendChild(statusIcon);
    uploadedFilesList.appendChild(fileItem);
}

// Append Chat Message Bubbles
function appendMessage(sender, text, isUser = false) {
    const messageDiv = document.createElement("div");
    messageDiv.className = isUser ? "message user-message" : "message bot-message";

    const avatarDiv = document.createElement("div");
    avatarDiv.className = "message-avatar";
    avatarDiv.innerHTML = isUser ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    
    const p = document.createElement("p");
    p.textContent = text;
    contentDiv.appendChild(p);

    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    messagesArea.appendChild(messageDiv);
    
    // Smooth scroll to bottom
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Append System alerts to Chat Thread
function appendSystemMessage(text, isError = false) {
    const systemDiv = document.createElement("div");
    systemDiv.className = "message system-message";
    
    const avatarDiv = document.createElement("div");
    avatarDiv.className = "message-avatar";
    avatarDiv.innerHTML = isError ? '<i class="fa-solid fa-circle-exclamation" style="color: #ef4444;"></i>' : '<i class="fa-solid fa-circle-info"></i>';

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";
    contentDiv.style.borderColor = isError ? "rgba(239, 68, 68, 0.25)" : "var(--border-glow)";
    contentDiv.style.background = isError ? "rgba(239, 68, 68, 0.05)" : "var(--bg-card)";
    
    const p = document.createElement("p");
    p.textContent = text;
    p.style.fontStyle = "italic";
    p.style.color = isError ? "#fca5a5" : "var(--text-secondary)";
    contentDiv.appendChild(p);

    systemDiv.appendChild(avatarDiv);
    systemDiv.appendChild(contentDiv);
    messagesArea.appendChild(systemDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Append typing loader
function appendTypingIndicator() {
    const indicatorDiv = document.createElement("div");
    indicatorDiv.className = "message bot-message";
    indicatorDiv.id = "typing-indicator-bubble";

    const avatarDiv = document.createElement("div");
    avatarDiv.className = "message-avatar";
    avatarDiv.innerHTML = '<i class="fa-solid fa-robot"></i>';

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";

    const typingDiv = document.createElement("div");
    typingDiv.className = "typing-indicator";
    typingDiv.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';

    contentDiv.appendChild(typingDiv);
    indicatorDiv.appendChild(avatarDiv);
    indicatorDiv.appendChild(contentDiv);
    messagesArea.appendChild(indicatorDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById("typing-indicator-bubble");
    if (indicator) {
        indicator.remove();
    }
}

// Chat Form Submission
chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const query = userInput.value.trim();
    if (!query) return;

    // Add user message and clear input
    appendMessage("You", query, true);
    userInput.value = "";

    // Show bot typing indicator
    appendTypingIndicator();

    try {
        const response = await fetch(`${API_BASE_URL}/chat/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ query: query })
        });

        removeTypingIndicator();

        if (response.ok) {
            const data = await response.json();
            appendMessage("AI", data.response);
        } else {
            appendMessage("AI", `Error: Server responded with status code ${response.status}`);
        }
    } catch (error) {
        removeTypingIndicator();
        appendMessage("AI", `Error: Could not connect to the backend server. Make sure main.py is running.`);
    }
});
