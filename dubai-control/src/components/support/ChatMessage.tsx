import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isAssistant = role === "assistant";

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className={`flex gap-4 mb-6 ${isAssistant ? "" : "flex-row-reverse"}`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isAssistant ? "bg-blue-100" : "bg-gray-200"
        }`}
      >
        {isAssistant ? (
          <Bot className="h-5 w-5 text-blue-600" />
        ) : (
          <User className="h-5 w-5 text-gray-600" />
        )}
      </div>

      <div className={`flex-1 ${isAssistant ? "" : "flex flex-col items-end"}`}>
        <div
          className={`inline-block max-w-3xl rounded-lg p-4 ${
            isAssistant
              ? "bg-white border border-gray-200"
              : "bg-blue-600 text-white"
          }`}
        >
          {isAssistant ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-3 last:mb-0 text-gray-700">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc pl-5 mb-3 text-gray-700 space-y-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal pl-5 mb-3 text-gray-700 space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => <li>{children}</li>,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-gray-900">
                      {children}
                    </strong>
                  ),
                  code: ({ children }) => (
                    <code className="bg-gray-100 text-blue-600 px-1.5 py-0.5 rounded text-sm">
                      {children}
                    </code>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-white whitespace-pre-wrap">{content}</p>
          )}
        </div>
        <div
          className={`text-xs text-gray-500 mt-1 ${
            isAssistant ? "" : "text-right"
          }`}
        >
          {formatTime(timestamp)}
        </div>
      </div>
    </div>
  );
}
