/**
 * Support Chat API Client
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

function getAuthToken(): string | null {
  return localStorage.getItem("authToken") || localStorage.getItem("auth_token");
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
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/api/support/sessions/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Token ${token}`,
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
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/api/support/sessions/`, {
    method: "GET",
    headers: {
      Authorization: `Token ${token}`,
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
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/support/sessions/${sessionId}/messages/`,
    {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
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
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/support/sessions/${sessionId}/message/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${token}`,
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
