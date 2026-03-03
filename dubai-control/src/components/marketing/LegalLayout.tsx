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
      <main className="flex-1 bg-white">
        <div className="marketing-container-tight py-16 md:py-24">
          <div className="prose prose-lg max-w-none">
            {children}
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
};

export default LegalLayout;
