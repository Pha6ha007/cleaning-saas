import MarketingLayout from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // TODO: Implement actual form submission
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <MarketingLayout>
      {/* Hero — Dark */}
      <section className="marketing-section-dark marketing-section-dense">
        <div className="marketing-container-wide">
          <div className="max-w-2xl">
            <span className="marketing-overline mb-4 block">Contact</span>
            <h1 className="mb-6">Let's Discuss Your Operations</h1>
            <p className="text-xl text-white/60 leading-relaxed">
              Interested in adding structured verification to your field operations? Contact us to discuss your
              operational context and see whether Proof Platform is a good fit.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form — Light */}
      <section className="marketing-section">
        <div className="marketing-container-wide">
          <div className="grid lg:grid-cols-12 gap-16">
            {/* Form */}
            <div className="lg:col-span-7">
              <h2 className="text-2xl font-semibold mb-8">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      Full Name *
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="h-12"
                      placeholder="Your name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Work Email *
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="h-12"
                      placeholder="you@company.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-sm font-medium">
                      Company *
                    </Label>
                    <Input
                      id="company"
                      name="company"
                      type="text"
                      value={formData.company}
                      onChange={handleChange}
                      required
                      className="h-12"
                      placeholder="Company name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="h-12"
                      placeholder="+971 XX XXX XXXX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-sm font-medium">
                    How can we help? *
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    required
                    className="resize-none"
                    placeholder="Tell us about your operations, team size, and what challenges you're looking to solve."
                  />
                </div>

                <Button type="submit" className="w-full md:w-auto marketing-btn-orange">
                  Send Message
                </Button>
              </form>
            </div>

            {/* Info Sidebar */}
            <div className="lg:col-span-5">
              <div className="bg-[hsl(220,18%,14%)] text-white rounded-lg p-8 md:p-10 mb-8 border-2 border-[#E97A1F]">
                <h3 className="text-xl font-semibold mb-6">Enterprise Inquiries</h3>
                <p className="text-white/70 mb-8 leading-relaxed">
                  For organizations with complex operational contexts or multiple locations, we offer assisted onboarding
                  and configuration guidance.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-[#E97A1F]/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-[#E97A1F]" />
                    </div>
                    <div>
                      <div className="font-medium">Response Time</div>
                      <div className="text-sm text-white/70">Within 24 hours</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Contact Information</h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-[#E97A1F]/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-[#E97A1F]" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">Email</div>
                      <div className="text-muted-foreground">enterprise@proofplatform.com</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-[#E97A1F]/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 text-[#E97A1F]" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">Phone</div>
                      <div className="text-muted-foreground">+971 4 XXX XXXX</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-[#E97A1F]/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-[#E97A1F]" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">Office</div>
                      <div className="text-muted-foreground">Dubai, United Arab Emirates</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map / Region Section — Dark */}
      <section className="marketing-section-dark marketing-section-dense">
        <div className="marketing-container-wide">
          <div className="text-center">
            <span className="marketing-overline mb-4 block">Regional Coverage</span>
            <h2 className="mb-6">Regional Focus</h2>
            <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
              Based in Dubai, Proof Platform is designed for operational use cases common across the Gulf region,
              including the UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, and Oman.
            </p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-8 mt-12">
              {regions.map((region) => (
                <div key={region} className="text-center">
                  <div className="text-white font-medium">{region}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
};

const regions = ["UAE", "Saudi Arabia", "Qatar", "Kuwait", "Bahrain", "Oman"];

export default Contact;
