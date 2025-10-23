// Star background logic
(function() {
    const canvas = document.getElementById('star-bg');
    const ctx = canvas.getContext('2d');
    let stars = [];
    const STAR_COLORS = ['#fff', '#ffe9c4', '#d4fbff', '#ffd6fa', '#c4ffd4', '#f7f7a1'];
    const STAR_COUNT = 120;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        drawStars();
    }

    function randomBetween(a, b) {
        return a + Math.random() * (b - a);
    }

    function createStars() {
        stars = [];
        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                r: randomBetween(0.5, 2.2),
                color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]
            });
        }
    }

    function drawStars() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (const star of stars) {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.r, 0, 2 * Math.PI);
            ctx.fillStyle = star.color;
            ctx.globalAlpha = randomBetween(0.7, 1);
            ctx.shadowColor = star.color;
            ctx.shadowBlur = 6;
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
    }

    function animate() {
        // Optional: twinkle effect
        for (let star of stars) {
            star.r += (Math.random() - 0.5) * 0.07;
            if (star.r < 0.5) star.r = 0.5;
            if (star.r > 2.2) star.r = 2.2;
        }
        drawStars();
        requestAnimationFrame(animate);
    }

    function initStars() {
        resizeCanvas();
        createStars();
        drawStars();
    }

    window.addEventListener('resize', () => {
        resizeCanvas();
        createStars();
    });

    initStars();
    animate();
})();

// Configuration variables
let apiUrl = localStorage.getItem('apiUrl') || '';
let apiKey = localStorage.getItem('apiKey') || '';
let senderId = localStorage.getItem('senderId') || '';
let accountId = 'account_001';
let ticketId = 'ticket_001';
let channel = 'web';

// Conversation memory
let memory = [];

// UI elements
const chatContainer = document.getElementById('chat-container');
const emptyState = document.getElementById('empty-state');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const saveSettings = document.getElementById('save-settings');
const cancelSettings = document.getElementById('cancel-settings');

// Typing indicator
const typingIndicator = document.createElement('div');
typingIndicator.id = 'typing-indicator';
typingIndicator.classList.add('message', 'ai');
typingIndicator.innerHTML = `
    <div class="avatar">AI</div>
    <div class="bubble">
        <div style="display: flex; align-items: center;">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    </div>
`;
chatContainer.appendChild(typingIndicator);

// Auto-resize textarea
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = `${this.scrollHeight}px`;
});

// Enter key handling
messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Send button
sendBtn.addEventListener('click', sendMessage);

// Settings modal
settingsBtn.addEventListener('click', openSettings);
cancelSettings.addEventListener('click', closeSettings);
saveSettings.addEventListener('click', saveAndCloseSettings);
settingsModal.addEventListener('click', function(e) {
    if (e.target === settingsModal) closeSettings();
});

function openSettings() {
    document.getElementById('api-url').value = apiUrl;
    document.getElementById('api-key').value = apiKey;
    document.getElementById('sender-id').value = senderId;
    document.getElementById('account-id').value = accountId;
    document.getElementById('ticket-id').value = ticketId;
    document.getElementById('channel').value = channel;
    settingsModal.style.display = 'flex';
    document.body.classList.add('modal-open');
}

function closeSettings() {
    settingsModal.style.display = 'none';
    document.body.classList.remove('modal-open');
}

function saveAndCloseSettings() {
    const newApiUrl = document.getElementById('api-url').value.trim();
    const newApiKey = document.getElementById('api-key').value.trim();

    if (!newApiKey) {
        alert('API Key is required.');
        return;
    }
    apiUrl = newApiUrl;
    apiKey = newApiKey;
    senderId = document.getElementById('sender-id').value.trim();
    accountId = document.getElementById('account-id').value.trim();
    ticketId = document.getElementById('ticket-id').value.trim();
    channel = document.getElementById('channel').value.trim();

    localStorage.setItem('apiUrl', apiUrl);
    localStorage.setItem('apiKey', apiKey);
    localStorage.setItem('senderId', senderId);

    closeSettings();
}

async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !apiKey) {
        if (!apiKey) alert('Please set your API Key in settings.');
        return;
    }

    // Add user message
    addMessage('user', message);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;
    typingIndicator.style.display = 'block';
    scrollToBottom();

    // Update memory
    memory.push({ role: 'User', message });

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                sender_id: senderId,
                account_id: accountId,
                ticket_id: ticketId,
                channel,
                memory
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const aiMessage = data.output?.content || 'No response'; // Assuming response has 'output.content' field
        addMessage('ai', aiMessage);
        memory.push({ role: 'AI', message: aiMessage });
    } catch (error) {
        addMessage('ai', `Error: ${error.message}`);
    } finally {
        typingIndicator.style.display = 'none';
        sendBtn.disabled = false;
        scrollToBottom();
    }
}

function addMessage(type, text) {
    if (emptyState) emptyState.style.display = 'none';

    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);

    const avatarText = type === 'user' ? 'U' : 'AI';
    const formattedText = formatText(text);

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    messageDiv.innerHTML = `
        <div class="avatar">${avatarText}</div>
        <div class="bubble">${formattedText}</div>
    `;
    const timestampDiv = document.createElement('div');
    timestampDiv.classList.add('timestamp');
    timestampDiv.textContent = timestamp;
    messageDiv.appendChild(timestampDiv);

    chatContainer.insertBefore(messageDiv, typingIndicator);
    scrollToBottom();
}

function formatText(text) {
    // Escape HTML
    text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Inline code
    text = text.replace(/`(.*?)`/g, '<code>$1</code>');

    // Code blocks
    text = text.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Lists and paragraphs
    const lines = text.split('\n');
    let inUl = false;
    let inOl = false;
    let output = [];
    lines.forEach(line => {
        if (line.startsWith('- ') || line.startsWith('* ')) {
            if (!inUl) {
                output.push('<ul>');
                inUl = true;
            }
            if (inOl) {
                output.push('</ol>');
                inOl = false;
            }
            output.push(`<li>${line.substring(2)}</li>`);
        } else if (/^\d+\. /.test(line)) {
            if (!inOl) {
                output.push('<ol>');
                inOl = true;
            }
            if (inUl) {
                output.push('</ul>');
                inUl = false;
            }
            output.push(`<li>${line.replace(/^\d+\. /, '')}</li>`);
        } else {
            if (inUl) {
                output.push('</ul>');
                inUl = false;
            }
            if (inOl) {
                output.push('</ol>');
                inOl = false;
            }
            if (line.trim()) {
                output.push(`<p>${line}</p>`);
            } else {
                output.push('<br>');
            }
        }
    });
    if (inUl) output.push('</ul>');
    if (inOl) output.push('</ol>');

    return output.join('');
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}
