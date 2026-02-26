import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DocsSidebar } from "../components/docs/DocsSidebar";
import { DocsContent } from "../components/docs/DocsContent";
import { DocsSearch } from "../components/docs/DocsSearch";
import { DocsHome } from "../components/docs/DocsHome";
import { ChevronRight } from "lucide-react";
import { allPages } from "@/data/maintenance-docs";

export default function Docs() {
  const { page } = useParams<{ page?: string }>();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(page || "");

  const handlePageChange = (pageId: string) => {
    setCurrentPage(pageId);
    navigate(`/maintenance/docs/${pageId}`);
  };

  const getCurrentPageInfo = () => {
    return allPages.find((p) => p.id === currentPage);
  };

  const pageInfo = getCurrentPageInfo();

  return (
    <div className="flex h-screen bg-gray-50">
      <DocsSidebar currentPage={currentPage} onPageChange={handlePageChange} />

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-600">
                <button
                  onClick={() => {
                    setCurrentPage("");
                    navigate("/maintenance/docs");
                  }}
                  className="hover:text-gray-900"
                >
                  Docs
                </button>
                {pageInfo && (
                  <>
                    <ChevronRight className="h-4 w-4 mx-2" />
                    <span className="text-gray-400">{pageInfo.group}</span>
                    <ChevronRight className="h-4 w-4 mx-2" />
                    <span className="font-medium text-gray-900">
                      {pageInfo.title}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 max-w-md">
              <DocsSearch onPageSelect={handlePageChange} />
            </div>
          </div>
        </div>

        {/* Content */}
        {currentPage ? (
          <DocsContent pageId={currentPage} />
        ) : (
          <DocsHome onPageSelect={handlePageChange} />
        )}
      </div>
    </div>
  );
}
