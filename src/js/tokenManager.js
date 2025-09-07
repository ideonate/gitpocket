// Token Manager - Handles multiple GitHub tokens for different organizations
import { safeSetItem, safeGetItem, safeRemoveItem } from './state.js';

class TokenManager {
    constructor() {
        this.tokens = this.loadTokens();
    }

    loadTokens() {
        const stored = safeGetItem('github_tokens');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Failed to parse stored tokens:', e);
                return this.getDefaultTokenStructure();
            }
        }
        
        // Migrate from single token to multi-token structure
        const oldToken = safeGetItem('github_token');
        const oldUser = safeGetItem('github_user');
        const oldScopes = safeGetItem('github_token_scopes');
        
        if (oldToken && oldUser) {
            try {
                const user = JSON.parse(oldUser);
                const tokens = this.getDefaultTokenStructure();
                tokens.personal = {
                    token: oldToken,
                    user: user,
                    scopes: oldScopes || 'Unknown',
                    addedAt: new Date().toISOString()
                };
                this.saveTokens(tokens);
                
                // Clean up old storage
                safeRemoveItem('github_token');
                safeRemoveItem('github_user');
                safeRemoveItem('github_token_scopes');
                
                return tokens;
            } catch (e) {
                console.error('Failed to migrate old token:', e);
            }
        }
        
        return this.getDefaultTokenStructure();
    }

    getDefaultTokenStructure() {
        return {
            personal: null,
            organizations: {}
        };
    }

    saveTokens(tokens = this.tokens) {
        safeSetItem('github_tokens', JSON.stringify(tokens));
        this.tokens = tokens;
    }

    getPersonalToken() {
        return this.tokens.personal;
    }

    setPersonalToken(tokenData) {
        this.tokens.personal = {
            ...tokenData,
            addedAt: new Date().toISOString()
        };
        this.saveTokens();
    }

    getOrgToken(orgName) {
        return this.tokens.organizations[orgName] || null;
    }

    setOrgToken(orgName, tokenData) {
        this.tokens.organizations[orgName] = {
            ...tokenData,
            orgName: orgName,
            addedAt: new Date().toISOString()
        };
        this.saveTokens();
    }

    removeOrgToken(orgName) {
        delete this.tokens.organizations[orgName];
        this.saveTokens();
    }

    getTokenForRepo(repoFullName) {
        // Parse owner from repo full name (e.g., "ideonate/gitpocket" -> "ideonate")
        const [owner] = repoFullName.split('/');
        
        // First check if we have an org-specific token
        const orgToken = this.getOrgToken(owner);
        if (orgToken) {
            return orgToken.token;
        }
        
        // Fall back to personal token
        const personalToken = this.getPersonalToken();
        return personalToken ? personalToken.token : null;
    }

    getAllTokens() {
        const tokens = [];
        
        if (this.tokens.personal) {
            tokens.push({
                type: 'personal',
                name: 'Personal Token',
                user: this.tokens.personal.user,
                scopes: this.tokens.personal.scopes,
                addedAt: this.tokens.personal.addedAt
            });
        }
        
        Object.entries(this.tokens.organizations).forEach(([orgName, tokenData]) => {
            tokens.push({
                type: 'organization',
                name: `${orgName} Organization`,
                orgName: orgName,
                user: tokenData.user,
                scopes: tokenData.scopes,
                addedAt: tokenData.addedAt
            });
        });
        
        return tokens;
    }

    hasAnyToken() {
        return this.tokens.personal !== null || Object.keys(this.tokens.organizations).length > 0;
    }

    clearAllTokens() {
        this.tokens = this.getDefaultTokenStructure();
        this.saveTokens();
    }

    async validateToken(token, tokenType = 'unknown') {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'User-Agent': 'GitHub-Manager-PWA'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Invalid token (${response.status})`);
            }
            
            const user = await response.json();
            
            // Check token scopes/type
            const classicScopes = response.headers.get('x-oauth-scopes') || '';
            const acceptedPermissions = response.headers.get('x-accepted-github-permissions') || '';
            
            let tokenInfo = '';
            if (classicScopes) {
                tokenInfo = `Classic PAT with scopes: ${classicScopes}`;
            } else if (acceptedPermissions) {
                tokenInfo = 'Fine-grained PAT (permissions not exposed by API)';
            } else {
                tokenInfo = `${tokenType} PAT`;
            }
            
            return {
                valid: true,
                user: user,
                scopes: tokenInfo,
                token: token
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }
}

// Create singleton instance
export const tokenManager = new TokenManager();