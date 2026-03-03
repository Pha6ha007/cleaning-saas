import LegalLayout from "@/components/marketing/LegalLayout";

const PrivacyPolicy = () => {
  return (
    <LegalLayout>
      <article>
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground text-lg">Last updated: {new Date().toLocaleDateString()}</p>

        <h2>1. Introduction</h2>
        <p>
          Proof Platform ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
          explains how we collect, use, disclose, and safeguard your information when you use our Service.
        </p>

        <h2>2. Information We Collect</h2>

        <h3>2.1 Account Information</h3>
        <p>When you create an account, we collect:</p>
        <ul>
          <li>Name and contact information (email, phone number)</li>
          <li>Company name and business details</li>
          <li>Account credentials (encrypted)</li>
        </ul>

        <h3>2.2 Operational Data</h3>
        <p>When you use the Service, we collect:</p>
        <ul>
          <li>GPS location data for service visit verification</li>
          <li>Photos uploaded as proof of work completion</li>
          <li>Checklist completion data</li>
          <li>Timestamps of service activities</li>
          <li>Device information and IP addresses</li>
        </ul>

        <h2>3. How We Use Your Information</h2>
        <p>We use the collected information to:</p>
        <ul>
          <li>Provide and maintain the Service</li>
          <li>Generate verification reports and proof of service</li>
          <li>Communicate with you about your account and service updates</li>
          <li>Improve and optimize the Service</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h2>4. Data Security</h2>
        <p>
          We implement industry-standard security measures to protect your data:
        </p>
        <ul>
          <li>Encryption of data in transit and at rest</li>
          <li>Secure server infrastructure with access controls</li>
          <li>Regular security audits and updates</li>
          <li>Employee training on data protection</li>
        </ul>

        <h2>5. Data Sharing and Disclosure</h2>
        <p>We do not sell your personal data. We may share data in the following circumstances:</p>
        <ul>
          <li>With your explicit consent</li>
          <li>With service providers who assist in operating the Service (under strict confidentiality)</li>
          <li>To comply with legal obligations or court orders</li>
          <li>To protect our rights, property, or safety</li>
        </ul>

        <h2>6. Data Retention</h2>
        <p>
          We retain verification data (GPS, photos, checklists) for the duration specified in your service agreement,
          typically for audit and compliance purposes. Account information is retained until account deletion is requested.
        </p>

        <h2>7. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access your personal data</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data (subject to legal retention requirements)</li>
          <li>Object to or restrict certain processing activities</li>
          <li>Data portability</li>
        </ul>

        <h2>8. Cookies and Tracking</h2>
        <p>
          We use essential cookies to maintain session state and authenticate users. We do not use third-party
          tracking cookies or advertising networks.
        </p>

        <h2>9. Children's Privacy</h2>
        <p>
          The Service is not intended for individuals under the age of 18. We do not knowingly collect personal
          information from children.
        </p>

        <h2>10. International Data Transfers</h2>
        <p>
          Your data is primarily processed and stored in the United Arab Emirates. If data is transferred
          internationally, we ensure appropriate safeguards are in place.
        </p>

        <h2>11. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material changes via email
          or through the Service.
        </p>

        <h2>12. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy or wish to exercise your rights, contact us at:
          <br />
          <strong>Email:</strong> privacy@proofplatform.com
          <br />
          <strong>Address:</strong> Dubai, United Arab Emirates
        </p>
      </article>
    </LegalLayout>
  );
};

export default PrivacyPolicy;
