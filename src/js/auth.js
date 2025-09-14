// Authentication functions
import { appState, safeSetItem, safeGetItem, safeRemoveItem } from './state.js';
import { tokenManager } from './tokenManager.js';
import { showAuthScreen, showTokenManagementUI } from './authUI.js';

export async function authenticate() {
    // Show the new authentication UI
    showAuthScreen();
}

export function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

export function logout() {
    // Clear all tokens using the token manager
    tokenManager.clearAllTokens();
    
    // Clear app state
    appState.authenticated = false;
    appState.user = null;
    
    // Reload the page
    location.reload();
}

// Token type detection is now handled in tokenManager.validateToken()

export function checkExistingAuth() {
    // Check if we have any tokens
    if (!tokenManager.hasAnyToken()) {
        return false;
    }
    
    // Get the personal token to use as default
    const personalToken = tokenManager.getPersonalToken();
    if (personalToken) {
        appState.authenticated = true;
        appState.user = personalToken.user;
        return true;
    }
    
    // If no personal token but we have org tokens, we're partially authenticated
    const allTokens = tokenManager.getAllTokens();
    if (allTokens.length > 0) {
        // Use the first available token as fallback
        const firstToken = allTokens[0];
        appState.authenticated = true;
        appState.user = firstToken.user;
        return true;
    }
    
    return false;
}