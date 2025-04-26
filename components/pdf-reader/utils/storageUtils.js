/**
 * Utility functions for handling localStorage
 * Includes functionality for storing test progress, notes, and other data
 */

/**
 * Checks if localStorage is available in the current environment
 * @returns {boolean} True if localStorage is available
 */
export function isLocalStorageAvailable() {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      const result = localStorage.getItem(testKey) === testKey;
      localStorage.removeItem(testKey);
      return result;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Gets the storage key for a test in progress
   * @param {number} testId - The ID of the test
   * @returns {string} The storage key
   */
  export function getInProgressTestStateKey(testId) {
    return `test_in_progress_${testId}`;
  }
  
  /**
   * Saves the in-progress state of a test to localStorage
   * @param {number} testId - The ID of the test
   * @param {string[]} userAnswers - Array of user answers
   */
  export function saveInProgressTestState(testId, userAnswers) {
    if (!testId || !isLocalStorageAvailable()) return;
    
    const testState = {
      testId,
      userAnswers,
      lastUpdated: Date.now()
    };
    
    localStorage.setItem(getInProgressTestStateKey(testId), JSON.stringify(testState));
  }
  
  /**
   * Loads the in-progress state of a test from localStorage
   * @param {number} testId - The ID of the test
   * @returns {Object|null} The test state object or null if not found
   */
  export function loadInProgressTestState(testId) {
    if (!testId || !isLocalStorageAvailable()) return null;
    
    const storedState = localStorage.getItem(getInProgressTestStateKey(testId));
    if (!storedState) return null;
    
    try {
      return JSON.parse(storedState);
    } catch (error) {
      console.error("Error loading test state:", error);
      return null;
    }
  }
  
  /**
   * Clears the in-progress state of a test from localStorage
   * @param {number} testId - The ID of the test
   */
  export function clearInProgressTestState(testId) {
    if (!testId || !isLocalStorageAvailable()) return;
    localStorage.removeItem(getInProgressTestStateKey(testId));
  }
  
  /**
   * Gets the storage key for a note
   * @param {number} fileId - The ID of the file
   * @returns {string} The storage key
   */
  export function getNoteStorageKey(fileId) {
    return `pdf_note_${fileId}`;
  }
  
  /**
   * Saves note to localStorage (as a backup)
   * @param {number} fileId - The ID of the file
   * @param {Object} note - The note object
   */
  export function saveNoteToStorage(fileId, note) {
    if (!fileId || !note || !isLocalStorageAvailable()) return;
    localStorage.setItem(getNoteStorageKey(fileId), JSON.stringify(note));
  }
  
  /**
   * Loads note from localStorage
   * @param {number} fileId - The ID of the file
   * @returns {Object|null} The note object or null if not found
   */
  export function loadNoteFromStorage(fileId) {
    if (!fileId || !isLocalStorageAvailable()) return null;
    
    const storedNote = localStorage.getItem(getNoteStorageKey(fileId));
    if (!storedNote) return null;
    
    try {
      return JSON.parse(storedNote);
    } catch (error) {
      console.error("Error loading note:", error);
      return null;
    }
  }
  
  /**
   * Clears all test states older than a specified time
   * @param {number} maxAgeMs - Maximum age in milliseconds (default: 7 days)
   */
  export function clearOldTestStates(maxAgeMs = 7 * 24 * 60 * 60 * 1000) {
    if (!isLocalStorageAvailable()) return;
    
    const now = Date.now();
    const testKeyPrefix = 'test_in_progress_';
    
    // Get all test keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(testKeyPrefix)) {
        try {
          const state = JSON.parse(localStorage.getItem(key));
          if (state && state.lastUpdated && (now - state.lastUpdated > maxAgeMs)) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // If we can't parse the item, just skip it
          console.error("Error parsing storage item:", e);
        }
      }
    }
  }