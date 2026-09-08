import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { pipeline } from '../data/pipeline';

export function TransparencyPage() {
  return (
    <main className="page transparency-page">
      <header className="sub-header fade-in">
        <div>
          <h1>Technical Transparency Panel</h1>
          <p>Decision logic pipeline for auditable interpretation.</p>
        </div>
        <Link to="/dashboard">Back to Dashboard</Link>
      </header>

      <Card title="Decision Pipeline" subtitle="From input variants to risk classification">
        <div className="pipeline trace-pipeline" aria-label="Decision pipeline execution trace">
          {pipeline.map((step, index) => (
            <div
              key={step.name}
              className={`pipeline-step pipeline-step-${step.state} ${index === pipeline.length - 1 ? 'pipeline-step-final' : ''}`}
              tabIndex={0}
              aria-label={`${step.name} stage`}
              title={step.detail}
            >
              <span>{step.name}</span>
              <small>{step.detail}</small>
              <span className="pipeline-arrow">{index < pipeline.length - 1 ? '→' : 'Final'}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Deterministic Properties">
        <ul className="trust-list">
          <li>Fixed translation tables from allele and diplotype to phenotype classes</li>
          <li>Explicit mapping from phenotype to drug-specific risk categories</li>
          <li>Versionable rule engine with reproducible outputs for identical inputs</li>
          <li>Uncertainty surfaced when genotype coverage or phenotype mapping is incomplete</li>
        </ul>
      </Card>
    </main>
  );
}
