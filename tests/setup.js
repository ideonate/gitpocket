// Test setup file
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = {
  storage: {},
  getItem: jest.fn((key) => localStorageMock.storage[key] || null),
  setItem: jest.fn((key, value) => {
    localStorageMock.storage[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete localStorageMock.storage[key];
  }),
  clear: jest.fn(() => {
    localStorageMock.storage = {};
  }),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock fetch globally
global.fetch = jest.fn();

// We'll handle location.reload mocking in individual tests when needed

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.storage = {};
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  global.fetch.mockClear();
});

// Mock DOM elements that the app expects
document.body.innerHTML = `
  <div id="authScreen" style="display: none;"></div>
  <div id="mainApp" style="display: none;"></div>
  <div id="authButton"></div>
  <div id="authIcon"></div>
  <div id="authText"></div>
  <div id="authError"></div>
  <div id="loadingState"></div>
  <div id="issuesCount">0</div>
  <div id="prsCount">0</div>
  <div id="issuesContent"></div>
  <div id="prsContent"></div>
  <div id="detailScreen"></div>
  <div id="detailTitle"></div>
  <div id="detailContent"></div>
  <div id="bottomInput"></div>
  <div id="commentInput"></div>
  <div id="sendBtn"></div>
  <div id="messageToast"></div>
  <div id="installPrompt"></div>
`;