// Live Webinar Room - App JavaScript

let isPlaying = false;
let isMuted = true; // Start muted for autoplay
let userStartedVideo = false; // Track if user actively started the video

// Offer message settings - adjust the time (in seconds) when the offer appears
const OFFER_TRIGGER_TIME = 10; // 10 seconds for testing (change this value to adjust)
let offerShown = false;

// Zapier webhook settings
const ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/9848534/u7dv4yn/';
const VIDEO_TRIGGER_TIME = 15; // Send webhook when video hits 15 seconds
let webhookSent = false; // Track if webhook has been sent

// Extract lead data from URL parameters
let leadEmail = '';
let leadFirstName = '';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    extractUrlParams();
    initPlayer();
    initFullscreen();
    disableRightClick();
});

/**
 * Extract URL Parameters
 */
function extractUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    leadEmail = urlParams.get('wj_lead_email') || '';
    leadFirstName = urlParams.get('wj_lead_first_name') || '';
    console.log('Lead data extracted:', { email: leadEmail, firstName: leadFirstName });
}

/**
 * Send Lead Data to Zapier Webhook
 */
function sendLeadWebhook() {
    if (webhookSent || !leadEmail) {
        return;
    }

    webhookSent = true;
    console.log('Sending lead data to Zapier:', { email: leadEmail, firstName: leadFirstName });

    fetch(ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: leadEmail,
            first_name: leadFirstName
        })
    })
    .then(response => {
        console.log('Webhook sent successfully:', response.status);
    })
    .catch(error => {
        console.error('Webhook error:', error);
    });
}

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
            // Mark that user actively started the video
            userStartedVideo = true;
            // Reset offer shown status so it can show again
            offerShown = false;
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

    // Check video time for offer message and webhook - only show when user has actively started the video
    player.addEventListener('timeupdate', function() {
        // Send Zapier webhook at 15 seconds
        if (!webhookSent && userStartedVideo && isPlaying && player.currentTime >= VIDEO_TRIGGER_TIME) {
            sendLeadWebhook();
        }

        // Show offer message
        if (!offerShown && userStartedVideo && isPlaying && player.currentTime >= OFFER_TRIGGER_TIME) {
            // Exit fullscreen if we're in fullscreen mode
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
            // Show the offer
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
    const videoSection = document.querySelector('.video-section');
    const player = document.getElementById('player');

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        // Enter fullscreen mode
        if (videoSection.requestFullscreen) {
            videoSection.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err);
            });
        } else if (videoSection.webkitRequestFullscreen) {
            videoSection.webkitRequestFullscreen();
        } else if (videoSection.msRequestFullscreen) {
            videoSection.msRequestFullscreen();
        } else if (videoSection.mozRequestFullScreen) {
            videoSection.mozRequestFullScreen();
        }
    } else {
        // Exit fullscreen mode - check if we should show the offer
        if (player && player.currentTime >= OFFER_TRIGGER_TIME) {
            showOfferMessage();
        }

        // Exit fullscreen mode
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(err => {
                console.log('Exit fullscreen failed:', err);
            });
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        }
    }
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

    // Listen for fullscreen changes (for icon update) - use standard event
    document.addEventListener('fullscreenchange', function() {
        updateFullscreenIcon();
        // Hide fullscreen button when in fullscreen
        const fullscreenBtn = document.querySelector('.fullscreen-btn');
        if (fullscreenBtn) {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                fullscreenBtn.style.display = 'none';
            } else {
                fullscreenBtn.style.display = 'flex';
            }
        }
    });

    // Webkit-prefixed fullscreen change for iOS Safari
    document.addEventListener('webkitfullscreenchange', function() {
        updateFullscreenIcon();
        const fullscreenBtn = document.querySelector('.fullscreen-btn');
        if (fullscreenBtn) {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                fullscreenBtn.style.display = 'none';
            } else {
                fullscreenBtn.style.display = 'flex';
            }
        }
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
            // If exiting fullscreen, check if we should show the offer
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                if (player && player.currentTime >= OFFER_TRIGGER_TIME) {
                    showOfferMessage();
                }
            }
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
    }
});

console.log('Live Webinar Room initialized');
