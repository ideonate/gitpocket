// Token Manager - Handles multiple GitHub tokens for different organizations
import { safeSetItem, safeGetItem, safeRemoveItem } from './state.js';
import { githubAPI } from './github-client.js';
import { validateToken } from './api.js';

// Function to clear the repository cache
function clearRepoCache() {
    try {
        localStorage.removeItem('gitpocket_repos_cache');
        console.log('[TokenManager] Repository cache cleared after token change');
    } catch (e) {
        console.warn('[TokenManager] Failed to clear repository cache:', e);
    }
}

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
            addedAt: new Date().toISOString(),
            lastValidated: new Date().toISOString()
        };
        this.saveTokens();
        clearRepoCache(); // Clear cache when token is set/updated
    }

    getOrgToken(orgName) {
        return this.tokens.organizations[orgName] || null;
    }

    setOrgToken(orgName, tokenData) {
        this.tokens.organizations[orgName] = {
            ...tokenData,
            orgName: orgName,
            addedAt: new Date().toISOString(),
            lastValidated: new Date().toISOString()
        };
        this.saveTokens();
        clearRepoCache(); // Clear cache when org token is set/updated
    }

    removeOrgToken(orgName) {
        delete this.tokens.organizations[orgName];
        this.saveTokens();
        clearRepoCache(); // Clear cache when org token is removed
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
                token: this.tokens.personal.token,
                user: this.tokens.personal.user,
                scopes: this.tokens.personal.scopes,
                addedAt: this.tokens.personal.addedAt,
                repoCount: this.tokens.personal.repoCount,
                repoAccessError: this.tokens.personal.repoAccessError,
                lastError: this.tokens.personal.lastError,
                lastErrorTime: this.tokens.personal.lastErrorTime
            });
        }
        
        Object.entries(this.tokens.organizations).forEach(([orgName, tokenData]) => {
            tokens.push({
                type: 'organization',
                name: `${orgName} Organization`,
                orgName: orgName,
                token: tokenData.token,
                user: tokenData.user,
                scopes: tokenData.scopes,
                addedAt: tokenData.addedAt,
                repoCount: tokenData.repoCount,
                repoAccessError: tokenData.repoAccessError,
                lastError: tokenData.lastError,
                lastErrorTime: tokenData.lastErrorTime
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
        clearRepoCache(); // Clear cache when all tokens are cleared
    }

    async fetchUserOrganizations(token = null) {
        const authToken = token || (this.tokens.personal ? this.tokens.personal.token : null);
        if (!authToken) {
            return { success: false, error: 'No token available', orgs: [], fallbackUsed: false };
        }

        let orgs = [];
        let fallbackUsed = false;
        
        try {
            
            // First, try the standard /user/orgs endpoint
            const response = await githubAPI('/user/orgs', authToken);
            
            orgs = await response.json();
            
            // Create a map to track all unique organizations
            const orgMap = new Map();
            
            // Add orgs from the primary endpoint
            orgs.forEach(org => {
                orgMap.set(org.login, {
                    login: org.login,
                    name: org.name || org.login,
                    avatar_url: org.avatar_url,
                    description: org.description,
                    inferred: false // Not inferred, from primary API
                });
            });
            
            console.log(`Found ${orgMap.size} organizations from /user/orgs, also checking for additional orgs...`);
            
            // ALWAYS try to get additional organizations from user's repos
            // This helps find orgs that don't expose via /user/orgs
            try {
                const reposResponse = await githubAPI('/user/repos?per_page=100&affiliation=organization_member', authToken);
                const repos = await reposResponse.json();
                
                // Extract unique organizations from repos
                repos.forEach(repo => {
                    if (repo.owner && repo.owner.type === 'Organization' && !orgMap.has(repo.owner.login)) {
                        orgMap.set(repo.owner.login, {
                            login: repo.owner.login,
                            name: repo.owner.login,
                            avatar_url: repo.owner.avatar_url,
                            description: null,
                            inferred: true // Mark as inferred from repos
                        });
                        fallbackUsed = true;
                    }
                });
                
                console.log(`Found ${orgMap.size} total organizations after checking repos`);
            } catch (reposError) {
                console.log('Could not fetch repos for additional orgs:', reposError.message);
            }
            
            // ALWAYS try /user/memberships/orgs endpoint for even more orgs
            try {
                const membershipsResponse = await githubAPI('/user/memberships/orgs', authToken);
                const memberships = await membershipsResponse.json();
                // Merge any new orgs found through memberships
                memberships.forEach(membership => {
                    if (membership.organization && !orgMap.has(membership.organization.login)) {
                        orgMap.set(membership.organization.login, {
                            login: membership.organization.login,
                            name: membership.organization.name || membership.organization.login,
                            avatar_url: membership.organization.avatar_url,
                            description: membership.organization.description,
                            inferred: true
                        });
                        fallbackUsed = true;
                    }
                });
                console.log(`Found ${orgMap.size} total organizations after checking memberships`);
            } catch (membershipError) {
                // Memberships endpoint might not be available, continue with what we have
                console.log('Memberships endpoint not available:', membershipError.message);
            }
            
            // Convert map back to array
            orgs = Array.from(orgMap.values());
            
            return {
                success: true,
                orgs: orgs.map(org => ({
                    login: org.login,
                    name: org.name || org.login,
                    avatar_url: org.avatar_url,
                    description: org.description,
                    inferred: org.inferred || false
                })),
                fallbackUsed: fallbackUsed,
                warning: fallbackUsed ? 'Additional organizations were discovered from repository and membership data. Some organizations may require separate tokens for full access.' : null
            };
        } catch (error) {
            console.error('Failed to fetch organizations:', error);
            return {
                success: false,
                error: error.message,
                orgs: [],
                fallbackUsed: false
            };
        }
    }

    async validateToken(token, tokenType = 'unknown', orgName = null) {
        // Import validateToken function from api.js
        return validateToken(token, tokenType, orgName);
    }
}

// Create singleton instance
export const tokenManager = new TokenManager();