import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
export function DataProtectionPolicyPage() {
  return (
    <main className="page terms-page">
      <header className="sub-header fade-in">
        <div>
          <h1>Data Protection Policy</h1>
          <p>Last Updated: [23.03.2026]</p>
        </div>
        <Link to="/">Back to home</Link>
      </header>

      <Card className="terms-card">
        <article className="terms-content" aria-label="Data Protection Policy">
          <p>
            PharmaKon is committed to protecting the privacy, confidentiality, and security of personal data. This Data
            Protection Policy outlines how we handle and safeguard user data in compliance with applicable data
            protection laws.
          </p>

          <hr />

          <h2>1. Purpose</h2>
          <p>The purpose of this policy is to ensure that PharmaKon:</p>
          <ul>
            <li>Protects user data from unauthorized access or misuse</li>
            <li>Complies with applicable data protection laws and regulations</li>
            <li>Maintains transparency in data handling practices</li>
          </ul>

          <hr />

          <h2>2. Scope</h2>
          <p>This policy applies to:</p>
          <ul>
            <li>All users of PharmaKon</li>
            <li>All data collected through the platform</li>
            <li>Employees, partners, and third-party service providers handling data</li>
          </ul>

          <hr />

          <h2>3. Types of Data Collected</h2>

          <h3>a) Personal Data</h3>
          <ul>
            <li>Name, email, phone number</li>
            <li>Address and account details</li>
          </ul>

          <h3>b) Sensitive Data</h3>
          <ul>
            <li>Health-related information (if provided)</li>
            <li>Prescription details</li>
          </ul>

          <h3>c) Technical Data</h3>
          <ul>
            <li>IP address</li>
            <li>Device and browser information</li>
            <li>Usage analytics</li>
          </ul>

          <hr />

          <h2>4. Principles of Data Protection</h2>
          <p>We follow these key principles:</p>
          <ul>
            <li>
              <strong>Lawfulness, Fairness, and Transparency</strong>
              <br />
              Data is processed legally and transparently
            </li>
            <li>
              <strong>Purpose Limitation</strong>
              <br />
              Data is collected only for specific, legitimate purposes
            </li>
            <li>
              <strong>Data Minimization</strong>
              <br />
              Only necessary data is collected
            </li>
            <li>
              <strong>Accuracy</strong>
              <br />
              Data is kept accurate and up to date
            </li>
            <li>
              <strong>Storage Limitation</strong>
              <br />
              Data is retained only as long as required
            </li>
            <li>
              <strong>Integrity and Confidentiality</strong>
              <br />
              Data is secured against unauthorized access
            </li>
          </ul>

          <hr />

          <h2>5. Data Usage</h2>
          <p>PharmaKon uses data to:</p>
          <ul>
            <li>Provide and improve services</li>
            <li>Process transactions and orders</li>
            <li>Communicate with users</li>
            <li>Ensure platform security</li>
          </ul>

          <hr />

          <h2>6. Data Sharing</h2>
          <p>Data may be shared with:</p>
          <ul>
            <li>Authorized pharmacies and healthcare providers</li>
            <li>Payment processors</li>
            <li>Delivery and logistics partners</li>
            <li>IT and analytics service providers</li>
          </ul>
          <p>All third parties are required to maintain data confidentiality and security.</p>

          <hr />

          <h2>7. Data Security Measures</h2>
          <p>We implement strong security measures, including:</p>
          <ul>
            <li>Encryption of sensitive data</li>
            <li>Secure servers and firewalls</li>
            <li>Access control and authentication systems</li>
            <li>Regular system monitoring</li>
          </ul>

          <hr />

          <h2>8. User Rights</h2>
          <p>Users have the right to:</p>
          <ul>
            <li>Access their personal data</li>
            <li>Request correction or deletion</li>
            <li>Restrict or object to data processing</li>
            <li>Withdraw consent</li>
          </ul>

          <hr />

          <h2>9. Data Breach Management</h2>
          <p>In the event of a data breach:</p>
          <ul>
            <li>Immediate steps will be taken to contain the breach</li>
            <li>Affected users will be notified if required</li>
            <li>Authorities will be informed as per legal requirements</li>
          </ul>

          <hr />

          <h2>10. Data Retention</h2>
          <p>
            Data is retained only as long as necessary for operational or legal purposes and is securely deleted
            afterward.
          </p>

          <hr />

          <h2>11. Employee Responsibilities</h2>
          <p>All employees and partners must:</p>
          <ul>
            <li>Handle data responsibly</li>
            <li>Follow security protocols</li>
            <li>Report any data breaches or risks immediately</li>
          </ul>

          <hr />

          <h2>12. Compliance with Laws</h2>
          <p>
            PharmaKon complies with applicable data protection laws in India and follows best practices aligned with
            global standards.
          </p>

          <hr />

          <h2>13. Policy Updates</h2>
          <p>
            This policy may be updated periodically. Continued use of the platform indicates acceptance of the updated
            policy.
          </p>

          <hr />

          <p>
            <strong>PharmaKon is committed to ensuring the highest standards of data protection and user privacy.</strong>
          </p>
        </article>
      </Card>
    </main>
  );
}
