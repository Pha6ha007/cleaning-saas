interface SuggestedQuestionsProps {
  onQuestionClick: (question: string) => void;
}

const SUGGESTED_QUESTIONS = [
  "How do I create a job?",
  "What is SLA and how is it calculated?",
  "How do I add a cleaner?",
  "How do checklists work?",
  "How do I download a job report?",
  "What happens when a cleaner checks in?",
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
            className="text-left px-4 py-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-sm text-gray-700"
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
