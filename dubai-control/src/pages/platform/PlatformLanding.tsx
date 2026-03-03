import { Link } from "react-router-dom";
import MarketingLayout from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, MapPin, Camera, ClipboardCheck, FileText, Shield, Clock, Globe } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import heroImage from "@/assets/platform/hero-operations.jpg";
import operationsImage from "@/assets/platform/operations-inspection.jpg";

const PlatformLanding = () => {
  return (
    <MarketingLayout>
      {/* HERO — DARK, POWERFUL, WITH IMAGE */}
      <section className="marketing-section-dark relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img src={heroImage} alt="Field operations verification" className="w-full h-full object-cover opacity-80" />
          <div className="marketing-hero-overlay absolute inset-0" />
        </div>

        <div className="marketing-container-wide relative z-10">
          <div className="max-w-3xl marketing-animate-slide-up text-left">
            <span className="marketing-overline mb-6 block">Enterprise Operations Platform</span>
            <h1 className="mb-8 text-white text-left">
              Verified Proof of Service.
              <br />
              <span className="text-white/50">Delivered at Scale.</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/55 mb-10 max-w-2xl leading-relaxed text-left">
              The enterprise platform for capturing, verifying, and delivering proof of completed field work across
              commercial operations in the Gulf region.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/products" className="marketing-cta-primary">
                Explore Products
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/contact" className="marketing-cta-secondary">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR — PRODUCT FACTS */}
      <section className="py-12 border-y bg-secondary/40 md:py-[33px] border-secondary">
        <div className="marketing-container-wide">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {productFacts.map((fact) => (
              <div key={fact.title} className="text-center md:text-left">
                <div className="text-lg font-semibold text-foreground mb-1">{fact.title}</div>
                <div className="text-sm text-muted-foreground leading-relaxed">{fact.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT PROOF PLATFORM IS — LIGHT SECTION */}
      <section className="marketing-section bg-background">
        <div className="marketing-container-wide">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="marketing-overline mb-4 block">About the Platform</span>
              <h2 className="mb-8">Infrastructure for Enterprise Field Operations</h2>
              <div className="space-y-6">
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Proof Platform provides the operational infrastructure that enterprise service providers need to
                  capture standardized, verifiable records of completed work.
                </p>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  From commercial cleaning to property management, we deliver the verification layer between your field
                  teams and the clients who need assurance that work was performed correctly.
                </p>
              </div>
              <div className="mt-10 grid grid-cols-2 gap-6">
                {highlights.map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <Check className="h-4 w-4 text-accent" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="marketing-enterprise-card !p-0 overflow-hidden">
                <img src={operationsImage} alt="Enterprise operations verification" className="w-full" />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-6 shadow-2xl border border-border max-w-xs">
                <div className="text-base font-bold text-[#E97A1F] mb-1">Tamper-resistant verification</div>
                <div className="text-sm font-medium text-foreground">Structured proof for every visit</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS / USE CASES — SOFT DARK SECTION */}
      <section className="marketing-section marketing-section-dark">
        <div className="marketing-container-wide">
          <div className="text-center mb-16">
            <span className="marketing-overline mb-4 block">Product Surfaces</span>
            <h2 className="max-w-2xl mx-auto text-white">One Platform. Purpose-Built Configurations.</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {products.map((product) => (
              <div key={product.name} className="group marketing-glass-panel-dark p-8 md:p-10 transition-all duration-300">
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-2xl font-semibold text-white">{product.name}</h3>
                    <span className="text-accent text-sm font-medium uppercase tracking-wider">{product.tag}</span>
                  </div>
                  <p className="text-white/55 mb-8 flex-1 text-lg leading-relaxed">{product.description}</p>
                  <Link
                    to={product.link}
                    className="inline-flex items-center gap-2 text-accent font-semibold group-hover:gap-3 transition-all"
                  >
                    Learn more
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CORE ENGINE — HOW IT WORKS — LIGHT */}
      <section className="marketing-section bg-secondary/30">
        <div className="marketing-container-wide">
          <div className="text-center mb-16">
            <span className="marketing-overline mb-4 block">Core Engine</span>
            <h2 className="max-w-2xl mx-auto">The Verification Layer That Powers Every Product</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreFeatures.map((feature) => (
              <div key={feature.title} className="marketing-enterprise-card text-center">
                <div className="marketing-feature-icon mx-auto mb-6">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h4 className="text-lg font-semibold mb-3 text-foreground">{feature.title}</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST INDICATORS — LIGHT */}
      <section className="marketing-section bg-background">
        <div className="marketing-container-wide">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="marketing-overline mb-4 block">Enterprise Trust</span>
              <h2 className="mb-8">Built for Teams That Require Verifiable Work</h2>
              <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
                In commercial operations, trust depends on evidence. Proof Platform is built to capture verifiable,
                auditable records of on-site work, designed to support compliance requirements in regulated environments.
              </p>
              <div className="space-y-6">
                {trustPoints.map((point) => (
                  <div key={point.title} className="flex gap-5">
                    <div className="h-12 w-12 rounded-xl bg-[#E97A1F]/10 flex items-center justify-center flex-shrink-0">
                      <point.icon className="h-6 w-6 text-[#E97A1F]" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-foreground mb-1">{point.title}</h4>
                      <p className="text-muted-foreground">{point.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {enterpriseTrust.map((item) => (
                <div key={item.title} className="marketing-enterprise-card">
                  <div className="text-base font-bold text-foreground mb-1">{item.title}</div>
                  <div className="text-sm text-muted-foreground">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PLATFORM PRINCIPLES — SOFT DARK */}
      <section className="marketing-section marketing-section-dark">
        <div className="marketing-container-wide">
          <div className="text-center mb-16">
            <span className="marketing-overline mb-4 block">Principles</span>
            <h2 className="text-white">How We Build</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {principles.map((principle, index) => (
              <div key={principle.title} className="marketing-glass-panel-dark p-8 text-center">
                <div className="h-14 w-14 rounded-xl bg-accent/15 text-accent flex items-center justify-center mx-auto mb-6 text-xl font-bold">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h4 className="text-xl font-semibold mb-4 text-white">{principle.title}</h4>
                <p className="text-white/55 leading-relaxed">{principle.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — LIGHT WITH ACCENT */}
      <section className="marketing-section bg-background">
        <div className="marketing-container-wide">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <span className="marketing-overline mb-4 block">FAQ</span>
              <h2 className="mb-6">Common Questions</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Get answers to the most common questions about Proof Platform and how it can transform your field
                operations.
              </p>
              <Link to="/contact" className="marketing-cta-primary">
                Speak with our team
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            <div className="marketing-enterprise-card !p-0 overflow-hidden">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border-b border-border/50 last:border-b-0 px-8"
                  >
                    <AccordionTrigger className="text-base font-semibold text-foreground hover:no-underline py-5 text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5 text-base leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA — SOFT DARK */}
      <section className="marketing-section marketing-section-dark">
        <div className="marketing-container-wide">
          <div className="marketing-glass-panel-dark p-12 md:p-16 text-center max-w-4xl mx-auto">
            <span className="marketing-overline mb-6 block">Get Started</span>
            <h2 className="mb-6 text-white">Ready to Bring Verifiable Proof to Your Field Operations?</h2>
            <p className="text-xl text-white/55 mb-10 leading-relaxed max-w-2xl mx-auto">
              Start with a pilot and see how structured verification improves visibility and trust in field operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/products" className="marketing-cta-primary">
                View Products
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/contact" className="marketing-cta-secondary">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

// Data
const productFacts = [
  {
    title: "GPS + Photo Verification",
    description: "Location-verified proof for every visit",
  },
  {
    title: "Before / After Evidence",
    description: "Structured photo capture with timestamps",
  },
  {
    title: "Automated PDF Reports",
    description: "Client-ready reports generated instantly",
  },
  {
    title: "Configurable Workflows",
    description: "Adapted for different service types",
  },
];

const highlights = [
  "Enterprise-grade security architecture",
  "Real-time verification and evidence capture",
  "Tamper-resistant audit records",
  "Compliance-ready audit trails",
  "Regional-ready platform architecture",
  "Enterprise support availability",
];

const products = [
  {
    name: "Commercial Cleaning",
    tag: "Operations",
    description:
      "Verification workflows for commercial cleaning operations. Capture proof of completed work, validate service schedules, and generate client-ready evidence.",
    link: "/products/cleaning",
  },
  {
    name: "Property Management",
    tag: "Real Estate",
    description:
      "Inspection and maintenance verification for property portfolios. Standardize site visits, document on-site conditions, and maintain auditable records across managed assets.",
    link: "/products/property",
  },
  {
    name: "Maintenance Services",
    tag: "Facilities",
    description:
      "Inspection and maintenance verification for property portfolios. Standardize site visits, document on-site conditions, and maintain auditable records across managed assets.",
    link: "/products/maintenance",
  },
  {
    name: "Site Visits & Fit-out",
    tag: "Construction",
    description:
      "On-site progress verification for construction and fit-out projects. Track milestones, verify work completion, and generate structured progress reports.",
    link: "/products/fitout",
  },
];

const coreFeatures = [
  {
    icon: MapPin,
    title: "GPS Check-in",
    description: "Verified location capture with geofencing at the start of every service visit.",
  },
  {
    icon: Camera,
    title: "Photo Evidence",
    description: "Before and after imagery with tamper-resistant timestamps and metadata.",
  },
  {
    icon: ClipboardCheck,
    title: "Smart Checklists",
    description: "Configurable task lists ensure consistent service delivery across all sites.",
  },
  {
    icon: FileText,
    title: "PDF Reports",
    description: "Automated, branded reports delivered to clients immediately on completion.",
  },
];

const trustPoints = [
  {
    icon: Shield,
    title: "Security by Design",
    description:
      "Secure data handling with encryption at rest and in transit, built with enterprise security practices in mind.",
  },
  {
    icon: Clock,
    title: "Real-Time Evidence Capture",
    description:
      "Location-verified check-ins and timestamped photo evidence available immediately after completion.",
  },
  {
    icon: Globe,
    title: "Regional Operational Context",
    description:
      "Designed with Gulf-region operational realities in mind, including site access requirements and multi-location coordination.",
  },
];

const enterpriseTrust = [
  {
    title: "Secure by design",
    description: "Encryption at rest and in transit",
  },
  {
    title: "Audit-ready records",
    description: "Structured, immutable verification data",
  },
  {
    title: "Enterprise-grade architecture",
    description: "Built for reliability and controlled access",
  },
  {
    title: "Direct founder support",
    description: "Hands-on support during early deployments",
  },
];

const principles = [
  {
    title: "Verification First",
    description:
      "Every feature exists to create trustworthy proof. If it doesn't contribute to verification, it doesn't belong in our platform.",
  },
  {
    title: "One Unified System",
    description:
      "Different service types, same underlying architecture. Consistency across verticals means faster deployment and better reliability.",
  },
  {
    title: "Operational Reality",
    description:
      "Built for field conditions—intermittent connectivity, varied devices, extreme temperatures, and real-world constraints.",
  },
];

const faqs = [
  {
    question: "What is Proof Platform?",
    answer:
      "Proof Platform is enterprise infrastructure for field service operations. It provides a standardized way to capture, verify, and deliver evidence of completed work across different service verticals.",
  },
  {
    question: "Is this a single product or multiple products?",
    answer:
      "Proof Platform is a unified system with purpose-built configurations for different industries. The core verification engine is shared; the workflows and reporting are tailored to specific use cases.",
  },
  {
    question: "What industries do you support?",
    answer:
      "We currently offer configurations for commercial cleaning, property management, maintenance services, and site visits/fit-out. The platform architecture supports additional verticals.",
  },
  {
    question: "How does verification work?",
    answer:
      "Each service visit captures GPS location, timestamped photos, and completed checklists. This data is compiled into tamper-resistant reports that serve as proof of service delivery.",
  },
  {
    question: "Do you support Arabic language?",
    answer:
      "Yes. Proof Platform offers full Arabic language support for both field teams and client-facing reports, ensuring seamless operations across the Gulf region.",
  },
];

export default PlatformLanding;
