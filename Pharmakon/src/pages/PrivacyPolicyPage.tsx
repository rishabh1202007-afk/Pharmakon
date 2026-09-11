import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';

export function PrivacyPolicyPage() {
  return (
    <main className="page terms-page">
      <header className="sub-header fade-in">
        <div>
          <h1>Privacy Policy</h1>
          <p>Last Updated: 21.03.2026</p>
        </div>
        <Link to="/">Back to home</Link>
      </header>

      <Card className="terms-card">
        <article className="terms-content" aria-label="Privacy Policy">
          <p>
            Welcome to <strong>PharmaKon</strong>. Your privacy is important to us. This Privacy Policy explains how
            we collect, use, disclose, and protect your information when you use our platform.
          </p>

          <hr />

          <h2>1. Information We Collect</h2>

          <h3>a) Personal Information</h3>
          <p>We may collect the following details:</p>
          <ul>
            <li>Name</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Address</li>
            <li>Account login credentials</li>
          </ul>

          <h3>b) Health-Related Information (if applicable)</h3>
          <ul>
            <li>Prescription details</li>
            <li>Medical preferences</li>
            <li>Health-related queries</li>
          </ul>

          <h3>c) Technical Information</h3>
          <ul>
            <li>IP address</li>
            <li>Browser type</li>
            <li>Device information</li>
            <li>Usage data (pages visited, time spent)</li>
          </ul>

          <hr />

          <h2>2. How We Use Your Information</h2>
          <p>We use your data to:</p>
          <ul>
            <li>Provide and improve our services</li>
            <li>Process orders and transactions</li>
            <li>Personalize user experience</li>
            <li>Communicate updates, offers, or support</li>
            <li>Ensure platform security and prevent fraud</li>
          </ul>

          <hr />

          <h2>3. Sharing of Information</h2>
          <p>We may share your information with:</p>
          <ul>
            <li>
              <strong>Pharmacies and healthcare providers</strong> (to fulfill orders or services)
            </li>
            <li>
              <strong>Payment gateways</strong> (for secure transactions)
            </li>
            <li>
              <strong>Service providers</strong> (delivery, analytics, hosting)
            </li>
          </ul>
          <p>
            We do <strong>not sell your personal data</strong> to third parties.
          </p>

          <hr />

          <h2>4. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your information. However, no system is completely
            secure, and we cannot guarantee absolute security.
          </p>

          <hr />

          <h2>5. Cookies and Tracking Technologies</h2>
          <p>PharmaKon uses cookies to:</p>
          <ul>
            <li>Improve website functionality</li>
            <li>Analyze user behavior</li>
            <li>Remember user preferences</li>
          </ul>
          <p>You can disable cookies through your browser settings.</p>

          <hr />

          <h2>6. User Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Update or correct information</li>
            <li>Request deletion of your data</li>
            <li>Withdraw consent (where applicable)</li>
          </ul>

          <hr />

          <h2>7. Data Retention</h2>
          <p>We retain your information only as long as necessary to:</p>
          <ul>
            <li>Provide services</li>
            <li>Comply with legal obligations</li>
            <li>Resolve disputes</li>
          </ul>

          <hr />

          <h2>8. Third-Party Links</h2>
          <p>
            Our platform may contain links to third-party websites. We are not responsible for their privacy practices.
          </p>

          <hr />

          <h2>9. Children's Privacy</h2>
          <p>PharmaKon does not knowingly collect data from children under 18 without parental consent.</p>

          <hr />

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Continued use of the platform indicates acceptance of
            the updated policy.
          </p>

          <hr />

          <h2>11. Governing Law</h2>
          <p>This Privacy Policy shall be governed by the laws of India.</p>

          <hr />

          <p>
            <strong>
              By using PharmaKon, you consent to the collection and use of your information as described in this
              Privacy Policy.
            </strong>
          </p>
        </article>
      </Card>
    </main>
  );
}
