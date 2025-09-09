// App State Management
export const appState = {
    authenticated: false,
    user: null,
    token: null,
    currentTab: 0,
    issues: [],
    pullRequests: [],
    currentItem: null,
    comments: [],
    currentRepo: null,
    allRepositories: [],
    currentFilter: null,
    stateFilter: 'all' // 'all', 'open', or 'closed'
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