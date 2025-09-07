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
        const token = prompt('Enter your GitHub Personal Access Token:\n\n🔑 For FINE-GRAINED tokens (Recommended):\n1. Go to github.com/settings/personal-access-tokens/fine-grained\n2. Generate new token\n3. Repository access: Select specific repos OR "All repositories"\n4. Set permissions:\n   • Issues: Read and Write\n   • Pull requests: Read and Write\n   • Metadata: Read\n\n⚠️ For ORGANIZATION repos:\n• Organization must allow fine-grained PATs\n• You may need org owner approval\n• Consider using Classic PAT if fine-grained doesn\'t work\n\n🔑 For CLASSIC tokens (if fine-grained doesn\'t work):\n1. Go to github.com/settings/tokens\n2. Generate new token (classic)\n3. Select scopes: repo (full), write:discussion\n\n5. Copy and paste token here');
        
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
        // Classic PATs use x-oauth-scopes, fine-grained PATs don't expose scopes
        const classicScopes = response.headers.get('x-oauth-scopes') || '';
        const acceptedPermissions = response.headers.get('x-accepted-github-permissions') || '';
        
        // Determine token type and set appropriate scopes/permissions
        let tokenInfo = '';
        if (classicScopes) {
            tokenInfo = `Classic PAT with scopes: ${classicScopes}`;
            console.log('Classic PAT detected, scopes:', classicScopes);
        } else if (acceptedPermissions) {
            tokenInfo = 'Fine-grained PAT (permissions not exposed by API)';
            console.log('Fine-grained PAT detected');
        } else {
            // Try to determine token type by making a test API call
            tokenInfo = await detectTokenType(token);
        }
        
        console.log('Token info:', tokenInfo);
        console.log('Accepted permissions:', acceptedPermissions);
        
        // Store token info including type and scopes/permissions
        appState.tokenScopes = tokenInfo;
        
        // Store credentials
        safeSetItem('github_token', token);
        safeSetItem('github_user', JSON.stringify(user));
        safeSetItem('github_token_scopes', tokenInfo);
        
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

async function detectTokenType(token) {
    try {
        // Try to create an issue comment on a test repo to check permissions
        const testResponse = await fetch('https://api.github.com/repos/octocat/Hello-World/issues', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });
        
        // Check headers for token type indicators
        const hasClassicScopes = testResponse.headers.get('x-oauth-scopes');
        const hasPermissions = testResponse.headers.get('x-accepted-github-permissions');
        
        if (hasClassicScopes) {
            return `Classic PAT with scopes: ${hasClassicScopes}`;
        } else if (hasPermissions || testResponse.ok) {
            return 'Fine-grained PAT (check GitHub settings for permissions)';
        } else {
            return 'PAT type unknown (check GitHub settings for permissions)';
        }
    } catch (error) {
        console.warn('Could not detect token type:', error);
        return 'PAT (check GitHub settings for permissions)';
    }
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
            appState.tokenScopes = scopes || 'PAT (check GitHub settings for permissions)';
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