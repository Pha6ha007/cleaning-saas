import MarketingLayout from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Shield, FileCheck, Users, Clock, Eye, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/maintainproof/hero-maintenance.jpg";

const MaintenanceLanding = () => {
  return (
    <MarketingLayout>
      {/* Platform badge */}
      <div className="bg-[#059669]/5 border-b border-[#059669]/10">
        <div className="marketing-container-wide py-3">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">Part of</span>
            <Link to="/" className="font-semibold text-[#059669] hover:underline">
              Proof Platform
            </Link>
            <span className="text-muted-foreground">— included in every plan</span>
            <Link to="/pricing" className="inline-flex items-center gap-1 text-[#059669] font-medium hover:underline">
              View pricing
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Hero — Dark, commanding */}
      <section className="relative min-h-[85vh] flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img src={heroImage} alt="Maintenance operations" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(195,35%,8%)]/95 via-[hsl(195,30%,10%)]/85 to-[hsl(195,25%,12%)]/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(195,35%,8%)] via-transparent to-[hsl(195,35%,8%)]/40" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 w-full pt-24 pb-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[0.65rem] font-bold text-[#059669] bg-[#059669]/[0.12] px-4 py-2 rounded-full mb-10 tracking-[0.12em] uppercase border border-[#059669]/20">
              <Shield className="w-3.5 h-3.5" />
              Operational Risk Control
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.05] tracking-tight mb-6">
              <span className="text-gray-300">Maintenance without proof</span>
              <br />
              <span className="text-white/70">becomes liability.</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/50 max-w-xl mb-14 leading-relaxed">
              Control every task. Document every action.
              <br className="hidden sm:block" />
              Protect your operation.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link to="/contact">
                <Button size="lg" className="h-14 px-10 text-base font-semibold shadow-2xl shadow-[#059669]/40 hover:shadow-[#059669]/50 rounded-lg bg-[#059669] hover:bg-[#059669]/90">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg" className="h-14 px-9 text-base font-medium border-white/20 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/30 rounded-lg bg-transparent">
                  Request Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution — High contrast split */}
      <section className="py-24 lg:py-32 px-6 bg-gradient-to-b from-[hsl(220,15%,96%)] to-[hsl(220,14%,94%)]">
        <div className="max-w-7xl mx-auto lg:px-4">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-5">
              When maintenance lacks proof,
              <br className="hidden sm:block" />
              <span className="text-muted-foreground">it creates exposure.</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed mt-6">
              Most teams run on paper, WhatsApp, and memory. Work gets lost. Proof disappears. Responsibility is
              unclear.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {/* Risk - Dark card with gradient */}
            <div className="relative group">
              {/* Subtle gradient glow behind */}
              <div className="absolute -inset-1 bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />

              <div className="relative bg-gradient-to-br from-[hsl(220,15%,15%)] to-[hsl(220,15%,20%)] p-10 lg:p-12 rounded-2xl shadow-2xl border border-white/5">
                <div className="inline-flex items-center gap-2 text-[0.65rem] font-bold text-red-400/70 bg-red-500/10 px-3 py-1.5 rounded-full mb-10 tracking-[0.14em] uppercase border border-red-500/20">
                  WITHOUT A SYSTEM
                </div>
                <ul className="space-y-5">
                  {[
                    "Tasks completed — but no evidence attached",
                    "Contractors blamed — but no audit trail",
                    "SLA penalties — without documentation",
                    "Owners requesting records you don't have",
                    "Disputes escalate with no defensible proof",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-4 text-white/60 text-base leading-relaxed group/item hover:text-white/80 transition-colors">
                      <span className="w-2 h-2 rounded-full bg-red-500/30 mt-2 shrink-0 group-hover/item:bg-red-500/50 transition-colors" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Control - Light card with green accent */}
            <div className="relative group">
              {/* Green glow behind */}
              <div className="absolute -inset-1 bg-gradient-to-br from-[#059669]/20 via-[#059669]/10 to-transparent rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />

              <div className="relative bg-gradient-to-br from-white to-[#059669]/[0.02] p-10 lg:p-12 rounded-2xl shadow-2xl border-2 border-[#059669]/20">
                <div className="inline-flex items-center gap-2 text-[0.65rem] font-bold text-[#059669] bg-[#059669]/10 px-3 py-1.5 rounded-full mb-10 tracking-[0.14em] uppercase border border-[#059669]/30">
                  <Check className="w-3 h-3" />
                  WITH MAINTAINPROOF
                </div>
                <ul className="space-y-5">
                  {[
                    "Every task logged with timestamped evidence",
                    "Photo and checklist proof attached to each job",
                    "Clear assignment, deadlines, and accountability",
                    "Complete audit trail for every property",
                    "Defensible records ready when you need them",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-4 text-foreground text-base leading-relaxed group/item">
                      <div className="w-5 h-5 rounded-full bg-[#059669]/10 flex items-center justify-center mt-0.5 shrink-0 group-hover/item:bg-[#059669]/20 transition-colors">
                        <Check className="w-3.5 h-3.5 text-[#059669]" />
                      </div>
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works — Procedural, structured */}
      <section className="py-24 lg:py-32 px-6 bg-white">
        <div className="max-w-7xl mx-auto lg:px-4">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-5">
              How it works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Four steps to controlled, documented maintenance operations.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-border rounded-xl overflow-hidden">
            {[
              { step: "01", title: "Create", description: "Log a work order with location, priority, and deadline." },
              { step: "02", title: "Assign", description: "Assign to technicians. They see it instantly." },
              {
                step: "03",
                title: "Complete",
                description: "Technician uploads photos and marks complete.",
              },
              {
                step: "04",
                title: "Verify",
                description: "Review proof. Close with documented confidence.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`relative p-8 lg:p-9 border-r border-b border-border last:border-r-0 sm:[&:nth-child(2)]:border-r-0 lg:[&:nth-child(2)]:border-r transition-colors duration-150 ${
                  item.step === "04" ? "bg-[#059669]/[0.04]" : "bg-white hover:bg-[hsl(220,14%,98%)]"
                }`}
              >
                <p className={`text-3xl font-bold mb-5 ${item.step === "04" ? "text-[#059669]/60" : "text-border"}`}>
                  {item.step}
                </p>
                <h3
                  className={`text-lg font-bold mb-2.5 ${item.step === "04" ? "text-[#059669]" : "text-foreground"}`}
                >
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                {item.step === "04" && (
                  <div className="absolute top-8 right-8 w-8 h-8 rounded-full bg-[#059669]/10 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-[#059669]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Operational Protection — Dark accent section */}
      <section className="py-24 lg:py-32 px-6 bg-[hsl(195,30%,10%)]">
        <div className="max-w-7xl mx-auto lg:px-4">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-5">
              Operational Protection
            </h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto leading-relaxed">
              Not features. Safeguards that protect your operation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
            {[
              {
                icon: FileCheck,
                title: "Proof of work",
                description:
                  "Every job documented with photos and timestamps. Answer owners with evidence, not excuses.",
              },
              {
                icon: Users,
                title: "Clear accountability",
                description:
                  "Know exactly who is responsible for what, and when it was due. No more ambiguity.",
              },
              {
                icon: Eye,
                title: "Complete audit trail",
                description:
                  "Full maintenance record for every property and asset. See what was done and when.",
              },
              {
                icon: Clock,
                title: "Faster response",
                description:
                  "Urgent issues get flagged and assigned immediately. Nothing sits unattended.",
              },
              {
                icon: Shield,
                title: "Owner confidence",
                description:
                  "Share reports that show work completed. Build trust through documented transparency.",
              },
              {
                icon: BarChart3,
                title: "Operational control",
                description:
                  "See all open work at a glance. Know your team's workload. Stay ahead of exposure.",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-[hsl(195,28%,13%)] p-8 lg:p-9 transition-colors duration-150 hover:bg-[hsl(195,28%,15%)]"
              >
                <item.icon className="w-5 h-5 text-[#059669]/60 mb-5" />
                <h3 className="text-sm font-bold text-white uppercase tracking-[0.06em] mb-3">{item.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for operators */}
      <section className="py-24 lg:py-32 px-6 bg-gradient-to-b from-[hsl(220,14%,94%)] to-[hsl(220,15%,96%)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-5">
              Built for operators
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              If you manage properties or facilities, this is for you.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: "Property Management Companies",
                description:
                  "Managing residential or commercial buildings with in-house or contracted maintenance teams.",
              },
              {
                title: "Facilities Managers",
                description:
                  "Responsible for building operations, vendor coordination, and maintenance scheduling.",
              },
              {
                title: "Real Estate Operators",
                description:
                  "Owners and operators who need visibility into property maintenance across portfolios.",
              },
              {
                title: "Maintenance Supervisors",
                description: "Leading technician teams and needing accountability for work completion.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4 p-7 bg-white rounded-lg border border-border/60 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-[#059669] mt-2 shrink-0" />
                <div>
                  <h3 className="font-bold text-foreground mb-1.5">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="py-20 px-6 bg-white border-y border-border/40">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight mb-4">
            Simple. Reliable. Built for the UAE market.
          </h2>
          <p className="text-muted-foreground text-base max-w-2xl mx-auto mb-12 leading-relaxed">
            We understand property operations in this region. No unnecessary complexity. No enterprise pricing. Just
            the tools you need to run maintenance properly.
          </p>

          <div className="inline-flex flex-wrap justify-center gap-x-10 gap-y-5 text-sm text-muted-foreground">
            {["UAE-based support", "Mobile-ready for field teams", "No long-term contracts", "Free onboarding"].map(
              (item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#059669]/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#059669]" />
                  </div>
                  <span className="font-medium">{item}</span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Final CTA — Dark */}
      <section className="py-24 lg:py-32 px-6 bg-[hsl(195,30%,10%)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
            Ready to take control?
          </h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto mb-14 leading-relaxed">
            Start a free trial or schedule a call to see how MaintainProof protects your operation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/contact">
              <Button size="lg" className="h-14 px-10 text-base font-semibold shadow-2xl shadow-[#059669]/40 hover:shadow-[#059669]/50 rounded-lg bg-[#059669] hover:bg-[#059669]/90">
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" size="lg" className="h-14 px-9 text-base font-medium border-white/20 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/30 rounded-lg bg-transparent">
                Schedule a Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default MaintenanceLanding;
