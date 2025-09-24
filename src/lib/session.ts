// Client-side session management
// Generates a persistent session ID for tracking user data without requiring authentication

const SESSION_KEY = 'll:session-id';

function generateSessionId(): string {
  return 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2);
}

export function getSessionId(): string {
  if (typeof window === 'undefined') {
    // Server-side: return a temporary ID (won't persist)
    return 'temp_' + Math.random().toString(36).substring(2);
  }

  try {
    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = generateSessionId();
      localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    // Fallback if localStorage is not available
    return 'fallback_' + Math.random().toString(36).substring(2);
  }
}

export function clearSession(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore errors
    }
  }
}