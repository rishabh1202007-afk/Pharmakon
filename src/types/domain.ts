export type RiskLevel = 'safe' | 'adjust' | 'toxic' | 'unknown';

export interface RiskReasoning {
  gene: string;
  diplotype: string;
  phenotype: string;
  enzymeBehavior: string;
  metabolismEffect: string;
}

export interface DrugRiskAssessment {
  drugName: string;
  riskLevel: RiskLevel;
  severity: 'Low' | 'Moderate' | 'High' | 'Unknown';
  confidence: number;
  actionable: boolean;
  reasoning: RiskReasoning;
  counterfactual: string;
  limitations: string;
}

export interface PatientSummary {
  patientId: string;
  timestamp: string;
  parsingStatus: 'Not Started' | 'Parsing' | 'Complete' | 'Invalid';
  completeness: number;
}

export interface AnalysisResponse {
  patient: PatientSummary;
  results: DrugRiskAssessment[];
  uncertainty: string;
}

export interface AiDraftVariant {
  rsid: string;
  evidence: string;
}

export interface AiDraftOutput {
  patient_id: string;
  drug: string;
  timestamp: string;
  risk_assessment: {
    risk_label: string;
    confidence_score: number;
    severity: 'moderate' | 'high' | 'critical';
  };
  pharmacogenomic_profile: {
    primary_gene: string;
    diplotype: string;
    phenotype: string;
    detected_variants: AiDraftVariant[];
  };
  clinical_recommendation: {
    action: string;
    rationale: string;
  };
  llm_generated_explanation: {
    summary: string;
    next_step: string;
  };
  quality_metrics: {
    vcf_parsing_success: boolean;
    variant_line_count: number;
    file_name: string;
  };
}

export type ClinicalRiskClass = 'Low' | 'Moderate' | 'High';

export type ClinicalPriority = 'Immediate' | 'Caution' | 'Monitor';

export interface ClinicalDrugComparisonRow {
  drug: string;
  risk: ClinicalRiskClass;
  recommendation: string;
}

export interface ClinicalPrescriptionAlert {
  header: string;
  impact: string[];
  recommendedAction: string;
  saferAlternatives: string;
  priority: ClinicalPriority;
  riskLevel: ClinicalRiskClass;
  confidenceScore: number;
  primaryCause: string;
  reasoningSteps: string[];
  uncertainty: {
    missingData: string;
    confidenceRisks: string;
    assumptions: string;
  };
  safetyNote: string;
  drugComparison?: ClinicalDrugComparisonRow[];
}

export interface CloudFieldEdit {
  fieldKey: string;
  value: unknown;
  editedBy: string;
  editorEmail: string;
  note: string;
  timestamp: string;
}

export interface CloudPatientNote {
  text: string;
  author: string;
  authorEmail: string;
  timestamp: string;
}

export interface CloudPatientRecord {
  patientId: string;
  hospitalId?: string;
  fields: Record<string, unknown>;
  edits: CloudFieldEdit[];
  notes: CloudPatientNote[];
  auditLogs?: AuditLogEntry[];
  createdAt: string;
  updatedAt: string;
  folderLocation?: string;
}

export interface AuditLogEntry {
  user_id: string;
  role: string;
  hospital_id?: string;
  patient_id: string;
  action: string;
  ai_suggestion: string;
  final_decision: string;
  timestamp: string;
  justification: string;
}

export interface PrescriptionRecord {
  id: string;
  patientId: string;
  diagnosis: string;
  medication: string;
  dosage: string;
  instructions: string;
  aiSuggestion: string;
  createdAt: string;
  createdBy: string;
}

export interface LabReportRecord {
  id: string;
  patientId: string;
  title: string;
  sourceType: 'pdf' | 'structured';
  findings: string;
  values: Array<{ name: string; value: string; reference: string }>;
  aiSummary: string;
  createdAt: string;
  createdBy: string;
}

export interface LongitudinalMapping {
  hospitalId: string;
  patientId: string;
}

export interface LongitudinalPatientIdentity {
  longitudinalId: string;
  description: string;
  createdAt: string;
  mappings: LongitudinalMapping[];
}

export interface HospitalPatientSnapshot {
  hospitalId: string;
  patientId: string;
  record: CloudPatientRecord | null;
  error?: string;
}

export interface FieldConflict {
  field: string;
  status: 'MANUAL_REVIEW_REQUIRED';
  values: Array<{
    hospitalId: string;
    patientId: string;
    value: unknown;
  }>;
}

export interface AggregatedPatientRecord {
  longitudinalId: string;
  snapshots: HospitalPatientSnapshot[];
  conflicts: FieldConflict[];
  retrievedAt: string;
  isDemo: true;
  totalRecordsRetrieved: number;
  totalRecordsUnavailable: number;
}

// ----------------------------------------------------------------------------
// ERP DOMAIN MODELS
// ----------------------------------------------------------------------------

export interface PatientFolderItem {
  name: string;
  sizeBytes: number;
  modifiedAt: string;
  isDirectory: boolean;
  data?: unknown;
}

export interface PatientFolderDetailsResponse {
  exists: boolean;
  hospitalId?: string;
  patientId?: string;
  folderPath?: string;
  totalFiles?: number;
  files: PatientFolderItem[];
  error?: string;
}

export interface PatientRegistryItem {
  patientId: string;
  patientName: string;
  age: string;
  gender: string;
  department: string;
  assignedDoctor: string;
  admissionType: string;
  status: string;
  riskLabel: string;
  severity: string;
  sourceFile: string | null;
  updatedAt: string;
  folderPath: string;
}

export interface AppointmentRecord {
  id: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  doctorName: string;
  department: string;
  date: string;
  time: string;
  reason: string;
  type: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'In-Progress';
  notes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

export interface BillingLineItem {
  description: string;
  category: 'Consultation' | 'Genomics Test' | 'Medication' | 'Bed Charge' | 'Lab Diagnostic' | 'Procedure';
  quantity: number;
  amount: number;
}

export interface BillingInvoice {
  id: string;
  hospitalId: string;
  patientId: string;
  patientName: string;
  items: BillingLineItem[];
  subtotal: number;
  insuranceCoverage: number;
  totalAmount: number;
  paymentMethod: 'Cash' | 'Insurance' | 'Credit Card' | 'Wire Transfer';
  paymentStatus: 'Pending' | 'Paid' | 'Partially Paid' | 'Waived';
  notes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
}

export interface InventoryItem {
  id: string;
  drugName: string;
  category: string;
  stockLevel: number;
  unit: string;
  minThreshold: number;
  batchNo: string;
  expiryDate: string;
  unitPrice: number;
  geneTarget: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastRestockedAt?: string;
  lastRestockedBy?: string;
}

export interface BedRecord {
  bedId: string;
  status: 'Available' | 'Occupied' | 'Maintenance';
  patientId: string | null;
  patientName: string | null;
  assignedAt: string | null;
}

export interface WardRecord {
  wardId: string;
  name: string;
  floor: string;
  totalBeds: number;
  occupiedBeds: number;
  beds: BedRecord[];
}

export interface ErpStats {
  totalPatients: number;
  admittedInPatients: number;
  outPatients: number;
  bedOccupancyRate: number;
  occupiedBeds: number;
  totalBeds: number;
  criticalGenomicRisks: number;
  lowStockDrugs: number;
  scheduledAppointmentsToday: number;
}
