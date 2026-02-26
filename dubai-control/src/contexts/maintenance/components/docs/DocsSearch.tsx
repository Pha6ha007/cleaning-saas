import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { allPages } from "@/data/maintenance-docs";
import { docContent } from "@/data/maintenance-docs/content";

interface DocsSearchProps {
  onPageSelect: (pageId: string) => void;
}

interface SearchResult {
  id: string;
  title: string;
  excerpt: string;
}

export function DocsSearch({ onPageSelect }: DocsSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const searchQuery = query.toLowerCase();
    const searchResults: SearchResult[] = [];

    allPages.forEach((page) => {
      const content = docContent[page.id];
      if (!content) return;

      const titleMatch = page.title.toLowerCase().includes(searchQuery);
      const contentMatch = content.content.toLowerCase().includes(searchQuery);

      if (titleMatch || contentMatch) {
        // Extract excerpt around the match
        const contentLower = content.content.toLowerCase();
        const matchIndex = contentLower.indexOf(searchQuery);
        const excerptStart = Math.max(0, matchIndex - 50);
        const excerptEnd = Math.min(
          content.content.length,
          matchIndex + searchQuery.length + 50
        );
        let excerpt = content.content.slice(excerptStart, excerptEnd);

        // Clean up excerpt (remove markdown, extra whitespace)
        excerpt = excerpt
          .replace(/#{1,6}\s/g, "")
          .replace(/\*\*/g, "")
          .replace(/\n/g, " ")
          .trim();

        if (excerptStart > 0) excerpt = "..." + excerpt;
        if (excerptEnd < content.content.length) excerpt = excerpt + "...";

        searchResults.push({
          id: page.id,
          title: page.title,
          excerpt,
        });
      }
    });

    setResults(searchResults.slice(0, 5)); // Limit to top 5 results
    setShowResults(true);
  }, [query]);

  const handleResultClick = (pageId: string) => {
    onPageSelect(pageId);
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
  };

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search documentation..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleResultClick(result.id)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="font-medium text-gray-900 mb-1">
                {result.title}
              </div>
              <div className="text-sm text-gray-600 line-clamp-2">
                {result.excerpt}
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && query.length >= 2 && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <p className="text-gray-600 text-sm">No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
