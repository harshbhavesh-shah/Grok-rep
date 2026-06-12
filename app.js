// ==========================================
// 1. GLOBAL CONFIGURATION & FIREBASE INITIALIZATION
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyBY5j60XYVsFOvDKEvKhBkYwVyHcrx0KYE",
  authDomain: "grok-b0017.firebaseapp.com",
  projectId: "grok-b0017",
  storageBucket: "grok-b0017.firebasestorage.app",
  messagingSenderId: "41831121530",
  appId: "1:41831121530:web:f3a8a1a91630a506bbf1c3"
};

// Initialize the cloud cluster connection
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// SYSTEM PERSONA: Restored the vital structural prompt configuration missing from line 20
const SYSTEM_PROMPT = {
    role: "system", 
    content: "You are an immersive creative writing partner. Speak organically, match the user's emotional tone, write deep descriptive prose, and never censor romantic or slice-of-life scenes."
};

// LOOPHOLE POOL: Drop your multiple free Puter account tokens here
const PUTER_AUTH_TOKENS = [
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6InYyIn0.eyJ0IjoidCIsInYiOiIyIiwidG9rZW5fdWlkIjoiYjEyMjJlYjYtNjg5YS00OWNkLTk5OTEtYTkwOGVlOTg1MmMxIiwidXUiOiJXaVVISkRaelRCS0pHcjhMOVBQdmlnPT0iLCJzdSI6IkNQNkU4dGMvUUJ1dC9GL096K2U1VUE9PSIsImFpIjoiV2lVSEpEWnpUQktKR3I4TDlQUHZpZz09IiwiZnVsbF9hY2Nlc3MiOnRydWUsImlhdCI6MTc4MTI1NzQxMX0.jQOpJ0DJDRGXRd5sf4882lHZo6kXD33CcBteGyN4Gsc"
];
let currentTokenIndex = 0;

// IN-MEMORY ACTIVE STATE DATA STORE
let chats = []; 
let activeChatId = null;

// ==========================================
// 2. LIVE CLOUD DATABASE BRIDGE
// ==========================================

window.onload = () => {
    setupUIEventListeners();
    syncChatsFromCloud(); 

    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.getVoices(); };
    }
};

function syncChatsFromCloud() {
    console.log("[Cloud Database] Establishing stream link to Firestore cluster...");
    
    db.collection("roleplays").orderBy("updatedAt", "desc").onSnapshot((snapshot) => {
        chats = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            chats.push({
                id: doc.id,
                title: data.title,
                context: data.context || []
            });
        });

        // SELF-HEALING ENFORCER: If the repo connection opens but finds a blank database, kickstart a canvas
        if (chats.length === 0) {
            console.log("[Cloud Database] Empty cloud layer detected. Provisioning starting scene...");
            createNewChat();
            return; 
        }

        if (chats.length > 0 && !activeChatId) {
            activeChatId = chats[0].id;
        }

        renderSidebar();
        renderMessages();
    }, (error) => {
        console.error("[Cloud Database] Connection severed: ", error);
    });
}

async function saveChatToCloud(chatId, title, contextArray) {
    try {
        await db.collection("roleplays").doc(chatId).set({
            title: title,
            context: contextArray,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`[Cloud Database] Document delta seamlessly synched: ${chatId}`);
    } catch (err) {
        console.error("[Cloud Database] Push operation rejected: ", err);
    }
}

// ==========================================
// 3. CORE MULTI-CHAT CORE ACTIONS
// ==========================================

function createNewChat() {
    const newId = Date.now().toString();
    const defaultTitle = "New Roleplay Scene";
    const initialContext = [SYSTEM_PROMPT];
    
    activeChatId = newId;
    saveChatToCloud(newId, defaultTitle, initialContext);
}

function switchChat(id) {
    activeChatId = id;
    renderSidebar();
    renderMessages();
}

function deleteChat(id, event) {
    event.stopPropagation();

    db.collection("roleplays").doc(id).delete().then(() => {
        console.log("[Cloud Database] Scene purged from data cells.");
        if (activeChatId === id) {
            activeChatId = chats.length > 0 ? chats[0].id : null;
            if (!activeChatId) createNewChat();
        }
    }).catch((error) => {
        console.error("[Cloud Database] Purge action dropped: ", error);
    });
}

// ==========================================
// 4. UI RENDERING ENGINES
// ==========================================

function renderSidebar() {
    const list = document.getElementById('chatHistoryList');
    if (!list) return;
    list.innerHTML = chats.map(chat => `
        <div class="chat-item ${chat.id === activeChatId ? 'active' : ''}" onclick="switchChat('${chat.id}')">
            <i class="fa-regular fa-message"></i>
            <span class="chat-title-text">${escapeHtml(chat.title)}</span>
            <button class="delete-chat-btn" onclick="deleteChat('${chat.id}', event)" title="Delete Chat">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </div>
    `).join('');
}

function renderMessages() {
    const feed = document.getElementById('messageFeed');
    if (!feed) return;
    
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat) return;

    const visibleMessages = activeChat.context.filter(m => m.role !== 'system');
    
    if (visibleMessages.length === 0) {
        feed.innerHTML = `<div style="text-align:center; color:var(--text-muted); margin-top:4rem; font-size:0.9rem; font-style:italic;">
            The canvas is blank. Describe your starting scene...
        </div>`;
        return;
    }

    feed.innerHTML = visibleMessages.map((msg, index) => {
        if (msg.role === 'user') {
            return `
                <div class="message user">
                    <div class="message-content"><strong>You:</strong><br>${escapeHtml(msg.content)}</div>
                </div>`;
        } else {
            return `
                <div class="message ai">
                    <div class="message-content"><strong>Grok:</strong><br>${escapeHtml(msg.content)}</div>
                    <div class="message-actions">
                        <button class="action-btn tts-btn" title="Speak Response">
                            <i class="fa-solid fa-volume-high"></i> TTS
                        </button>
                        <button class="action-btn regen-btn" title="Regenerate" data-index="${index}">
                            <i class="fa-solid fa-rotate-right"></i> Regenerate
                        </button>
                    </div>
                </div>`;
        }
    }).join('');
    
    feed.scrollTop = feed.scrollHeight; 
    attachMessageActionListeners();
}

// ==========================================
// 5. EVENT HANDLERS & HELPERS
// ==========================================

function setupUIEventListeners() {
    const textarea = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const targetTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', targetTheme);
            console.log(`[UI Canvas] Style theme re-mapped to: ${targetTheme}`);
        });
    }

    if (textarea) {
        textarea.addEventListener("input", function() {
            this.style.height = "auto";
            this.style.height = this.scrollHeight + "px";
        });

        textarea.addEventListener("keydown", (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendPrompt();
            }
        });
    }

    if (sendBtn) sendBtn.addEventListener("click", sendPrompt);
    if (newChatBtn) newChatBtn.addEventListener("click", createNewChat);
}

function attachMessageActionListeners() {
    document.querySelectorAll('.regen-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            regenerateResponse(index);
        });
    });

    document.querySelectorAll('.tts-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            speakText(this);
        });
    });
}

// Basic security protection layout
function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ==========================================
// 6. LOOPHOLE API ENGINE & SWAP MACHINERY
// ==========================================

async function sendPrompt() {
    const textarea = document.getElementById('userInput');
    const activeChat = chats.find(c => c.id === activeChatId);
    const useMemory = document.getElementById('memoryToggle').checked;

    if (!textarea || !textarea.value.trim() || !activeChat) return;

    const userText = textarea.value;
    textarea.value = '';
    textarea.style.height = "auto"; 

    if (activeChat.context.filter(m => m.role !== 'system').length === 0) {
        activeChat.title = userText.substring(0, 24) + (userText.length > 24 ? "..." : "");
    }

    activeChat.context.push({ role: "user", content: userText });
    renderMessages();

    const feed = document.getElementById('messageFeed');
    const thinkingDiv = document.createElement('div');
    thinkingDiv.className = "message ai processing";
    thinkingDiv.innerHTML = `<div class="message-content"><strong>Grok:</strong><br><em style="color:var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Analyzing reality...</em></div>`;
    if (feed) {
        feed.appendChild(thinkingDiv);
        feed.scrollTop = feed.scrollHeight;
    }

    const payloadMessages = useMemory ? activeChat.context : [SYSTEM_PROMPT, { role: "user", content: userText }];

    try {
            // Filter context weight depending on memory toggle configuration state
        const payloadMessages = useMemory ? activeChat.context : [SYSTEM_PROMPT, { role: "user", content: userText }];

        // Target the absolute outer shell layout wrapper
        const container = document.querySelector('.app-container');
        // FIX: Active the Gemini liquid aurora mesh animation sequence
        if (container) container.classList.add('ai-thinking');

        const aiResponseText = await executeGrokCallWithTokenRotation(payloadMessages);
        
        const aiResponseText = await executeGrokCallWithTokenRotation(payloadMessages);
        
        if (thinkingDiv) thinkingDiv.remove(); 
        
        activeChat.context.push({ role: "assistant", content: aiResponseText });
        
        // FIX: Saved the state array to Firestore directly, removing local storage remnants
        await saveChatToCloud(activeChat.id, activeChat.title, activeChat.context);
        
        renderMessages();
    } catch (error) {
        if (thinkingDiv) thinkingDiv.remove();
        
        const errorDiv = document.createElement('div');
        errorDiv.className = "message ai";
        errorDiv.innerHTML = `<div class="message-content" style="color:#ff4a4a; font-size:0.9rem;">
            <i class="fa-solid fa-circle-exclamation"></i> <strong>Loophole Failure:</strong> ${error.message}
        </div>`;
        if (feed) {
            feed.appendChild(errorDiv);
            feed.scrollTop = feed.scrollHeight;
        }

        if (container) container.classList.remove('ai-thinking');
        if (thinkingDiv) thinkingDiv.remove();
    }
}

async function executeGrokCallWithTokenRotation(messagesArray) {
    const activeToken = PUTER_AUTH_TOKENS[currentTokenIndex];

    if (!activeToken || activeToken.length < 30) {
        throw new Error("Missing Puter Loophole Auth Tokens. Ensure a valid token is loaded in the PUTER_AUTH_TOKENS array!");
    }
    
    try {
        const response = await fetch("https://api.puter.com/puterai/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${activeToken}`
            },
            body: JSON.stringify({
                model: "x-ai/grok-4-1-fast", 
                messages: messagesArray,
                stream: false 
            })
        });

        if (response.status === 429 || response.status === 403 || response.status === 401) {
            throw new Error("QuotaExhausted");
        }

        const data = await response.json();
        
        if (data && data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        } else {
            throw new Error("Unexpected response shape. Check Puter token balances.");
        }

    } catch (err) {
        if (err.message === "QuotaExhausted" && currentTokenIndex < PUTER_AUTH_TOKENS.length - 1) {
            console.warn(`[Loophole Engine] Token Slot ${currentTokenIndex} exhausted. Swapping seamlessly...`);
            currentTokenIndex++; 
            return await executeGrokCallWithTokenRotation(messagesArray); 
        } else if (err.message === "QuotaExhausted") {
            throw new Error("All loaded burner accounts are fully exhausted for the next 24 hours.");
        } else {
            throw err;
        }
    }
}

// ==========================================
// 7. COMPLEMENTARY SYSTEM ACTIONS (TTS & REGEN)
// ==========================================

async function regenerateResponse(visibleIndex) {
    const activeChat = chats.find(c => c.id === activeChatId);
    if (!activeChat) return;

    let systemCount = activeChat.context.filter(m => m.role === 'system').length;
    let targetGlobalIndex = visibleIndex + systemCount;

    activeChat.context = activeChat.context.slice(0, targetGlobalIndex);
    renderMessages();

    const extractedUserPrompt = activeChat.context[activeChat.context.length - 1].content;
    activeChat.context.pop(); 

    const textarea = document.getElementById('userInput');
    if (textarea) textarea.value = extractedUserPrompt;
    sendPrompt();
}

// Keep track of the active voice stream globally
let loadedVoices = [];

if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {
        loadedVoices = window.speechSynthesis.getVoices();
        console.log(`[TTS Engine] Dynamic Sync: ${loadedVoices.length} voices loaded.`);
    };
}

async function speakText(buttonElement) {
    try {
        const textContainer = buttonElement.closest('.message.ai').querySelector('.message-content');
        if (!textContainer) return;

        const coreText = textContainer.innerText.replace(/^Grok:\s*/, '').trim();
        if (!coreText) return;

        const originalHtml = buttonElement.innerHTML;
        buttonElement.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Rendering GenAI Voice...`;
        buttonElement.disabled = true;

        window.speechSynthesis.cancel();
        if (window.currentActiveAudio) {
            window.currentActiveAudio.pause();
        }

        const response = await fetch("http://127.0.0.1:8888/generate_speech", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ text: coreText })
        });

        if (!response.ok) throw new Error("Voice server node unreachable.");

        const responseBlob = await response.blob();
        const audioBlob = new Blob([responseBlob], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        window.currentActiveAudio = audio;
        
        buttonElement.innerHTML = `<i class="fa-solid fa-volume-high"></i> Playing...`;
        
        audio.play();
        
        audio.onended = () => {
            buttonElement.innerHTML = originalHtml;
            buttonElement.disabled = false;
        };

    } catch (err) {
        console.error("[TTS Engine] Generative failure:", err);
        buttonElement.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> GenAI Offline`;
        buttonElement.disabled = false;
    }
}