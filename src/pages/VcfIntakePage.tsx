import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SUPPORTED_DRUGS } from '../data/drugs';
import {
  convertPatientToInPatient,
  convertPatientToOutPatient,
  discardTempIntakeDocument,
  discardTempIntakeDocumentOnUnload,
  isApiRequestError,
  syncPatientFromIntake,
} from '../services/cloudPatientService';
import { useIntake } from '../state/intakeStore';
import { useAuth } from '../state/authStore';
import type { AiDraftOutput, AiDraftVariant } from '../types/domain';
import { Button } from '../ui/Button';

interface ParsedVariant extends AiDraftVariant {
  chrom: string;
  pos: string;
  ref: string;
  alt: string;
  gene: string | null;
}

type ImpactLevel = 'high' | 'medium' | 'low';

interface VariantRule {
  gene: string;
  diplotype: string;
  phenotype: string;
  impact: ImpactLevel;
}

const DRUG_GENE_TARGETS: Record<string, string> = {
  Warfarin: 'CYP2C9',
  Clopidogrel: 'CYP2C19',
  Codeine: 'CYP2D6',
  Simvastatin: 'SLCO1B1',
  Tacrolimus: 'CYP3A5',
};

const VARIANT_RULES: Record<string, VariantRule> = {
  rs4244285: { gene: 'CYP2C19', diplotype: '*2/*2', phenotype: 'Poor Metabolizer', impact: 'high' },
  rs776746: { gene: 'CYP3A5', diplotype: '*3/*3', phenotype: 'Non-Expresser', impact: 'medium' },
  rs1799853: { gene: 'CYP2C9', diplotype: '*1/*2', phenotype: 'Intermediate Metabolizer', impact: 'medium' },
  rs1057910: { gene: 'CYP2C9', diplotype: '*1/*3', phenotype: 'Intermediate Metabolizer', impact: 'medium' },
  rs3892097: { gene: 'CYP2D6', diplotype: '*4/*4', phenotype: 'Poor Metabolizer', impact: 'high' },
  rs4149056: { gene: 'SLCO1B1', diplotype: 'c.521TC', phenotype: 'Decreased Function', impact: 'medium' },
};

function generateRefreshPatientId(): string {
  const timestampFragment = Date.now().toString().slice(-6);
  const randomFragment = Math.floor(100 + Math.random() * 900).toString();
  return `PTC${timestampFragment}${randomFragment}`;
}

function calculateAgeFromDateOfBirth(dateOfBirth: string): number | null {
  if (!dateOfBirth) {
    return null;
  }

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function parseInfoField(infoField: string): Record<string, string> {
  return infoField
    .split(';')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, item) => {
      const [rawKey, ...valueParts] = item.split('=');
      if (!rawKey) {
        return accumulator;
      }

      const key = rawKey.trim().toUpperCase();
      const value = valueParts.join('=').trim();
      if (value) {
        accumulator[key] = value;
      }
      return accumulator;
    }, {});
}

function parseVcfVariants(rawVcf: string): ParsedVariant[] {
  const lines = rawVcf.split(/\r?\n/);

  return lines
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => line.split('\t'))
    .filter((parts) => parts.length >= 5)
    .map((parts) => {
      const [chrom, pos, id, ref, alt, , , info = ''] = parts;
      const normalizedRsid = id && id !== '.' ? id : `${chrom}:${pos}`;
      const infoMap = parseInfoField(info);
      const mappedRuleGene = VARIANT_RULES[normalizedRsid.toLowerCase()]?.gene ?? null;
      const parsedGene = infoMap.GENE || infoMap.GENE_SYMBOL || infoMap.SYMBOL || mappedRuleGene;

      return {
        rsid: normalizedRsid,
        evidence: `${chrom}:${pos} ${ref}>${alt}`,
        chrom,
        pos,
        ref,
        alt,
        gene: parsedGene ? parsedGene.toUpperCase() : null,
      };
    });
}

function buildFallbackPatientId(file: File): string {
  const compact = file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 10);
  return `PT-${compact || 'UPLOAD'}`;
}

function inferPatientId(rawVcf: string, file: File, patientIdOverride?: string): string {
  const override = patientIdOverride?.trim();
  if (override) {
    return override;
  }

  const lines = rawVcf.split(/\r?\n/);
  const fromHeader = lines
    .find((line) => line.toLowerCase().startsWith('##patient_id='))
    ?.split('=')
    .slice(1)
    .join('')
    .trim();

  return fromHeader || buildFallbackPatientId(file);
}

function impactScore(impact: ImpactLevel | null): number {
  if (impact === 'high') {
    return 3;
  }
  if (impact === 'medium') {
    return 2;
  }
  return 1;
}

function buildAiDraftOutput(
  file: File,
  rawVcf: string,
  selectedMedications: string[],
  patientIdOverride?: string,
): AiDraftOutput {
  const variants = parseVcfVariants(rawVcf);
  const inferredPatientId = inferPatientId(rawVcf, file, patientIdOverride);
  const primaryDrug = selectedMedications[0] ?? 'Unknown Drug';
  const targetGene = DRUG_GENE_TARGETS[primaryDrug] ?? null;

  const primaryVariant =
    variants.find((variant) => {
      const ruleGene = VARIANT_RULES[variant.rsid.toLowerCase()]?.gene ?? null;
      return Boolean(targetGene && (variant.gene === targetGene || ruleGene === targetGene));
    }) ?? variants[0] ?? null;

  const primaryRule = primaryVariant ? VARIANT_RULES[primaryVariant.rsid.toLowerCase()] : undefined;
  const primaryGene = primaryRule?.gene || primaryVariant?.gene || targetGene || 'UNKNOWN';
  const phenotype =
    primaryRule?.phenotype || (targetGene && primaryGene === targetGene ? 'Intermediate Metabolizer' : 'Unknown');
  const diplotype = primaryRule?.diplotype || 'Not Resolved';

  const targetMatchedVariants = variants.filter((variant) => {
    const ruleGene = VARIANT_RULES[variant.rsid.toLowerCase()]?.gene ?? null;
    return Boolean(targetGene && (variant.gene === targetGene || ruleGene === targetGene));
  });

  const highestImpact: ImpactLevel | null = primaryRule?.impact ?? null;
  const compositeRiskScore = impactScore(highestImpact) + (targetMatchedVariants.length > 1 ? 1 : 0);
  const severity: AiDraftOutput['risk_assessment']['severity'] =
    compositeRiskScore >= 3 ? 'critical' : compositeRiskScore >= 2 ? 'high' : 'moderate';

  const riskLabel = severity === 'critical' ? 'High risk' : severity === 'high' ? 'Moderate risk' : 'Low risk';

  const confidenceBase = severity === 'critical' ? 0.92 : severity === 'high' ? 0.86 : 0.78;
  const confidenceBoost = Math.min(0.08, targetMatchedVariants.length * 0.02 + (primaryRule ? 0.03 : 0));
  const confidence = Number(Math.min(0.98, confidenceBase + confidenceBoost).toFixed(2));

  const detectedVariants: AiDraftVariant[] = variants.slice(0, 5).map((variant) => ({
    rsid: variant.rsid,
    evidence: variant.evidence,
  }));

  const action =
    severity === 'critical'
      ? `Avoid standard ${primaryDrug} dosing and switch to a safer alternative with specialist review.`
      : severity === 'high'
        ? `Reduce initial ${primaryDrug} dose and increase monitoring frequency.`
        : `Proceed with standard ${primaryDrug} dosing and routine clinical monitoring.`;

  const rationale =
    targetGene && primaryGene === targetGene
      ? `${primaryGene} variant evidence indicates ${phenotype.toLowerCase()} behavior for ${primaryDrug}.`
      : `Uploaded VCF evidence suggests low-confidence genotype impact for ${primaryDrug}; continue with standard caution.`;

  const guidelineStrength = severity === 'moderate' ? 'CPIC Level B' : 'CPIC Level A';

  return {
    patient_id: inferredPatientId,
    drug: selectedMedications.join(', '),
    timestamp: new Date().toISOString(),
    risk_assessment: {
      risk_label: riskLabel,
      confidence_score: confidence,
      severity,
    },
    pharmacogenomic_profile: {
      primary_gene: primaryGene,
      diplotype,
      phenotype,
      detected_variants: detectedVariants,
    },
    clinical_recommendation: {
      action,
      rationale,
    },
    llm_generated_explanation: {
      summary: `${riskLabel} classification generated from ${targetMatchedVariants.length || variants.length} matched variant records and ${guidelineStrength} guidance.`,
      next_step: 'Route this deterministic output to the dashboard for clinician sign-off and audit tracking.',
    },
    quality_metrics: {
      vcf_parsing_success: rawVcf.includes('#CHROM') && variants.length > 0,
      variant_line_count: variants.length,
      file_name: file.name,
    },
  };
}

export function VcfIntakePage() {
  const navigate = useNavigate();
  const { saveOutput } = useIntake();
  const { role, hospital } = useAuth();

  const [patientId, setPatientId] = useState(() => generateRefreshPatientId());
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [sexAtBirth, setSexAtBirth] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [country, setCountry] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactRelation, setEmergencyContactRelation] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [assignedDoctor, setAssignedDoctor] = useState('');
  const [department, setDepartment] = useState('');
  const [admissionType, setAdmissionType] = useState<'OPD' | 'IPD' | 'Emergency' | ''>('');
  const [admissionDate, setAdmissionDate] = useState('');
  const [caseType, setCaseType] = useState<'New' | 'Follow-up' | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMedications, setSelectedMedications] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConvertingToInPatient, setIsConvertingToInPatient] = useState(false);
  const [isConvertingToOutPatient, setIsConvertingToOutPatient] = useState(false);
  const [output, setOutput] = useState<AiDraftOutput | null>(null);
  const [tempIntakeDocumentId, setTempIntakeDocumentId] = useState<string | null>(null);
  const [expandedDisclosures, setExpandedDisclosures] = useState({ limits: false, audit: false });
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const outputSectionRef = useRef<HTMLElement | null>(null);

  const derivedAge = useMemo(() => calculateAgeFromDateOfBirth(dateOfBirth), [dateOfBirth]);
  const hospitalIdFromLogin = hospital?.hospital_id || '';
  const todayIsoDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const hasPatientContext =
    Boolean(patientId.trim()) &&
    Boolean(fullName.trim()) &&
    Boolean(dateOfBirth) &&
    Boolean(gender) &&
    Boolean(sexAtBirth) &&
    Boolean(phoneNumber.trim()) &&
    Boolean(city.trim()) &&
    Boolean(stateProvince.trim()) &&
    Boolean(country.trim()) &&
    Boolean(emergencyContactName.trim()) &&
    Boolean(emergencyContactRelation.trim()) &&
    Boolean(emergencyContactPhone.trim()) &&
    Boolean(hospitalIdFromLogin) &&
    Boolean(assignedDoctor.trim()) &&
    Boolean(department.trim()) &&
    Boolean(admissionType) &&
    Boolean(admissionDate) &&
    Boolean(caseType) &&
    selectedMedications.length > 0;
  const hasValidatedUpload = hasPatientContext && Boolean(selectedFile);
  const canManageAdmissionFlow = role === 'admin' || role === 'doctor';

  const primaryDrug = output?.drug.split(',')[0]?.trim() ?? '';
  const primaryGene = output?.pharmacogenomic_profile.primary_gene ?? '';
  const phenotype = output?.pharmacogenomic_profile.phenotype ?? '';
  const primaryVariant = output?.pharmacogenomic_profile.detected_variants[0];
  const confidencePercent = output ? Math.round(output.risk_assessment.confidence_score * 100) : 0;
  const riskLabel = output?.risk_assessment.risk_label ?? '';
  const riskPillClass =
    output?.risk_assessment.severity === 'critical'
      ? 'risk-pill risk-pill--high'
      : output?.risk_assessment.severity === 'high'
        ? 'risk-pill risk-pill--moderate'
        : output?.risk_assessment.severity === 'moderate'
          ? 'risk-pill risk-pill--safe'
          : 'risk-pill risk-pill--high';

  const guidelineLevel = output?.risk_assessment.severity === 'moderate' ? 'CPIC Level B' : 'CPIC Level A';
  const generatedAtUtc = output ? new Date(output.timestamp).toUTCString() : '';

  const reasoningChain = [
    `${primaryVariant?.rsid ?? 'variant id unavailable'} detected`,
    `${primaryGene} reduced activity inferred`,
    `${phenotype} phenotype assigned`,
    `${guidelineLevel} rule matched`,
    `${riskLabel} recommendation generated`,
  ];

  const toggleDisclosure = (key: 'limits' | 'audit') => {
    setExpandedDisclosures((current) => ({ ...current, [key]: !current[key] }));
  };

  const handleFileSelected = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!/\.vcf$/i.test(file.name)) {
      setError('Invalid file type. Please upload a .vcf file only.');
      setSelectedFile(null);
      return;
    }

    setError(null);
    setSyncMessage(null);
    setSelectedFile(file);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelected(event.dataTransfer.files?.[0] ?? null);
  };

  const toggleMedication = (drug: string) => {
    setSelectedMedications((current) =>
      current.includes(drug) ? current.filter((entry) => entry !== drug) : [...current, drug],
    );
  };

  useEffect(() => {
    if (!tempIntakeDocumentId || !output?.patient_id) {
      return;
    }

    const handlePageHide = () => {
      discardTempIntakeDocumentOnUnload(output.patient_id, tempIntakeDocumentId);
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [tempIntakeDocumentId, output?.patient_id]);

  const generateStructuredOutput = async () => {
    if (!hasPatientContext) {
      setError('Complete all required patient-creation fields and select at least one medication before running the pipeline.');
      return;
    }

    if (!selectedFile) {
      setError('Select a VCF file before generating output.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSyncMessage(null);

    try {
      const rawText = await selectedFile.text();
      const draft = buildAiDraftOutput(selectedFile, rawText, selectedMedications, patientId.trim());

      setOutput(draft);
      setExpandedDisclosures({ limits: false, audit: false });
      saveOutput(draft);
      requestAnimationFrame(() => {
        outputSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      try {
        const synced = await syncPatientFromIntake(draft.patient_id, draft, {
          fullName,
          dateOfBirth,
          patientAge: derivedAge !== null ? String(derivedAge) : '',
          gender,
          sexAtBirth,
          phoneNumber,
          email,
          city,
          state: stateProvince,
          country,
          emergencyContactName,
          emergencyContactRelation,
          emergencyContactPhone,
          hospitalId: hospitalIdFromLogin,
          assignedDoctor,
          department,
          admissionType: admissionType || undefined,
          admissionDate,
          caseType: caseType || undefined,
          selectedMedications,
          sourceFile: selectedFile.name,
          capturedAt: new Date().toISOString(),
        });
        setTempIntakeDocumentId(synced.dms?.tempDocumentId || null);
        setSyncMessage('Intake stored temporarily and synced. Convert to In-Patient to create permanent patient JSON.');
      } catch (syncError) {
        if (isApiRequestError(syncError) && syncError.status === 403) {
          setSyncMessage('Output saved locally. Cloud sync is restricted to doctor/admin role for genomic intake.');
        } else if (isApiRequestError(syncError) && syncError.status === 503) {
          setSyncMessage('Output saved locally. Cloud database is temporarily unavailable.');
        } else {
          setSyncMessage('Output saved locally. Cloud sync is currently unavailable.');
        }
      }
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Unable to process VCF file.';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const convertToInPatient = async () => {
    if (!output?.patient_id) {
      setError('Generate output first before converting to in-patient.');
      return;
    }

    setIsConvertingToInPatient(true);
    setError(null);

    try {
      await convertPatientToInPatient(output.patient_id, {
        admittedBy: 'Intake Console',
        admissionNote: `Converted from intake console at ${new Date().toISOString()}`,
      });

      if (tempIntakeDocumentId) {
        try {
          await discardTempIntakeDocument(output.patient_id, tempIntakeDocumentId);
          setTempIntakeDocumentId(null);
        } catch {
          // Best-effort cleanup; conversion succeeds even if temp cleanup fails.
        }
      }

      setSyncMessage('Patient converted to in-patient. Permanent patient JSON has been created/updated.');

      if (role === 'admin') {
        setSyncMessage('Patient admitted (in-patient). Admin can now use Hospital Exit when ready.');
      } else {
        navigate(`/dashboard?patientId=${encodeURIComponent(output.patient_id)}`);
      }
    } catch {
      setError('Unable to convert patient to in-patient right now. Please retry (doctor/admin access required).');
    } finally {
      setIsConvertingToInPatient(false);
    }
  };

  const convertToOutPatient = async () => {
    if (!output?.patient_id) {
      setError('Generate output first before converting to out-patient (hospital exit).');
      return;
    }

    setIsConvertingToOutPatient(true);
    setError(null);

    try {
      await convertPatientToOutPatient(output.patient_id, {
        dischargedBy: 'Intake Console',
        dischargeNote: `Marked as out-patient at ${new Date().toISOString()}`,
      });

      setSyncMessage('Patient marked as out-patient (hospital exit) and permanent patient record has been updated.');
    } catch {
      setError('Unable to convert patient to out-patient right now. Please retry (doctor/admin access required).');
    } finally {
      setIsConvertingToOutPatient(false);
    }
  };

  return (
    <main className="page intake-page intake-console">
      <section className="intake-console-shell fade-in">
        <header className="intake-console-topbar">
          <div className="intake-console-window-controls" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="intake-console-actions">
            <Link to="/landing" className="intake-console-action" aria-label="Go to landing page">
              Go to Landing Page
            </Link>
          </div>
        </header>

        <section className="intake-console-hero">
          <p className="intake-console-kicker">PHARMAKON INTAKE ENGINE</p>
          <h1>Clinical Genomic Intake Console</h1>
          <p className="intake-console-subtitle">Deterministic • Auditable • Clinically Defensible</p>
        </section>

        <ol className="intake-console-progress" aria-label="intake steps">
          <li className={hasPatientContext ? 'is-complete' : 'is-current'}>
            <span>{hasPatientContext ? '✓' : '1'}</span>
            <small>Patient</small>
          </li>
          <li className={hasValidatedUpload ? 'is-complete' : hasPatientContext ? 'is-current' : ''}>
            <span>{hasValidatedUpload ? '✓' : '2'}</span>
            <small>Upload</small>
          </li>
          <li className={output ? 'is-complete' : hasValidatedUpload ? 'is-current' : ''}>
            <span>{output ? '✓' : '3'}</span>
            <small>Run</small>
          </li>
        </ol>

        <section className="intake-stage-card">
          <header className="intake-stage-card-header">
            <div>
              <h2>Step 1 — Patient Context</h2>
              <p>Complete required patient-creation fields and medication context.</p>
            </div>
            <p className={`intake-status-pill ${hasPatientContext ? 'is-complete' : 'is-pending'}`}>
              {hasPatientContext ? 'Completed' : 'In Progress'}
            </p>
          </header>

          <p className="meta-line">Basic Identity (Mandatory)</p>
          <div className="intake-context-grid">
            <label>
              <span>Patient ID</span>
              <input
                type="text"
                value={patientId}
                onChange={(event) => {
                  setPatientId(event.target.value);
                  setError(null);
                }}
                placeholder="Auto-generated on refresh"
              />
            </label>

            <label>
              <span>Full Name</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Enter patient's full legal name"
              />
            </label>

            <label>
              <span>Date of Birth</span>
              <input type="date" value={dateOfBirth} max={todayIsoDate} onChange={(event) => setDateOfBirth(event.target.value)} />
            </label>

            <label>
              <span>Gender</span>
              <select value={gender} onChange={(event) => setGender(event.target.value)}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </label>

            <label>
              <span>Sex at Birth</span>
              <select value={sexAtBirth} onChange={(event) => setSexAtBirth(event.target.value)}>
                <option value="">Select sex at birth</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Unknown">Unknown</option>
              </select>
            </label>

            <label>
              <span>Hospital ID (Auto-filled from Login)</span>
              <input type="text" value={hospitalIdFromLogin || 'Not available'} readOnly disabled />
            </label>
          </div>

          <div className="action-buttons" style={{ marginTop: '0.55rem' }}>
            <Button type="button" variant="secondary" onClick={() => setPatientId(generateRefreshPatientId())}>
              Auto-generate Patient ID
            </Button>
          </div>
          {derivedAge !== null ? <p className="meta-line">Derived age from DOB: {derivedAge} years</p> : null}

          <p className="meta-line" style={{ marginTop: '0.9rem' }}>Contact Details</p>
          <div className="intake-context-grid">
            <label>
              <span>Phone Number</span>
              <input type="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="Primary contact number" />
            </label>

            <label>
              <span>Email (Optional)</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="patient@example.com" />
            </label>
          </div>

          <p className="meta-line" style={{ marginTop: '0.9rem' }}>Address (Simple)</p>
          <div className="intake-context-grid">
            <label>
              <span>City</span>
              <input type="text" value={city} onChange={(event) => setCity(event.target.value)} placeholder="City" />
            </label>

            <label>
              <span>State</span>
              <input type="text" value={stateProvince} onChange={(event) => setStateProvince(event.target.value)} placeholder="State" />
            </label>

            <label>
              <span>Country</span>
              <input type="text" value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Country" />
            </label>
          </div>

          <p className="meta-line" style={{ marginTop: '0.9rem' }}>Emergency Contact</p>
          <div className="intake-context-grid">
            <label>
              <span>Emergency Contact Name</span>
              <input
                type="text"
                value={emergencyContactName}
                onChange={(event) => setEmergencyContactName(event.target.value)}
                placeholder="Contact person"
              />
            </label>

            <label>
              <span>Relation</span>
              <input
                type="text"
                value={emergencyContactRelation}
                onChange={(event) => setEmergencyContactRelation(event.target.value)}
                placeholder="Relation to patient"
              />
            </label>

            <label>
              <span>Emergency Contact Phone</span>
              <input
                type="tel"
                value={emergencyContactPhone}
                onChange={(event) => setEmergencyContactPhone(event.target.value)}
                placeholder="Emergency phone number"
              />
            </label>
          </div>

          <p className="meta-line" style={{ marginTop: '0.9rem' }}>Hospital Context</p>
          <div className="intake-context-grid">
            <label>
              <span>Assigned Doctor</span>
              <input
                type="text"
                value={assignedDoctor}
                onChange={(event) => setAssignedDoctor(event.target.value)}
                placeholder="Doctor assigned to this patient"
              />
            </label>

            <label>
              <span>Department</span>
              <input
                type="text"
                value={department}
                onChange={(event) => setDepartment(event.target.value)}
                placeholder="Cardiology / Oncology / etc."
              />
            </label>
          </div>

          <p className="meta-line" style={{ marginTop: '0.9rem' }}>Admission Info</p>
          <div className="intake-context-grid">
            <label>
              <span>Admission Type</span>
              <select value={admissionType} onChange={(event) => setAdmissionType(event.target.value as 'OPD' | 'IPD' | 'Emergency' | '')}>
                <option value="">Select admission type</option>
                <option value="OPD">OPD</option>
                <option value="IPD">IPD</option>
                <option value="Emergency">Emergency</option>
              </select>
            </label>

            <label>
              <span>Admission Date</span>
              <input type="date" value={admissionDate} max={todayIsoDate} onChange={(event) => setAdmissionDate(event.target.value)} />
            </label>

            <label>
              <span>Case Type</span>
              <select value={caseType} onChange={(event) => setCaseType(event.target.value as 'New' | 'Follow-up' | '')}>
                <option value="">Select case type</option>
                <option value="New">New</option>
                <option value="Follow-up">Follow-up</option>
              </select>
            </label>
          </div>

          <div className="intake-medication-field">
            <span>Medications (Required for genomic decision run)</span>
            <div className="intake-medication-quick-picks">
              {SUPPORTED_DRUGS.map((drug) => {
                const isSelected = selectedMedications.includes(drug);
                return (
                  <button
                    key={drug}
                    type="button"
                    className={`intake-med-pill ${isSelected ? 'is-selected' : ''}`.trim()}
                    onClick={() => toggleMedication(drug)}
                  >
                    {drug}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="intake-stage-card">
          <header className="intake-stage-card-header">
            <div>
              <h2>Step 2 — VCF Upload</h2>
              <p>Upload one validated .vcf file for deterministic processing.</p>
            </div>
            <p className={`intake-status-pill ${hasValidatedUpload ? 'is-complete' : 'is-pending'}`}>
              {hasValidatedUpload ? 'Validated' : 'Pending'}
            </p>
          </header>

          <div className="intake-upload-layout">
            <ul className="intake-checklist">
              <li className={hasPatientContext ? 'is-complete' : ''}>Patient metadata complete</li>
              <li className={selectedFile ? 'is-complete' : ''}>VCF validated</li>
              <li className={selectedFile ? 'is-complete' : ''}>SNP panel loaded</li>
            </ul>

            <label
              className={`intake-panel vcf-dropzone ${isDragging ? 'dragging' : ''}`.trim()}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept=".vcf"
                onChange={(event) => {
                  handleFileSelected(event.target.files?.[0] ?? null);
                }}
              />
              <strong>☁</strong>
              <span>Drag & drop VCF file here</span>
              <small>{selectedFile ? `${selectedFile.name}` : 'or click to upload'}</small>
            </label>
          </div>
        </section>

        <div className="intake-run-strip">
          <Button className="intake-run-button" onClick={generateStructuredOutput} disabled={isProcessing || !hasValidatedUpload}>
            {isProcessing ? 'Running Deterministic Pipeline...' : 'Run Deterministic Pipeline'}
          </Button>
        </div>

        {error ? <p className="auth-error">{error}</p> : null}
        {syncMessage ? <p className="intake-sync-message">{syncMessage}</p> : null}

        {output ? (
          <section ref={outputSectionRef} className="intake-stage-card intake-stage-output">
            <header className="intake-stage-card-header">
              <div>
                <h2>Step 3 — Run Output</h2>
                <p>Defensible clinician-facing recommendation panel generated from deterministic evidence.</p>
              </div>
              <p className="intake-status-pill is-complete">Completed</p>
            </header>

            <div className="intake-signoff-panel">
              <p className="intake-signoff-kicker">THIS IS WHAT A DEFENSIBLE DECISION LOOKS LIKE</p>
              <h3 className="intake-signoff-title">Clinical Sign-off Output Panel</h3>
              <p className="intake-signoff-subtitle">
                Recommendation generated from parsed variant evidence and deterministic guideline-linked rules.
              </p>

              <div className="intake-signoff-top">
                <article className="intake-decision-chip">
                  <p className="intake-decision-chip-label">Decision First</p>
                  <h4>
                    {primaryDrug} · {primaryGene}
                  </h4>
                  <p className="intake-decision-chip-meta">Phenotype: {phenotype}</p>
                </article>

                <article className="intake-decision-chip">
                  <p className="intake-decision-chip-label">Risk Classification</p>
                  <p className={riskPillClass}>{riskLabel}</p>
                  <p className="intake-decision-chip-meta">Guideline strength: {guidelineLevel}</p>
                  <p className="intake-decision-chip-meta intake-confidence-pill">Confidence: {confidencePercent}%</p>
                </article>
              </div>

              <div className="intake-signoff-grid">
                <section className="intake-output-card">
                  <h4>Evidence Summary</h4>
                  <div className="intake-kv-list">
                    <p>
                      <span>Drug</span>
                      <strong>{primaryDrug}</strong>
                    </p>
                    <p>
                      <span>Primary gene</span>
                      <strong>{primaryGene}</strong>
                    </p>
                    <p>
                      <span>Phenotype</span>
                      <strong>{phenotype}</strong>
                    </p>
                    <p>
                      <span>Variant evidence</span>
                      <strong>{primaryVariant ? `${primaryVariant.rsid} (${primaryVariant.evidence})` : 'No variant evidence extracted'}</strong>
                    </p>
                  </div>

                  <div className="intake-guideline-evidence">
                    <h5>Guideline Evidence</h5>
                    <p>
                      <span>Guideline Source</span>
                      <strong>{output.llm_generated_explanation.summary}</strong>
                    </p>
                    <p>
                      <span>Evidence Level</span>
                      <strong>{guidelineLevel}</strong>
                    </p>
                    <p>
                      <span>Rule Match</span>
                      <strong>{output.clinical_recommendation.rationale}</strong>
                    </p>
                    <p>
                      <span>Source file</span>
                      <strong>{output.quality_metrics.file_name}</strong>
                    </p>
                  </div>
                </section>

                <section className="intake-output-card">
                  <h4>Clinical Recommendation</h4>
                  <p>{output.clinical_recommendation.action}</p>
                  <p>{output.clinical_recommendation.rationale}</p>

                  <div className="intake-reasoning-chain">
                    <h5>Visible Reasoning Chain</h5>
                    <ol>
                      {reasoningChain.map((step) => (
                        <li key={step}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </section>
              </div>

              <div className="intake-signoff-bottom">
                <article className="intake-disclosure">
                  <button
                    type="button"
                    className="intake-disclosure-toggle"
                    onClick={() => toggleDisclosure('limits')}
                    aria-expanded={expandedDisclosures.limits}
                    aria-controls="intake-limits"
                  >
                    When this system may be limited
                  </button>
                  <div id="intake-limits" className={`intake-disclosure-body ${expandedDisclosures.limits ? 'is-open' : ''}`.trim()}>
                    <ul>
                      <li>Incomplete variant coverage in uploaded VCF.</li>
                      <li>Novel or rare variants without validated guideline mapping.</li>
                      <li>Non-genetic factors may alter final prescribing risk.</li>
                    </ul>
                  </div>
                </article>

                <article className="intake-disclosure">
                  <button
                    type="button"
                    className="intake-disclosure-toggle"
                    onClick={() => toggleDisclosure('audit')}
                    aria-expanded={expandedDisclosures.audit}
                    aria-controls="intake-audit"
                  >
                    Audit Trail
                  </button>
                  <div id="intake-audit" className={`intake-disclosure-body ${expandedDisclosures.audit ? 'is-open' : ''}`.trim()}>
                    <div className="intake-kv-list">
                      <p>
                        <span>Rule version</span>
                        <strong>{`${primaryGene}-deterministic-v1`}</strong>
                      </p>
                      <p>
                        <span>Generated at (UTC)</span>
                        <strong>{generatedAtUtc}</strong>
                      </p>
                      <p>
                        <span>Decision path</span>
                        <strong>{reasoningChain.join(' → ')}</strong>
                      </p>
                      <p>
                        <span>Review status</span>
                        <strong>Pending clinician sign-off</strong>
                      </p>
                    </div>
                  </div>
                </article>
              </div>

              <p className="intake-signoff-accountability">Every step is reviewable. Every outcome is accountable.</p>
            </div>

            <div className="intake-actions">
              {canManageAdmissionFlow ? (
                <>
                  <Button variant="secondary" onClick={convertToInPatient} disabled={isConvertingToInPatient || isConvertingToOutPatient}>
                    {isConvertingToInPatient ? 'Admitting...' : 'Hospital Admit (In-Patient)'}
                  </Button>
                  <Button variant="secondary" onClick={convertToOutPatient} disabled={isConvertingToOutPatient || isConvertingToInPatient}>
                    {isConvertingToOutPatient ? 'Processing Exit...' : 'Hospital Exit (Out-Patient)'}
                  </Button>
                </>
              ) : (
                <p className="meta-line">Hospital admit/exit actions require doctor or admin role.</p>
              )}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
