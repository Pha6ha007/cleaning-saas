import LegalLayout from "@/components/marketing/LegalLayout";

const RefundPolicy = () => {
  return (
    <LegalLayout>
      <article>
        <h1>Refund Policy</h1>
        <p className="text-muted-foreground text-lg">Last updated: {new Date().toLocaleDateString()}</p>

        <h2>1. Overview</h2>
        <p>
          This Refund Policy outlines the terms and conditions under which refunds may be issued for Proof Platform
          subscriptions and services.
        </p>

        <h2>2. Subscription Model</h2>
        <p>
          Proof Platform operates on a subscription basis with monthly or annual billing cycles. Subscription fees
          are charged in advance for the upcoming billing period.
        </p>

        <h2>3. Refund Eligibility</h2>

        <h3>3.1 Trial Period</h3>
        <p>
          If you cancel within the first 14 days of your initial subscription (trial period) and have not used
          the Service beyond basic testing, you may be eligible for a full refund.
        </p>

        <h3>3.2 Service Issues</h3>
        <p>
          If the Service experiences significant downtime or technical issues that prevent normal operation,
          and we are unable to resolve the issue within a reasonable timeframe, a prorated refund may be issued
          for the affected period.
        </p>

        <h3>3.3 Billing Errors</h3>
        <p>
          If you are charged in error, we will issue a full refund for the incorrect charge once the error is
          verified.
        </p>

        <h2>4. Non-Refundable Circumstances</h2>
        <p>Refunds will not be issued in the following cases:</p>
        <ul>
          <li>Cancellations after the trial period has ended</li>
          <li>Partial refunds for unused time within a billing cycle</li>
          <li>Dissatisfaction with features that were clearly documented before purchase</li>
          <li>User error or misuse of the Service</li>
          <li>Violation of our Terms of Service resulting in account suspension</li>
        </ul>

        <h2>5. Cancellation Process</h2>
        <p>
          You may cancel your subscription at any time through your account settings or by contacting our support team.
          Upon cancellation:
        </p>
        <ul>
          <li>You will retain access to the Service until the end of your current billing period</li>
          <li>No further charges will be made after the current period ends</li>
          <li>Your data will be retained for 30 days, after which it will be permanently deleted</li>
        </ul>

        <h2>6. Refund Processing</h2>
        <p>
          If you are eligible for a refund:
        </p>
        <ul>
          <li>Refunds will be processed within 10 business days of approval</li>
          <li>Refunds will be issued to the original payment method</li>
          <li>You will receive email confirmation once the refund is processed</li>
          <li>Depending on your bank or payment provider, it may take additional time for the refund to appear</li>
        </ul>

        <h2>7. Enterprise Agreements</h2>
        <p>
          Custom enterprise agreements may have different refund terms as specified in the individual contract.
          Please refer to your enterprise agreement or contact your account manager.
        </p>

        <h2>8. Downgrade Policy</h2>
        <p>
          If you downgrade your subscription plan:
        </p>
        <ul>
          <li>The change will take effect at the start of the next billing cycle</li>
          <li>No prorated refunds will be issued for the current billing period</li>
          <li>You will retain access to current plan features until the billing cycle ends</li>
        </ul>

        <h2>9. Force Majeure</h2>
        <p>
          We are not liable for refunds due to circumstances beyond our reasonable control, including but not
          limited to natural disasters, wars, terrorist attacks, riots, embargoes, or acts of civil or military authorities.
        </p>

        <h2>10. Modifications to This Policy</h2>
        <p>
          We reserve the right to modify this Refund Policy at any time. Changes will be effective immediately
          upon posting. Your continued use of the Service after changes constitutes acceptance of the modified policy.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          For refund requests or questions about this policy, please contact us at:
          <br />
          <strong>Email:</strong> billing@proofplatform.com
          <br />
          <strong>Support:</strong> enterprise@proofplatform.com
          <br />
          <strong>Address:</strong> Dubai, United Arab Emirates
        </p>

        <h2>12. Dispute Resolution</h2>
        <p>
          If you disagree with our refund decision, you may request a review by contacting our customer service
          team. We will review your case and respond within 5 business days.
        </p>
      </article>
    </LegalLayout>
  );
};

export default RefundPolicy;
