// 儲存所有對話歷史
let allChats = [];
// 當前對話歷史
let chatHistory = [];
// 當前對話的 ID
let currentChatId = null;

// 初始化聊天介面
document.addEventListener('DOMContentLoaded', () => {
    // 從 localStorage 加載歷史對話
    loadChatsFromStorage();
    
    // 綁定發送按鈕事件
    document.getElementById('sendButton').addEventListener('click', sendMessage);
    
    // 綁定輸入框的 Enter 鍵事件
    document.getElementById('userInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // 綁定新對話按鈕事件
    document.querySelector('.new-chat').addEventListener('click', startNewChat);

    // 漢堡選單功能
    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // 點擊選單項目後自動關閉選單
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });

    // 點擊頁面其他地方時關閉選單
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.navbar')) {
            navLinks.classList.remove('active');
        }
    });
});

// 從 localStorage 加載對話歷史
function loadChatsFromStorage() {
    const savedChats = localStorage.getItem('allChats');
    if (savedChats) {
        allChats = JSON.parse(savedChats);
        updateChatHistory();
    }
    // 如果沒有任何對話，創建一個新的
    if (allChats.length === 0) {
        startNewChat();
    } else {
        // 載入最後一個對話
        loadChat(allChats[allChats.length - 1].id);
    }
}

// 更新側邊欄的對話歷史
function updateChatHistory() {
    const chatHistoryDiv = document.querySelector('.chat-history');
    chatHistoryDiv.innerHTML = '';
    
    allChats.forEach(chat => {
        const chatElement = document.createElement('div');
        chatElement.className = `chat-history-item ${chat.id === currentChatId ? 'active' : ''}`;
        chatElement.textContent = chat.title || '新對話';
        chatElement.onclick = () => loadChat(chat.id);
        chatHistoryDiv.appendChild(chatElement);
    });
}

// 載入特定對話
function loadChat(chatId) {
    const chat = allChats.find(c => c.id === chatId);
    if (chat) {
        currentChatId = chatId;
        chatHistory = [...chat.messages];
        
        // 清空並重新顯示訊息
        const chatbox = document.getElementById('chatbox');
        chatbox.innerHTML = '';
        chatHistory.forEach(msg => {
            appendMessage(msg.role, msg.content);
        });
        
        updateChatHistory();
    }
}

// 開始新對話
function startNewChat() {
    const newChat = {
        id: Date.now().toString(),
        title: '新對話',
        messages: []
    };
    
    allChats.push(newChat);
    currentChatId = newChat.id;
    chatHistory = [];
    
    document.getElementById('chatbox').innerHTML = '';
    appendMessage('system', '開始新的對話！');
    
    updateChatHistory();
    saveChatsToStorage();
}

// 保存對話到 localStorage
function saveChatsToStorage() {
    localStorage.setItem('allChats', JSON.stringify(allChats));
}

// 更新當前對話
function updateCurrentChat(message, response) {
    const currentChat = allChats.find(c => c.id === currentChatId);
    if (currentChat) {
        currentChat.messages.push(
            { role: "user", content: message },
            { role: "assistant", content: response }
        );
        // 更新對話標題（使用第一條用戶訊息）
        if (currentChat.messages.length === 2) {
            currentChat.title = message.substring(0, 20) + (message.length > 20 ? '...' : '');
            updateChatHistory();
        }
        saveChatsToStorage();
    }
}

// 發送訊息
async function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    
    if (!message) return;

    userInput.value = '';
    appendMessage('user', message);

    try {
        showLoadingIndicator();

        const response = await fetch('https://free.gpt.ge/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-NUZWQZBSjJSzXIha67283bD30a45498bBeFd3b738b54B9E1'
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    ...chatHistory,
                    { role: "user", content: message }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        hideLoadingIndicator();

        if (data.choices && data.choices[0] && data.choices[0].message) {
            const aiResponse = data.choices[0].message.content;
            appendMessage('assistant', aiResponse);
            
            // 更新聊天歷史
            chatHistory.push(
                { role: "user", content: message },
                { role: "assistant", content: aiResponse }
            );
            
            // 更新並保存當前對話
            updateCurrentChat(message, aiResponse);
        } else {
            throw new Error('Invalid response format from API');
        }
    } catch (error) {
        console.error('Error:', error);
        hideLoadingIndicator();
        appendMessage('system', `發生錯誤：${error.message}`);
    }
}

// 添加訊息到聊天框
function appendMessage(role, content) {
    const chatbox = document.getElementById('chatbox');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    chatbox.appendChild(messageDiv);
    
    // 使用 setTimeout 確保滾動發生在 DOM 更新之後
    setTimeout(() => {
        chatbox.scrollTop = chatbox.scrollHeight;
    }, 0);
}

// 顯示載入中動畫
function showLoadingIndicator() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant-message loading';
    loadingDiv.innerHTML = '<div class="loading-dots"><div></div><div></div><div></div></div>';
    document.getElementById('chatbox').appendChild(loadingDiv);
}

// 隱藏載入中動畫
function hideLoadingIndicator() {
    const loadingElement = document.querySelector('.loading');
    if (loadingElement) {
        loadingElement.remove();
    }
} 