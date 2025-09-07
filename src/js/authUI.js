// Authentication UI - Manages the token management interface
import { tokenManager } from './tokenManager.js';
import { appState } from './state.js';

export function showTokenManagementUI() {
    const container = document.createElement('div');
    container.className = 'token-management-container';
    container.innerHTML = `
        <div class="token-management-modal">
            <div class="token-management-header">
                <h2>🔐 GitHub Token Management</h2>
                <button class="close-btn" onclick="this.closest('.token-management-container').remove()">✕</button>
            </div>
            
            <div class="token-management-body">
                <div class="token-section">
                    <h3>Personal Access Token</h3>
                    <p class="token-description">Your personal token is used for accessing your repositories and as a fallback for organization repositories.</p>
                    <div id="personalTokenStatus"></div>
                    <button class="add-token-btn" id="addPersonalTokenBtn">
                        ${tokenManager.getPersonalToken() ? '🔄 Replace Personal Token' : '➕ Add Personal Token'}
                    </button>
                </div>
                
                <div class="token-section">
                    <h3>Organization Tokens</h3>
                    <p class="token-description">Add specific tokens for organization repositories when your personal token doesn't have sufficient permissions.</p>
                    <div id="orgTokensList"></div>
                    <button class="add-token-btn" id="addOrgTokenBtn">➕ Add Organization Token</button>
                </div>
                
                <div class="token-list">
                    <h3>Active Tokens</h3>
                    <div id="activeTokensList"></div>
                </div>
            </div>
            
            <div class="token-management-footer">
                <button class="primary-btn" onclick="this.closest('.token-management-container').remove()">Done</button>
            </div>
        </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .token-management-container {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
        }
        
        .token-management-modal {
            background: white;
            border-radius: 12px;
            max-width: 600px;
            width: 100%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        
        .token-management-header {
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .token-management-header h2 {
            margin: 0;
            font-size: 20px;
            color: #333;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
        }
        
        .close-btn:hover {
            background: #f0f0f0;
        }
        
        .token-management-body {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        
        .token-section {
            margin-bottom: 30px;
        }
        
        .token-section h3 {
            margin: 0 0 8px 0;
            font-size: 16px;
            color: #333;
        }
        
        .token-description {
            margin: 0 0 12px 0;
            font-size: 14px;
            color: #666;
            line-height: 1.5;
        }
        
        .add-token-btn {
            background: #6750a4;
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .add-token-btn:hover {
            background: #5a40a0;
        }
        
        .token-list {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
        }
        
        .token-item {
            background: #f5f5f5;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .token-info {
            flex: 1;
        }
        
        .token-name {
            font-weight: 500;
            margin-bottom: 4px;
        }
        
        .token-details {
            font-size: 12px;
            color: #666;
        }
        
        .token-actions {
            display: flex;
            gap: 8px;
        }
        
        .token-action-btn {
            background: none;
            border: 1px solid #ddd;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .token-action-btn:hover {
            background: #f0f0f0;
        }
        
        .token-action-btn.danger {
            color: #d32f2f;
            border-color: #d32f2f;
        }
        
        .token-action-btn.danger:hover {
            background: #ffebee;
        }
        
        .token-management-footer {
            padding: 20px;
            border-top: 1px solid #e0e0e0;
            display: flex;
            justify-content: flex-end;
        }
        
        .primary-btn {
            background: #6750a4;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .primary-btn:hover {
            background: #5a40a0;
        }
        
        .token-status {
            padding: 8px 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            font-size: 14px;
        }
        
        .token-status.active {
            background: #e8f5e9;
            color: #2e7d32;
            border: 1px solid #4caf50;
        }
        
        .token-status.missing {
            background: #fff3e0;
            color: #e65100;
            border: 1px solid #ff9800;
        }
        
        @media (prefers-color-scheme: dark) {
            .token-management-modal {
                background: #1e1e1e;
            }
            
            .token-management-header h2,
            .token-section h3,
            .token-name {
                color: #e0e0e0;
            }
            
            .token-management-header,
            .token-management-footer,
            .token-list {
                border-color: #333;
            }
            
            .close-btn {
                color: #aaa;
            }
            
            .close-btn:hover {
                background: #333;
            }
            
            .token-description,
            .token-details {
                color: #aaa;
            }
            
            .token-item {
                background: #2a2a2a;
            }
            
            .token-action-btn {
                border-color: #555;
                color: #e0e0e0;
            }
            
            .token-action-btn:hover {
                background: #333;
            }
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(container);
    
    // Update the UI with current tokens
    updateTokenDisplay();
    
    // Add event listeners
    document.getElementById('addPersonalTokenBtn').addEventListener('click', () => addPersonalToken());
    document.getElementById('addOrgTokenBtn').addEventListener('click', () => addOrgToken());
}

function updateTokenDisplay() {
    const personalStatus = document.getElementById('personalTokenStatus');
    const orgList = document.getElementById('orgTokensList');
    const activeList = document.getElementById('activeTokensList');
    
    // Update personal token status
    const personalToken = tokenManager.getPersonalToken();
    if (personalToken) {
        personalStatus.innerHTML = `
            <div class="token-status active">
                ✅ Active: ${personalToken.user.login} (${personalToken.scopes})
            </div>
        `;
    } else {
        personalStatus.innerHTML = `
            <div class="token-status missing">
                ⚠️ No personal token configured
            </div>
        `;
    }
    
    // Update active tokens list
    const allTokens = tokenManager.getAllTokens();
    if (allTokens.length === 0) {
        activeList.innerHTML = '<p style="color: #666; font-size: 14px;">No tokens configured yet.</p>';
    } else {
        activeList.innerHTML = allTokens.map(token => `
            <div class="token-item">
                <div class="token-info">
                    <div class="token-name">${token.name}</div>
                    <div class="token-details">
                        User: ${token.user.login} | ${token.scopes}
                    </div>
                </div>
                <div class="token-actions">
                    ${token.type === 'organization' ? 
                        `<button class="token-action-btn danger" onclick="removeOrgToken('${token.orgName}')">Remove</button>` : 
                        ''}
                </div>
            </div>
        `).join('');
    }
}

async function addPersonalToken() {
    const token = prompt(
        'Enter your Personal GitHub Access Token:\n\n' +
        '🔑 For FINE-GRAINED tokens (Recommended):\n' +
        '1. Go to github.com/settings/personal-access-tokens/fine-grained\n' +
        '2. Generate new token\n' +
        '3. Repository access: "All repositories" or select specific repos\n' +
        '4. Set permissions:\n' +
        '   • Issues: Read and Write\n' +
        '   • Pull requests: Read and Write\n' +
        '   • Metadata: Read\n\n' +
        '🔑 For CLASSIC tokens:\n' +
        '1. Go to github.com/settings/tokens\n' +
        '2. Generate new token (classic)\n' +
        '3. Select scopes: repo (full), write:discussion'
    );
    
    if (!token) return;
    
    const result = await tokenManager.validateToken(token, 'Personal');
    if (result.valid) {
        tokenManager.setPersonalToken(result);
        appState.token = token;
        appState.user = result.user;
        appState.tokenScopes = result.scopes;
        appState.authenticated = true;
        updateTokenDisplay();
        alert(`✅ Personal token added successfully for ${result.user.login}`);
        
        // Reload the main app if this is the first token
        if (!appState.authenticated) {
            const { showMainApp } = await import('./app.js');
            showMainApp();
        }
    } else {
        alert(`❌ Invalid token: ${result.error}`);
    }
}

async function addOrgToken() {
    const orgName = prompt('Enter the organization name (e.g., "microsoft", "facebook"):');
    if (!orgName) return;
    
    const token = prompt(
        `Enter a GitHub token with access to ${orgName} organization:\n\n` +
        '⚠️ Organization-specific requirements:\n' +
        '• The organization must allow your token type (fine-grained or classic)\n' +
        '• For fine-grained tokens, you may need approval from org owners\n' +
        '• Ensure the token has Issues and Pull requests write permissions\n\n' +
        'Token:'
    );
    
    if (!token) return;
    
    const result = await tokenManager.validateToken(token, `${orgName} Organization`);
    if (result.valid) {
        tokenManager.setOrgToken(orgName, result);
        updateTokenDisplay();
        alert(`✅ Organization token added successfully for ${orgName}`);
    } else {
        alert(`❌ Invalid token: ${result.error}`);
    }
}

window.removeOrgToken = function(orgName) {
    if (confirm(`Remove token for ${orgName} organization?`)) {
        tokenManager.removeOrgToken(orgName);
        updateTokenDisplay();
    }
};

export function showAuthScreen() {
    const container = document.getElementById('app');
    container.innerHTML = `
        <div class="auth-screen">
            <div class="auth-container">
                <div class="auth-logo">🐙</div>
                <h1 class="auth-title">GitPocket</h1>
                <p class="auth-subtitle">Manage GitHub on the go</p>
                
                <div class="auth-buttons">
                    <button class="auth-btn primary" id="quickAuthBtn">
                        <span class="auth-btn-icon">🚀</span>
                        <span class="auth-btn-text">Quick Setup</span>
                    </button>
                    
                    <button class="auth-btn secondary" id="advancedAuthBtn">
                        <span class="auth-btn-icon">⚙️</span>
                        <span class="auth-btn-text">Advanced Token Management</span>
                    </button>
                </div>
                
                <div class="auth-info">
                    <h3>Required Permissions:</h3>
                    <ul>
                        <li>Issues: Read and Write</li>
                        <li>Pull requests: Read and Write</li>
                        <li>Metadata: Read</li>
                    </ul>
                    
                    <p class="auth-note">
                        💡 For organization repositories, you may need separate tokens with appropriate permissions.
                    </p>
                </div>
                
                <div id="authError" class="auth-error" style="display: none;"></div>
            </div>
        </div>
    `;
    
    // Add auth screen styles
    const style = document.createElement('style');
    style.textContent = `
        .auth-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        
        .auth-container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            text-align: center;
        }
        
        .auth-logo {
            font-size: 64px;
            margin-bottom: 20px;
        }
        
        .auth-title {
            font-size: 28px;
            margin: 0 0 8px 0;
            color: #333;
        }
        
        .auth-subtitle {
            color: #666;
            margin: 0 0 30px 0;
        }
        
        .auth-buttons {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 30px;
        }
        
        .auth-btn {
            padding: 14px 20px;
            border-radius: 8px;
            border: none;
            font-size: 16px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
        }
        
        .auth-btn.primary {
            background: #6750a4;
            color: white;
        }
        
        .auth-btn.primary:hover {
            background: #5a40a0;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(103, 80, 164, 0.3);
        }
        
        .auth-btn.secondary {
            background: #f5f5f5;
            color: #333;
            border: 1px solid #ddd;
        }
        
        .auth-btn.secondary:hover {
            background: #e8e8e8;
        }
        
        .auth-btn-icon {
            font-size: 20px;
        }
        
        .auth-info {
            text-align: left;
            background: #f9f9f9;
            border-radius: 8px;
            padding: 16px;
            margin-top: 20px;
        }
        
        .auth-info h3 {
            margin: 0 0 12px 0;
            font-size: 14px;
            color: #666;
        }
        
        .auth-info ul {
            margin: 0;
            padding-left: 20px;
            color: #666;
            font-size: 14px;
        }
        
        .auth-info li {
            margin-bottom: 4px;
        }
        
        .auth-note {
            margin: 12px 0 0 0;
            font-size: 13px;
            color: #666;
            line-height: 1.5;
        }
        
        .auth-error {
            background: #ffebee;
            color: #c62828;
            padding: 12px;
            border-radius: 8px;
            margin-top: 16px;
            font-size: 14px;
        }
    `;
    document.head.appendChild(style);
    
    // Add event listeners
    document.getElementById('quickAuthBtn').addEventListener('click', async () => {
        await addPersonalToken();
        if (tokenManager.getPersonalToken()) {
            const { showMainApp } = await import('./app.js');
            showMainApp();
        }
    });
    
    document.getElementById('advancedAuthBtn').addEventListener('click', () => {
        showTokenManagementUI();
    });
}