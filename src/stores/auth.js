import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { githubAPI } from '../services/github-client';

export const useAuthStore = defineStore('auth', () => {
  // State
  const tokens = ref({
    personal: null,
    organizations: {}
  });
  const user = ref(null);
  const authenticated = ref(false);

  // Getters
  const personalToken = computed(() => tokens.value.personal);
  const orgTokens = computed(() => tokens.value.organizations);
  const hasAnyToken = computed(() =>
    tokens.value.personal !== null || Object.keys(tokens.value.organizations).length > 0
  );

  const allTokens = computed(() => {
    const result = [];
    if (tokens.value.personal) {
      result.push({
        type: 'personal',
        name: 'Personal Token',
        token: tokens.value.personal.token,
        user: tokens.value.personal.user,
        scopes: tokens.value.personal.scopes,
        addedAt: tokens.value.personal.addedAt,
        repoCount: tokens.value.personal.repoCount,
        repoAccessError: tokens.value.personal.repoAccessError,
        lastError: tokens.value.personal.lastError,
        lastErrorTime: tokens.value.personal.lastErrorTime
      });
    }
    Object.entries(tokens.value.organizations).forEach(([orgName, tokenData]) => {
      result.push({
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
    return result;
  });

  // Actions
  function setPersonalToken(tokenData) {
    tokens.value.personal = {
      ...tokenData,
      addedAt: new Date().toISOString(),
      lastValidated: new Date().toISOString()
    };
    if (tokenData.user) {
      user.value = tokenData.user;
      authenticated.value = true;
    }
    clearRepoCache();
  }

  function getOrgToken(orgName) {
    return tokens.value.organizations[orgName] || null;
  }

  function setOrgToken(orgName, tokenData) {
    tokens.value.organizations[orgName] = {
      ...tokenData,
      orgName: orgName,
      addedAt: new Date().toISOString(),
      lastValidated: new Date().toISOString()
    };
    clearRepoCache();
  }

  function removeOrgToken(orgName) {
    delete tokens.value.organizations[orgName];
    clearRepoCache();
  }

  function getTokenForRepo(repoFullName) {
    const [owner] = repoFullName.split('/');
    const orgToken = tokens.value.organizations[owner];
    if (orgToken) {
      return orgToken.token;
    }
    return tokens.value.personal?.token || null;
  }

  function clearAllTokens() {
    tokens.value = {
      personal: null,
      organizations: {}
    };
    user.value = null;
    authenticated.value = false;
    clearRepoCache();
  }

  function clearRepoCache() {
    try {
      localStorage.removeItem('gitpocket_repos_cache');
      console.log('[AuthStore] Repository cache cleared after token change');
    } catch (e) {
      console.warn('[AuthStore] Failed to clear repository cache:', e);
    }
  }

  async function validateToken(token, tokenType = 'unknown', orgName = null) {
    try {
      const response = await githubAPI('/user', token);
      const userData = await response.json();

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

      let repoCount = 0;
      let repoAccessError = null;
      try {
        const repoResponse = await githubAPI('/user/repos?per_page=1', token);
        const linkHeader = repoResponse.headers.get('Link');
        if (linkHeader) {
          const lastPageMatch = linkHeader.match(/page=(\d+)>; rel="last"/);
          if (lastPageMatch) {
            repoCount = parseInt(lastPageMatch[1]);
          } else {
            const repos = await repoResponse.json();
            repoCount = repos.length;
          }
        } else {
          const repos = await repoResponse.json();
          repoCount = repos.length;
        }
      } catch (error) {
        repoAccessError = `Error checking repository access: ${error.message}`;
      }

      return {
        valid: true,
        user: userData,
        scopes: tokenInfo,
        token: token,
        repoCount: repoCount,
        repoAccessError: repoAccessError
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  async function fetchUserOrganizations(token = null) {
    const authToken = token || tokens.value.personal?.token;
    if (!authToken) {
      return { success: false, error: 'No token available', orgs: [], fallbackUsed: false };
    }

    let orgs = [];
    let fallbackUsed = false;

    try {
      const response = await githubAPI('/user/orgs', authToken);
      orgs = await response.json();

      const orgMap = new Map();

      orgs.forEach(org => {
        orgMap.set(org.login, {
          login: org.login,
          name: org.name || org.login,
          avatar_url: org.avatar_url,
          description: org.description,
          inferred: false
        });
      });

      // Try to get additional organizations from repos
      try {
        const reposResponse = await githubAPI('/user/repos?affiliation=organization_member', authToken);
        const repos = await reposResponse.json();

        repos.forEach(repo => {
          if (repo.owner && repo.owner.type === 'Organization' && !orgMap.has(repo.owner.login)) {
            orgMap.set(repo.owner.login, {
              login: repo.owner.login,
              name: repo.owner.login,
              avatar_url: repo.owner.avatar_url,
              description: null,
              inferred: true
            });
            fallbackUsed = true;
          }
        });
      } catch (reposError) {
        console.log('Could not fetch repos for additional orgs:', reposError.message);
      }

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
        warning: fallbackUsed ? 'Additional organizations were discovered from repository data.' : null
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

  function checkExistingAuth() {
    if (!hasAnyToken.value) {
      return false;
    }

    if (tokens.value.personal) {
      authenticated.value = true;
      user.value = tokens.value.personal.user;
      return true;
    }

    const tokensList = allTokens.value;
    if (tokensList.length > 0) {
      authenticated.value = true;
      user.value = tokensList[0].user;
      return true;
    }

    return false;
  }

  function logout() {
    clearAllTokens();
    location.reload();
  }

  return {
    // State
    tokens,
    user,
    authenticated,
    // Getters
    personalToken,
    orgTokens,
    hasAnyToken,
    allTokens,
    // Actions
    setPersonalToken,
    getOrgToken,
    setOrgToken,
    removeOrgToken,
    getTokenForRepo,
    clearAllTokens,
    validateToken,
    fetchUserOrganizations,
    checkExistingAuth,
    logout
  };
}, {
  persist: {
    key: 'github_tokens',
    paths: ['tokens']
  }
});
