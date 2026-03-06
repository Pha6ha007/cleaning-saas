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
      <main className="flex-1 bg-[hsl(220,20%,10%)]">
        <div className="marketing-container-tight py-16 md:py-24">
          <div className="prose prose-lg prose-invert max-w-none
            prose-headings:text-white prose-headings:font-semibold
            prose-h1:text-4xl prose-h1:mb-2
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-3
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-white/70 prose-p:leading-relaxed
            prose-li:text-white/70
            prose-strong:text-white
            prose-a:text-[#E97A1F] prose-a:no-underline hover:prose-a:underline
            [&_h1+p]:text-white/40 [&_h1+p]:text-sm [&_h1+p]:mb-8
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
