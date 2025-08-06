// content.js (Final "Brute-Force" Version)

class GradualOverlayController {
    constructor() {
        this.overlayId = 'bst-blocker-overlay';
        this.modalId = 'bst-blocker-modal';
        this.scrollInterval = null; // To hold our brute-force interval

        this.preventScroll = this.preventScroll.bind(this);
        this.init();
    }

    init() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'startGradualWarning') {
                this.showOverlay(message.sessionType || 'current', message.warningDelay || 60);
                sendResponse({ status: "warning_shown" });
            } else if (message.action === 'hideWarning') {
                this.hideOverlay();
                sendResponse({ status: "warning_hidden" });
            }
        });
    }

    preventScroll(e) {
        if (e.type === 'keydown') {
            const scrollKeys = [' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'];
            if (scrollKeys.includes(e.key)) {
                e.preventDefault();
            }
        } else {
            e.preventDefault();
        }
        e.stopImmediatePropagation();
    }

    attachScrollBlockers() {
        // Method 1: CSS Override
        document.documentElement.classList.add('bst-no-scroll');
        if (document.body) {
            document.body.classList.add('bst-no-scroll');
        }

        // Method 2: Aggressive Event Interception
        const options = { passive: false, capture: true };
        window.addEventListener('wheel', this.preventScroll, options);
        window.addEventListener('touchmove', this.preventScroll, options);
        window.addEventListener('keydown', this.preventScroll, { capture: true });

        // Method 3: Brute-force scroll reset
        this.scrollInterval = setInterval(() => {
            if (window.scrollY > 0 || document.documentElement.scrollTop > 0) {
                window.scrollTo(0, 0);
            }
        }, 100);
    }

    removeScrollBlockers() {
        // Clear brute-force interval
        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
            this.scrollInterval = null;
        }

        // Remove event listeners
        const options = { passive: false, capture: true };
        window.removeEventListener('wheel', this.preventScroll, options);
        window.removeEventListener('touchmove', this.preventScroll, options);
        window.removeEventListener('keydown', this.preventScroll, { capture: true });

        // Remove CSS override
        document.documentElement.classList.remove('bst-no-scroll');
        if (document.body) {
            document.body.classList.remove('bst-no-scroll');
        }
    }

    showOverlay(sessionType, warningDelay) {
        if (document.getElementById(this.overlayId)) {
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = this.overlayId;
        overlay.style.animationDuration = `${warningDelay}s`;

        overlay.innerHTML = `
            <div id="${this.modalId}" class="bst-blocker-modal">
                <div class="bst-modal-content">
                    <div class="bst-modal-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.5 9.75a.75.75 0 00-1.5 0v3c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75v-3a.75.75 0 00-.75-.75zm3 0a.75.75 0 00-1.5 0v3c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75v-3a.75.75 0 00-.75-.75zm.75-4.5a.75.75 0 00-1.5 0v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V7.5a.75.75 0 00-.75-.75z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <h2 class="bst-modal-title">Site Blocked</h2>
                    <p class="bst-modal-subtitle">
                        This website is restricted during your session: <strong>${sessionType}</strong>
                    </p>
                    <button class="bst-stay-focused">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V5a.75.75 0 00-.75-.75zM10 13a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                        </svg>
                        Stay focused on your goals
                    </button>
                    <p class="bst-extension-info">The extension popup remains accessible for session management.</p>
                    <p class="bst-modal-footer">Browser Session Tracker</p>
                </div>
            </div>
        `;

        const appendAndShow = () => {
            document.body.appendChild(overlay);

            // THE CHANGE IS HERE: We are commenting out the call to your scroll blocker.
            // this.attachScrollBlockers();

            const modal = document.getElementById(this.modalId);
            if (modal) {
                modal.style.display = 'none';
            }

            setTimeout(() => {
                if (modal) {
                    modal.style.display = 'flex';
                }
            }, warningDelay * 1000);
        };

        if (document.body) {
            appendAndShow();
        } else {
            document.addEventListener('DOMContentLoaded', appendAndShow, { once: true });
        }
    }

    hideOverlay() {
        // THE CHANGE IS HERE: We also comment out the removal function call.
        // this.removeScrollBlockers();

        const overlay = document.getElementById(this.overlayId);
        if (overlay) {
            overlay.style.animation = 'bst-fade-out 0.3s ease-out forwards';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
    }
}

new GradualOverlayController();