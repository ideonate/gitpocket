// Composable for GitHub API operations
import { useAuthStore } from '../stores/auth';
import { useAppStore } from '../stores/app';
import {
  fetchAllRepositories,
  fetchIssuesAndPRs,
  fetchWorkflowRuns as fetchWorkflowRunsAPI,
  fetchIssue,
  fetchPullRequest,
  loadComments as loadCommentsAPI,
  loadIssueReactions as loadIssueReactionsAPI,
  addComment as addCommentAPI,
  addReaction as addReactionAPI,
  removeReaction as removeReactionAPI,
  mergePullRequest as mergePRAPI,
  closePullRequest as closePRAPI,
  createIssue as createIssueAPI,
  updateIssueState as updateIssueStateAPI,
  updateAssignees as updateAssigneesAPI,
  checkWorkflowDispatchSupport,
  triggerWorkflowDispatch as triggerWorkflowDispatchAPI,
  clearRepoCache
} from '../services/github-api';

export function useGitHub() {
  const authStore = useAuthStore();
  const appStore = useAppStore();

  async function loadData(filterRepo = null, forceRefresh = false) {
    appStore.setLoading(true);

    try {
      const repos = await fetchAllRepositories(
        authStore.getTokenForRepo,
        authStore.allTokens,
        forceRefresh
      );

      appStore.setRepositories(repos);

      if (repos.length === 0) {
        appStore.setIssues([]);
        appStore.setPullRequests([]);
        appStore.setWorkflowRuns([]);
        appStore.setLoading(false);
        return;
      }

      // Filter repositories if needed
      let reposToLoad = repos;
      if (filterRepo) {
        if (filterRepo === '__private__') {
          reposToLoad = repos.filter(repo => repo.private === true);
        } else if (filterRepo === '__public__') {
          reposToLoad = repos.filter(repo => repo.private === false);
        } else if (filterRepo.includes('/')) {
          reposToLoad = repos.filter(repo => repo.full_name === filterRepo);
        } else {
          reposToLoad = repos.filter(repo => {
            const owner = repo.owner.login;
            return owner === filterRepo || repo.org === filterRepo;
          });
        }
      }

      // Fetch issues and PRs
      const { issues, pullRequests } = await fetchIssuesAndPRs(
        reposToLoad,
        authStore.getTokenForRepo
      );

      appStore.setIssues(issues);
      appStore.setPullRequests(pullRequests);

      // Fetch workflow runs
      const workflowRuns = await fetchWorkflowRunsAPI(
        reposToLoad,
        authStore.getTokenForRepo
      );

      appStore.setWorkflowRuns(workflowRuns);

    } catch (error) {
      console.error('Load data error:', error);
      appStore.showError('Failed to load data: ' + error.message);
    } finally {
      appStore.setLoading(false);
    }
  }

  async function refreshData() {
    try {
      if (appStore.currentFilter && appStore.currentFilter.includes('/')) {
        await loadData(appStore.currentFilter, true);
      } else {
        await loadData(appStore.currentFilter, true);
      }
      appStore.showSuccess('Refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing data:', error);
      appStore.showError('Failed to refresh: ' + error.message);
    }
  }

  async function reloadRepositories() {
    try {
      clearRepoCache();
      await loadData(null, true);
      appStore.showSuccess('Repository list reloaded!');
    } catch (error) {
      console.error('Error reloading repositories:', error);
      appStore.showError('Failed to reload repositories: ' + error.message);
    }
  }

  async function loadIssueDetail(owner, repo, number) {
    const token = authStore.getTokenForRepo(`${owner}/${repo}`);
    const issue = await fetchIssue(owner, repo, number, token);
    return issue;
  }

  async function loadPRDetail(owner, repo, number) {
    const token = authStore.getTokenForRepo(`${owner}/${repo}`);
    const pr = await fetchPullRequest(owner, repo, number, token);
    return pr;
  }

  async function loadComments(owner, repo, number) {
    const token = authStore.getTokenForRepo(`${owner}/${repo}`);
    const comments = await loadCommentsAPI(owner, repo, number, token);
    appStore.setComments(comments);
    return comments;
  }

  async function loadIssueReactions(owner, repo, number) {
    const token = authStore.getTokenForRepo(`${owner}/${repo}`);
    const reactions = await loadIssueReactionsAPI(owner, repo, number, token);
    appStore.setIssueReactions(reactions);
    return reactions;
  }

  async function addComment(owner, repo, number, commentText) {
    const token = authStore.getTokenForRepo(`${owner}/${repo}`);
    return await addCommentAPI(owner, repo, number, commentText, token);
  }

  async function addReaction(owner, repo, id, content, isComment = false) {
    const token = authStore.getTokenForRepo(`${owner}/${repo}`);
    return await addReactionAPI(owner, repo, id, content, token, isComment);
  }

  async function removeReaction(owner, repo, reactionId) {
    const token = authStore.getTokenForRepo(`${owner}/${repo}`);
    return await removeReactionAPI(owner, repo, reactionId, token);
  }

  async function mergePullRequest(owner, repo, number, mergeMethod = 'merge') {
    const token = authStore.getTokenForRepo(`${owner}/${repo}`);
    return await mergePRAPI(owner, repo, number, mergeMethod, token);
  }

  async function closePullRequest(owner, repo, number) {
    const token = authStore.getTokenForRepo(`${owner}/${repo}`);
    return await closePRAPI(owner, repo, number, token);
  }

  async function createIssue(owner, repo, issueData) {
    const token = authStore.getTokenForRepo(`${owner}/${repo}`);
    return await createIssueAPI(owner, repo, issueData, token);
  }

  async function updateIssueState(owner, repo, number, newState) {
    const token = authStore.getTokenForRepo(`${owner}/${repo}`);
    return await updateIssueStateAPI(owner, repo, number, newState, token);
  }

  async function updateAssignees(owner, repo, number, assignees) {
    const token = authStore.getTokenForRepo(`${owner}/${repo}`);
    return await updateAssigneesAPI(owner, repo, number, assignees, token);
  }

  async function canTriggerWorkflow(owner, repo, workflowPath) {
    const token = authStore.getTokenForRepo(`${owner}/${repo}`);
    return await checkWorkflowDispatchSupport(owner, repo, workflowPath, token);
  }

  async function triggerWorkflowDispatch(owner, repo, workflowId, ref, inputs = {}) {
    const token = authStore.getTokenForRepo(`${owner}/${repo}`);
    return await triggerWorkflowDispatchAPI(owner, repo, workflowId, ref, inputs, token);
  }

  return {
    loadData,
    refreshData,
    reloadRepositories,
    loadIssueDetail,
    loadPRDetail,
    loadComments,
    loadIssueReactions,
    addComment,
    addReaction,
    removeReaction,
    mergePullRequest,
    closePullRequest,
    createIssue,
    updateIssueState,
    updateAssignees,
    canTriggerWorkflow,
    triggerWorkflowDispatch
  };
}
