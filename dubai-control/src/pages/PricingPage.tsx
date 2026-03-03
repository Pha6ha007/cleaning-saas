import MarketingLayout from "@/components/marketing/MarketingLayout";
import { Check, ArrowRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const PricingPage = () => {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const monthlyPrices = { starter: 129, professional: 279, business: 499 };
  const annualPrices = { starter: 109, professional: 239, business: 429 };

  return (
    <MarketingLayout>
      {/* Hero section - Dark */}
      <section className="marketing-section-dark pt-20 pb-16">
        <div className="marketing-container-wide text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#E97A1F] bg-[#E97A1F]/10 px-4 py-2 rounded-full mb-8 uppercase tracking-wider border border-[#E97A1F]/20">
            <Check className="w-4 h-4" />
            All contexts included in every plan
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 max-w-4xl mx-auto leading-tight">
            One platform. All operations.
          </h1>

          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-12 leading-relaxed">
            Choose the scale that fits your team. All contexts included.
          </p>

          {/* Billing toggle - Minimalist pill */}
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/8 rounded-full p-1 mb-16">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-[#E97A1F] text-white shadow-lg"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === "annual"
                  ? "bg-[#E97A1F] text-white shadow-lg"
                  : "text-white/60 hover:text-white"
              }`}
            >
              Annual
            </button>
            {billingCycle === "annual" && (
              <span className="text-xs text-[#E97A1F] font-semibold px-2">Save ~15%</span>
            )}
          </div>
        </div>
      </section>

      {/* Pricing plans - All dark cards */}
      <section className="py-20 px-6 marketing-section-dark">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-6">
            {/* Starter */}
            <PricingCard
              name="Starter"
              description="For small teams getting started"
              monthlyPrice={monthlyPrices.starter}
              annualPrice={annualPrices.starter}
              billingCycle={billingCycle}
              features={[
                "Up to 10 team members",
                "500 service visits/month",
                "GPS check-in & photo proof",
                "Automated PDF reports",
                "CleanProof + MaintainProof",
                "Email support",
                "Basic analytics",
              ]}
              limitations={["Limited to 500 visits/month", "Email support only"]}
              ctaText="Start Free Trial"
              ctaLink="/login?trial=starter"
            />

            {/* Professional (Recommended) */}
            <PricingCard
              name="Professional"
              description="Most popular for growing teams"
              monthlyPrice={monthlyPrices.professional}
              annualPrice={annualPrices.professional}
              billingCycle={billingCycle}
              features={[
                "Up to 30 team members",
                "Unlimited service visits",
                "GPS check-in & photo proof",
                "Automated PDF reports",
                "All contexts included",
                "Priority email support",
                "Advanced analytics",
                "Custom checklists",
                "API access",
              ]}
              limitations={[]}
              ctaText="Start Free Trial"
              ctaLink="/login?trial=professional"
              recommended={true}
            />

            {/* Business */}
            <PricingCard
              name="Business"
              description="For larger operations"
              monthlyPrice={monthlyPrices.business}
              annualPrice={annualPrices.business}
              billingCycle={billingCycle}
              features={[
                "Up to 75 team members",
                "Unlimited service visits",
                "GPS check-in & photo proof",
                "Automated PDF reports",
                "All contexts included",
                "Priority support + phone",
                "Advanced analytics",
                "Custom checklists",
                "API access",
                "Custom integrations",
                "Dedicated onboarding",
              ]}
              limitations={[]}
              ctaText="Start Free Trial"
              ctaLink="/login?trial=business"
            />

            {/* Enterprise */}
            <PricingCard
              name="Enterprise"
              description="Custom solutions at scale"
              monthlyPrice={null}
              annualPrice={null}
              billingCycle={billingCycle}
              features={[
                "Unlimited team members",
                "Unlimited service visits",
                "All platform features",
                "Dedicated account manager",
                "24/7 priority support",
                "Custom SLAs",
                "On-premise deployment option",
                "Advanced security controls",
                "Custom development",
                "Training & consulting",
              ]}
              limitations={[]}
              ctaText="Contact Sales"
              ctaLink="/contact"
              enterprise={true}
            />
          </div>

          {/* Trust bar */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-white/50">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#E97A1F]" />
              <span>14-day free trial</span>
            </div>
            <div className="text-white/30">·</div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#E97A1F]" />
              <span>No credit card required</span>
            </div>
            <div className="text-white/30">·</div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#E97A1F]" />
              <span>Cancel anytime</span>
            </div>
            <div className="text-white/30">·</div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#E97A1F]" />
              <span>Data export included</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section - Dark with Accordion */}
      <section className="marketing-section-dark border-t border-white/8 py-20">
        <div className="marketing-container-wide">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Pricing FAQ</h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto">
              Common questions about Proof Platform pricing and plans
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-0">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="border-b border-white/8 last:border-0"
                >
                  <AccordionTrigger className="text-left text-base font-semibold text-white hover:text-white/80 py-6">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-white/60 leading-relaxed pb-6">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="marketing-section-dark border-t border-white/8 py-20">
        <div className="marketing-container-wide text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to get started?</h2>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Start your free 14-day trial today. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login?trial=professional" className="marketing-cta-primary">
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link to="/contact" className="marketing-cta-secondary">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

// Pricing Card Component - All Dark
interface PricingCardProps {
  name: string;
  description: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  billingCycle: "monthly" | "annual";
  features: string[];
  limitations: string[];
  ctaText: string;
  ctaLink: string;
  recommended?: boolean;
  enterprise?: boolean;
}

const PricingCard = ({
  name,
  description,
  monthlyPrice,
  annualPrice,
  billingCycle,
  features,
  limitations,
  ctaText,
  ctaLink,
  recommended = false,
  enterprise = false,
}: PricingCardProps) => {
  const currentPrice = billingCycle === "monthly" ? monthlyPrice : annualPrice;
  const oldPrice = billingCycle === "annual" ? monthlyPrice : null;

  return (
    <div
      className={`relative rounded-xl p-8 flex flex-col bg-[hsl(220,18%,14%)] ${
        recommended
          ? "border-2 border-[#E97A1F]"
          : "border border-[rgba(255,255,255,0.08)]"
      }`}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#E97A1F] text-white px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
          Recommended
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2 text-white">{name}</h3>
        <p className="text-sm text-white/60">{description}</p>
      </div>

      <div className="mb-6">
        {enterprise ? (
          <div className="text-4xl font-bold text-white">Custom</div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              {billingCycle === "annual" && oldPrice && (
                <span className="text-2xl font-bold text-white/30 line-through">
                  ${oldPrice}
                </span>
              )}
              <span className="text-4xl font-bold text-white">
                ${currentPrice}
              </span>
              <span className="text-sm text-white/50">/month</span>
            </div>
            {billingCycle === "annual" && (
              <p className="text-xs mt-1 text-white/50">
                Billed annually
              </p>
            )}
          </>
        )}
      </div>

      {/* CTA Button */}
      {recommended ? (
        <Link
          to={ctaLink}
          className="w-full mb-6 inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-md bg-[#E97A1F] hover:bg-[#E97A1F]/90 text-white transition-all"
        >
          {ctaText}
        </Link>
      ) : (
        <Link
          to={ctaLink}
          className="w-full mb-6 inline-flex items-center justify-center px-6 py-3 text-sm font-semibold rounded-md border-2 border-[#E97A1F] text-[#E97A1F] hover:bg-[#E97A1F]/10 transition-all"
        >
          {ctaText}
        </Link>
      )}

      {/* Divider */}
      <div className="border-t border-[rgba(255,255,255,0.08)] mb-6"></div>

      {/* Features */}
      <div className="flex-1">
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <Check className="h-5 w-5 flex-shrink-0 mt-0.5 text-[#E97A1F]" />
              <span className="text-sm text-[rgba(255,255,255,0.7)]">{feature}</span>
            </li>
          ))}
          {limitations.map((limitation, i) => (
            <li key={i} className="flex items-start gap-3">
              <X className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-400" />
              <span className="text-sm text-[rgba(255,255,255,0.5)]">
                {limitation}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// FAQ Data
const faqs = [
  {
    question: "What's included in all plans?",
    answer:
      "Every plan includes access to all operational contexts (CleanProof, MaintainProof, PropertyProof when available, and FitOutProof when available). You get GPS check-in, photo evidence capture, automated PDF reports, and the core verification engine. Plans differ in team size limits, visit quotas, and support levels.",
  },
  {
    question: "How does the free trial work?",
    answer:
      "All paid plans include a free 14-day trial with full access to all features. No credit card is required to start. You can cancel anytime during the trial with no charges.",
  },
  {
    question: "Can I change plans later?",
    answer:
      "Yes. You can upgrade or downgrade your plan at any time. When you upgrade, you'll be charged the prorated difference. When you downgrade, the change takes effect at the next billing cycle.",
  },
  {
    question: "What happens if I exceed my visit limit?",
    answer:
      "On the Starter plan (500 visits/month), you'll receive a notification when approaching the limit. You can upgrade to Professional or Business for unlimited visits, or purchase additional visit capacity as needed.",
  },
  {
    question: "Is there a setup fee?",
    answer:
      "No setup fees. Professional and Business plans include free onboarding assistance. Enterprise plans include dedicated onboarding and training as part of the custom agreement.",
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer:
      "Yes. Annual billing saves approximately 15% compared to monthly billing. You can switch between monthly and annual billing at any time.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, Amex) and bank transfers for annual plans. Enterprise customers can arrange invoice-based billing.",
  },
  {
    question: "Can I export my data?",
    answer:
      "Yes. All plans include data export capabilities. You can export your verification records, photos, and reports at any time in standard formats (CSV, PDF).",
  },
];

export default PricingPage;
