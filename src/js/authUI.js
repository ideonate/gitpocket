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
            z-index: 10000;
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
    
    // Return early if elements don't exist yet
    if (!personalStatus || !orgList || !activeList) {
        return;
    }
    
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
        
        // Load the main app or reload repositories if already in main app
        const mainApp = document.getElementById('mainApp');
        if (mainApp && mainApp.style.display !== 'none') {
            // Already in main app, just reload data
            const { loadData } = await import('./api.js');
            await loadData(null, true); // Force refresh to use new token
        } else {
            // Not in main app yet, show it
            const { showMainApp } = await import('./app.js');
            showMainApp();
        }
    } else {
        alert(`❌ Invalid token: ${result.error}`);
    }
}

async function addOrgToken() {
    // First, show loading state and fetch organizations
    const loadingDialog = document.createElement('div');
    loadingDialog.className = 'modal-overlay';
    loadingDialog.innerHTML = `
        <div class="modal-dialog" style="text-align: center;">
            <h2>Loading Organizations...</h2>
            <p>Fetching your GitHub organizations...</p>
            <div class="loading-spinner" style="margin: 20px auto; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
            }
            .modal-dialog {
                background: white;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                max-width: 500px;
                width: 90%;
            }
            @media (prefers-color-scheme: dark) {
                .modal-dialog {
                    background: #1e1e1e;
                    color: #e0e0e0;
                }
            }
        </style>
    `;
    document.body.appendChild(loadingDialog);

    // Fetch organizations
    console.log('Fetching user organizations...');
    const orgsResult = await tokenManager.fetchUserOrganizations();
    console.log('Organizations result:', orgsResult);
    
    // Remove loading dialog
    if (loadingDialog && loadingDialog.parentNode) {
        document.body.removeChild(loadingDialog);
    }

    if (!orgsResult || !orgsResult.success) {
        console.error('Failed to fetch organizations:', orgsResult?.error || 'Unknown error');
        alert(`⚠️ Could not fetch organizations: ${orgsResult?.error || 'Unknown error'}\n\nYou can still manually enter an organization name.`);
        // Fall back to manual entry
        const orgName = prompt('Enter the organization name manually (e.g., "microsoft", "facebook"):');
        if (!orgName) return;
        
        await requestOrgToken(orgName);
        return;
    }

    // Check if orgs array exists and is valid
    if (!orgsResult.orgs || !Array.isArray(orgsResult.orgs)) {
        console.error('Invalid organizations data:', orgsResult);
        alert(`⚠️ Invalid organization data received.\n\nYou can still manually enter an organization name.`);
        const orgName = prompt('Enter the organization name manually (e.g., "microsoft", "facebook"):');
        if (!orgName) return;
        
        await requestOrgToken(orgName);
        return;
    }

    if (orgsResult.orgs.length === 0) {
        alert(`📝 No organizations found via GitHub API.\n\nThis is common with fine-grained PATs because:\n• Organizations must opt-in to fine-grained PAT access\n• The /user/orgs endpoint may return empty for fine-grained tokens\n\nYou can still manually enter your organization name!`);
        const orgName = prompt('Enter the organization name manually (e.g., "microsoft", "facebook"):');
        if (!orgName) return;
        
        await requestOrgToken(orgName);
        return;
    }

    // Create organization selection dialog
    console.log('Creating organization selection dialog with', orgsResult.orgs.length, 'organizations');
    
    try {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
        `;
        dialog.innerHTML = `
        <div class="modal-dialog" style="
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;">
            <h2>Select Organization</h2>
            <p style="margin-bottom: 20px; color: #666;">Choose an organization to add a token for:</p>
            ${orgsResult.warning ? `
            <div style="
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 6px;
                padding: 10px;
                margin-bottom: 15px;
                font-size: 0.9em;
                color: #92400e;
            ">
                ⚠️ <strong>Note:</strong> ${orgsResult.warning}
            </div>
            ` : ''}
            
            <div class="org-list" style="margin-bottom: 20px; max-height: 300px; overflow-y: auto;">
                ${orgsResult.orgs.map(org => `
                    <div class="org-item" data-org="${org.login}" style="
                        display: flex;
                        align-items: center;
                        padding: 12px;
                        margin-bottom: 8px;
                        border: 1px solid #e5e7eb;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                    " onmouseover="this.style.backgroundColor='#f3f4f6'" onmouseout="this.style.backgroundColor='transparent'">
                        ${org.avatar_url ? `<img src="${org.avatar_url}" alt="${org.login}" style="width: 32px; height: 32px; border-radius: 4px; margin-right: 12px;">` : ''}
                        <div style="flex: 1;">
                            <div style="font-weight: 600; color: #333;">${org.name} ${org.inferred ? '<span style="font-size: 0.8em; color: #f59e0b; font-weight: normal;">(inferred)</span>' : ''}</div>
                            <div style="font-size: 0.9em; color: #6b7280;">@${org.login}</div>
                            ${org.description ? `<div style="font-size: 0.85em; color: #9ca3af; margin-top: 4px;">${org.description}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
                <p style="font-size: 0.9em; color: #6b7280; margin-bottom: 10px;">
                    💡 <strong>Can't see your organization?</strong> Enter its name manually below.<br>
                    <span style="font-size: 0.85em;">Fine-grained PATs may not show all orgs unless they've opted-in.</span>
                </p>
                <input type="text" id="manualOrgName" placeholder="e.g., microsoft, facebook" style="
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #e5e7eb;
                    border-radius: 4px;
                    font-size: 14px;
                    margin-bottom: 10px;
                    box-sizing: border-box;
                ">
                <button id="manualOrgSubmit" style="
                    padding: 8px 16px;
                    background: #6366f1;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                ">Add Manual Organization</button>
            </div>
            
            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                <button id="cancelOrgSelection" style="
                    padding: 8px 16px;
                    background: #e5e7eb;
                    color: #374151;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                ">Cancel</button>
            </div>
        </div>
        <style>
            @media (prefers-color-scheme: dark) {
                .modal-dialog {
                    background: #1e1e1e !important;
                    color: #e0e0e0 !important;
                }
                .modal-dialog h2 {
                    color: #e0e0e0 !important;
                }
                .org-item {
                    border-color: #444 !important;
                }
                .org-item:hover {
                    background-color: #333 !important;
                }
                .org-item > div > div:first-child {
                    color: #e0e0e0 !important;
                }
                #manualOrgName {
                    background: #2a2a2a;
                    border-color: #444;
                    color: #e0e0e0;
                }
                #cancelOrgSelection {
                    background: #333 !important;
                    color: #e0e0e0 !important;
                }
            }
        </style>
    `;
        document.body.appendChild(dialog);

        // Add event listeners
        const orgItems = dialog.querySelectorAll('.org-item');
        orgItems.forEach(item => {
            item.addEventListener('click', async () => {
                const orgName = item.dataset.org;
                document.body.removeChild(dialog);
                await requestOrgToken(orgName);
            });
        });

        const manualSubmitBtn = dialog.querySelector('#manualOrgSubmit');
        if (manualSubmitBtn) {
            manualSubmitBtn.addEventListener('click', async () => {
                const orgName = dialog.querySelector('#manualOrgName').value.trim();
                if (orgName) {
                    document.body.removeChild(dialog);
                    await requestOrgToken(orgName);
                }
            });
        }

        const cancelBtn = dialog.querySelector('#cancelOrgSelection');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(dialog);
            });
        }

        // Allow closing with ESC key
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(dialog);
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
        
        console.log('Organization selection dialog created successfully');
    } catch (error) {
        console.error('Error creating organization selection dialog:', error);
        alert(`❌ Error creating organization selection dialog: ${error.message}\n\nYou can still manually enter an organization name.`);
        const orgName = prompt('Enter the organization name manually (e.g., "microsoft", "facebook"):');
        if (orgName) {
            await requestOrgToken(orgName);
        }
    }
}

async function requestOrgToken(orgName) {
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
        
        // Reload repositories after adding org token
        const { loadData } = await import('./api.js');
        await loadData(null, true); // Force refresh to include new org repos
    } else {
        alert(`❌ Invalid token: ${result.error}`);
    }
}

window.removeOrgToken = async function(orgName) {
    if (confirm(`Remove token for ${orgName} organization?`)) {
        tokenManager.removeOrgToken(orgName);
        updateTokenDisplay();
        
        // Reload repositories after removing org token
        const { loadData } = await import('./api.js');
        await loadData(null, true); // Force refresh to update repo list
    }
};

export function showAuthScreen() {
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');
    
    if (mainApp) mainApp.style.display = 'none';
    if (authScreen) {
        authScreen.style.display = 'flex';
        authScreen.innerHTML = `
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
}