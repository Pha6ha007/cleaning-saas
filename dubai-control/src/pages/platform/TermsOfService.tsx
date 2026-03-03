import LegalLayout from "@/components/marketing/LegalLayout";

const TermsOfService = () => {
  return (
    <LegalLayout>
      <article>
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground text-lg">Last updated: {new Date().toLocaleDateString()}</p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using Proof Platform ("the Service"), you agree to be bound by these Terms of Service.
          If you do not agree to these terms, please do not use the Service.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          Proof Platform provides enterprise software for field operations verification, including GPS check-in,
          photo evidence capture, checklist management, and automated reporting for commercial service operations.
        </p>

        <h2>3. User Accounts</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials and for all activities
          that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
        <ul>
          <li>Use the Service in any way that violates applicable laws or regulations</li>
          <li>Attempt to gain unauthorized access to the Service or its related systems</li>
          <li>Interfere with or disrupt the Service or servers connected to the Service</li>
          <li>Transmit any malicious code, viruses, or harmful data</li>
        </ul>

        <h2>5. Data and Privacy</h2>
        <p>
          Your use of the Service is also governed by our Privacy Policy. We collect and process data in accordance
          with applicable data protection laws. All verification data, including GPS coordinates and photos, is
          encrypted and stored securely.
        </p>

        <h2>6. Intellectual Property</h2>
        <p>
          The Service and its original content, features, and functionality are owned by Proof Platform and are
          protected by international copyright, trademark, and other intellectual property laws.
        </p>

        <h2>7. Service Availability</h2>
        <p>
          We strive to provide reliable service but do not guarantee that the Service will be available at all times.
          We may suspend or terminate the Service for maintenance, updates, or other reasons.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Proof Platform shall not be liable for any indirect, incidental,
          special, consequential, or punitive damages resulting from your use of or inability to use the Service.
        </p>

        <h2>9. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. We will notify users of material changes via
          email or through the Service. Continued use of the Service after changes constitutes acceptance of the
          modified Terms.
        </p>

        <h2>10. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the United Arab Emirates.
          Any disputes shall be subject to the exclusive jurisdiction of the courts of Dubai.
        </p>

        <h2>11. Contact Information</h2>
        <p>
          If you have questions about these Terms, please contact us at:
          <br />
          <strong>Email:</strong> legal@proofplatform.com
          <br />
          <strong>Address:</strong> Dubai, United Arab Emirates
        </p>
      </article>
    </LegalLayout>
  );
};

export default TermsOfService;
