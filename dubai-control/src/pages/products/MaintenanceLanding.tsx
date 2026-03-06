import MarketingLayout from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Shield, FileCheck, Users, Clock, Eye, BarChart3, Plus, Send, CheckCircle2, ClipboardCheck } from "lucide-react";
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
                <button className="relative overflow-hidden h-14 px-10 text-base font-semibold rounded-xl backdrop-blur-md bg-[#059669]/85 hover:bg-[#059669]/95 text-white border border-[#059669]/60 shadow-2xl shadow-[#059669]/40 hover:shadow-[#059669]/50 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                  <span className="relative flex items-center gap-2">
                    Start Free Trial
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </button>
              </Link>
              <Link to="/contact">
                <button className="relative overflow-hidden h-14 px-9 text-base font-medium rounded-xl backdrop-blur-md bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 hover:border-white/40 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                  <span className="relative">Request Demo</span>
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Problem vs Solution — High contrast split with 3D cards */}
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

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12" style={{ perspective: "1200px" }}>
            {/* Risk - Dark 3D card */}
            <div className="relative group" style={{ transformStyle: "preserve-3d" }}>
              {/* Animated gradient glow */}
              <div className="absolute -inset-2 bg-gradient-to-br from-red-500/20 via-orange-500/10 to-red-500/5 rounded-3xl blur-xl opacity-40 group-hover:opacity-70 transition-all duration-500 animate-pulse" />

              <div
                className="relative bg-gradient-to-br from-[hsl(220,15%,12%)] via-[hsl(220,15%,15%)] to-[hsl(220,15%,18%)] p-10 lg:p-12 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-white/5 transition-all duration-500 group-hover:shadow-[0_30px_60px_rgba(0,0,0,0.5)] group-hover:-translate-y-2"
                style={{
                  transform: "rotateY(-2deg) rotateX(2deg)",
                  transformStyle: "preserve-3d"
                }}
              >
                {/* Inner glow effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-white/[0.03] via-transparent to-transparent pointer-events-none" />

                <div className="inline-flex items-center gap-2 text-[0.65rem] font-bold text-red-400 bg-red-500/15 px-4 py-2 rounded-full mb-10 tracking-[0.14em] uppercase border border-red-500/30 shadow-lg shadow-red-500/10">
                  WITHOUT A SYSTEM
                </div>
                <ul className="space-y-6">
                  {[
                    "Tasks completed — but no evidence attached",
                    "Contractors blamed — but no audit trail",
                    "SLA penalties — without documentation",
                    "Owners requesting records you don't have",
                    "Disputes escalate with no defensible proof",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-4 text-white/70 text-base leading-relaxed group/item hover:text-white transition-all duration-300"
                      style={{
                        transform: `translateZ(${10 + i * 5}px)`,
                        animationDelay: `${i * 100}ms`
                      }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-red-500/50 to-red-600/30 mt-2 shrink-0 group-hover/item:from-red-500 group-hover/item:to-red-600 transition-all duration-300 shadow-lg shadow-red-500/20" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Control - Light 3D card with green accent */}
            <div className="relative group" style={{ transformStyle: "preserve-3d" }}>
              {/* Animated green glow */}
              <div className="absolute -inset-2 bg-gradient-to-br from-[#059669]/30 via-[#059669]/15 to-emerald-500/10 rounded-3xl blur-xl opacity-50 group-hover:opacity-90 transition-all duration-500" />

              <div
                className="relative bg-gradient-to-br from-white via-white to-[#059669]/[0.03] p-10 lg:p-12 rounded-3xl shadow-[0_20px_50px_rgba(5,150,105,0.15)] border-2 border-[#059669]/25 transition-all duration-500 group-hover:shadow-[0_30px_60px_rgba(5,150,105,0.25)] group-hover:-translate-y-2"
                style={{
                  transform: "rotateY(2deg) rotateX(2deg)",
                  transformStyle: "preserve-3d"
                }}
              >
                {/* Inner shine effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[#059669]/[0.03] via-transparent to-transparent pointer-events-none" />

                <div className="inline-flex items-center gap-2 text-[0.65rem] font-bold text-[#059669] bg-[#059669]/10 px-4 py-2 rounded-full mb-10 tracking-[0.14em] uppercase border border-[#059669]/30 shadow-lg shadow-[#059669]/10">
                  <Check className="w-3.5 h-3.5" />
                  WITH MAINTAINPROOF
                </div>
                <ul className="space-y-6">
                  {[
                    "Every task logged with timestamped evidence",
                    "Photo and checklist proof attached to each job",
                    "Clear assignment, deadlines, and accountability",
                    "Complete audit trail for every property",
                    "Defensible records ready when you need them",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-4 text-foreground text-base leading-relaxed group/item hover:translate-x-1 transition-all duration-300"
                      style={{
                        transform: `translateZ(${10 + i * 5}px)`,
                        animationDelay: `${i * 100}ms`
                      }}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#059669]/20 to-[#059669]/10 flex items-center justify-center mt-0.5 shrink-0 group-hover/item:from-[#059669]/30 group-hover/item:to-[#059669]/20 transition-all duration-300 shadow-md shadow-[#059669]/10">
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

      {/* How It Works — 3D cards with icons */}
      <section className="py-24 lg:py-32 px-6 bg-gradient-to-b from-white via-[hsl(220,14%,98%)] to-white">
        <div className="max-w-7xl mx-auto lg:px-4">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-5">
              How it works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Four steps to controlled, documented maintenance operations.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6" style={{ perspective: "1200px" }}>
            {[
              { step: "01", title: "Create", description: "Log a work order with location, priority, and deadline.", icon: Plus },
              { step: "02", title: "Assign", description: "Assign to technicians. They see it instantly.", icon: Send },
              { step: "03", title: "Complete", description: "Technician uploads photos and marks complete.", icon: ClipboardCheck },
              { step: "04", title: "Verify", description: "Review proof. Close with documented confidence.", icon: CheckCircle2 },
            ].map((item, i) => (
              <div
                key={i}
                className="group relative"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Glow effect */}
                <div className={`absolute -inset-1 rounded-2xl blur-lg transition-all duration-500 ${
                  item.step === "04"
                    ? "bg-[#059669]/20 group-hover:bg-[#059669]/30"
                    : "bg-gradient-to-br from-slate-200/50 to-slate-300/30 group-hover:from-slate-300/60 group-hover:to-slate-400/40"
                }`} />

                <div
                  className={`relative p-8 lg:p-9 rounded-2xl border transition-all duration-500 group-hover:-translate-y-3 group-hover:shadow-2xl ${
                    item.step === "04"
                      ? "bg-gradient-to-br from-[#059669]/10 via-[#059669]/5 to-white border-[#059669]/30 shadow-lg shadow-[#059669]/10"
                      : "bg-white border-border/60 shadow-lg hover:border-border"
                  }`}
                  style={{
                    transform: `rotateX(${2 - i * 0.5}deg)`,
                    transformStyle: "preserve-3d"
                  }}
                >
                  {/* Inner shine */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/80 via-transparent to-transparent pointer-events-none" />

                  {/* Icon badge */}
                  <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 ${
                    item.step === "04"
                      ? "bg-gradient-to-br from-[#059669] to-[#059669]/80 shadow-lg shadow-[#059669]/30"
                      : "bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-[#059669]/10 group-hover:to-[#059669]/5"
                  }`}>
                    <item.icon className={`w-5 h-5 transition-colors duration-300 ${
                      item.step === "04"
                        ? "text-white"
                        : "text-slate-500 group-hover:text-[#059669]"
                    }`} />
                  </div>

                  <p className={`text-3xl font-bold mb-4 transition-colors duration-300 ${
                    item.step === "04" ? "text-[#059669]" : "text-slate-200 group-hover:text-slate-300"
                  }`}>
                    {item.step}
                  </p>
                  <h3 className={`text-xl font-bold mb-3 transition-colors duration-300 ${
                    item.step === "04" ? "text-[#059669]" : "text-foreground"
                  }`}>
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed relative z-10">{item.description}</p>

                  {/* Decorative corner accent */}
                  {item.step === "04" && (
                    <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-bl from-[#059669]/10 to-transparent rounded-full blur-xl" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Operational Protection — Glass cards with improved readability */}
      <section className="py-24 lg:py-32 px-6 bg-gradient-to-b from-[hsl(195,30%,8%)] via-[hsl(195,28%,10%)] to-[hsl(195,30%,8%)]">
        <div className="max-w-7xl mx-auto lg:px-4">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-5">
              Operational Protection
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto leading-relaxed">
              Not features. Safeguards that protect your operation.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
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
                className="group relative"
              >
                {/* Glow effect on hover */}
                <div className="absolute -inset-0.5 bg-gradient-to-br from-[#059669]/20 via-transparent to-[#059669]/10 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />

                {/* Glass card */}
                <div className="relative backdrop-blur-md bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-white/[0.02] p-8 lg:p-10 rounded-2xl border border-white/10 transition-all duration-500 group-hover:border-[#059669]/30 group-hover:-translate-y-1 group-hover:shadow-2xl group-hover:shadow-[#059669]/10">
                  {/* Inner glass shine */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/[0.05] via-transparent to-transparent pointer-events-none" />

                  {/* Icon with glass background */}
                  <div className="relative w-12 h-12 rounded-xl backdrop-blur-sm bg-gradient-to-br from-[#059669]/20 to-[#059669]/10 border border-[#059669]/20 flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:border-[#059669]/40 group-hover:shadow-lg group-hover:shadow-[#059669]/20">
                    <item.icon className="w-5 h-5 text-[#059669] transition-all duration-300 group-hover:text-[#10b981]" />
                  </div>

                  <h3 className="text-base font-bold text-white uppercase tracking-[0.04em] mb-4 group-hover:text-[#10b981] transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed group-hover:text-white/80 transition-colors duration-300">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Glass CTA button */}
          <div className="text-center mt-16">
            <Link to="/contact">
              <button className="relative overflow-hidden backdrop-blur-md bg-[#059669]/80 hover:bg-[#059669]/90 text-white px-10 py-4 rounded-xl font-semibold border border-[#059669]/50 shadow-lg shadow-[#059669]/25 hover:shadow-xl hover:shadow-[#059669]/30 transition-all duration-300 hover:-translate-y-0.5 text-base">
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                <span className="relative flex items-center gap-2">
                  Start Protecting Your Operations
                  <ArrowRight className="w-5 h-5" />
                </span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Built for operators — 3D cards */}
      <section className="py-24 lg:py-32 px-6 bg-gradient-to-b from-[hsl(220,14%,94%)] via-[hsl(220,15%,96%)] to-[hsl(220,14%,94%)]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight mb-5">
              Built for operators
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              If you manage properties or facilities, this is for you.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-5" style={{ perspective: "1000px" }}>
            {[
              {
                title: "Property Management Companies",
                description:
                  "Managing residential or commercial buildings with in-house or contracted maintenance teams.",
                icon: "🏢"
              },
              {
                title: "Facilities Managers",
                description:
                  "Responsible for building operations, vendor coordination, and maintenance scheduling.",
                icon: "🔧"
              },
              {
                title: "Real Estate Operators",
                description:
                  "Owners and operators who need visibility into property maintenance across portfolios.",
                icon: "📊"
              },
              {
                title: "Maintenance Supervisors",
                description: "Leading technician teams and needing accountability for work completion.",
                icon: "👷"
              },
            ].map((item, i) => (
              <div
                key={i}
                className="group relative"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Subtle glow */}
                <div className="absolute -inset-1 bg-gradient-to-br from-[#059669]/10 via-transparent to-transparent rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-all duration-500" />

                <div
                  className="relative flex gap-5 p-8 bg-white rounded-2xl border border-border/40 shadow-lg transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:border-[#059669]/20"
                  style={{
                    transform: `rotateX(${1 - i * 0.3}deg)`,
                  }}
                >
                  {/* Inner shine */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white via-transparent to-transparent pointer-events-none" />

                  {/* Accent dot with glow */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-[#059669]/30 rounded-full blur-md group-hover:bg-[#059669]/50 transition-all duration-300" />
                    <div className="relative w-3 h-3 rounded-full bg-gradient-to-br from-[#059669] to-[#10b981] mt-1.5 shrink-0 shadow-md shadow-[#059669]/30" />
                  </div>

                  <div className="relative">
                    <h3 className="font-bold text-foreground mb-2 text-lg group-hover:text-[#059669] transition-colors duration-300">
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                  </div>
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

      {/* Final CTA — Dark with glass elements */}
      <section className="py-24 lg:py-32 px-6 bg-gradient-to-b from-[hsl(195,30%,8%)] via-[hsl(195,28%,10%)] to-[hsl(195,30%,8%)] relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#059669]/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight mb-6">
            Ready to take control?
          </h2>
          <p className="text-white/60 text-lg max-w-xl mx-auto mb-14 leading-relaxed">
            Start a free trial or schedule a call to see how MaintainProof protects your operation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/contact">
              <button className="relative overflow-hidden h-14 px-10 text-base font-semibold rounded-xl backdrop-blur-md bg-[#059669]/85 hover:bg-[#059669]/95 text-white border border-[#059669]/60 shadow-2xl shadow-[#059669]/40 hover:shadow-[#059669]/50 transition-all duration-300 hover:-translate-y-0.5">
                <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
                <span className="relative flex items-center gap-2">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </span>
              </button>
            </Link>
            <Link to="/contact">
              <button className="relative overflow-hidden h-14 px-9 text-base font-medium rounded-xl backdrop-blur-md bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/20 hover:border-white/40 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-0.5">
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                <span className="relative">Schedule a Demo</span>
              </button>
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default MaintenanceLanding;
