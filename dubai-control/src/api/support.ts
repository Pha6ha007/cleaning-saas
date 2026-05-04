import { API_BASE_URL } from "@/lib/env";

/**
 * Support Chat API Client
 */

/**
 * Get the current auth token from localStorage.
 * Prefers JWT access_token; falls back to legacy Token auth for existing sessions.
 */
function getAuthToken(): { token: string; scheme: "Bearer" | "Token" } | null {
  // Prefer JWT access token (new auth flow)
  const jwtAccess = localStorage.getItem("access_token");
  if (jwtAccess) {
    return { token: jwtAccess, scheme: "Bearer" };
  }

  // Fall back to legacy Token auth (existing sessions, backward compat)
  const legacyToken =
    localStorage.getItem("authToken") || localStorage.getItem("auth_token");
  if (legacyToken) {
    return { token: legacyToken, scheme: "Token" };
  }

  return null;
}

export interface SupportSession {
  id: string;
  product: "cleaning" | "maintenance";
  title: string;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface CreateSessionRequest {
  product?: "cleaning" | "maintenance";
}

export interface SendMessageRequest {
  message: string;
}

export interface SendMessageResponse {
  user_message: SupportMessage;
  assistant_message: SupportMessage;
}

/**
 * Create a new support chat session
 */
export async function createSession(
  data: CreateSessionRequest = {}
): Promise<SupportSession> {
  const auth = getAuthToken();
  if (!auth) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/api/support/sessions/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `${auth.scheme} ${auth.token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to create session");
  }

  return response.json();
}

/**
 * Get list of support sessions
 */
export async function getSessions(): Promise<SupportSession[]> {
  const auth = getAuthToken();
  if (!auth) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/api/support/sessions/`, {
    method: "GET",
    headers: {
      Authorization: `${auth.scheme} ${auth.token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch sessions");
  }

  return response.json();
}

/**
 * Get messages for a specific session
 */
export async function getSessionMessages(
  sessionId: string
): Promise<SupportMessage[]> {
  const auth = getAuthToken();
  if (!auth) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/support/sessions/${sessionId}/messages/`,
    {
      method: "GET",
      headers: {
        Authorization: `${auth.scheme} ${auth.token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch messages");
  }

  return response.json();
}

/**
 * Send a message and get AI response
 */
export async function sendMessage(
  sessionId: string,
  data: SendMessageRequest
): Promise<SendMessageResponse> {
  const auth = getAuthToken();
  if (!auth) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/support/sessions/${sessionId}/message/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${auth.scheme} ${auth.token}`,
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to send message");
  }

  return response.json();
}
