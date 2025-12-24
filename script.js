// Theme toggle functionality with localStorage persistence
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

// Load saved theme preference or use system preference
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        html.setAttribute('data-theme', savedTheme);
    } else {
        // Check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        html.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
}

// Toggle theme
function toggleTheme() {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Event listener for theme toggle button
themeToggle.addEventListener('click', toggleTheme);

// Load theme on page load
loadThemePreference();

// Update timestamp
function updateTimestamp() {
    const timestampEl = document.getElementById('timestamp');
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    timestampEl.textContent = now.toLocaleDateString('en-US', options);
}

// Update timestamp every minute
updateTimestamp();
setInterval(updateTimestamp, 60000);

// Message form handling with localStorage
const messageForm = document.getElementById('message-form');
const messagesList = document.getElementById('messages-list');
const userNameInput = document.getElementById('user-name');
const userMessageInput = document.getElementById('user-message');

// Load messages from localStorage
function loadMessages() {
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    messagesList.innerHTML = '';
    messages.forEach(renderMessage);
}

// Save messages to localStorage
function saveMessages(messages) {
    localStorage.setItem('messages', JSON.stringify(messages));
}

// Render a single message
function renderMessage(message) {
    const messageEl = document.createElement('div');
    messageEl.className = 'message-item';
    messageEl.innerHTML = `
        <div class="author">${escapeHtml(message.author)}</div>
        <div class="content">${escapeHtml(message.content)}</div>
        <div class="time">${message.time}</div>
    `;
    messagesList.prepend(messageEl);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handle form submission
messageForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const name = userNameInput.value.trim();
    const content = userMessageInput.value.trim();

    if (!name || !content) return;

    const message = {
        author: name,
        content: content,
        time: new Date().toLocaleString()
    };

    // Get existing messages and add new one
    const messages = JSON.parse(localStorage.getItem('messages') || '[]');
    messages.unshift(message);

    // Keep only last 50 messages
    if (messages.length > 50) {
        messages.pop();
    }

    saveMessages(messages);
    renderMessage(message);

    // Clear form
    userMessageInput.value = '';

    // Save name for convenience
    localStorage.setItem('userName', name);
});

// Load saved username
const savedName = localStorage.getItem('userName');
if (savedName) {
    userNameInput.value = savedName;
}

// Load messages on page load
loadMessages();

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        html.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
});
