// Tests for state management
import { appState, safeGetItem, safeSetItem, safeRemoveItem } from '../src/js/state';

describe('State Management', () => {
  describe('appState', () => {
    it('should have correct initial state', () => {
      expect(appState.authenticated).toBe(false);
      expect(appState.user).toBe(null);
      expect(appState.currentTab).toBe(0);
      expect(appState.issues).toEqual([]);
      expect(appState.pullRequests).toEqual([]);
      expect(appState.currentItem).toBe(null);
      expect(appState.comments).toEqual([]);
      expect(appState.currentRepo).toBe(null);
    });
  });

  describe('Storage helpers', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    describe('safeSetItem', () => {
      it('should store value in localStorage', () => {
        safeSetItem('test_key', 'test_value');
        expect(localStorage.setItem).toHaveBeenCalledWith('test_key', 'test_value');
      });

      it('should handle localStorage errors gracefully', () => {
        localStorage.setItem.mockImplementation(() => {
          throw new Error('Storage error');
        });
        
        const result = safeSetItem('test_key', 'test_value');
        expect(result).toBe(true); // Falls back to memory storage
      });
    });

    describe('safeGetItem', () => {
      it('should retrieve value from localStorage', () => {
        localStorage.getItem.mockReturnValue('stored_value');
        const result = safeGetItem('test_key');
        
        expect(localStorage.getItem).toHaveBeenCalledWith('test_key');
        expect(result).toBe('stored_value');
      });

      it('should return null for non-existent keys', () => {
        localStorage.getItem.mockReturnValue(null);
        const result = safeGetItem('non_existent');
        
        expect(result).toBe(null);
      });

      it('should handle localStorage errors gracefully', () => {
        localStorage.getItem.mockImplementation(() => {
          throw new Error('Storage error');
        });
        
        const result = safeGetItem('test_key');
        expect(result).toBe(null); // Falls back to memory storage
      });
    });

    describe('safeRemoveItem', () => {
      it('should remove value from localStorage', () => {
        safeRemoveItem('test_key');
        expect(localStorage.removeItem).toHaveBeenCalledWith('test_key');
      });

      it('should handle localStorage errors gracefully', () => {
        localStorage.removeItem.mockImplementation(() => {
          throw new Error('Storage error');
        });
        
        const result = safeRemoveItem('test_key');
        expect(result).toBe(true);
      });
    });
  });
});