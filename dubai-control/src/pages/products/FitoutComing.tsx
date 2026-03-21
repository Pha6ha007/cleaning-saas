import MarketingLayout from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Check, HardHat, Camera, FileText, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const FitoutComing = () => {
  const [email, setEmail] = useState("");

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement backend integration
    alert("Thank you! We'll notify you when FitOutProof launches.");
    setEmail("");
  };

  return (
    <MarketingLayout>
      {/* Platform badge */}
      <div className="bg-[#D97706]/5 border-b border-[#D97706]/10">
        <div className="marketing-container-wide py-3">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">Part of</span>
            <Link to="/" className="font-semibold text-[#D97706] hover:underline">
              Proof Platform
            </Link>
            <span className="text-muted-foreground">— coming Q3 2026</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="marketing-section bg-gradient-to-b from-[#D97706]/5 to-background">
        <div className="marketing-container-wide text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#D97706] bg-[#D97706]/10 px-4 py-2 rounded-full mb-8 uppercase tracking-wider border border-[#D97706]/20">
            <HardHat className="w-4 h-4" />
            Coming Q3 2026
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 max-w-4xl mx-auto">
            FitOutProof
            <br />
            <span className="text-muted-foreground">Site visit verification for construction & fit-out</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            Document construction progress, verify site visits, and maintain verified records of on-site work
            completion for fit-out and renovation projects.
          </p>

          {/* Notify form */}
          <form onSubmit={handleNotify} className="max-w-md mx-auto mb-8">
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
              <Button type="submit" size="lg" className="h-12 px-6 bg-[#D97706] hover:bg-[#D97706]/90">
                Notify me
              </Button>
            </div>
          </form>

          <p className="text-sm text-muted-foreground">
            Join the waitlist to get early access when FitOutProof launches
          </p>
        </div>
      </section>

      {/* What FitOutProof will do */}
      <section className="marketing-section bg-white border-y border-border">
        <div className="marketing-container-wide">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Construction progress verification</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Purpose-built for project managers, contractors, and owners who need verifiable records of on-site
              construction and fit-out work.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: MapPin,
                title: "GPS-verified site visits",
                description:
                  "Confirm that site visits occurred at the correct location with GPS check-in and timestamping.",
              },
              {
                icon: Camera,
                title: "Progress photo documentation",
                description:
                  "Capture construction progress with location-tagged, timestamped photos organized by milestone.",
              },
              {
                icon: FileText,
                title: "Automated progress reports",
                description:
                  "Generate client-ready progress reports with photo evidence and completion status automatically.",
              },
              {
                icon: HardHat,
                title: "Milestone tracking",
                description:
                  "Track project milestones with verified completion evidence and structured audit trails.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-5">
                <div className="h-12 w-12 rounded-xl bg-[#D97706]/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-6 w-6 text-[#D97706]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="marketing-section bg-secondary/30">
        <div className="marketing-container-wide">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for construction operations</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              FitOutProof will serve contractors, project managers, and property owners.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                title: "Fit-out progress tracking",
                description:
                  "Document interior fit-out work with photo evidence at each stage of completion.",
              },
              {
                title: "Renovation site visits",
                description:
                  "Verify contractor site visits and work completion for renovation and refurbishment projects.",
              },
              {
                title: "Handover documentation",
                description:
                  "Create comprehensive handover documentation with verified completion evidence and photo records.",
              },
            ].map((item, i) => (
              <div key={i} className="marketing-enterprise-card">
                <div className="flex items-start gap-3 mb-3">
                  <Check className="h-5 w-5 text-[#D97706] mt-0.5 flex-shrink-0" />
                  <h3 className="font-semibold">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="marketing-section bg-gradient-to-b from-[#D97706]/5 to-background">
        <div className="marketing-container-wide text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Want early access?</h2>
            <p className="text-lg text-muted-foreground mb-10">
              FitOutProof is scheduled for Q3 2026. Get on the waitlist to be notified when we launch and receive
              early access pricing.
            </p>

            <form onSubmit={handleNotify} className="max-w-md mx-auto mb-8">
              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-14 text-base"
                />
                <Button type="submit" size="lg" className="h-14 px-8 bg-[#D97706] hover:bg-[#D97706]/90">
                  Join Waitlist
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </form>

            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <Link to="/products" className="hover:text-foreground transition-colors">
                ← Back to Products
              </Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

export default FitoutComing;
