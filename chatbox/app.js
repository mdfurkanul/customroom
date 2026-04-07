// Live Webinar Room - App JavaScript

let isPlaying = false;
let isMuted = true; // Start muted for autoplay

// Offer message settings - adjust the time (in seconds) when the offer appears
const OFFER_TRIGGER_TIME = 10; // 10 seconds for testing (change this value to adjust)
let offerShown = false;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    initPlayer();
    initChat();
    initTimer();
    initChatToggle();
    initFullscreen();
    disableRightClick();
});

/**
 * Disable Right-Click Context Menu
 */
function disableRightClick() {
    // Disable context menu on entire document
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }, true);

    // Also disable on video element specifically
    const player = document.getElementById('player');
    if (player) {
        player.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, true);
    }

    // Disable keyboard shortcuts for developer tools and save
    document.addEventListener('keydown', function(e) {
        // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S, Ctrl+P
        if (e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
            (e.ctrlKey && (e.key === 'U' || e.key === 'S' || e.key === 'P')) ||
            (e.metaKey && (e.key === 'U' || e.key === 'S' || e.key === 'P' || e.key === 'I')) ||
            (e.altKey && e.key === 'F12')) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, true);

    // Disable drag and drop of video and images
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'VIDEO' || e.target.tagName === 'IMG') {
            e.preventDefault();
            return false;
        }
    }, true);

    // Disable selection to prevent copying
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    }, true);

    // Touch-based long press prevention on mobile
    let touchTimer = null;
    document.addEventListener('touchstart', function(e) {
        touchTimer = setTimeout(function() {
            // Prevent long-press context menu on mobile
            if (navigator.vibrate) {
                navigator.vibrate(0);
            }
        }, 500);
    }, { passive: true });

    document.addEventListener('touchend', function() {
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
    }, { passive: true });

    document.addEventListener('touchmove', function() {
        if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
        }
    }, { passive: true });
}

/**
 * Initialize HTML5 Video Player
 */
function initPlayer() {
    const player = document.getElementById('player');
    const playOverlay = document.querySelector('.play-overlay');

    if (!player) {
        console.error('Video player not found');
        return;
    }

    // Start muted for autoplay
    player.muted = true;
    isMuted = true;

    // Auto-play video on page load (muted)
    player.play().then(() => {
        isPlaying = true;
        // Keep overlay visible for user to click to enable sound
        console.log('Video autoplaying (muted)');
        player.style.display = 'block';
    }).catch(err => {
        console.log('Auto-play prevented, waiting for user interaction');
    });

    // Play overlay click handler - restart video from beginning and unmute
    if (playOverlay) {
        playOverlay.addEventListener('click', function() {
            // Restart video from beginning
            player.currentTime = 0;
            // Unmute
            player.muted = false;
            isMuted = false;
            // Play
            player.play().then(() => {
                isPlaying = true;
                playOverlay.classList.add('hidden');
                player.style.display = 'block';
                console.log('Video started with sound');
            });
        });
    }

    // When video starts playing
    player.addEventListener('play', function() {
        isPlaying = true;
    });

    // When video pauses
    player.addEventListener('pause', function() {
        isPlaying = false;
    });

    // Check video time for offer message - only show when video is playing
    player.addEventListener('timeupdate', function() {
        if (!offerShown && isPlaying && player.currentTime >= OFFER_TRIGGER_TIME) {
            showOfferMessage();
            offerShown = true;
        }
    });

    // When video ends
    player.addEventListener('ended', function() {
        console.log('Video ended');
        // Show overlay again when video ends
        if (playOverlay) {
            playOverlay.classList.remove('hidden');
        }
    });

    player.addEventListener('error', function(e) {
        console.error('Video error:', e);
        showNotification('Error loading video. Please refresh the page.');
    });

    // Click on video to enter fullscreen
    player.addEventListener('click', function(e) {
        // Don't trigger fullscreen if clicking on overlay
        if (e.target.closest('.play-overlay')) return;
        toggleFullscreen();
    });

    console.log('Video player initialized successfully');
}

/**
 * Toggle Fullscreen
 */
function toggleFullscreen() {
    const mainLayout = document.querySelector('.main-layout');
    const videoSection = document.querySelector('.video-section');
    const videoContainer = document.querySelector('.video-container');

    if (!mainLayout.classList.contains('fullscreen-mode')) {
        // Enter custom fullscreen mode
        mainLayout.classList.add('fullscreen-mode');
        document.body.classList.add('fullscreen-mode');

        // Request fullscreen on main-layout so sidebar can appear on top
        if (mainLayout.requestFullscreen) {
            mainLayout.requestFullscreen();
        } else if (mainLayout.webkitRequestFullscreen) {
            mainLayout.webkitRequestFullscreen();
        }
    } else {
        // Exit fullscreen mode
        mainLayout.classList.remove('fullscreen-mode');
        document.body.classList.remove('fullscreen-mode');

        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    }
}

/**
 * Toggle Chat in Fullscreen Mode
 */
function toggleChatInFullscreen() {
    const mainLayout = document.querySelector('.main-layout');
    if (mainLayout) {
        mainLayout.classList.toggle('chat-hidden');
    }
    document.body.classList.toggle('chat-hidden');
    updateFullscreenChatButtons();
}

/**
 * Initialize Fullscreen Button
 */
function initFullscreen() {
    const fullscreenBtn = document.querySelector('.fullscreen-btn');

    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleFullscreen();
        });
    }

    // Listen for fullscreen changes (for icon update and sync)
    document.addEventListener('fullscreenchange', function() {
        updateFullscreenIcon();
        // Sync custom mode with browser fullscreen state
        const mainLayout = document.querySelector('.main-layout');
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
        if (!isFullscreen) {
            mainLayout.classList.remove('fullscreen-mode');
            document.body.classList.remove('fullscreen-mode');
        }
        // Hide/show fullscreen button based on fullscreen state
        const fullscreenBtn = document.querySelector('.fullscreen-btn');
        if (fullscreenBtn) {
            if (isFullscreen) {
                fullscreenBtn.style.display = 'none';
            } else {
                fullscreenBtn.style.display = 'flex';
            }
        }
        // Update fullscreen chat button visibility
        updateFullscreenChatButtons();
    });

    document.addEventListener('webkitfullscreenchange', function() {
        updateFullscreenIcon();
        const mainLayout = document.querySelector('.main-layout');
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
        if (!isFullscreen) {
            mainLayout.classList.remove('fullscreen-mode');
            document.body.classList.remove('fullscreen-mode');
        }
        // Hide/show fullscreen button based on fullscreen state
        const fullscreenBtn = document.querySelector('.fullscreen-btn');
        if (fullscreenBtn) {
            if (isFullscreen) {
                fullscreenBtn.style.display = 'none';
            } else {
                fullscreenBtn.style.display = 'flex';
            }
        }
        // Update fullscreen chat button visibility
        updateFullscreenChatButtons();
    });
}

/**
 * Update fullscreen icon based on state
 */
function updateFullscreenIcon() {
    const fullscreenBtn = document.querySelector('.fullscreen-btn');
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;

    if (fullscreenBtn) {
        if (isFullscreen) {
            // Show exit fullscreen icon
            fullscreenBtn.querySelector('svg').innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
            `;
        } else {
            // Show enter fullscreen icon
            fullscreenBtn.querySelector('svg').innerHTML = `
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            `;
        }
    }
}

/**
 * Initialize Chat Toggle (Hide/Show)
 */
function initChatToggle() {
    const hideChatBtn = document.querySelector('.hide-chat-btn');
    const showChatBtns = document.querySelectorAll('.show-chat-btn');
    const fullscreenShowChatBtn = document.querySelector('.fullscreen-show-chat-btn');
    const fullscreenHideChatBtn = document.querySelector('.fullscreen-hide-chat-btn');
    const mainLayout = document.querySelector('.main-layout');

    if (hideChatBtn) {
        hideChatBtn.addEventListener('click', function() {
            if (mainLayout) {
                mainLayout.classList.add('chat-hidden');
            }
            document.body.classList.add('chat-hidden');
            updateFullscreenChatButtons();
        });
    }

    showChatBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (mainLayout) {
                mainLayout.classList.remove('chat-hidden');
            }
            document.body.classList.remove('chat-hidden');
            updateFullscreenChatButtons();
        });
    });

    if (fullscreenShowChatBtn) {
        fullscreenShowChatBtn.addEventListener('click', function() {
            if (mainLayout) {
                mainLayout.classList.remove('chat-hidden');
            }
            document.body.classList.remove('chat-hidden');
            updateFullscreenChatButtons();
        });
    }

    if (fullscreenHideChatBtn) {
        fullscreenHideChatBtn.addEventListener('click', function() {
            if (mainLayout) {
                mainLayout.classList.add('chat-hidden');
            }
            document.body.classList.add('chat-hidden');
            updateFullscreenChatButtons();
        });
    }
}

/**
 * Update fullscreen chat button visibility
 */
function updateFullscreenChatButtons() {
    const mainLayout = document.querySelector('.main-layout');
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    const fullscreenChatOpenContainer = document.querySelector('.fullscreen-chat-open-container');
    const fullscreenHideChatBtn = document.querySelector('.fullscreen-hide-chat-btn');

    if (fullscreenChatOpenContainer) {
        if (isFullscreen && mainLayout && mainLayout.classList.contains('chat-hidden')) {
            fullscreenChatOpenContainer.style.display = 'block';
        } else {
            fullscreenChatOpenContainer.style.display = 'none';
        }
    }

    if (fullscreenHideChatBtn) {
        if (isFullscreen && mainLayout && !mainLayout.classList.contains('chat-hidden')) {
            fullscreenHideChatBtn.style.display = 'block';
        } else {
            fullscreenHideChatBtn.style.display = 'none';
        }
    }
}

/**
 * Initialize Chat Functionality
 */
function initChat() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');

    if (!chatForm || !chatInput || !chatMessages) {
        console.warn('Chat elements not found');
        return;
    }

    // Sample chat messages
    const sampleMessages = [
        { name: 'Sarah Mitchell', text: 'This is so helpful, thank you!' },
        { name: 'Mike Johnson', text: 'Can you share the code examples afterwards?' },
        { name: 'Emily Chen', text: 'Just joined - what did I miss?' },
        { name: 'David Park', text: 'The audio is perfect now, thanks!' },
        { name: 'Lisa Thompson', text: 'Will this be recorded?' },
        { name: 'James Wilson', text: 'Great explanation of the concepts!' }
    ];

    let messageIndex = 0;
    let welcomeMessageRemoved = false;

    function addSampleMessage() {
        if (!welcomeMessageRemoved) {
            const welcomeDiv = chatMessages.querySelector('.empty-state');
            if (welcomeDiv) {
                welcomeDiv.remove();
            }
            welcomeMessageRemoved = true;
        }

        if (messageIndex < sampleMessages.length) {
            const msg = sampleMessages[messageIndex];
            addChatMessage(msg.name, msg.text, chatMessages);
            messageIndex = (messageIndex + 1) % sampleMessages.length;
        }

        const nextInterval = Math.random() * 12000 + 8000;
        setTimeout(addSampleMessage, nextInterval);
    }

    setTimeout(addSampleMessage, 5000);

    // Handle form submission
    chatForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const message = chatInput.value.trim();
        if (message) {
            const welcomeDiv = chatMessages.querySelector('.empty-state');
            if (welcomeDiv) {
                welcomeDiv.remove();
            }

            addChatMessage('You', message, chatMessages, true);
            chatInput.value = '';

            // Simulate host response
            setTimeout(() => {
                const responses = [
                    'Great question! We\'ll cover that soon.',
                    'Thanks for joining us today!',
                    'Stay tuned for more details.'
                ];
                const randomResponse = responses[Math.floor(Math.random() * responses.length)];
                addChatMessage('Host', randomResponse, chatMessages, false, true);
            }, 2500);
        }
    });

    console.log('Chat initialized');
}

/**
 * Add a message to the chat
 */
function addChatMessage(name, text, container, isUser = false, isHost = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message flex gap-3 ${isHost ? 'host' : ''}`;

    const bgColor = isUser ? '10b981' : isHost ? '076fcc' : 'random';
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgColor}&color=fff&size=64`;

    messageDiv.innerHTML = `
        <div class="chat-message-avatar flex-shrink-0">
            <img src="${avatarUrl}" alt="${name}">
        </div>
        <div class="chat-message-content flex-1 min-w-0">
            <p class="chat-message-name">
                ${name}
                ${isHost ? '<span class="sender-badge host">Host</span>' : ''}
                <span class="chat-message-time">Just now</span>
            </p>
            <p class="chat-message-text mt-0.5">${escapeHtml(text)}</p>
        </div>
    `;

    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Initialize Timer
 */
function initTimer() {
    const timerEl = document.getElementById('timer');

    if (!timerEl) return;

    let seconds = 0;

    setInterval(() => {
        seconds++;

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        const formatted = [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');

        timerEl.textContent = formatted;
    }, 1000);
}

/**
 * Show notification toast
 */
function showNotification(message) {
    let notification = document.querySelector('.notification-toast');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification-toast';
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/**
 * Show Offer Message
 */
function showOfferMessage() {
    const offerContainer = document.getElementById('offer-cta-container');
    if (offerContainer) {
        offerContainer.classList.remove('hidden');
    }
}

/**
 * Keyboard Shortcuts
 */
document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    const player = document.getElementById('player');

    switch(e.key.toLowerCase()) {
        case 'f':
            e.preventDefault();
            toggleFullscreen();
            break;
        case 'm':
            e.preventDefault();
            if (player) {
                player.muted = !player.muted;
                isMuted = player.muted;
                showNotification(isMuted ? 'Muted' : 'Unmuted');
            }
            break;
        case 'h':
            e.preventDefault();
            // Toggle chat visibility
            const mainLayout = document.querySelector('.main-layout');
            if (mainLayout) {
                mainLayout.classList.toggle('chat-hidden');
            }
            document.body.classList.toggle('chat-hidden');
            break;
    }
});

console.log('Live Webinar Room initialized');
