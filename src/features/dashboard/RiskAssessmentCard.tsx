import { Card } from '../../ui/Card';
import { Collapsible } from '../../ui/Collapsible';
import { StatusBadge } from '../../ui/StatusBadge';
import type { DrugRiskAssessment } from '../../types/domain';

interface RiskAssessmentCardProps {
  result: DrugRiskAssessment;
}

export function RiskAssessmentCard({ result }: RiskAssessmentCardProps) {
  return (
    <Card title={result.drugName} subtitle="Deterministic risk output">
      <section className="decision-zone" aria-label="Decision verdict">
        <p className="decision-label">Decision</p>
        <div className="decision-row">
          <StatusBadge level={result.riskLevel} />
          <div className="confidence-block">
            <span className="confidence-label">Confidence</span>
            <strong className="confidence-value">{result.confidence}</strong>
          </div>
        </div>
        <div className="risk-meta">
          <span>Severity: {result.severity}</span>
          <span>Actionability: {result.actionable ? 'Action required' : 'No action required'}</span>
        </div>
      </section>

      <Collapsible label="Evidence" defaultOpen>
        <dl className="detail-grid">
          <div>
            <dt>Detected Gene</dt>
            <dd>{result.reasoning.gene}</dd>
          </div>
          <div>
            <dt>Diplotype</dt>
            <dd>{result.reasoning.diplotype}</dd>
          </div>
          <div>
            <dt>Phenotype</dt>
            <dd>{result.reasoning.phenotype}</dd>
          </div>
          <div>
            <dt>Enzyme Behavior</dt>
            <dd>{result.reasoning.enzymeBehavior}</dd>
          </div>
          <div>
            <dt>Drug Metabolism Effect</dt>
            <dd>{result.reasoning.metabolismEffect}</dd>
          </div>
        </dl>
      </Collapsible>

      <div className="statement">
        <h4>Explanation</h4>
        <p>This result follows from detected genotype and phenotype translation.</p>
      </div>

      <div className="statement">
        <h4>Counterfactual Insight</h4>
        <p>{result.counterfactual}</p>
      </div>

      <div className="statement">
        <h4>Uncertainty &amp; Limitations</h4>
        <p>{result.limitations}</p>
      </div>
    </Card>
  );
}