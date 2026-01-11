// Get elements
const messagesArea = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const messageForm = document.getElementById('messageForm');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const charCount = document.getElementById('charCount');
const clearChatBtn = document.getElementById('clearChat');
const toggleThemeBtn = document.getElementById('toggleTheme');
const notification = document.getElementById('notification');

// Config
//const API_URL = 'http://localhost:3000/api/chat';
const API_URL = 'http://localhost:3000/api/chat';
// User ID
let userId = localStorage.getItem('balu_chat_userId');
if (!userId) {
    userId = 'user_' + Date.now();
    localStorage.setItem('balu_chat_userId', userId);
}

// Get current time
function getTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${mins}`;
}

// Show notification
function showNotification(msg) {
    notification.textContent = msg;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2500);
}

// Scroll to bottom
function scrollDown() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Add message to chat
function addMessage(text, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `<p>${text}</p>`;
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'time';
    timeSpan.textContent = getTime();
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeSpan);
    messagesArea.appendChild(messageDiv);
    
    scrollDown();
    saveMessage(text, isUser);
}

// Show typing
function showTyping() {
    typingIndicator.style.display = 'block';
    scrollDown();
}

// Hide typing
function hideTyping() {
    typingIndicator.style.display = 'none';
}

// Save message
function saveMessage(msg, isUser) {
    let history = JSON.parse(localStorage.getItem('balu_chat_history') || '[]');
    history.push({ message: msg, isUser, time: new Date().toISOString() });
    if (history.length > 50) {
        history = history.slice(-50);
    }
    localStorage.setItem('balu_chat_history', JSON.stringify(history));
}

// Load history
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('balu_chat_history') || '[]');
    if (history.length > 0) {
        messagesArea.innerHTML = '';
        history.forEach(item => {
            addMessage(item.message, item.isUser);
        });
    }
}

// Clear chat
function clearChat() {
    if (confirm('Are you sure you want to clear all messages?')) {
        localStorage.removeItem('balu_chat_history');
        messagesArea.innerHTML = '';
        addMessage("Hi! I'm Balu. How can I help you today?", false);
        showNotification('Chat cleared');
    }
}

// Send message to API
async function sendToAPI(message) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, message })
        });
        
        if (!response.ok) {
            throw new Error('Network error');
        }
        
        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Handle form submit
async function handleSubmit(e) {
    e.preventDefault();
    
    const text = messageInput.value.trim();
    if (!text) return;
    
    // Disable input
    messageInput.disabled = true;
    sendBtn.disabled = true;
    
    // Add user message
    addMessage(text, true);
    messageInput.value = '';
    updateCharCount();
    
    // Show typing
    showTyping();
    
    try {
        // Get response
        const reply = await sendToAPI(text);
        
        // Hide typing and show reply
        hideTyping();
        addMessage(reply, false);
    } catch (error) {
        hideTyping();
        addMessage("Sorry, I'm having trouble connecting right now.", false);
        showNotification('Connection error');
    }
    
    // Enable input
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
}

// Update char count
function updateCharCount() {
    const count = messageInput.value.length;
    charCount.textContent = count;
}

// Toggle theme
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('balu_theme', isDark ? 'dark' : 'light');
}

// Load theme
function loadTheme() {
    const theme = localStorage.getItem('balu_theme');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    }
}

// Check server
async function checkServer() {
    try {
        await fetch('http://localhost:3000/api/health');
        showNotification('Connected');
    } catch {
        showNotification('Server offline');
    }
}

// Event listeners
messageForm.addEventListener('submit', handleSubmit);
messageInput.addEventListener('input', updateCharCount);
clearChatBtn.addEventListener('click', clearChat);
toggleThemeBtn.addEventListener('click', toggleTheme);

// Load on start
window.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadHistory();
    checkServer();
    messageInput.focus();
});
