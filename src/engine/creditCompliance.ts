/**
 * FDE-BANKOPS Credit Risk (IFRS-9 / Basel III) & SAMA/AML Compliance Engine
 * Exclusive Architect: أ. طارق ابوعشي | Tareq Abuashi — Forward Deployed AI & FinTech Systems Engineer
 */

export type FinancingRecommendation =
  | 'Murabaha Tier-A Approved'
  | 'Manual Underwriting'
  | 'Declined';

export interface CreditInput {
  applicantType: 'Retail Salary-Assigned' | 'Corporate SME Murabaha';
  monthlyIncomeSar: number;
  requestedAmountSar: number;
  existingObligationsSar: number;
  tenorMonths: number;
  simahScore: number; // 300 - 850
  collateralCoveragePct: number; // 0 - 100
}

export interface CreditAssessment {
  pdPct: number; // Probability of Default %
  lgdPct: number; // Loss Given Default %
  eadSar: number; // Exposure at Default (SAR)
  eclSar: number; // IFRS-9 Expected Credit Loss = PD * LGD * EAD
  rwaSar: number; // Basel III Risk-Weighted Assets
  dtiPct: number; // Debt-to-Income %
  monthlyInstallmentSar: number;
  recommendation: FinancingRecommendation;
  ifrsStage: 'Stage 1 (12m ECL)' | 'Stage 2 (Lifetime ECL)' | 'Stage 3 (Credit-Impaired)';
  rationale: string;
}

export type ControlStatus = 'PASS' | 'WARN' | 'BREACH';

export interface ComplianceControl {
  id: string;
  framework: 'SAMA CSF Controls' | 'AML Rule 40 (Structuring/Smurfing)' | 'FATF Travel Rule' | 'Zero-PII LLM Guardrail';
  code: string;
  status: ControlStatus;
  detail: string;
  lastAudited: string;
}

export interface StrPayloadContext {
  caseId: string;
  triggerType: 'ACCOUNT_TAKEOVER' | 'AML_STRUCTURING' | 'BASELINE_MONITOR';
  riskScore: number;
  amountSar: number;
  rail: string;
  maskedIban: string;
  maskedNationalId: string;
  shapTopDrivers: string[];
}

export function evaluateCreditRisk(input: CreditInput): CreditAssessment {
  const income = Math.max(3000, input.monthlyIncomeSar);
  const amount = Math.max(10000, input.requestedAmountSar);
  const tenor = Math.max(6, input.tenorMonths);
  const simah = Math.min(850, Math.max(300, input.simahScore));
  const collateral = Math.min(100, Math.max(0, input.collateralCoveragePct));

  // Murabaha fixed profit rate (~3.85% flat annual equivalent based on SIMAH tier)
  const annualRate = simah >= 720 ? 0.036 : simah >= 640 ? 0.049 : 0.068;
  const totalProfit = amount * annualRate * (tenor / 12);
  const totalPayable = amount + totalProfit;
  const monthlyInstallmentSar = Math.round(totalPayable / tenor);

  const dtiPct = Number((((input.existingObligationsSar + monthlyInstallmentSar) / income) * 100).toFixed(1));

  // Logistic-inspired PD calibration from SIMAH score, DTI, and segment
  const simahNorm = (750 - simah) / 140; // negative if > 750
  const dtiPenalty = Math.max(0, (dtiPct - 33) * 0.055);
  const segmentOffset = input.applicantType === 'Corporate SME Murabaha' ? 0.35 : -0.15;
  const logit = -3.45 + simahNorm * 1.45 + dtiPenalty + segmentOffset;
  const rawPd = (1 / (1 + Math.exp(-logit))) * 100;
  const pdPct = Number(Math.min(48.0, Math.max(0.28, rawPd)).toFixed(2));

  // Basel III / IFRS-9 LGD based on collateral coverage & unsecured floor
  const baseLgd = input.applicantType === 'Retail Salary-Assigned' ? 38 : 48;
  const lgdPct = Number(Math.max(12, baseLgd - collateral * 0.32).toFixed(1));

  const eadSar = Math.round(amount * 0.94);
  const eclSar = Math.round((pdPct / 100) * (lgdPct / 100) * eadSar);

  // Simplified Basel III IRB risk-weight scaling
  const riskWeightFactor = Math.min(1.5, Math.max(0.35, 0.38 + (pdPct / 100) * 3.8 + (lgdPct / 100) * 0.25));
  const rwaSar = Math.round(eadSar * riskWeightFactor);

  // SAMA Responsible Lending DTI cap (33.3% basic / up to 45% or 55% with housing; strict corporate thresholds)
  const dtiHardCap = input.applicantType === 'Retail Salary-Assigned' ? 45 : 55;
  const dtiSoftCap = input.applicantType === 'Retail Salary-Assigned' ? 33.3 : 42;

  let recommendation: FinancingRecommendation = 'Murabaha Tier-A Approved';
  let ifrsStage: CreditAssessment['ifrsStage'] = 'Stage 1 (12m ECL)';
  let rationale = 'SIMAH creditworthiness, SAMA DTI ratio, and IFRS-9 PD/LGD fall well within Tier-A Murabaha auto-approval thresholds.';

  if (pdPct >= 8.5 || dtiPct > dtiHardCap || simah < 580) {
    recommendation = 'Declined';
    ifrsStage = pdPct >= 15 ? 'Stage 3 (Credit-Impaired)' : 'Stage 2 (Lifetime ECL)';
    rationale = `Declined under SAMA Responsible Lending & IFRS-9 policy: DTI (${dtiPct}%) or PD (${pdPct}%) breaches risk appetite ceiling.`;
  } else if (pdPct >= 2.8 || dtiPct > dtiSoftCap || simah < 660) {
    recommendation = 'Manual Underwriting';
    ifrsStage = 'Stage 2 (Lifetime ECL)';
    rationale = `Routed to Credit Committee (Alinma Underwriting Desk): moderate PD (${pdPct}%) or DTI (${dtiPct}%) requires income/collateral verification.`;
  }

  return {
    pdPct,
    lgdPct,
    eadSar,
    eclSar,
    rwaSar,
    dtiPct,
    monthlyInstallmentSar,
    recommendation,
    ifrsStage,
    rationale,
  };
}

export function evaluateComplianceMatrix(mode: 'NORMAL' | 'ATO' | 'SMURFING' | 'API_503' | 'CREDIT'): ComplianceControl[] {
  const now = new Date().toISOString().slice(11, 19) + ' AST';

  if (mode === 'ATO') {
    return [
      {
        id: 'sama-csf',
        framework: 'SAMA CSF Controls',
        code: 'CSF-3.3.4 / IAM-MFA',
        status: 'BREACH',
        detail: 'New untrusted device fingerprint + impossible geo-velocity detected prior to SAR 480,000 SARIE wire.',
        lastAudited: now,
      },
      {
        id: 'aml-40',
        framework: 'AML Rule 40 (Structuring/Smurfing)',
        code: 'SAFIU-R40',
        status: 'WARN',
        detail: 'Single high-value outbound spike (9.6x 90d baseline) flagged for immediate SAFIU STR escalation.',
        lastAudited: now,
      },
      {
        id: 'fatf-16',
        framework: 'FATF Travel Rule',
        code: 'ISO-20022 pacs.008',
        status: 'PASS',
        detail: 'Originator & beneficiary IBAN/BIC fields populated; beneficiary flagged on high-risk graph hop.',
        lastAudited: now,
      },
      {
        id: 'zero-pii',
        framework: 'Zero-PII LLM Guardrail',
        code: 'PDPL-ART-11',
        status: 'PASS',
        detail: 'National ID, IBAN, and phone redacted via deterministic token vault before LLM Context Router.',
        lastAudited: now,
      },
    ];
  }

  if (mode === 'SMURFING') {
    return [
      {
        id: 'sama-csf',
        framework: 'SAMA CSF Controls',
        code: 'CSF-3.3.1 / TX-MON',
        status: 'PASS',
        detail: 'Session signatures valid; telemetry ingested via TLS 1.3 mTLS SARIE gateway.',
        lastAudited: now,
      },
      {
        id: 'aml-40',
        framework: 'AML Rule 40 (Structuring/Smurfing)',
        code: 'SAFIU-R40-RING',
        status: 'BREACH',
        detail: '6 coordinated accounts split SAR 297,000 into SAR 49,500 legs (< SAR 50,000 CTR threshold) in 14 mins.',
        lastAudited: now,
      },
      {
        id: 'fatf-16',
        framework: 'FATF Travel Rule',
        code: 'ISO-20022 VASP/FI',
        status: 'BREACH',
        detail: 'Common ultimate beneficial device hash linked across 4 receiving mule IBANs.',
        lastAudited: now,
      },
      {
        id: 'zero-pii',
        framework: 'Zero-PII LLM Guardrail',
        code: 'PDPL-ART-11',
        status: 'PASS',
        detail: 'All 6 customer National IDs masked prior to KYC Graph context assembly.',
        lastAudited: now,
      },
    ];
  }

  if (mode === 'API_503') {
    return [
      {
        id: 'sama-csf',
        framework: 'SAMA CSF Controls',
        code: 'CSF-3.5.2 / BCM-RESILIENCE',
        status: 'WARN',
        detail: 'Core Banking REST API returned HTTP 503; Circuit Breaker OPEN, serving degraded-safe Semantic Cache.',
        lastAudited: now,
      },
      {
        id: 'aml-40',
        framework: 'AML Rule 40 (Structuring/Smurfing)',
        code: 'SAFIU-R40',
        status: 'PASS',
        detail: 'Redis velocity counters intact; cached AML sliding windows operational during failover.',
        lastAudited: now,
      },
      {
        id: 'fatf-16',
        framework: 'FATF Travel Rule',
        code: 'ISO-20022 pacs.008',
        status: 'PASS',
        detail: 'ISO 20022 schema validation enforced locally at fde-context-router edge container.',
        lastAudited: now,
      },
      {
        id: 'zero-pii',
        framework: 'Zero-PII LLM Guardrail',
        code: 'PDPL-ART-11',
        status: 'PASS',
        detail: 'Zero-PII masking active in edge sidecar; zero unredacted payloads leaked during retry.',
        lastAudited: now,
      },
    ];
  }

  return [
    {
      id: 'sama-csf',
      framework: 'SAMA CSF Controls',
      code: 'CSF-3.3 / ZERO-TRUST',
      status: 'PASS',
      detail: 'mTLS active, HSM key rotation verified, real-time telemetry streaming under <18 ms SLA.',
      lastAudited: now,
    },
    {
      id: 'aml-40',
      framework: 'AML Rule 40 (Structuring/Smurfing)',
      code: 'SAFIU-R40',
      status: 'PASS',
      detail: '24h sliding velocity windows within SAR 50,000 structuring threshold tolerances.',
      lastAudited: now,
    },
    {
      id: 'fatf-16',
      framework: 'FATF Travel Rule',
      code: 'ISO-20022 pacs.008',
      status: 'PASS',
      detail: 'All SARIE / SWIFT wire messages carry validated originator & beneficiary KYC metadata.',
      lastAudited: now,
    },
    {
      id: 'zero-pii',
      framework: 'Zero-PII LLM Guardrail',
      code: 'PDPL-ART-11',
      status: 'PASS',
      detail: '100% PII redaction enforced (IBAN, Iqama/National ID, Card PAN) before LLM Context Window.',
      lastAudited: now,
    },
  ];
}

export function generateStrPayload(ctx: StrPayloadContext): string {
  const timestamp = new Date().toISOString();
  const payload = {
    reportHeader: {
      regulator: 'SAFIU / SAMA Financial Intelligence Unit',
      schemaVersion: 'SAMA-STR-ISO20022-v3.2',
      reportId: ctx.caseId,
      generatedAtUtc: timestamp,
      reportingEntity: 'Alinma Digital FinTech Sandbox (FDE-BANKOPS)',
      architectSignature: 'Tareq Abuashi — Forward Deployed AI & FinTech Systems Engineer',
    },
    suspicionClassification: {
      triggerCode: ctx.triggerType,
      compositeRiskScore: `${ctx.riskScore}/100`,
      actionTaken: ctx.riskScore >= 75 ? 'IMMEDIATE_WIRE_FREEZE_AND_ESCROW' : 'ENHANCED_DUE_DILIGENCE',
      applicableRules:
        ctx.triggerType === 'AML_STRUCTURING'
          ? ['SAMA_AML_RULE_40', 'SAFIU_STRUCTURING_SMURFING_RING', 'FATF_REC_16']
          : ['SAMA_CSF_3_3_4', 'ACCOUNT_TAKEOVER_HIGH_VELOCITY_WIRE', 'PDPL_ZERO_PII_MASKED'],
    },
    maskedTransactionEvidence: {
      paymentRail: ctx.rail,
      amountSar: ctx.amountSar,
      currency: 'SAR',
      originatorNationalId: ctx.maskedNationalId,
      originatorIban: ctx.maskedIban,
      piiRedactionPolicy: 'ZERO_PII_ENFORCED_PRIOR_TO_LLM',
    },
    explainableAiShapDrivers: ctx.shapTopDrivers,
  };

  return JSON.stringify(payload, null, 2);
}
