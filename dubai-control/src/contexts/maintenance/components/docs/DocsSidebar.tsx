import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { docGroups } from "@/data/maintenance-docs";

interface DocsSidebarProps {
  currentPage: string;
  onPageChange: (pageId: string) => void;
}

export function DocsSidebar({ currentPage, onPageChange }: DocsSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    docGroups.map((g) => g.name) // All groups expanded by default
  );

  const toggleGroup = (groupName: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupName)
        ? prev.filter((g) => g !== groupName)
        : [...prev, groupName]
    );
  };

  return (
    <div className="w-64 border-r border-gray-200 bg-white h-full overflow-y-auto">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">
          Documentation
        </h2>

        <nav className="space-y-6">
          {docGroups.map((group) => {
            const isExpanded = expandedGroups.includes(group.name);

            return (
              <div key={group.name}>
                <button
                  onClick={() => toggleGroup(group.name)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-700"
                >
                  <span>{group.name}</span>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {isExpanded && (
                  <ul className="space-y-1 ml-1">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <button
                          onClick={() => onPageChange(item.id)}
                          className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                            currentPage === item.id
                              ? "bg-teal-50 text-teal-700 font-medium"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {item.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
