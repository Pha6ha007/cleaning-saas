import { useState, useEffect } from "react";
import { ChatSidebar } from "@/components/support/ChatSidebar";
import { ChatWindow } from "@/components/support/ChatWindow";
import { useToast } from "@/hooks/use-toast";
import {
  getSessions,
  createSession,
  getSessionMessages,
  sendMessage,
  SupportSession,
  SupportMessage,
} from "@/api/support";

export default function Support() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SupportSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    } else {
      setMessages([]);
    }
  }, [currentSessionId]);

  const loadSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const data = await getSessions();
      setSessions(data);
    } catch (error) {
      console.error("Failed to load sessions:", error);
      toast({
        title: "Error",
        description: "Failed to load chat history",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const data = await getSessionMessages(sessionId);
      setMessages(data);
    } catch (error) {
      console.error("Failed to load messages:", error);
      toast({
        title: "Error",
        description: "Failed to load conversation",
        variant: "destructive",
      });
    }
  };

  const handleNewChat = async () => {
    try {
      setIsCreating(true);
      const newSession = await createSession({ product: "cleaning" });
      setSessions([newSession, ...sessions]);
      setCurrentSessionId(newSession.id);
    } catch (error) {
      console.error("Failed to create session:", error);
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSessionSelect = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const handleSendMessage = async (messageText: string) => {
    if (!currentSessionId) {
      // Create new session if none exists
      try {
        setIsCreating(true);
        const newSession = await createSession({ product: "cleaning" });
        setSessions([newSession, ...sessions]);
        setCurrentSessionId(newSession.id);

        // Send message to new session
        await sendMessageToSession(newSession.id, messageText);
      } catch (error) {
        console.error("Failed to create session:", error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
      } finally {
        setIsCreating(false);
      }
      return;
    }

    await sendMessageToSession(currentSessionId, messageText);
  };

  const sendMessageToSession = async (
    sessionId: string,
    messageText: string
  ) => {
    try {
      setIsLoading(true);

      const response = await sendMessage(sessionId, { message: messageText });

      // Add both user and assistant messages
      setMessages((prev) => [
        ...prev,
        response.user_message,
        response.assistant_message,
      ]);

      // Update session in list (move to top, update title)
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                title: response.user_message.content.slice(0, 50),
                updated_at: new Date().toISOString(),
              }
            : s
        );
        // Sort by updated_at
        return updated.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingSessions) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading support...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        isCreating={isCreating}
      />
      <ChatWindow
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    </div>
  );
}
