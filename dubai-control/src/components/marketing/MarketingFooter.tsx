import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const MarketingFooter = () => {
  return (
    <footer className="marketing-section-dark border-t border-white/10">
      <div className="marketing-container-wide py-16 md:py-20">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="md:col-span-2 space-y-4">
            <span className="text-xl font-bold text-white">
              Proof Platform
            </span>
            <p className="text-base text-white/50 max-w-sm">
              Enterprise field operations infrastructure for verification and proof of completed on-site work.
            </p>
          </div>

          {/* Platform Links */}
          <div className="space-y-4">
            <span className="text-sm font-semibold text-white uppercase tracking-wider">Platform</span>
            <nav className="flex flex-col gap-3">
              <Link to="/" className="text-base text-white/50 hover:text-white transition-colors">
                Platform Overview
              </Link>
              <Link to="/products" className="text-base text-white/50 hover:text-white transition-colors">
                Products
              </Link>
              <Link to="/pricing" className="text-base text-white/50 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link to="/principles" className="text-base text-white/50 hover:text-white transition-colors">
                Principles
              </Link>
              <Link to="/updates" className="text-base text-white/50 hover:text-white transition-colors">
                Updates
              </Link>
              <Link to="/contact" className="text-base text-white/50 hover:text-white transition-colors">
                Contact
              </Link>
            </nav>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <span className="text-sm font-semibold text-white uppercase tracking-wider">Legal</span>
            <nav className="flex flex-col gap-3">
              <Link to="/terms" className="text-base text-white/50 hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link to="/privacy" className="text-base text-white/50 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link to="/refund" className="text-base text-white/50 hover:text-white transition-colors">
                Refund Policy
              </Link>
            </nav>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="py-8 px-8 md:px-12 rounded-lg bg-white/5 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div>
            <h4 className="text-xl font-semibold text-white mb-1">Ready to transform your operations?</h4>
            <p className="text-white/50">Get in touch with our enterprise team today.</p>
          </div>
          <Link to="/contact" className="inline-flex items-center gap-2 text-accent font-semibold hover:gap-3 transition-all">
            Contact Sales
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/40">
            © {new Date().getFullYear()} Proof Platform. All rights reserved.
          </p>
          <p className="text-sm text-white/40">
            Serving the UAE, Saudi Arabia, and Gulf Region
          </p>
        </div>
      </div>
    </footer>
  );
};

export default MarketingFooter;
