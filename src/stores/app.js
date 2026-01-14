import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useAppStore = defineStore('app', () => {
  // State
  const currentTab = ref(0);
  const currentFilter = ref(null);
  const stateFilter = ref('all'); // 'all', 'open', 'closed'
  const currentItem = ref(null);
  const currentItemType = ref(null); // 'issue', 'pr', 'action'
  const detailVisible = ref(false);
  const loading = ref(false);
  const message = ref({ text: '', type: '', visible: false });
  const filterPanelOpen = ref(false);
  const collapsedGroups = ref(new Set());
  const showInstallPrompt = ref(false);

  // Issues
  const issues = ref([]);
  const unfilteredIssues = ref([]);

  // Pull Requests
  const pullRequests = ref([]);
  const unfilteredPullRequests = ref([]);

  // Actions/Workflow Runs
  const workflowRuns = ref([]);
  const unfilteredWorkflowRuns = ref([]);

  // Comments and reactions for detail view
  const comments = ref([]);
  const issueReactions = ref([]);

  // Repositories
  const allRepositories = ref([]);

  // Suggested assignees
  const suggestedAssignees = ref(new Set());

  // Getters
  const issuesCount = computed(() => issues.value.length);
  const prsCount = computed(() => pullRequests.value.length);
  const actionsCount = computed(() => workflowRuns.value.length);

  const filteredIssues = computed(() => {
    let result = unfilteredIssues.value;

    // Apply state filter
    if (stateFilter.value === 'open') {
      result = result.filter(i => i.state === 'open');
    } else if (stateFilter.value === 'closed') {
      result = result.filter(i => i.state === 'closed');
    }

    // Apply repo filter
    if (currentFilter.value) {
      if (currentFilter.value === '__private__') {
        result = result.filter(i => {
          const repo = allRepositories.value.find(r => r.full_name === i.repository_name);
          return repo?.private === true;
        });
      } else if (currentFilter.value === '__public__') {
        result = result.filter(i => {
          const repo = allRepositories.value.find(r => r.full_name === i.repository_name);
          return repo?.private === false;
        });
      } else if (currentFilter.value.includes('/')) {
        result = result.filter(i => i.repository_name === currentFilter.value);
      } else {
        result = result.filter(i => {
          const owner = i.repository_name?.split('/')[0];
          return owner === currentFilter.value;
        });
      }
    }

    return result;
  });

  const filteredPullRequests = computed(() => {
    let result = unfilteredPullRequests.value;

    if (stateFilter.value === 'open') {
      result = result.filter(pr => pr.state === 'open');
    } else if (stateFilter.value === 'closed') {
      result = result.filter(pr => pr.state === 'closed');
    }

    if (currentFilter.value) {
      if (currentFilter.value === '__private__') {
        result = result.filter(pr => {
          const repo = allRepositories.value.find(r => r.full_name === pr.repository_name);
          return repo?.private === true;
        });
      } else if (currentFilter.value === '__public__') {
        result = result.filter(pr => {
          const repo = allRepositories.value.find(r => r.full_name === pr.repository_name);
          return repo?.private === false;
        });
      } else if (currentFilter.value.includes('/')) {
        result = result.filter(pr => pr.repository_name === currentFilter.value);
      } else {
        result = result.filter(pr => {
          const owner = pr.repository_name?.split('/')[0];
          return owner === currentFilter.value;
        });
      }
    }

    return result;
  });

  const filteredWorkflowRuns = computed(() => {
    let result = unfilteredWorkflowRuns.value;

    if (currentFilter.value) {
      if (currentFilter.value === '__private__') {
        result = result.filter(run => {
          const repo = allRepositories.value.find(r => r.full_name === run.repository_name);
          return repo?.private === true;
        });
      } else if (currentFilter.value === '__public__') {
        result = result.filter(run => {
          const repo = allRepositories.value.find(r => r.full_name === run.repository_name);
          return repo?.private === false;
        });
      } else if (currentFilter.value.includes('/')) {
        result = result.filter(run => run.repository_name === currentFilter.value);
      } else {
        result = result.filter(run => {
          const owner = run.repository_name?.split('/')[0];
          return owner === currentFilter.value;
        });
      }
    }

    return result;
  });

  // Actions
  function setTab(index) {
    currentTab.value = index;
  }

  function setFilter(filter) {
    currentFilter.value = filter;
    filterPanelOpen.value = false;
  }

  function clearFilter() {
    currentFilter.value = null;
  }

  function cycleStateFilter() {
    if (stateFilter.value === 'all') {
      stateFilter.value = 'open';
    } else if (stateFilter.value === 'open') {
      stateFilter.value = 'closed';
    } else {
      stateFilter.value = 'all';
    }
  }

  function setStateFilter(filter) {
    stateFilter.value = filter;
  }

  function toggleFilterPanel() {
    filterPanelOpen.value = !filterPanelOpen.value;
  }

  function toggleGroup(groupName) {
    if (collapsedGroups.value.has(groupName)) {
      collapsedGroups.value.delete(groupName);
    } else {
      collapsedGroups.value.add(groupName);
    }
  }

  function setCurrentItem(item, type) {
    currentItem.value = item;
    currentItemType.value = type;
    detailVisible.value = true;
  }

  function clearCurrentItem() {
    currentItem.value = null;
    currentItemType.value = null;
    detailVisible.value = false;
    comments.value = [];
    issueReactions.value = [];
  }

  function setIssues(data) {
    unfilteredIssues.value = data;
    issues.value = filteredIssues.value;
    updateSuggestedAssignees(data);
  }

  function setPullRequests(data) {
    unfilteredPullRequests.value = data;
    pullRequests.value = filteredPullRequests.value;
    updateSuggestedAssignees(data);
  }

  function setWorkflowRuns(data) {
    unfilteredWorkflowRuns.value = data;
    workflowRuns.value = filteredWorkflowRuns.value;
  }

  function setRepositories(repos) {
    allRepositories.value = repos;
  }

  function setComments(data) {
    comments.value = data;
  }

  function setIssueReactions(data) {
    issueReactions.value = data;
  }

  function updateSuggestedAssignees(items) {
    items.forEach(item => {
      if (item.user?.login) {
        suggestedAssignees.value.add(item.user.login);
      }
      if (item.assignees && Array.isArray(item.assignees)) {
        item.assignees.forEach(assignee => {
          if (assignee.login) {
            suggestedAssignees.value.add(assignee.login);
          }
        });
      }
      if (item.assignee?.login) {
        suggestedAssignees.value.add(item.assignee.login);
      }
    });
  }

  function setLoading(value) {
    loading.value = value;
  }

  function showMessage(text, type = 'success') {
    message.value = { text, type, visible: true };
    setTimeout(() => {
      message.value.visible = false;
    }, 3000);
  }

  function showError(text) {
    showMessage(text, 'error');
  }

  function showSuccess(text) {
    showMessage(text, 'success');
  }

  return {
    // State
    currentTab,
    currentFilter,
    stateFilter,
    currentItem,
    currentItemType,
    detailVisible,
    loading,
    message,
    filterPanelOpen,
    collapsedGroups,
    showInstallPrompt,
    issues,
    unfilteredIssues,
    pullRequests,
    unfilteredPullRequests,
    workflowRuns,
    unfilteredWorkflowRuns,
    comments,
    issueReactions,
    allRepositories,
    suggestedAssignees,
    // Getters
    issuesCount,
    prsCount,
    actionsCount,
    filteredIssues,
    filteredPullRequests,
    filteredWorkflowRuns,
    // Actions
    setTab,
    setFilter,
    clearFilter,
    cycleStateFilter,
    setStateFilter,
    toggleFilterPanel,
    toggleGroup,
    setCurrentItem,
    clearCurrentItem,
    setIssues,
    setPullRequests,
    setWorkflowRuns,
    setRepositories,
    setComments,
    setIssueReactions,
    setLoading,
    showMessage,
    showError,
    showSuccess
  };
}, {
  persist: {
    key: 'gitpocket_ui_state',
    paths: ['currentTab', 'currentFilter', 'stateFilter']
  }
});
