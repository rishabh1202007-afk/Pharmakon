import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';

export function TermsConditionsPage() {
  return (
    <main className="page terms-page">
      <header className="sub-header fade-in">
        <div>
          <h1>Terms and Conditions</h1>
          <p>Last Updated: 21.03.2026 </p>
        </div>
        <Link to="/">Back to home</Link>
      </header>

      <Card className="terms-card">
        <article className="terms-content" aria-label="Terms and Conditions">
          <p>
            Welcome to <strong>PharmaKon</strong>. By accessing or using our platform, you agree to comply with and be
            bound by the following Terms and Conditions. Please read them carefully.
          </p>

          <hr />

          <h2>1. Acceptance of Terms</h2>
          <p>
            By using PharmaKon, you agree to these Terms and Conditions and our Privacy Policy. If you do not agree,
            please do not use the platform.
          </p>

          <hr />

          <h2>2. Description of Services</h2>
          <p>
            PharmaKon is a digital platform that provides information related to pharmaceutical products, healthcare
            services, and related resources. It may also facilitate ordering, recommendations, or connections with
            pharmacies and healthcare providers.
          </p>

          <hr />

          <h2>3. User Eligibility</h2>
          <ul>
            <li>Users must be at least 18 years old or use the platform under parental supervision.</li>
            <li>You agree to provide accurate and complete information during registration.</li>
          </ul>

          <hr />

          <h2>4. User Accounts</h2>
          <ul>
            <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
            <li>All activities under your account are your responsibility.</li>
            <li>PharmaKon reserves the right to suspend or terminate accounts for misuse or violation of terms.</li>
          </ul>

          <hr />

          <h2>5. Medical Disclaimer</h2>
          <ul>
            <li>PharmaKon does not provide medical advice, diagnosis, or treatment.</li>
            <li>Information provided is for educational purposes only.</li>
            <li>Always consult a qualified healthcare professional before making medical decisions.</li>
          </ul>

          <hr />

          <h2>6. Orders, Payments, and Refunds</h2>
          <ul>
            <li>Prices of products/services are subject to change without notice.</li>
            <li>Payments must be made through authorized payment methods.</li>
            <li>Refunds and cancellations will be processed according to PharmaKon's refund policy.</li>
            <li>PharmaKon is not responsible for delays caused by third-party vendors or delivery services.</li>
          </ul>

          <hr />

          <h2>7. User Responsibilities</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the platform for illegal or unauthorized purposes</li>
            <li>Upload false, misleading, or harmful information</li>
            <li>Attempt to breach security or disrupt services</li>
          </ul>

          <hr />

          <h2>8. Intellectual Property Rights</h2>
          <p>
            All content on PharmaKon, including logos, text, graphics, and software, is the property of PharmaKon and
            protected by applicable laws. Users may not copy, reproduce, or distribute content without permission.
          </p>

          <hr />

          <h2>9. Privacy Policy</h2>
          <p>
            Your use of PharmaKon is also governed by our Privacy Policy, which explains how we collect, use, and
            protect your data.
          </p>

          <hr />

          <h2>10. Third-Party Services</h2>
          <p>
            PharmaKon may integrate with third-party services such as payment gateways, pharmacies, or logistics
            providers. We are not responsible for the actions or services of these third parties.
          </p>

          <hr />

          <h2>11. Limitation of Liability</h2>
          <p>PharmaKon shall not be held liable for:</p>
          <ul>
            <li>Any indirect, incidental, or consequential damages</li>
            <li>Errors or inaccuracies in content</li>
            <li>Service interruptions or technical issues</li>
          </ul>

          <hr />

          <h2>12. Termination</h2>
          <p>
            We reserve the right to suspend or terminate access to the platform at any time without prior notice if
            users violate these terms.
          </p>

          <hr />

          <h2>13. Changes to Terms</h2>
          <p>
            PharmaKon may update these Terms and Conditions at any time. Continued use of the platform implies
            acceptance of the updated terms.
          </p>

          <hr />

          <h2>14. Governing Law</h2>
          <p>
            These Terms shall be governed by and interpreted in accordance with the laws of India. Any disputes shall
            be subject to the jurisdiction of Indian courts.
          </p>

          <hr />

          <p>
            <strong>
              By using PharmaKon, you acknowledge that you have read, understood, and agreed to these Terms and
              Conditions.
            </strong>
          </p>
        </article>
      </Card>
    </main>
  );
}
