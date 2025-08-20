// ✅ Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDgDw-8py40dvUpyvEJBkGufZXytxFvoDg",
  authDomain: "simplegc-1fc48.firebaseapp.com",
  projectId: "simplegc-1fc48",
  storageBucket: "simplegc-1fc48.firebasestorage.app",
  messagingSenderId: "431674118694",
  appId: "1:431674118694:web:6ea21cfc0c91cbed82cce7",
  measurementId: "G-70P7G9NERH"
};

// ✅ Init Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const chatUI = document.getElementById('chatUI');
const messagesDiv = document.getElementById('messages');
const sendBtn = document.getElementById('sendBtn');
const messageInput = document.getElementById('messageInput');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');

// State variables
let currentUser = null;
let messagesListener = null;

// ✅ Auto-resize textarea
messageInput.addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  
  // Enable/disable send button
  sendBtn.disabled = !this.value.trim();
});

// ✅ Send on Enter (but Shift+Enter for new line)
messageInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (messageInput.value.trim()) {
      sendMessage();
    }
  }
});

// ✅ Google login
loginBtn.onclick = async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    loginBtn.innerHTML = '<div class="spinner"></div> Signing in...';
    loginBtn.disabled = true;
    await auth.signInWithPopup(provider);
  } catch (err) {
    console.error('Login error:', err);
    alert('Login failed. Please try again.');
    resetLoginButton();
  }
};

// ✅ Reset login button to original state
function resetLoginButton() {
  loginBtn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
    Continue with Google
  `;
  loginBtn.disabled = false;
}

// ✅ Logout with page reload
logoutBtn.onclick = async () => {
  try {
    if (messagesListener) {
      messagesListener();
      messagesListener = null;
    }
    await auth.signOut();
    // Force page reload to clear all state
    window.location.reload();
  } catch (err) {
    console.error('Logout error:', err);
    // Still reload even if logout fails to reset the UI
    window.location.reload();
  }
};

// ✅ Auth state change
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    loginScreen.style.display = "none";
    chatUI.style.display = "flex";
    
    // Update user info
    userAvatar.src = user.photoURL || 'https://via.placeholder.com/32';
    userName.textContent = user.displayName || 'User';
    
    loadMessages();
  } else {
    currentUser = null;
    loginScreen.style.display = "flex";
    chatUI.style.display = "none";
    messagesDiv.innerHTML = '<div class="empty-state"><div>👋</div><div>Start a conversation!</div></div>';
    
    // Reset login button state
    resetLoginButton();
    
    if (messagesListener) {
      messagesListener();
      messagesListener = null;
    }
  }
});

// ✅ Send message
async function sendMessage() {
  const text = messageInput.value.trim();
  if (text && currentUser) {
    try {
      sendBtn.disabled = true;
      await db.collection("messages").add({
        text,
        uid: currentUser.uid,
        name: currentUser.displayName || 'Anonymous',
        photoURL: currentUser.photoURL || '',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      messageInput.value = "";
      messageInput.style.height = 'auto';
      sendBtn.disabled = true;
    } catch (err) {
      console.error('Send error:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      sendBtn.disabled = !messageInput.value.trim();
    }
  }
}

sendBtn.onclick = sendMessage;

// ✅ Load messages with better UX
function loadMessages() {
  messagesDiv.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  
  messagesListener = db.collection("messages")
    .orderBy("timestamp")
    .onSnapshot(snapshot => {
      messagesDiv.innerHTML = "";
      
      if (snapshot.empty) {
        messagesDiv.innerHTML = '<div class="empty-state"><div>👋</div><div>Start a conversation!</div></div>';
        return;
      }

      const fragment = document.createDocumentFragment();
      
      snapshot.forEach(doc => {
        const msg = doc.data();
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message");
        messageDiv.classList.add(msg.uid === currentUser.uid ? "me" : "other");
        
        const isMe = msg.uid === currentUser.uid;
        const time = msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
        
        messageDiv.innerHTML = `
          ${!isMe ? `<div class="message-sender">${msg.name}</div>` : ''}
          <div class="message-text">${escapeHtml(msg.text)}</div>
          ${time ? `<div class="message-time">${time}</div>` : ''}
        `;
        
        fragment.appendChild(messageDiv);
      });
      
      messagesDiv.appendChild(fragment);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }, err => {
      console.error('Messages error:', err);
      messagesDiv.innerHTML = '<div class="empty-state"><div>❌</div><div>Failed to load messages</div></div>';
    });
}

// ✅ Utility function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ✅ Format timestamp
function formatTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp.toDate()).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ✅ Handle network status
window.addEventListener('online', () => {
  console.log('Back online');
});

window.addEventListener('offline', () => {
  console.log('Gone offline');
});

// ✅ Prevent zoom on iOS input focus
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
  const viewport = document.querySelector('meta[name=viewport]');
  viewport.setAttribute('content', viewport.content + ', user-scalable=no');
}