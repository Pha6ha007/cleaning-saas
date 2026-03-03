import MarketingLayout from "@/components/marketing/MarketingLayout";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import SolutionSection from "@/components/landing/SolutionSection";
import ScrollShowcaseSection from "@/components/landing/ScrollShowcaseSection";
import FAQSection from "@/components/landing/FAQSection";
import CTASection from "@/components/landing/CTASection";
import TransitionSection1 from "@/components/landing/TransitionSection1";
import TransitionSection3 from "@/components/landing/TransitionSection3";

export default function CleaningLanding() {
  return (
    <MarketingLayout>
      {/* Platform badge */}
      <div className="bg-[#2563EB]/5 border-b border-[#2563EB]/10">
        <div className="marketing-container-wide py-3">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">Part of</span>
            <Link to="/" className="font-semibold text-[#2563EB] hover:underline">
              Proof Platform
            </Link>
            <span className="text-muted-foreground">— included in every plan</span>
            <Link to="/pricing" className="inline-flex items-center gap-1 text-[#2563EB] font-medium hover:underline">
              View pricing
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* CleanProof landing content */}
      <main className="overflow-hidden">
        <HeroSection />
        <ProblemSection />
        <TransitionSection1 />
        <SolutionSection />
        <ScrollShowcaseSection />
        <FAQSection />
        <TransitionSection3 />
        <CTASection />
      </main>
    </MarketingLayout>
  );
}
