// GitHub API Helper Functions
import { githubAPI, githubAPIPaginated, githubGraphQL } from './github-client';

// Cache key for repositories
const REPO_CACHE_KEY = 'gitpocket_repos_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function clearRepoCache() {
  try {
    localStorage.removeItem(REPO_CACHE_KEY);
    console.log('[Cache] Repository cache cleared');
  } catch (e) {
    console.warn('[Cache] Failed to clear repository cache:', e);
  }
}

export async function fetchAllRepositories(getTokenForRepo, allTokens, forceRefresh = false) {
  try {
    // Check cache first
    if (!forceRefresh) {
      const cachedData = localStorage.getItem(REPO_CACHE_KEY);
      if (cachedData) {
        try {
          const cache = JSON.parse(cachedData);
          const cacheAge = Date.now() - cache.timestamp;

          if (cacheAge < CACHE_DURATION) {
            console.log('[fetchAllRepositories] Using cached repositories:', cache.repos.length);
            return cache.repos;
          }
        } catch (e) {
          console.warn('[fetchAllRepositories] Invalid cache data');
        }
      }
    }

    console.log('[fetchAllRepositories] Starting repository fetch');

    const allDiscoveredRepos = [];
    const discoveredOrgs = new Set();

    console.log(`[DEBUG] Available tokens: ${allTokens.length}`);

    for (const tokenInfo of allTokens) {
      const tokenLabel = tokenInfo.orgName || 'personal';
      const token = tokenInfo.token;

      try {
        const endpoint = tokenInfo.orgName
          ? `/orgs/${tokenLabel}/repos?type=all&sort=updated`
          : '/user/repos?type=all&sort=updated';
        const repos = await githubAPIPaginated(endpoint, token);

        allDiscoveredRepos.push(...repos);

        repos.forEach(repo => {
          if (repo.owner && repo.owner.type === 'Organization') {
            discoveredOrgs.add(repo.owner.login);
          }
        });
      } catch (error) {
        console.error(`Failed to fetch repos with ${tokenLabel} token:`, error);
      }
    }

    // Deduplicate repositories by ID
    const uniqueRepos = Array.from(new Map(allDiscoveredRepos.map(repo => [repo.id, repo])).values());
    console.log(`[fetchAllRepositories] ${uniqueRepos.length} unique repositories`);

    // Sort by updated date
    const sortedRepos = uniqueRepos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    // Save to cache
    try {
      const cacheData = {
        repos: sortedRepos,
        timestamp: Date.now()
      };
      localStorage.setItem(REPO_CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.warn('[fetchAllRepositories] Failed to save cache:', e);
    }

    return sortedRepos;
  } catch (error) {
    console.error('Failed to fetch repositories:', error);
    return [];
  }
}

export async function createRepository(owner, isOrg, repoData, token) {
  if (!token) {
    throw new Error('No authentication token available for this owner.');
  }

  const endpoint = isOrg ? `/orgs/${owner}/repos` : '/user/repos';

  try {
    const response = await githubAPI(endpoint, token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(repoData)
    });

    // Repository list cache is now stale
    clearRepoCache();

    return response.json();
  } catch (error) {
    const message = error.message || '';
    if (message.includes('403') || message.includes('404') || message.toLowerCase().includes('permission') || message.toLowerCase().includes('not accessible')) {
      const where = isOrg ? `the "${owner}" organization` : 'your account';
      throw new Error(
        `Permission denied creating a repository under ${where}. ` +
        'Your token needs repository creation rights — for a classic token use the "repo" scope; ' +
        'for a fine-grained token grant "Administration" write access (and make sure the token is authorised for the organisation).'
      );
    }
    throw error;
  }
}

export async function fetchIssuesAndPRs(repos, getTokenForRepo) {
  const allIssues = [];
  const allPRs = [];

  const repoPromises = repos.map(async (repo) => {
    try {
      const token = getTokenForRepo(repo.full_name);
      const [issuesRes, prsRes] = await Promise.all([
        githubAPI(`/repos/${repo.full_name}/issues?state=all&per_page=30`, token),
        githubAPI(`/repos/${repo.full_name}/pulls?state=all&per_page=30`, token)
      ]);

      const issues = await issuesRes.json();
      const prs = await prsRes.json();

      const realIssues = issues.filter(issue => !issue.pull_request);

      realIssues.forEach(issue => {
        issue.repository_name = repo.full_name;
        issue.repository_url = repo.url;
      });

      prs.forEach(pr => {
        pr.repository_name = repo.full_name;
        pr.repository_url = repo.url;
      });

      allIssues.push(...realIssues);
      allPRs.push(...prs);
    } catch (error) {
      console.warn(`Failed to load data from ${repo.full_name}:`, error);
    }
  });

  await Promise.all(repoPromises);

  return {
    issues: allIssues.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)),
    pullRequests: allPRs.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  };
}

export async function fetchWorkflowRuns(repos, getTokenForRepo) {
  const allRuns = [];

  const repoPromises = repos.map(async (repo) => {
    try {
      const token = getTokenForRepo(repo.full_name);
      const response = await githubAPI(`/repos/${repo.full_name}/actions/runs?per_page=30`, token);
      const data = await response.json();

      if (data.workflow_runs) {
        data.workflow_runs.forEach(run => {
          run.repository_name = repo.full_name;
        });
        allRuns.push(...data.workflow_runs);
      }
    } catch (error) {
      console.warn(`Failed to fetch workflow runs from ${repo.full_name}:`, error);
    }
  });

  await Promise.all(repoPromises);

  return allRuns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function fetchIssue(owner, repo, number, token) {
  const response = await githubAPI(`/repos/${owner}/${repo}/issues/${number}`, token);
  const issue = await response.json();
  issue.repository_name = `${owner}/${repo}`;
  return issue;
}

export async function fetchPullRequest(owner, repo, number, token) {
  const response = await githubAPI(`/repos/${owner}/${repo}/pulls/${number}`, token);
  const pr = await response.json();
  pr.repository_name = `${owner}/${repo}`;
  return pr;
}

export async function loadComments(owner, repo, number, token) {
  try {
    const response = await githubAPI(`/repos/${owner}/${repo}/issues/${number}/comments`, token);
    const comments = await response.json();

    const commentsWithReactions = await Promise.all(comments.map(async (comment) => {
      try {
        const reactionsResponse = await githubAPI(`/repos/${owner}/${repo}/issues/comments/${comment.id}/reactions`, token);
        const reactions = await reactionsResponse.json();
        return { ...comment, reactions };
      } catch (error) {
        return { ...comment, reactions: [] };
      }
    }));

    return commentsWithReactions;
  } catch (error) {
    console.error('Failed to load comments:', error);
    return [];
  }
}

export async function loadIssueReactions(owner, repo, number, token) {
  try {
    const response = await githubAPI(`/repos/${owner}/${repo}/issues/${number}/reactions`, token);
    return await response.json();
  } catch (error) {
    console.error('Failed to load issue reactions:', error);
    return [];
  }
}

export async function fetchLastComment(owner, repo, number, author, token) {
  try {
    const response = await githubAPI(`/repos/${owner}/${repo}/issues/${number}/comments?per_page=1&sort=created&direction=desc`, token);
    const comments = await response.json();

    if (comments && comments.length > 0) {
      return {
        user: comments[0].user.login,
        created_at: comments[0].created_at,
        isAuthorOnly: false
      };
    }
    if (author) {
      return {
        user: author,
        created_at: null,
        isAuthorOnly: true
      };
    }
    return null;
  } catch (error) {
    console.error(`Failed to fetch last comment for #${number}:`, error);
    return null;
  }
}

export async function addComment(owner, repo, number, commentText, token) {
  if (!token) {
    throw new Error('No authentication token available for this repository.');
  }

  try {
    const response = await githubAPI(`/repos/${owner}/${repo}/issues/${number}/comments`, token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ body: commentText })
    });

    return response.json();
  } catch (error) {
    if (error.message?.includes('403')) {
      throw new Error('Permission denied. Please ensure your token has Issues and Pull requests write access.');
    }
    throw error;
  }
}

export async function addReaction(owner, repo, id, content, token, isComment = false) {
  if (!token) {
    throw new Error('No authentication token available for this repository.');
  }

  const endpoint = isComment
    ? `/repos/${owner}/${repo}/issues/comments/${id}/reactions`
    : `/repos/${owner}/${repo}/issues/${id}/reactions`;

  const response = await githubAPI(endpoint, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  });

  return await response.json();
}

export async function removeReaction(owner, repo, reactionId, token) {
  if (!token) {
    throw new Error('No authentication token available for this repository.');
  }

  await githubAPI(`/repos/${owner}/${repo}/issues/reactions/${reactionId}`, token, {
    method: 'DELETE'
  });

  return true;
}

export async function mergePullRequest(owner, repo, number, mergeMethod, token) {
  if (!token) {
    throw new Error('No authentication token available for this repository.');
  }

  const response = await githubAPI(`/repos/${owner}/${repo}/pulls/${number}/merge`, token, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      merge_method: mergeMethod
    })
  });

  return response.json();
}

export async function closePullRequest(owner, repo, number, token) {
  if (!token) {
    throw new Error('No authentication token available for this repository.');
  }

  const response = await githubAPI(`/repos/${owner}/${repo}/pulls/${number}`, token, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      state: 'closed'
    })
  });

  return response.json();
}

export async function createIssue(owner, repo, issueData, token) {
  if (!token) {
    throw new Error('No authentication token available for this repository.');
  }

  const response = await githubAPI(`/repos/${owner}/${repo}/issues`, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(issueData)
  });

  return response.json();
}

export async function updateIssueState(owner, repo, number, newState, token) {
  if (!token) {
    throw new Error('No authentication token available for this repository.');
  }

  const response = await githubAPI(`/repos/${owner}/${repo}/issues/${number}`, token, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      state: newState
    })
  });

  return response.json();
}

export async function updateAssignees(owner, repo, number, assignees, token) {
  if (!token) {
    throw new Error('No authentication token available for this repository.');
  }

  const response = await githubAPI(`/repos/${owner}/${repo}/issues/${number}`, token, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      assignees: assignees
    })
  });

  return response.json();
}

export async function checkWorkflowDispatchSupport(owner, repo, workflowPath, token) {
  try {
    const response = await githubAPI(`/repos/${owner}/${repo}/contents/${workflowPath}`, token);
    const data = await response.json();

    const content = atob(data.content);

    const onSectionRegex = /^on:\s*$/m;
    const onInlineRegex = /^on:\s*(\[.*workflow_dispatch.*\]|workflow_dispatch)/m;
    const workflowDispatchTriggerRegex = /^\s{2,}workflow_dispatch:/m;

    const onMatch = content.match(onSectionRegex);
    if (onMatch) {
      const onIndex = onMatch.index;
      const afterOn = content.substring(onIndex);
      if (workflowDispatchTriggerRegex.test(afterOn)) {
        return true;
      }
    }

    if (onInlineRegex.test(content)) {
      return true;
    }

    return false;
  } catch (error) {
    console.warn(`Failed to check workflow_dispatch support for ${workflowPath}:`, error);
    return false;
  }
}

// Projects V2 (GraphQL API)
const PROJECTS_QUERY = `
query($login: String!, $first: Int!, $after: String) {
  user: repositoryOwner(login: $login) {
    ... on User {
      projectsV2(first: $first, after: $after, orderBy: {field: UPDATED_AT, direction: DESC}) {
        nodes {
          id
          title
          shortDescription
          url
          closed
          number
          updatedAt
          createdAt
          items {
            totalCount
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
    ... on Organization {
      projectsV2(first: $first, after: $after, orderBy: {field: UPDATED_AT, direction: DESC}) {
        nodes {
          id
          title
          shortDescription
          url
          closed
          number
          updatedAt
          createdAt
          items {
            totalCount
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}`;

const PROJECT_ITEMS_QUERY = `
query($projectId: ID!, $first: Int!, $after: String) {
  node(id: $projectId) {
    ... on ProjectV2 {
      fields(first: 20) {
        nodes {
          ... on ProjectV2SingleSelectField {
            id
            name
            options {
              id
              name
            }
          }
          ... on ProjectV2Field {
            id
            name
          }
        }
      }
      items(first: $first, after: $after) {
        nodes {
          id
          fieldValues(first: 10) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field {
                  ... on ProjectV2SingleSelectField {
                    name
                  }
                }
              }
              ... on ProjectV2ItemFieldTextValue {
                text
                field {
                  ... on ProjectV2Field {
                    name
                  }
                }
              }
            }
          }
          content {
            __typename
            ... on Issue {
              title
              number
              state
              url
              repository {
                nameWithOwner
              }
            }
            ... on PullRequest {
              title
              number
              state
              url
              repository {
                nameWithOwner
              }
            }
            ... on DraftIssue {
              title
              body
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
}`;

export async function fetchProjects(owners, getTokenForRepo, allTokens, projectsToken = null) {
  const allProjects = [];
  const fetchedOwners = new Set();

  for (const owner of owners) {
    if (fetchedOwners.has(owner)) continue;
    fetchedOwners.add(owner);

    // Prefer the dedicated projects token (classic token with read:project scope)
    const token = projectsToken || getTokenForRepo(`${owner}/any`) || allTokens[0]?.token;
    if (!token) continue;

    try {
      const data = await githubGraphQL(PROJECTS_QUERY, {
        login: owner,
        first: 20
      }, token);

      if (data.user?.projectsV2?.nodes) {
        const projects = data.user.projectsV2.nodes.map(project => ({
          ...project,
          owner_name: owner,
          items_count: project.items?.totalCount || 0
        }));
        allProjects.push(...projects);
      }
    } catch (error) {
      console.warn(`Failed to fetch projects for ${owner}:`, error);
    }
  }

  return allProjects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function fetchProjectItems(projectId, token, repoToken = null) {
  const allItems = [];
  let after = null;

  for (let page = 0; page < 10; page++) {
    try {
      const data = await githubGraphQL(PROJECT_ITEMS_QUERY, {
        projectId,
        first: 50,
        after
      }, token);

      const projectNode = data.node;
      if (!projectNode?.items?.nodes) break;

      const items = projectNode.items.nodes.map(item => {
        // Extract status from field values
        let status = 'No Status';
        const fieldValues = item.fieldValues?.nodes || [];
        for (const fv of fieldValues) {
          if (fv.field?.name === 'Status' && fv.name) {
            status = fv.name;
            break;
          }
        }

        const content = item.content || {};
        const isDraft = content.__typename === 'DraftIssue' || (!content.__typename && !content.number);
        return {
          id: item.id,
          status,
          title: content.title || null,
          number: content.number || null,
          state: content.state || null,
          url: content.url || null,
          repository: content.repository?.nameWithOwner || null,
          isDraft,
          contentType: content.__typename || null,
        };
      });

      allItems.push(...items);

      if (!projectNode.items.pageInfo.hasNextPage) break;
      after = projectNode.items.pageInfo.endCursor;
    } catch (error) {
      console.warn('Failed to fetch project items:', error);
      break;
    }
  }

  // Enrich linked Issue/PR items that are missing titles (token may lack repo access)
  const effectiveRepoToken = repoToken || token;
  const missingTitleItems = allItems.filter(item => !item.isDraft && !item.title && item.number && item.repository);
  if (missingTitleItems.length > 0) {
    await Promise.all(missingTitleItems.map(async item => {
      try {
        const [owner, repo] = item.repository.split('/');
        const response = await githubAPI(`/repos/${owner}/${repo}/issues/${item.number}`, effectiveRepoToken);
        if (response.ok) {
          const data = await response.json();
          item.title = data.title || item.title;
          if (data.state) item.state = data.state.toUpperCase();
        }
      } catch (e) {
        // ignore, fallback title applied below
      }
    }));
  }

  // Apply fallback titles for items still missing one
  for (const item of allItems) {
    if (!item.title) {
      if (item.isDraft) {
        item.title = 'Draft';
      } else if (item.number) {
        item.title = `#${item.number}`;
      } else {
        item.title = 'Untitled';
      }
    }
  }

  return allItems;
}

export async function triggerWorkflowDispatch(owner, repo, workflowId, ref, inputs, token) {
  if (!token) {
    throw new Error('No authentication token available for this repository.');
  }

  const response = await githubAPI(`/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, token, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ref: ref,
      inputs: inputs || {}
    })
  });

  if (response.status === 204) {
    return { success: true };
  }

  const data = await response.json();
  return data;
}
