// Authentication functions
import { appState, safeSetItem, safeGetItem, safeRemoveItem } from './state.js';

export async function authenticate() {
    const button = document.getElementById('authButton');
    const icon = document.getElementById('authIcon');
    const text = document.getElementById('authText');
    const errorDiv = document.getElementById('authError');
    
    button.disabled = true;
    icon.innerHTML = '<div class="loading"></div>';
    text.textContent = 'Connecting...';
    errorDiv.style.display = 'none';
    
    try {
        const token = prompt('Enter your GitHub Fine-grained Personal Access Token:\n\n1. Go to github.com/settings/personal-access-tokens/fine-grained\n2. Generate new token\n3. Select your repositories\n4. Set permissions: Issues (Read+Write), Pull requests (Read+Write), Metadata (Read)\n5. Copy and paste here');
        
        if (!token) {
            throw new Error('Authentication cancelled');
        }
        
        // Validate token by fetching user info
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28',
                'User-Agent': 'GitHub-Manager-PWA'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Invalid token (${response.status})`);
        }
        
        const user = await response.json();
        
        // Check token scopes from response headers
        const scopes = response.headers.get('x-oauth-scopes') || '';
        const acceptedScopes = response.headers.get('x-accepted-oauth-scopes') || '';
        
        console.log('Token scopes:', scopes);
        console.log('Accepted scopes:', acceptedScopes);
        
        // Store token info including scopes
        appState.tokenScopes = scopes;
        
        // Store credentials
        safeSetItem('github_token', token);
        safeSetItem('github_user', JSON.stringify(user));
        safeSetItem('github_token_scopes', scopes);
        
        appState.authenticated = true;
        appState.token = token;
        appState.user = user;
        
        // Import showMainApp dynamically to avoid circular dependencies
        const { showMainApp } = await import('./app.js');
        showMainApp();
        
    } catch (error) {
        console.error('Auth error:', error);
        showAuthError('Authentication failed: ' + error.message);
        button.disabled = false;
        icon.textContent = '🐙';
        text.textContent = 'Sign in with GitHub';
    }
}

export function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

export function logout() {
    safeRemoveItem('github_token');
    safeRemoveItem('github_user');
    safeRemoveItem('github_token_scopes');
    location.reload();
}

export function checkExistingAuth() {
    const token = safeGetItem('github_token');
    const user = safeGetItem('github_user');
    const scopes = safeGetItem('github_token_scopes');
    
    if (token && user) {
        try {
            appState.authenticated = true;
            appState.token = token;
            appState.user = JSON.parse(user);
            appState.tokenScopes = scopes;
            return true;
        } catch (parseError) {
            console.warn('Failed to parse stored user data:', parseError);
            // Clear corrupted data
            safeRemoveItem('github_token');
            safeRemoveItem('github_user');
            safeRemoveItem('github_token_scopes');
        }
    }
    return false;
}