// Mock GitHub API responses
export const mockUser = {
  login: 'testuser',
  id: 12345,
  avatar_url: 'https://avatars.githubusercontent.com/u/12345',
  name: 'Test User',
  email: 'test@example.com',
};

export const mockRepos = [
  {
    id: 1,
    full_name: 'testuser/repo1',
    name: 'repo1',
    owner: { login: 'testuser' },
    url: 'https://api.github.com/repos/testuser/repo1',
    updated_at: '2024-01-01T12:00:00Z',
  },
  {
    id: 2,
    full_name: 'testuser/repo2',
    name: 'repo2',
    owner: { login: 'testuser' },
    url: 'https://api.github.com/repos/testuser/repo2',
    updated_at: '2024-01-02T12:00:00Z',
  },
];

export const mockIssues = [
  {
    id: 101,
    number: 1,
    title: 'Test Issue 1',
    body: 'This is a test issue body',
    state: 'open',
    user: { login: 'testuser' },
    comments: 2,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T12:00:00Z',
  },
  {
    id: 102,
    number: 2,
    title: 'Test Issue 2',
    body: 'Another test issue',
    state: 'closed',
    user: { login: 'otheruser' },
    comments: 0,
    created_at: '2024-01-02T10:00:00Z',
    updated_at: '2024-01-02T12:00:00Z',
  },
  {
    id: 103,
    number: 3,
    title: 'Pull Request (should be filtered)',
    body: 'This is actually a PR',
    state: 'open',
    user: { login: 'testuser' },
    comments: 1,
    pull_request: { url: 'https://api.github.com/repos/testuser/repo1/pulls/3' },
    created_at: '2024-01-03T10:00:00Z',
    updated_at: '2024-01-03T12:00:00Z',
  },
];

export const mockPullRequests = [
  {
    id: 201,
    number: 3,
    title: 'Test PR 1',
    body: 'This is a test pull request',
    state: 'open',
    draft: false,
    user: { login: 'testuser' },
    created_at: '2024-01-03T10:00:00Z',
    updated_at: '2024-01-03T12:00:00Z',
  },
  {
    id: 202,
    number: 4,
    title: 'Draft PR',
    body: 'This is a draft pull request',
    state: 'open',
    draft: true,
    user: { login: 'otheruser' },
    created_at: '2024-01-04T10:00:00Z',
    updated_at: '2024-01-04T12:00:00Z',
  },
];

export const mockComments = [
  {
    id: 301,
    body: 'This is a comment',
    user: { login: 'commenter1' },
    created_at: '2024-01-01T13:00:00Z',
  },
  {
    id: 302,
    body: 'This is another comment',
    user: { login: 'commenter2' },
    created_at: '2024-01-01T14:00:00Z',
  },
];

// Helper to create a successful API response
export function createSuccessResponse(data) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  });
}

// Helper to create an error API response
export function createErrorResponse(status, message) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ message }),
  });
}

// Mock fetch implementation for GitHub API
export function setupMockFetch() {
  global.fetch.mockImplementation((url) => {
    if (url.includes('/user') && !url.includes('/repos')) {
      return createSuccessResponse(mockUser);
    }
    if (url.includes('/user/repos')) {
      return createSuccessResponse(mockRepos);
    }
    if (url.includes('/issues') && url.includes('/comments')) {
      return createSuccessResponse(mockComments);
    }
    if (url.includes('/issues')) {
      return createSuccessResponse(mockIssues);
    }
    if (url.includes('/pulls')) {
      return createSuccessResponse(mockPullRequests);
    }
    return createErrorResponse(404, 'Not found');
  });
}