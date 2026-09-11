import { Card } from '../../ui/Card';
import type { PatientSummary } from '../../types/domain';

interface PatientSummaryCardProps {
  patient: PatientSummary;
}

export function PatientSummaryCard({ patient }: PatientSummaryCardProps) {
  const completenessPercent = Math.round(patient.completeness * 100);

  return (
    <Card title="Patient Summary" subtitle="Input integrity and processing status">
      <dl className="detail-grid">
        <div>
          <dt>Patient ID</dt>
          <dd>{patient.patientId}</dd>
        </div>
        <div>
          <dt>Timestamp</dt>
          <dd>{new Date(patient.timestamp).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Parsing Status</dt>
          <dd>{patient.parsingStatus}</dd>
        </div>
        <div>
          <dt>Data Completeness</dt>
          <dd>{completenessPercent}%</dd>
        </div>
      </dl>
    </Card>
  );
}
