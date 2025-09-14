// Tests for API functions
import { loadData, loadComments, addComment } from '../src/js/api';
import { githubAPI } from '../src/js/github-client';
import { appState } from '../src/js/state';
import { tokenManager } from '../src/js/tokenManager';
import { setupMockFetch, mockUser, mockRepos, mockIssues, mockPullRequests, mockComments } from './mocks/githubAPI';

// Mock the UI module to avoid circular dependencies
jest.mock('../src/js/ui', () => ({
  renderIssues: jest.fn(),
  renderPullRequests: jest.fn(),
  showError: jest.fn(),
  showEmptyState: jest.fn(),
}));

// Mock the tokenManager module
jest.mock('../src/js/tokenManager', () => ({
  tokenManager: {
    getTokenForRepo: jest.fn(() => 'test-token'),
    getPersonalToken: jest.fn(() => ({ token: 'test-token' })),
    getOrgToken: jest.fn(() => null),
    getAllTokens: jest.fn(() => [])
  }
}));

describe('API Functions', () => {
  beforeEach(() => {
    setupMockFetch();
    // Tests will pass a token directly to githubAPI
  });

  describe('githubAPI', () => {
    it('should make authenticated API calls', async () => {
      const response = await githubAPI('/user', 'test-token');
      const data = await response.json();
      
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'GitHub-Manager-PWA'
          })
        })
      );
      expect(data).toEqual(mockUser);
    });

    it('should throw error for failed API calls', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' })
      });
      
      await expect(githubAPI('/user', 'bad-token')).rejects.toThrow('Unauthorized');
    });
  });

  describe('loadData', () => {
    it('should load repositories, issues, and pull requests', async () => {
      await loadData();
      
      // Check that API was called for repos
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/user/repos'),
        expect.any(Object)
      );
      
      // Check that issues and PRs were loaded for each repo
      mockRepos.forEach(repo => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/repos/${repo.full_name}/issues`),
          expect.any(Object)
        );
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining(`/repos/${repo.full_name}/pulls`),
          expect.any(Object)
        );
      });
      
      // Check that state was updated (excluding PR that's in issues)
      expect(appState.issues.length).toBeGreaterThan(0);
      expect(appState.pullRequests.length).toBeGreaterThan(0);
    });

    it('should filter out pull requests from issues', async () => {
      await loadData();
      
      // Check that PRs are not included in issues
      const prInIssues = appState.issues.find(issue => issue.pull_request);
      expect(prInIssues).toBeUndefined();
    });

    it('should handle empty repository list', async () => {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/user/repos')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          });
        }
        return Promise.resolve({
          ok: false,
          status: 404
        });
      });
      
      await loadData();
      
      expect(appState.issues).toEqual([]);
      expect(appState.pullRequests).toEqual([]);
    });
  });

  describe('loadComments', () => {
    it('should load comments for an issue', async () => {
      await loadComments('testuser', 'repo1', 1);
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/repos/testuser/repo1/issues/1/comments'),
        expect.any(Object)
      );
      expect(appState.comments).toEqual(mockComments);
    });

    it('should handle error when loading comments fails', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));
      
      await loadComments('testuser', 'repo1', 1);
      
      expect(appState.comments).toEqual([]);
    });
  });

  describe('addComment', () => {
    it('should post a comment to an issue', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 999, body: 'New comment' })
      });
      
      const result = await addComment('New comment', 'testuser', 'repo1', 1);
      
      expect(fetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/testuser/repo1/issues/1/comments',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ body: 'New comment' })
        })
      );
      expect(result).toEqual({ id: 999, body: 'New comment' });
    });

    it('should throw error when comment posting fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ message: 'Forbidden' })
      });
      
      await expect(addComment('New comment', 'testuser', 'repo1', 1))
        .rejects.toThrow('Forbidden');
    });
  });
});