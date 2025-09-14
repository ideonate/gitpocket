// App State Management
export const appState = {
    authenticated: false,
    user: null,
    currentTab: 0,
    issues: [],
    pullRequests: [],
    currentItem: null,
    comments: [],
    currentRepo: null,
    allRepositories: [],
    currentFilter: null,
    stateFilter: 'all', // 'all', 'open', or 'closed'
    suggestedAssignees: new Set() // Store unique usernames for assignee suggestions
};

// In-memory storage fallback
let memoryStorage = {};

// Safe storage helper functions
export function safeGetItem(key) {
    try {
        if (typeof Storage !== 'undefined' && window.localStorage) {
            return localStorage.getItem(key);
        }
    } catch (e) {
        console.warn('localStorage not available, using memory storage:', e);
    }
    return memoryStorage[key] || null;
}

export function safeSetItem(key, value) {
    try {
        if (typeof Storage !== 'undefined' && window.localStorage) {
            localStorage.setItem(key, value);
            return true;
        }
    } catch (e) {
        console.warn('localStorage not available, using memory storage:', e);
    }
    memoryStorage[key] = value;
    return true;
}

export function safeRemoveItem(key) {
    try {
        if (typeof Storage !== 'undefined' && window.localStorage) {
            localStorage.removeItem(key);
        }
    } catch (e) {
        console.warn('localStorage not available, using memory storage:', e);
    }
    delete memoryStorage[key];
    return true;
}

// Persistence functions for app state
export function saveAppStateToStorage() {
    // Save persistent UI state
    const persistentState = {
        currentTab: appState.currentTab,
        currentFilter: appState.currentFilter,
        stateFilter: appState.stateFilter,
        // Convert Set to Array for serialization
        collapsedGroups: appState.collapsedGroups ? Array.from(appState.collapsedGroups) : []
    };
    safeSetItem('gitpocket_ui_state', JSON.stringify(persistentState));
}

export function loadAppStateFromStorage() {
    const savedState = safeGetItem('gitpocket_ui_state');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            // Restore saved state values
            if (state.currentTab !== undefined) {
                appState.currentTab = state.currentTab;
            }
            if (state.currentFilter !== undefined) {
                appState.currentFilter = state.currentFilter;
            }
            if (state.stateFilter !== undefined) {
                appState.stateFilter = state.stateFilter;
            }
            // Restore collapsedGroups from Array back to Set
            if (state.collapsedGroups !== undefined && Array.isArray(state.collapsedGroups)) {
                appState.collapsedGroups = new Set(state.collapsedGroups);
            }
            return true;
        } catch (e) {
            console.warn('Failed to parse saved UI state:', e);
        }
    }
    return false;
}