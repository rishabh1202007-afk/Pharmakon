import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const hospitalHighlights = [
  'Secure VCF upload and validation paired with logging for compliant delivery.',
  'Real-time pharmacogenomic assessments based on curated CPIC and DPWG references.',
  'Traceable audit trails keep each recommendation explainable on review.',
];

export function HospitalSignsPage() {
  return (
    <main className="page hospital-signs-page">
      <header className="sub-header fade-in">
        <div>
          <h1>Hospital Staff Sign-In</h1>
          <p>Access the clinical intake workflow and manage patient-specific recommendations.</p>
        </div>
        <Link to="/">Back to home</Link>
      </header>

      <Card title="Clinician Workflow" subtitle="From genomic data to actionable guidance">
        <div className="hospital-highlight-list">
          {hospitalHighlights.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
        <div className="hospital-cta">
          <Link to="/login">
            <Button>Go to Staff Login</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
