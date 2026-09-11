import type { LabReportRecord } from '../types/domain';

export interface LabAgentReportInput extends Pick<LabReportRecord, 'id' | 'title' | 'sourceType' | 'findings' | 'aiSummary' | 'createdAt' | 'createdBy'> {
  values: Array<{ name: string; value: string; reference: string }>;
}

export interface LabRealtimeSignal {
  value: string;
  detail: string;
}

export interface LabLatestFinding {
  id: string;
  timestamp: string;
  marker: string;
  finding: string;
  clinicalWeight: 'Low' | 'Moderate' | 'High';
  disposition: string;
}

export interface LabDateWiseFindingGroup {
  date: string;
  totalFindings: number;
  highPriorityCount: number;
  highlights: string[];
}

export interface LabRealtimeViewModel {
  headline: string;
  confidence: number;
  signals: {
    wbc: LabRealtimeSignal;
    creatinine: LabRealtimeSignal;
    alt: LabRealtimeSignal;
    specimenTurnaround: LabRealtimeSignal;
  };
  latestFindings: LabLatestFinding[];
  dateWiseFindings: LabDateWiseFindingGroup[];
  aiAgent: {
    summary: string;
    recommendation: string;
    basis: string;
  };
}

interface BuildLabRealtimeViewInput {
  patientId: string;
  riskLabel: string;
  severityLabel: string;
  reports: LabAgentReportInput[];
  fallbackSignals: {
    wbc: string;
    creatinine: string;
    alt: string;
    specimenTurnaround: string;
  };
}

const WBC_BASELINE = 6900;

function withUnit(value: string, unit: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'N/A';
  }

  return trimmed.toLowerCase().includes(unit.toLowerCase()) ? trimmed : `${trimmed} ${unit}`;
}

function parseNumeric(raw: string): number | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.includes('/')) {
    const [first] = normalized.split('/');
    const fromFraction = Number(first);
    return Number.isFinite(fromFraction) ? fromFraction : null;
  }

  const stripped = normalized.replace(/[^0-9.-]/g, '');
  const value = Number(stripped);
  return Number.isFinite(value) ? value : null;
}

function parseReferenceRange(reference: string): { low: number; high: number } | null {
  const match = reference.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const low = Number(match[1]);
  const high = Number(match[2]);
  if (!Number.isFinite(low) || !Number.isFinite(high)) {
    return null;
  }

  return { low, high };
}

function normalizeMarkerName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findLatestMarkerValue(
  reports: LabAgentReportInput[],
  aliases: string[],
): { rawValue: string; createdAt: string } | null {
  const normalizedAliases = aliases.map((entry) => normalizeMarkerName(entry));

  for (const report of reports) {
    for (const row of report.values || []) {
      const marker = normalizeMarkerName(row.name || '');
      if (normalizedAliases.some((alias) => marker.includes(alias))) {
        return {
          rawValue: row.value || '',
          createdAt: report.createdAt,
        };
      }
    }
  }

  return null;
}

function weightScore(weight: 'Low' | 'Moderate' | 'High'): number {
  if (weight === 'High') {
    return 3;
  }

  if (weight === 'Moderate') {
    return 2;
  }

  return 1;
}

function deriveClinicalWeight(params: {
  severityLabel: string;
  hasAbnormalRange: boolean;
  finding: string;
  sourceType: 'pdf' | 'structured';
}): 'Low' | 'Moderate' | 'High' {
  const base = params.severityLabel.toLowerCase();

  if (base === 'critical') {
    return 'High';
  }

  const finding = params.finding.toLowerCase();
  if (params.hasAbnormalRange || /critical|severe|escalat|urgent|toxic/.test(finding)) {
    return 'High';
  }

  if (base === 'high' || params.sourceType === 'pdf' || /upward|drift|variance|monitor|watch/.test(finding)) {
    return 'Moderate';
  }

  return 'Low';
}

function dispositionForWeight(weight: 'Low' | 'Moderate' | 'High'): string {
  if (weight === 'High') {
    return 'Attending review open';
  }

  if (weight === 'Moderate') {
    return 'Pharmacy monitor enabled';
  }

  return 'Routine surveillance';
}

function toDisplayDate(raw: string): string {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleDateString();
}

function toIsoDateKey(raw: string): string {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return 'unknown';
  }

  return date.toISOString().slice(0, 10);
}

function toDisplayTime(raw: string): string {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleTimeString();
}

function fallbackTimeBucket(raw: string): string {
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(diffMs / (1000 * 60)));

  if (minutes < 60) {
    return `${minutes} min`;
  }

  if (minutes < 24 * 60) {
    return `${Math.round(minutes / 60)} hr`;
  }

  return `${Math.round(minutes / (24 * 60))} d`;
}

function primaryMarker(report: LabAgentReportInput): string {
  const abnormalRow = report.values.find((row) => {
    const range = parseReferenceRange(row.reference || '');
    const value = parseNumeric(row.value || '');
    if (!range || value === null) {
      return false;
    }

    return value < range.low || value > range.high;
  });

  if (abnormalRow?.name) {
    return abnormalRow.name;
  }

  if (report.values[0]?.name) {
    return report.values[0].name;
  }

  const title = report.title.toLowerCase();
  if (title.includes('wbc')) {
    return 'WBC';
  }

  if (title.includes('creatinine')) {
    return 'Creatinine';
  }

  if (title.includes('alt')) {
    return 'ALT';
  }

  return 'General';
}

function hasAbnormalRange(report: LabAgentReportInput): boolean {
  return report.values.some((row) => {
    const range = parseReferenceRange(row.reference || '');
    const value = parseNumeric(row.value || '');
    if (!range || value === null) {
      return false;
    }

    return value < range.low || value > range.high;
  });
}

function findingText(report: LabAgentReportInput): string {
  if (report.findings?.trim()) {
    return report.findings.trim();
  }

  if (report.aiSummary?.trim()) {
    return report.aiSummary.trim();
  }

  const firstValue = report.values[0];
  if (firstValue) {
    return `${firstValue.name}: ${firstValue.value} (ref ${firstValue.reference || 'N/A'})`;
  }

  return 'No narrative finding provided.';
}

export function buildLabRealtimeView(input: BuildLabRealtimeViewInput): LabRealtimeViewModel {
  const reports = [...input.reports].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const latestFindings: LabLatestFinding[] = reports.slice(0, 12).map((report) => {
    const finding = findingText(report);
    const weight = deriveClinicalWeight({
      severityLabel: input.severityLabel,
      hasAbnormalRange: hasAbnormalRange(report),
      finding,
      sourceType: report.sourceType,
    });

    return {
      id: report.id,
      timestamp: report.createdAt,
      marker: primaryMarker(report),
      finding,
      clinicalWeight: weight,
      disposition: dispositionForWeight(weight),
    };
  });

  const groupedByDate = new Map<string, LabLatestFinding[]>();
  latestFindings.forEach((entry) => {
    const dateKey = toIsoDateKey(entry.timestamp);
    const current = groupedByDate.get(dateKey) || [];
    current.push(entry);
    groupedByDate.set(dateKey, current);
  });

  const dateWiseFindings: LabDateWiseFindingGroup[] = Array.from(groupedByDate.entries())
    .map(([dateKey, entries]) => ({
      date: dateKey === 'unknown' ? 'Unknown date' : toDisplayDate(dateKey),
      totalFindings: entries.length,
      highPriorityCount: entries.filter((entry) => entry.clinicalWeight === 'High').length,
      highlights: entries.slice(0, 2).map((entry) => `${entry.marker}: ${entry.finding}`),
      rankTime: dateKey === 'unknown' ? 0 : new Date(dateKey).getTime(),
    }))
    .sort((left, right) => right.rankTime - left.rankTime)
    .slice(0, 10)
    .map(({ rankTime: _rankTime, ...entry }) => entry);

  const latestWbc = findLatestMarkerValue(reports, ['wbc', 'whitebloodcell', 'whitecell']);
  const latestCreatinine = findLatestMarkerValue(reports, ['creatinine']);
  const latestAlt = findLatestMarkerValue(reports, ['alt', 'alanineaminotransferase']);

  const wbcRaw = latestWbc?.rawValue || input.fallbackSignals.wbc;
  const creatinineRaw = latestCreatinine?.rawValue || input.fallbackSignals.creatinine;
  const altRaw = latestAlt?.rawValue || input.fallbackSignals.alt;

  const wbcNumeric = parseNumeric(wbcRaw);
  const creatinineNumeric = parseNumeric(creatinineRaw);
  const altNumeric = parseNumeric(altRaw);

  const wbcDelta = wbcNumeric === null ? null : Math.round(wbcNumeric - WBC_BASELINE);
  const wbcDetail =
    wbcDelta === null
      ? 'Delta unavailable from report values'
      : `${wbcDelta >= 0 ? '+' : ''}${wbcDelta.toLocaleString()} /µL vs baseline`;

  const creatinineDetail =
    creatinineNumeric === null
      ? 'Renal trend unavailable from numeric reports'
      : creatinineNumeric > 1.3
        ? 'Renal clearance watchlist enabled'
        : 'Renal clearance within expected range';

  const altDetail =
    altNumeric === null
      ? 'Hepatic trend unavailable from numeric reports'
      : altNumeric > 45
        ? 'Hepatic exposure monitoring active'
        : 'Hepatic markers within expected range';

  const turnaroundValue = reports[0] ? fallbackTimeBucket(reports[0].createdAt) : input.fallbackSignals.specimenTurnaround;
  const turnaroundDetail = reports[0]
    ? `Latest report captured ${fallbackTimeBucket(reports[0].createdAt)} ago`
    : 'Awaiting report ingestion for turnaround tracking';

  const highestWeight = latestFindings.reduce<'Low' | 'Moderate' | 'High'>(
    (current, entry) => (weightScore(entry.clinicalWeight) > weightScore(current) ? entry.clinicalWeight : current),
    input.severityLabel.toLowerCase() === 'critical' ? 'High' : input.severityLabel.toLowerCase() === 'high' ? 'Moderate' : 'Low',
  );

  const reportCoverage = Math.min(1, reports.length / 6);
  const withAiSummary = reports.filter((entry) => entry.aiSummary?.trim()).length;
  const aiDensity = reports.length ? withAiSummary / reports.length : 0;
  const confidence = Number(Math.min(0.99, 0.65 + reportCoverage * 0.22 + aiDensity * 0.12).toFixed(2));

  const latestEntry = latestFindings[0];
  const recommendation =
    highestWeight === 'High'
      ? 'Escalate to attending review and queue repeat panel verification.'
      : highestWeight === 'Moderate'
        ? 'Continue monitored follow-up and confirm trending direction in next panel.'
        : 'Continue routine surveillance with standard review cadence.';

  const headlineSuffix = highestWeight === 'High' ? 'REVIEW REQUIRED' : highestWeight === 'Moderate' ? 'MONITOR CLOSELY' : 'STABLE MONITORING';

  return {
    headline: `${input.riskLabel.toUpperCase()} LAB CORRELATION — ${headlineSuffix}`,
    confidence,
    signals: {
      wbc: {
        value: withUnit(wbcRaw || '', '/µL'),
        detail: wbcDetail,
      },
      creatinine: {
        value: withUnit(creatinineRaw || '', 'mg/dL'),
        detail: creatinineDetail,
      },
      alt: {
        value: withUnit(altRaw || '', 'U/L'),
        detail: altDetail,
      },
      specimenTurnaround: {
        value: turnaroundValue,
        detail: turnaroundDetail,
      },
    },
    latestFindings,
    dateWiseFindings,
    aiAgent: {
      summary: latestEntry
        ? `${latestEntry.marker} at ${toDisplayTime(latestEntry.timestamp)}: ${latestEntry.finding}`
        : `No report findings are available yet for ${input.patientId}.`,
      recommendation,
      basis: `Derived from ${reports.length} report artifact(s) and ${reports.reduce((acc, report) => acc + report.values.length, 0)} structured marker row(s).`,
    },
  };
}
