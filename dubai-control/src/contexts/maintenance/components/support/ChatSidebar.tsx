import { Plus, MessageCircle } from "lucide-react";
import { SupportSession } from "@/api/support";

interface ChatSidebarProps {
  sessions: SupportSession[];
  currentSessionId: string | null;
  onSessionSelect: (sessionId: string) => void;
  onNewChat: () => void;
  isCreating: boolean;
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onSessionSelect,
  onNewChat,
  isCreating,
}: ChatSidebarProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Support</h2>
        <button
          onClick={onNewChat}
          disabled={isCreating}
          className="w-full flex items-center justify-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-5 w-5 mr-2" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p>No conversations yet.</p>
            <p className="mt-1">Start a new chat to get help!</p>
          </div>
        ) : (
          <div className="p-2">
            {sessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSessionSelect(session.id)}
                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                  currentSessionId === session.id
                    ? "bg-teal-50 border border-teal-200"
                    : "hover:bg-gray-50 border border-transparent"
                }`}
              >
                <div className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                  {session.title || "New conversation"}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(session.updated_at)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
