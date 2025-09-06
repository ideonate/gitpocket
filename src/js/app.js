// Main Application Entry Point
import { appState } from './state.js';
import { authenticate, logout, checkExistingAuth } from './auth.js';
import { loadData } from './api.js';
import { showTab, hideDetail, addComment, showIssueDetail, showPRDetail, mergePR, closePR } from './ui.js';
import { registerServiceWorker, setupInstallPrompt, installApp, hideInstallPrompt } from './pwa.js';

// Export functions that need to be available globally
export function showMainApp() {
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
    loadData();
}

export function refreshData() {
    loadData();
}

export function showProfile() {
    if (confirm(`Signed in as ${appState.user.login}\n\nSign out?`)) {
        logout();
    }
}

// Initialize app
export function initApp() {
    try {
        // Check for existing auth
        if (checkExistingAuth()) {
            showMainApp();
            return;
        }
        
        // Show auth screen
        const authScreen = document.getElementById('authScreen');
        if (authScreen) {
            authScreen.style.display = 'flex';
        }
        
        // Setup comment input
        const commentInput = document.getElementById('commentInput');
        const sendBtn = document.getElementById('sendBtn');
        
        if (commentInput && sendBtn) {
            commentInput.addEventListener('input', () => {
                sendBtn.disabled = !commentInput.value.trim();
            });
        }
        
    } catch (error) {
        console.error('Init error:', error);
        // Show a fallback error message
        document.body.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 32px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                <h2 style="margin-bottom: 16px;">App Initialization Error</h2>
                <p style="margin-bottom: 24px; color: #666; line-height: 1.4;">
                    The app encountered an error during startup. This might be due to browser compatibility issues.
                </p>
                <button onclick="location.reload()" style="padding: 12px 24px; background: #6750a4; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
                    Retry
                </button>
                <div style="margin-top: 24px; font-size: 14px; color: #999;">
                    Try using Chrome, Safari, or Firefox for the best experience.
                </div>
            </div>
        `;
    }
}

// Make functions available globally for onclick handlers
window.authenticate = authenticate;
window.showTab = showTab;
window.hideDetail = hideDetail;
window.addComment = addComment;
window.refreshData = refreshData;
window.showProfile = showProfile;
window.showIssueDetail = showIssueDetail;
window.showPRDetail = showPRDetail;
window.mergePR = mergePR;
window.closePR = closePR;
window.installApp = installApp;
window.hideInstallPrompt = hideInstallPrompt;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    registerServiceWorker();
    setupInstallPrompt();
    initApp();
});

// Handle errors globally
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});