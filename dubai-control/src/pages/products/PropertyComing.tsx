import MarketingLayout from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Check, Building2, ClipboardCheck, Camera, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

const PropertyComing = () => {
  const [email, setEmail] = useState("");

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Notify me:", email);
    // TODO: Implement backend integration
    alert("Thank you! We'll notify you when PropertyProof launches.");
    setEmail("");
  };

  return (
    <MarketingLayout>
      {/* Platform badge */}
      <div className="bg-[#7C3AED]/5 border-b border-[#7C3AED]/10">
        <div className="marketing-container-wide py-3">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">Part of</span>
            <Link to="/" className="font-semibold text-[#7C3AED] hover:underline">
              Proof Platform
            </Link>
            <span className="text-muted-foreground">— coming Q4 2026</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="marketing-section bg-gradient-to-b from-[#7C3AED]/5 to-background">
        <div className="marketing-container-wide text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#7C3AED] bg-[#7C3AED]/10 px-4 py-2 rounded-full mb-8 uppercase tracking-wider border border-[#7C3AED]/20">
            <Building2 className="w-4 h-4" />
            Coming Q4 2026
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 max-w-4xl mx-auto">
            PropertyProof
            <br />
            <span className="text-muted-foreground">Inspection verification for real estate portfolios</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
            Standardize property inspections, document conditions, and maintain verifiable records across your
            managed properties.
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
              <Button type="submit" size="lg" className="h-12 px-6 bg-[#7C3AED] hover:bg-[#7C3AED]/90">
                Notify me
              </Button>
            </div>
          </form>

          <p className="text-sm text-muted-foreground">
            Join the waitlist to get early access when PropertyProof launches
          </p>
        </div>
      </section>

      {/* What PropertyProof will do */}
      <section className="marketing-section bg-white border-y border-border">
        <div className="marketing-container-wide">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Property inspection verification</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Purpose-built for property management companies, landlords, and real estate operators who need
              standardized inspection documentation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: ClipboardCheck,
                title: "Standardized inspection templates",
                description:
                  "Pre-built checklists for move-in/move-out, periodic inspections, and property condition reports.",
              },
              {
                icon: Camera,
                title: "Photo documentation",
                description:
                  "Capture property conditions with GPS-tagged, timestamped photos attached to inspection records.",
              },
              {
                icon: FileText,
                title: "Automated inspection reports",
                description:
                  "Generate professional PDF reports immediately after inspection completion for tenants and owners.",
              },
              {
                icon: Building2,
                title: "Property portfolio tracking",
                description:
                  "Maintain complete inspection history for every unit across your entire property portfolio.",
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-5">
                <div className="h-12 w-12 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="h-6 w-6 text-[#7C3AED]" />
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Built for real estate operations</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              PropertyProof will serve property managers, landlords, and real estate operators.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                title: "Move-in/Move-out inspections",
                description:
                  "Document property conditions at tenant transitions with photo evidence and structured checklists.",
              },
              {
                title: "Periodic property inspections",
                description:
                  "Conduct regular property checks with consistent documentation across your portfolio.",
              },
              {
                title: "Condition assessment reports",
                description:
                  "Generate detailed property condition reports for insurance, valuation, or owner reporting.",
              },
            ].map((item, i) => (
              <div key={i} className="marketing-enterprise-card">
                <div className="flex items-start gap-3 mb-3">
                  <Check className="h-5 w-5 text-[#7C3AED] mt-0.5 flex-shrink-0" />
                  <h3 className="font-semibold">{item.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="marketing-section bg-gradient-to-b from-[#7C3AED]/5 to-background">
        <div className="marketing-container-wide text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Want early access?</h2>
            <p className="text-lg text-muted-foreground mb-10">
              PropertyProof is scheduled for Q4 2026. Get on the waitlist to be notified when we launch and receive
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
                <Button type="submit" size="lg" className="h-14 px-8 bg-[#7C3AED] hover:bg-[#7C3AED]/90">
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

export default PropertyComing;
