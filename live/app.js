'use strict';

var isPlaying = false;
var isMuted = true;
var userStartedVideo = false;
var isFullscreen = false;
var OFFER_TRIGGER_TIME = 10;
var VIDEO_TRIGGER_TIME = 15;
var ZAPIER_WEBHOOK_URL = '';
var webhookSent = false;
var offerShown = false;
var leadEmail = '';
var leadFirstName = '';

function loadConfig() {
    var configScript = document.getElementById('app-config');
    if (configScript) {
        OFFER_TRIGGER_TIME = parseInt(configScript.getAttribute('data-offer-trigger-time')) || 10;
        VIDEO_TRIGGER_TIME = parseInt(configScript.getAttribute('data-video-trigger-time')) || 15;
        ZAPIER_WEBHOOK_URL = configScript.getAttribute('data-webhook-url') || '';
    }
}

function extractUrlParams() {
    try {
        var queryString = window.location.search.substring(1);
        if (!queryString) {
            var hash = window.location.hash.substring(1);
            if (hash) queryString = hash;
        }
        if (!queryString) return;
        var params = queryString.split('&');
        for (var i = 0; i < params.length; i++) {
            var pair = params[i].split('=');
            if (pair.length < 1) continue;
            var key = decodeURIComponent(pair[0]);
            var value = decodeURIComponent(pair[1] || '');
            if (key === 'wj_lead_email') leadEmail = value;
            else if (key === 'wj_lead_first_name') leadFirstName = value;
        }
    } catch (e) {}
}

function sendLeadWebhook() {
    if (webhookSent || !leadEmail || leadEmail.trim() === '') return;
    webhookSent = true;
    var xhr = new XMLHttpRequest();
    xhr.open('POST', ZAPIER_WEBHOOK_URL, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send('email=' + encodeURIComponent(leadEmail) + '&first_name=' + encodeURIComponent(leadFirstName));
}

function disableRightClick() {
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }, true);
    var player = document.getElementById('player');
    if (player) {
        player.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }, true);
    }
    document.addEventListener('keydown', function(e) {
        if (!e) e = window.event;
        var key = e.key || e.keyCode;
        if (key === 'F12' || key === 123 ||
            (e.ctrlKey && e.shiftKey && (key === 'I' || key === 'J' || key === 73 || key === 74)) ||
            (e.ctrlKey && (key === 'U' || key === 'S' || key === 'P' || key === 85 || key === 83 || key === 80)) ||
            (e.metaKey && (key === 'U' || key === 'S' || key === 'P' || key === 'I')) ||
            (e.altKey && (key === 'F12' || key === 123))) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, true);
    document.addEventListener('dragstart', function(e) {
        if (e.target && (e.target.tagName === 'VIDEO' || e.target.tagName === 'IMG')) {
            e.preventDefault();
            return false;
        }
    }, true);
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    }, true);
    var touchTimer = null;
    document.addEventListener('touchstart', function() {
        if (touchTimer) clearTimeout(touchTimer);
        touchTimer = setTimeout(function() {
            if (navigator.vibrate) navigator.vibrate(0);
        }, 500);
    }, { passive: true });
    document.addEventListener('touchend', function() {
        if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
    }, { passive: true });
    document.addEventListener('touchmove', function() {
        if (touchTimer) { clearTimeout(touchTimer); touchTimer = null; }
    }, { passive: true });
}

function initPlayer() {
    var player = document.getElementById('player');
    var playOverlay = document.querySelector('.play-overlay');
    if (!player) return;
    player.setAttribute('playsinline', 'true');
    player.setAttribute('webkit-playsinline', 'true');
    player.muted = true;
    isMuted = true;
    player.style.display = 'block';
    var tryPlay = function() {
        var playPromise = player.play();
        if (playPromise && playPromise.then) {
            playPromise.then(function() {
                isPlaying = true;
            }).catch(function() {});
        }
    };
    tryPlay();
    document.addEventListener('touchstart', function firstTouch() {
        if (!isPlaying && !userStartedVideo) tryPlay();
        document.removeEventListener('touchstart', firstTouch);
    }, { passive: true });
    if (playOverlay) {
        var handlePlayClick = function(e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            userStartedVideo = true;
            offerShown = false;
            player.currentTime = 0;
            player.muted = false;
            isMuted = false;
            var playPromise = player.play();
            if (playPromise && playPromise.then) {
                playPromise.then(function() {
                    isPlaying = true;
                    playOverlay.classList.add('hidden');
                    player.style.display = 'block';
                }).catch(function() {});
            }
        };
        if ('ontouchstart' in window) {
            playOverlay.addEventListener('touchstart', handlePlayClick, { passive: false });
        }
        playOverlay.addEventListener('click', handlePlayClick);
    }
    player.addEventListener('play', function() { isPlaying = true; });
    player.addEventListener('pause', function() { isPlaying = false; });
    var lastWebhookCheck = 0;
    var lastOfferCheck = 0;
    player.addEventListener('timeupdate', function() {
        var currentTime = player.currentTime;
        if (currentTime - lastWebhookCheck >= 0.5) {
            lastWebhookCheck = currentTime;
            if (!webhookSent && userStartedVideo && isPlaying && currentTime >= VIDEO_TRIGGER_TIME) {
                sendLeadWebhook();
            }
        }
        if (currentTime - lastOfferCheck >= 0.5) {
            lastOfferCheck = currentTime;
            if (!offerShown && userStartedVideo && isPlaying && currentTime >= OFFER_TRIGGER_TIME) {
                if (isFullscreen) exitFullscreen();
                showOfferMessage();
                offerShown = true;
            }
        }
    });
    player.addEventListener('ended', function() {
        isPlaying = false;
        if (playOverlay) playOverlay.classList.remove('hidden');
    });
    player.addEventListener('error', function() {
        showNotification('Error loading video. Please refresh the page.');
    });
    player.addEventListener('click', function(e) {
        if (e.target && e.target.closest && e.target.closest('.play-overlay')) return;
        toggleFullscreen();
    });
}

function enterFullscreen() {
    var videoSection = document.querySelector('.video-section');
    if (!videoSection) return;
    if (videoSection.requestFullscreen) {
        videoSection.requestFullscreen().catch(function() {});
    } else if (videoSection.webkitRequestFullscreen) {
        videoSection.webkitRequestFullscreen();
    } else if (videoSection.webkitEnterFullscreen) {
        videoSection.webkitEnterFullscreen();
    } else if (videoSection.msRequestFullscreen) {
        videoSection.msRequestFullscreen();
    } else if (videoSection.mozRequestFullScreen) {
        videoSection.mozRequestFullScreen();
    }
    isFullscreen = true;
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen().catch(function() {});
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    }
    isFullscreen = false;
}

function toggleFullscreen() {
    var player = document.getElementById('player');
    if (!isFullscreen) {
        enterFullscreen();
    } else {
        if (player && player.currentTime >= OFFER_TRIGGER_TIME) showOfferMessage();
        exitFullscreen();
    }
}

function initFullscreen() {
    var fullscreenBtn = document.querySelector('.fullscreen-btn');
    if (fullscreenBtn) {
        var handleFullscreenClick = function(e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            toggleFullscreen();
        };
        if ('ontouchstart' in window) {
            fullscreenBtn.addEventListener('touchstart', handleFullscreenClick, { passive: false });
        }
        fullscreenBtn.addEventListener('click', handleFullscreenClick);
    }
    var handleFullscreenChange = function() {
        isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.webkitIsFullScreen);
        updateFullscreenIcon();
        var btn = document.querySelector('.fullscreen-btn');
        if (btn) {
            btn.style.display = isFullscreen ? 'none' : 'flex';
        }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
}

function updateFullscreenIcon() {
    var fullscreenBtn = document.querySelector('.fullscreen-btn');
    if (!fullscreenBtn) return;
    var svg = fullscreenBtn.querySelector('svg');
    if (!svg) return;
    if (isFullscreen) {
        svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />';
    } else {
        svg.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />';
    }
}

function showNotification(message) {
    var notification = document.querySelector('.notification-toast');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification-toast';
        document.body.appendChild(notification);
    }
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(function() { notification.classList.remove('show'); }, 3000);
}

function showOfferMessage() {
    var offerContainer = document.getElementById('offer-cta-container');
    if (offerContainer) offerContainer.classList.remove('hidden');
}

document.addEventListener('keydown', function(e) {
    if (!e) e = window.event;
    var target = e.target || e.srcElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    var player = document.getElementById('player');
    var key = e.key ? e.key.toLowerCase() : '';
    if (key === 'f') {
        e.preventDefault();
        if (isFullscreen && player && player.currentTime >= OFFER_TRIGGER_TIME) showOfferMessage();
        toggleFullscreen();
    } else if (key === 'm') {
        e.preventDefault();
        if (player) {
            player.muted = !player.muted;
            isMuted = player.muted;
            showNotification(isMuted ? 'Muted' : 'Unmuted');
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    loadConfig();
    extractUrlParams();
    initPlayer();
    initFullscreen();
    disableRightClick();
});
