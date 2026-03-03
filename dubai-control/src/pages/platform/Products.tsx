import { Link } from "react-router-dom";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Layers, Cog, Shield, Headphones } from "lucide-react";
import operationsImage from "@/assets/platform/operations-maintenance.jpg";

const Products = () => {
  return (
    <MarketingLayout>
      {/* Hero — Dark with presence */}
      <section className="marketing-section-dark marketing-section-dense">
        <div className="marketing-container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#E97A1F] bg-[#E97A1F]/10 px-4 py-2 rounded-full mb-6 uppercase tracking-wider border border-[#E97A1F]/20">
                PRODUCTS
              </div>
              <h1 className="mb-6">Configured for Different Operational Contexts</h1>
              <p className="text-xl text-white/60 leading-relaxed">
                Each product configuration applies the same verification core to the operational workflows and
                requirements of different service environments.
              </p>
            </div>
            <div className="hidden lg:block">
              <img src={operationsImage} alt="Field operations" className="rounded-lg shadow-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid — Light */}
      <section className="marketing-section">
        <div className="marketing-container-wide">
          <div className="space-y-0">
            {products.map((product, index) => (
              <div
                key={product.name}
                className="py-12 md:py-16 border-b border-border last:border-b-0 grid lg:grid-cols-12 gap-8 md:gap-12 items-start"
              >
                <div className="lg:col-span-4">
                  <span className="marketing-overline mb-3 block">{product.category}</span>
                  <h2 className="text-3xl md:text-4xl font-semibold">{product.name}</h2>
                </div>
                <div className="lg:col-span-8 space-y-8">
                  <p className="text-lg text-muted-foreground leading-relaxed">{product.description}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    {product.capabilities.map((capability, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-[#E97A1F]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-4 w-4 text-[#E97A1F]" />
                        </div>
                        <span className="text-foreground">{capability}</span>
                      </div>
                    ))}
                  </div>
                  {product.status === "available" ? (
                    <Link to={product.link} className="inline-flex items-center gap-2 mt-4 border-2 border-[#E97A1F] text-[#E97A1F] hover:bg-[#E97A1F]/10 rounded-md px-8 py-3 font-semibold transition-all">
                      View Product
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <div className="mt-4">
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-muted/60 text-muted-foreground/80 text-sm font-medium border border-border">
                        Coming Soon
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Note — Dark */}
      <section className="marketing-section marketing-section-dark">
        <div className="marketing-container-wide">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="marketing-overline mb-4 block">Unified Platform</span>
              <h2 className="mb-6">One Platform, Shared Infrastructure</h2>
              <p className="text-lg text-white/60 leading-relaxed mb-8">
                All products share the same core verification engine—GPS check-in, photo evidence, structured
                checklists, and automated reporting. What differs is the configuration layer that adapts these
                capabilities to specific operational contexts.
              </p>
              <div className="space-y-4">
                {platformStats.map((stat) => (
                  <div key={stat.label} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#E97A1F]/10 flex items-center justify-center flex-shrink-0">
                      <stat.icon className="h-4 w-4 text-[#E97A1F]" />
                    </div>
                    <div className="text-sm text-white font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex lg:justify-end">
              <div className="bg-white/5 border border-white/10 rounded-lg p-8 md:p-10 max-w-md">
                <h4 className="text-xl font-semibold text-white mb-4">Ready to get started?</h4>
                <p className="text-white/60 mb-6">
                  Start with a pilot and choose the verification configuration that fits your operations.
                </p>
                <Link to="/contact" className="marketing-cta-primary w-full justify-center">
                  Contact Sales
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — Light */}
      <section className="marketing-section bg-secondary/30">
        <div className="marketing-container-wide text-center">
          <div className="max-w-2xl mx-auto">
            <span className="marketing-overline mb-4 block">Additional Configurations</span>
            <h2 className="mb-6">Not Seeing Your Use Case?</h2>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              Proof Platform is built around a flexible verification core that can be configured for additional on-site
              service contexts. Contact us to discuss whether your operational use case fits the platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact" className="marketing-cta-primary">
                Discuss Your Use Case
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

// Data
const products = [
  {
    name: "CleanProof",
    category: "Operations",
    status: "available",
    link: "/products/cleaning",
    description:
      "Verification workflows for commercial cleaning operations. From daily office cleans to periodic deep-cleaning services, capture standardized proof that work was completed as specified.",
    capabilities: [
      "GPS-verified check-in at client sites",
      "Before/after photo capture with timestamps",
      "Configurable cleaning checklists by space type",
      "Automated PDF reports generated on completion",
      "Structured records of completed service visits",
    ],
  },
  {
    name: "MaintainProof",
    category: "Facilities",
    status: "available",
    link: "/products/maintenance",
    description:
      "Service verification for maintenance operations. Log every service visit with the evidence needed to demonstrate work was performed correctly.",
    capabilities: [
      "Job-specific verification checklists",
      "Before/after state documentation",
      "GPS-verified time on site",
      "Photo evidence attached to service records",
      "Standardized service reports in PDF format",
    ],
  },
  {
    name: "PropertyProof",
    category: "Real Estate",
    status: "coming_soon",
    link: "/products/property",
    description:
      "Inspection and maintenance documentation for property portfolios. Standardize how site visits are recorded, conditions are documented, and historical records are maintained across managed properties.",
    capabilities: [
      "Structured inspection templates by property type",
      "Condition documentation with photo evidence",
      "GPS-verified site visit records",
      "Historical inspection and maintenance records",
      "Client-ready PDF reports per visit",
    ],
  },
  {
    name: "FitOutProof",
    category: "Construction",
    status: "coming_soon",
    link: "/products/fitout",
    description:
      "Progress documentation for construction, renovation, and fit-out site visits. Capture verified evidence of on-site progress and completed work.",
    capabilities: [
      "On-site visit documentation with photo evidence",
      "Location-tagged progress photos",
      "Structured visit checklists",
      "Verified records of completed site visits",
      "Client-ready progress reports in PDF format",
    ],
  },
];

const platformStats = [
  { label: "Unified Verification Platform", icon: Layers },
  { label: "Multiple Operational Configurations", icon: Cog },
  { label: "Configurable Verification Workflows", icon: Shield },
  { label: "Enterprise Support Availability", icon: Headphones },
];

export default Products;
