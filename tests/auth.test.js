// Tests for authentication functions
import { authenticate, checkExistingAuth, logout } from '../src/js/auth';
import { appState, safeSetItem, safeGetItem, safeRemoveItem } from '../src/js/state';
import { setupMockFetch, mockUser } from './mocks/githubAPI';

// Mock the app module to avoid circular dependencies
jest.mock('../src/js/app', () => ({
  showMainApp: jest.fn(),
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
    appState.token = null;
  });

  describe('authenticate', () => {
    it('should authenticate with valid token', async () => {
      const testToken = 'github_pat_test123';
      global.prompt.mockReturnValue(testToken);
      
      const button = document.getElementById('authButton');
      const icon = document.getElementById('authIcon');
      const text = document.getElementById('authText');
      
      await authenticate();
      
      // Check that token was validated
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `Bearer ${testToken}`,
          })
        })
      );
      
      // Check that state was updated
      expect(appState.authenticated).toBe(true);
      expect(appState.token).toBe(testToken);
      expect(appState.user).toEqual(mockUser);
      
      // Check that credentials were stored
      expect(localStorage.setItem).toHaveBeenCalledWith('github_token', testToken);
      expect(localStorage.setItem).toHaveBeenCalledWith('github_user', JSON.stringify(mockUser));
    });

    it('should handle authentication cancellation', async () => {
      global.prompt.mockReturnValue(null);
      
      await authenticate();
      
      expect(appState.authenticated).toBe(false);
      expect(appState.token).toBe(null);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle invalid token', async () => {
      global.prompt.mockReturnValue('invalid-token');
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Bad credentials' })
      });
      
      await authenticate();
      
      expect(appState.authenticated).toBe(false);
      expect(appState.token).toBe(null);
      
      const errorDiv = document.getElementById('authError');
      expect(errorDiv.style.display).toBe('block');
      expect(errorDiv.textContent).toContain('Bad credentials');
    });
  });

  describe('checkExistingAuth', () => {
    it('should restore authentication from storage', () => {
      const storedToken = 'stored-token';
      const storedUser = JSON.stringify(mockUser);
      
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'github_token') return storedToken;
        if (key === 'github_user') return storedUser;
        return null;
      });
      
      const result = checkExistingAuth();
      
      expect(result).toBe(true);
      expect(appState.authenticated).toBe(true);
      expect(appState.token).toBe(storedToken);
      expect(appState.user).toEqual(mockUser);
    });

    it('should return false when no stored credentials', () => {
      localStorage.getItem.mockReturnValue(null);
      
      const result = checkExistingAuth();
      
      expect(result).toBe(false);
      expect(appState.authenticated).toBe(false);
    });

    it('should handle corrupted user data', () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === 'github_token') return 'token';
        if (key === 'github_user') return 'invalid-json';
        return null;
      });
      
      const result = checkExistingAuth();
      
      expect(result).toBe(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('github_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('github_user');
    });
  });

  describe('logout', () => {
    it('should clear stored credentials and reload', () => {
      // Mock location.reload for this test
      const reloadMock = jest.fn();
      Object.defineProperty(window.location, 'reload', {
        configurable: true,
        value: reloadMock
      });
      
      logout();
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('github_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('github_user');
      expect(reloadMock).toHaveBeenCalled();
    });
  });
});