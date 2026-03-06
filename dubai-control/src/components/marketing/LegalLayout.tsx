import { ReactNode } from "react";
import MarketingHeader from "./MarketingHeader";
import MarketingFooter from "./MarketingFooter";
import "../../styles/marketing-theme.css";

interface LegalLayoutProps {
  children: ReactNode;
}

const LegalLayout = ({ children }: LegalLayoutProps) => {
  return (
    <div className="marketing-root min-h-screen flex flex-col">
      <MarketingHeader />
      <main className="flex-1 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
          <div className="prose prose-lg max-w-none
            prose-headings:text-gray-900 prose-headings:font-semibold
            prose-h1:text-4xl prose-h1:tracking-tight prose-h1:mb-1
            prose-h2:text-2xl prose-h2:mt-14 prose-h2:mb-4 prose-h2:pt-6 prose-h2:border-t prose-h2:border-gray-200
            prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-gray-700
            prose-p:text-gray-600 prose-p:leading-relaxed
            prose-li:text-gray-600
            prose-strong:text-gray-900
            prose-a:text-[#E97A1F] prose-a:no-underline hover:prose-a:underline
            [&_h1+p]:text-gray-400 [&_h1+p]:text-sm [&_h1+p]:mb-10 [&_h1+p]:pb-6 [&_h1+p]:border-b [&_h1+p]:border-gray-200
          ">
            {children}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
};

export default LegalLayout;
