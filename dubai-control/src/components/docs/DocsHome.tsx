import { BookOpen, Lightbulb, FileText, Settings } from "lucide-react";

interface DocsHomeProps {
  onPageSelect: (pageId: string) => void;
}

export function DocsHome({ onPageSelect }: DocsHomeProps) {
  const sections = [
    {
      icon: BookOpen,
      title: "Getting Started",
      description: "New to CleanProof? Start here to learn the basics.",
      pages: [
        { id: "first-steps", title: "First Steps" },
        { id: "how-it-works", title: "How It Works" },
      ],
      color: "blue",
    },
    {
      icon: Settings,
      title: "Guides",
      description: "Step-by-step guides for common tasks.",
      pages: [
        { id: "creating-jobs", title: "Creating Jobs" },
        { id: "managing-locations", title: "Managing Locations" },
        { id: "working-with-cleaners", title: "Working with Cleaners" },
        { id: "checklist-templates", title: "Checklist Templates" },
      ],
      color: "green",
    },
    {
      icon: Lightbulb,
      title: "Concepts",
      description: "Understand how CleanProof works under the hood.",
      pages: [
        { id: "proof-system", title: "Proof System" },
        { id: "sla-engine", title: "SLA Engine" },
        { id: "analytics", title: "Analytics" },
      ],
      color: "purple",
    },
    {
      icon: FileText,
      title: "Reference",
      description: "Detailed information and specifications.",
      pages: [{ id: "plans-billing", title: "Plans & Billing" }],
      color: "orange",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; hover: string }> = {
      blue: {
        bg: "bg-blue-50",
        text: "text-blue-600",
        hover: "hover:bg-blue-100",
      },
      green: {
        bg: "bg-green-50",
        text: "text-green-600",
        hover: "hover:bg-green-100",
      },
      purple: {
        bg: "bg-purple-50",
        text: "text-purple-600",
        hover: "hover:bg-purple-100",
      },
      orange: {
        bg: "bg-orange-50",
        text: "text-orange-600",
        hover: "hover:bg-orange-100",
      },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            CleanProof Documentation
          </h1>
          <p className="text-xl text-gray-600">
            Everything you need to know about using CleanProof to manage your
            cleaning operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((section) => {
            const colors = getColorClasses(section.color);
            const Icon = section.icon;

            return (
              <div
                key={section.title}
                className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start mb-4">
                  <div className={`${colors.bg} p-3 rounded-lg mr-4`}>
                    <Icon className={`h-6 w-6 ${colors.text}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      {section.title}
                    </h2>
                    <p className="text-gray-600 text-sm">
                      {section.description}
                    </p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {section.pages.map((page) => (
                    <li key={page.id}>
                      <button
                        onClick={() => onPageSelect(page.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${colors.text} ${colors.hover} transition-colors`}
                      >
                        {page.title} →
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Need Help?
          </h3>
          <p className="text-gray-700 mb-4">
            Can't find what you're looking for? Our AI support assistant can
            help answer your questions.
          </p>
          <a
            href="/support"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Ask Support Assistant
          </a>
        </div>
      </div>
    </div>
  );
}
