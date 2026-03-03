import MarketingLayout from "@/components/marketing/MarketingLayout";

const Updates = () => {
  return (
    <MarketingLayout>
      {/* Page Header */}
      <section className="pt-32 pb-16 bg-background border-b border-border/50 py-[51px]">
        <div className="marketing-container-wide">
          <div className="max-w-2xl">
            <span className="marketing-overline mb-4 block">Platform Updates</span>
            <h1 className="text-3xl md:text-4xl font-bold mb-6">What's New</h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              A chronological record of platform improvements, new capabilities, and system updates. All changes are
              documented for transparency.
            </p>
          </div>
        </div>
      </section>

      {/* Updates List */}
      <section className="marketing-section bg-background">
        <div className="marketing-container-wide">
          <div className="max-w-3xl">
            {updates.map((update, index) => (
              <article
                key={index}
                className="pb-12 mb-12 border-b border-border/50 last:border-b-0 last:mb-0 last:pb-0"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-8">
                  <div className="sm:w-32 flex-shrink-0">
                    <time className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {update.date}
                    </time>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                          update.type === "Feature"
                            ? "bg-[#E97A1F]/10 text-[#E97A1F]"
                            : update.type === "Improvement"
                            ? "bg-[#E97A1F]/10 text-[#E97A1F]"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {update.type}
                      </span>
                    </div>
                    <h2 className="text-xl font-semibold mb-3 text-foreground">{update.title}</h2>
                    <p className="text-muted-foreground leading-relaxed">{update.description}</p>
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
              Updates are published as they become available. For specific questions about platform capabilities,
              please contact our team directly.
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

const updates = [
  {
    date: "Jan 2026",
    type: "Feature",
    title: "PDF Report Generation",
    description:
      "Automatic PDF reports include before/after photos, checklist completion status, and GPS-verified timestamps. Reports are available for download from the manager dashboard.",
  },
  {
    date: "Dec 2025",
    type: "Improvement",
    title: "Photo Upload Reliability",
    description:
      "Improved handling of photo uploads in low-connectivity environments. Photos now queue locally and sync when connection is restored.",
  },
  {
    date: "Nov 2025",
    type: "System",
    title: "First Pilot Deployment",
    description:
      "Completed first pilot deployment with an early partner client. Core workflow validated: GPS check-in, photo capture, checklist completion, and report delivery.",
  },
  {
    date: "Oct 2025",
    type: "Feature",
    title: "Internal Beta Launch",
    description:
      "Launched internal beta of manager dashboard and cleaner mobile app. Core verification workflow operational for testing.",
  },
];

export default Updates;
