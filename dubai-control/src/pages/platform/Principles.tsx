import MarketingLayout from "@/components/marketing/MarketingLayout";

const Principles = () => {
  return (
    <MarketingLayout>
      {/* Page Header */}
      <section className="pt-32 pb-16 bg-background border-b border-border/50">
        <div className="marketing-container-wide">
          <div className="max-w-2xl">
            <span className="marketing-overline mb-4 block">Platform Principles</span>
            <h1 className="text-3xl md:text-4xl font-bold mb-6">How We Build</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              The foundational decisions that guide platform development. These principles inform every feature,
              interface, and system choice.
            </p>
          </div>
        </div>
      </section>

      {/* Principles List */}
      <section className="marketing-section bg-background">
        <div className="marketing-container-wide">
          <div className="max-w-3xl">
            {principles.map((principle, index) => (
              <article
                key={index}
                className="pb-12 mb-12 border-b border-border/50 last:border-b-0 last:mb-0 last:pb-0"
              >
                <div className="flex gap-6">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                      <span className="text-sm font-semibold text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-4 text-foreground">{principle.title}</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">{principle.description}</p>
                    {principle.details && (
                      <p className="text-sm text-muted-foreground/80 leading-relaxed">{principle.details}</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Note */}
      <section className="py-16 bg-secondary/30 border-t border-border/50">
        <div className="marketing-container-wide">
          <div className="max-w-2xl">
            <p className="text-sm text-muted-foreground">
              These principles are not marketing statements. They represent actual constraints and priorities that
              shape how the platform operates.
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

const principles = [
  {
    title: "Verification First",
    description:
      "Every feature we build exists to create trustworthy proof of completed work. If a capability doesn't contribute to verification, we question whether it belongs.",
    details:
      "This principle guides us to keep the platform focused. We'd rather do fewer things well than add features that distract from the core job.",
  },
  {
    title: "Simplicity Over Complexity",
    description:
      "Cleaners in the field shouldn't need training to use the app. Complexity belongs in configuration, not in daily operation.",
    details:
      "We aim for the mobile app to be immediately understandable. If something requires explanation, we treat that as a design problem to solve.",
  },
  {
    title: "Built for Real Conditions",
    description:
      "The platform is designed for field work: variable connectivity, different device types, and the practical constraints of on-site cleaning.",
    details:
      "We test against real-world conditions, not ideal scenarios. Offline reliability and graceful handling of poor connectivity are priorities, not afterthoughts.",
  },
  {
    title: "Honest Records",
    description:
      "Reports and records are designed to be clear and factual. GPS timestamps, photos, and checklist status reflect what actually happened.",
    details:
      "We don't obscure information or present data in misleading ways. Client-facing reports show the work as it was completed.",
  },
  {
    title: "Start Small, Prove Value",
    description:
      "We believe in earning trust through results, not promises. The platform does a few things reliably before expanding into new capabilities.",
    details:
      "This means we often say 'not yet' to feature requests. We'd rather ship something solid than something half-finished.",
  },
  {
    title: "Incremental Improvement",
    description:
      "The platform evolves through measured, tested changes rather than large releases. Stability matters more than novelty.",
    details:
      "We deploy updates carefully. When we make changes, we communicate them clearly and avoid breaking what already works.",
  },
];

export default Principles;
