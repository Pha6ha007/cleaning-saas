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

      {/* Hero header */}
      <div className="bg-gradient-to-b from-[hsl(220,20%,10%)] to-[hsl(220,18%,14%)] pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          {/* Title will be styled via prose */}
        </div>
      </div>

      <main className="flex-1 bg-[hsl(220,15%,97%)]">
        <div className="max-w-4xl mx-auto px-6 -mt-8">
          {/* Main content card */}
          <div className="bg-white rounded-2xl shadow-xl shadow-black/5 border border-gray-100 overflow-hidden">
            <div className="p-8 md:p-12 lg:p-16">
              <div className="prose prose-lg max-w-none

                /* Title styling */
                prose-h1:text-4xl prose-h1:md:text-5xl prose-h1:font-bold prose-h1:tracking-tight
                prose-h1:text-[hsl(220,20%,10%)] prose-h1:mb-3

                /* Last updated text */
                [&_h1+p]:text-sm [&_h1+p]:text-gray-400 [&_h1+p]:font-medium
                [&_h1+p]:mb-12 [&_h1+p]:pb-8 [&_h1+p]:border-b-2 [&_h1+p]:border-gray-100

                /* Section headers (h2) - card-like */
                prose-h2:text-xl prose-h2:md:text-2xl prose-h2:font-bold
                prose-h2:text-[hsl(220,20%,10%)] prose-h2:mt-12 prose-h2:mb-6
                prose-h2:bg-gradient-to-r prose-h2:from-gray-50 prose-h2:to-transparent
                prose-h2:py-4 prose-h2:px-5 prose-h2:-mx-5 prose-h2:rounded-xl
                prose-h2:border-l-4 prose-h2:border-[#059669]

                /* Subsection headers (h3) */
                prose-h3:text-lg prose-h3:font-semibold prose-h3:text-gray-800
                prose-h3:mt-8 prose-h3:mb-4

                /* Body text */
                prose-p:text-gray-600 prose-p:leading-relaxed prose-p:text-base

                /* Lists */
                prose-ul:my-4 prose-ul:space-y-2
                prose-li:text-gray-600 prose-li:leading-relaxed
                [&_ul]:list-none [&_ul]:pl-0
                [&_li]:relative [&_li]:pl-6
                [&_li]:before:content-[''] [&_li]:before:absolute
                [&_li]:before:left-0 [&_li]:before:top-[0.6em]
                [&_li]:before:w-2 [&_li]:before:h-2
                [&_li]:before:bg-[#059669]/20 [&_li]:before:rounded-full

                /* Strong text */
                prose-strong:text-gray-900 prose-strong:font-semibold

                /* Links */
                prose-a:text-[#059669] prose-a:font-medium prose-a:no-underline
                hover:prose-a:text-[#047857] hover:prose-a:underline
              ">
                {children}
              </div>
            </div>
          </div>

          {/* Bottom spacing */}
          <div className="h-16 md:h-24" />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
};

export default LegalLayout;
