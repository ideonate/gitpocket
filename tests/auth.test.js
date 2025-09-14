// Tests for authentication functions
import { authenticate, checkExistingAuth, logout } from '../src/js/auth';
import { appState, safeSetItem, safeGetItem, safeRemoveItem } from '../src/js/state';
import { tokenManager } from '../src/js/tokenManager';
import { showAuthScreen } from '../src/js/authUI';
import { setupMockFetch, mockUser } from './mocks/githubAPI';

// Mock the app module to avoid circular dependencies
jest.mock('../src/js/app', () => ({
  showMainApp: jest.fn(),
}));

// Mock tokenManager
jest.mock('../src/js/tokenManager', () => ({
  tokenManager: {
    hasAnyToken: jest.fn(() => false),
    getPersonalToken: jest.fn(() => null),
    getAllTokens: jest.fn(() => []),
    setPersonalToken: jest.fn(),
    clearAllTokens: jest.fn()
  }
}));

// Mock authUI
jest.mock('../src/js/authUI', () => ({
  showAuthScreen: jest.fn(),
  showTokenManagementUI: jest.fn()
}));

// Mock prompt
global.prompt = jest.fn();

describe('Authentication', () => {
  beforeEach(() => {
    setupMockFetch();
    global.prompt.mockClear();
    // Reset appState
    appState.authenticated = false;
    appState.user = null;
  });

  describe('authenticate', () => {
    it('should show the auth screen', async () => {
      await authenticate();
      
      // Check that auth screen was shown
      expect(showAuthScreen).toHaveBeenCalled();
    });

    // Authentication flow is now handled in authUI module
  });

  describe('checkExistingAuth', () => {
    it('should check tokenManager for existing tokens', () => {
      // Mock tokenManager to have a personal token
      tokenManager.hasAnyToken.mockReturnValue(true);
      tokenManager.getPersonalToken.mockReturnValue({
        token: 'stored-token',
        user: mockUser
      });
      
      const result = checkExistingAuth();
      
      expect(result).toBe(true);
      expect(appState.authenticated).toBe(true);
      expect(appState.user).toEqual(mockUser);
    });

    it('should return false when no tokens available', () => {
      tokenManager.hasAnyToken.mockReturnValue(false);
      tokenManager.getPersonalToken.mockReturnValue(null);
      
      const result = checkExistingAuth();
      
      expect(result).toBe(false);
      expect(appState.authenticated).toBe(false);
    });

    it('should handle no tokens case', () => {
      tokenManager.hasAnyToken.mockReturnValue(false);
      
      const result = checkExistingAuth();
      
      expect(result).toBe(false);
      expect(appState.authenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear tokens and reload', () => {
      // Mock location.reload for this test
      const reloadMock = jest.fn();
      Object.defineProperty(window.location, 'reload', {
        configurable: true,
        value: reloadMock
      });
      
      logout();
      
      expect(tokenManager.clearAllTokens).toHaveBeenCalled();
      expect(appState.authenticated).toBe(false);
      expect(appState.user).toBe(null);
      expect(reloadMock).toHaveBeenCalled();
    });
  });
});