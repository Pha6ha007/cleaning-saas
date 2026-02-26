interface SuggestedQuestionsProps {
  onQuestionClick: (question: string) => void;
}

const SUGGESTED_QUESTIONS = [
  "How do I add a new asset?",
  "What is a service visit?",
  "How does SLA work in maintenance?",
  "How do I assign a technician to a visit?",
  "How do I view asset history?",
  "What is a checklist template?",
];

export function SuggestedQuestions({
  onQuestionClick,
}: SuggestedQuestionsProps) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-3">
        💡 Suggested questions:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {SUGGESTED_QUESTIONS.map((question) => (
          <button
            key={question}
            onClick={() => onQuestionClick(question)}
            className="text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-colors text-sm text-gray-700"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
