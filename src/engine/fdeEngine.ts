/**
 * FDE-BANKOPS: Forward Deployed Context Engineering, Docker Telemetry & Fraud Engine
 * Exclusive Architect: أ. طارق ابوعشي | Tareq Abuashi — Forward Deployed AI & FinTech Systems Engineer
 */

export type BankingRail =
  | 'SARIE Instant Wire'
  | 'Corporate Treasury'
  | 'Mada POS'
  | 'Murabaha Credit';

export type ScenarioMode = 'NORMAL' | 'ATO' | 'SMURFING' | 'API_503' | 'CREDIT';

export type HttpStatusCode = 200 | 429 | 503;

export interface DockerContainerMetric {
  id: string;
  image: string;
  role: string;
  cpuPct: number;
  ramMb: number;
  ramLimitMb: number;
  p95LatencyMs: number;
  httpStatus: HttpStatusCode;
  replicas: number;
  statusText: 'HEALTHY' | 'DEGRADED' | 'SCALING' | 'RESTARTING';
  autoScaled?: boolean;
}

export interface ClientSourceStatus {
  id: string;
  name: string;
  protocol: string;
  status: 'CONNECTED' | 'FAILOVER_CACHE' | 'TIMEOUT_503';
  latencyMs: number;
  recordsFed: number;
}

export interface ShapFeature {
  name: string;
  rawValue: string;
  shapContribution: number; // positive pushes toward fraud/block, negative pushes toward safe
}

export interface BankingTransaction {
  id: string;
  timestamp: string;
  rail: BankingRail;
  amountSar: number;
  merchantOrBeneficiary: string;
  maskedIban: string;
  maskedNationalId: string;
  inferenceMs: number;
  riskScore: number; // 0 - 100
  verdict: 'APPROVED' | 'CHALLENGE_MFA' | 'BLOCKED';
  shapFeatures: ShapFeature[];
  explanation: string;
}

export interface ContextWindowSnapshot {
  systemPromptTokens: number;
  bankingSourceTokens: number;
  samaVectorTokens: number;
  schemaContractTokens: number;
  totalTokens: number;
  maxContextTokens: number;
  piiFieldsMaskedCount: number;
  piiRedactionExamples: Array<{ field: string; rawSample: string; maskedValue: string }>;
  pydanticValid: boolean;
  schemaContractName: string;
  promptInspectorText: string;
  validatedJsonOutput: string;
}

export interface FdeEngineState {
  mode: ScenarioMode;
  circuitBreaker: 'CLOSED' | 'OPEN' | 'HALF-OPEN';
  semanticCacheActive: boolean;
  semanticCacheHitRatePct: number;
  avgInferenceMs: number;
  activeRiskScore: number;
  containers: DockerContainerMetric[];
  sources: ClientSourceStatus[];
  transactions: BankingTransaction[];
  selectedTx: BankingTransaction;
  contextSnapshot: ContextWindowSnapshot;
  bannerMessage: string;
  bannerSeverity: 'emerald' | 'amber' | 'rose' | 'cyan';
}

function createInitialContainers(): DockerContainerMetric[] {
  return [
    {
      id: 'router',
      image: 'fde-context-router:v2.4',
      role: 'Context & Zero-PII Router',
      cpuPct: 31,
      ramMb: 412,
      ramLimitMb: 1024,
      p95LatencyMs: 6.4,
      httpStatus: 200,
      replicas: 1,
      statusText: 'HEALTHY',
    },
    {
      id: 'xgboost',
      image: 'fraud-xgboost-engine:v3.1',
      role: 'Real-Time SHAP Inference',
      cpuPct: 44,
      ramMb: 680,
      ramLimitMb: 2048,
      p95LatencyMs: 9.2,
      httpStatus: 200,
      replicas: 2,
      statusText: 'HEALTHY',
    },
    {
      id: 'sama',
      image: 'sama-aml-compliance:v1.9',
      role: 'AML Rule 40 & STR Guard',
      cpuPct: 24,
      ramMb: 340,
      ramLimitMb: 1024,
      p95LatencyMs: 4.8,
      httpStatus: 200,
      replicas: 1,
      statusText: 'HEALTHY',
    },
    {
      id: 'pgvector',
      image: 'pgvector-kyc-store:16',
      role: 'SAMA Policy & KYC Vector DB',
      cpuPct: 29,
      ramMb: 1240,
      ramLimitMb: 4096,
      p95LatencyMs: 7.1,
      httpStatus: 200,
      replicas: 1,
      statusText: 'HEALTHY',
    },
    {
      id: 'redis',
      image: 'redis-velocity-cache:7.2',
      role: 'Velocity & Semantic Cache',
      cpuPct: 18,
      ramMb: 295,
      ramLimitMb: 1024,
      p95LatencyMs: 1.9,
      httpStatus: 200,
      replicas: 1,
      statusText: 'HEALTHY',
    },
  ];
}

function buildBaselineTx(seq: number): BankingTransaction {
  const rails: BankingRail[] = ['SARIE Instant Wire', 'Corporate Treasury', 'Mada POS', 'Murabaha Credit'];
  const rail = rails[seq % rails.length];
  const amounts: Record<BankingRail, number[]> = {
    'SARIE Instant Wire': [4250, 12800, 8900, 15400],
    'Corporate Treasury': [64000, 118500, 82000, 49000],
    'Mada POS': [185, 640, 1290, 412],
    'Murabaha Credit': [18500, 32000, 14200, 27500],
  };
  const beneficiaries: Record<BankingRail, string[]> = {
    'SARIE Instant Wire': ['Riyadh Logistics Co.', 'Al-Faisaliah Medical', 'Saudi Cloud Services', 'Jeddah Port Authority'],
    'Corporate Treasury': ['ARABCO Contracting', 'Alinma Sukuk Escrow', 'NEOM Infrastructure Pool', 'SABIC Vendor Clearing'],
    'Mada POS': ['Jarir Bookstore #14', 'Danube Hypermarket', 'STC Pay Merchant', 'Al-Dawaa Pharmacy'],
    'Murabaha Credit': ['Auto Murabaha #8812', 'SME Working Capital #409', 'Home Finance Leg #221', 'Equipment Lease #905'],
  };

  const idx = seq % 4;
  const amountSar = amounts[rail][idx];
  const riskScore = 7 + ((seq * 5) % 14); // 7 - 20 low baseline risk
  const inferenceMs = Number((10.8 + ((seq * 1.7) % 5.4)).toFixed(1));

  return {
    id: `TX-${9900 + seq}`,
    timestamp: new Date().toISOString().slice(11, 19),
    rail,
    amountSar,
    merchantOrBeneficiary: beneficiaries[rail][idx],
    maskedIban: `SA${14 + (seq % 70)} 0500 **** **** ${1020 + ((seq * 37) % 8800)}`,
    maskedNationalId: `10${seq % 9}****${710 + (seq % 280)}`,
    inferenceMs,
    riskScore,
    verdict: 'APPROVED',
    shapFeatures: [
      { name: 'Velocity Z-Score', rawValue: '0.32σ (Normal)', shapContribution: -0.19 },
      { name: 'Geo/Device Drift', rawValue: '0.0 km / Trusted', shapContribution: -0.24 },
      { name: 'Beneficiary Graph Risk', rawValue: '0.08 (Verified KYC)', shapContribution: -0.15 },
      { name: 'Amount vs 90d Baseline', rawValue: '1.08x Median', shapContribution: 0.04 },
    ],
    explanation: `Cleared via XGBoost v3.1 in ${inferenceMs} ms. Trusted device binding and normal 90-day SARIE/Mada velocity profile.`,
  };
}

export class FdeBankOpsEngine {
  private state: FdeEngineState;
  private txCounter = 100;
  private onUpdate?: (state: FdeEngineState) => void;

  constructor(onUpdate?: (state: FdeEngineState) => void) {
    this.onUpdate = onUpdate;
    const initialTxs = [buildBaselineTx(99), buildBaselineTx(98), buildBaselineTx(97), buildBaselineTx(96)];
    this.state = {
      mode: 'NORMAL',
      circuitBreaker: 'CLOSED',
      semanticCacheActive: false,
      semanticCacheHitRatePct: 91.4,
      avgInferenceMs: 13.4,
      activeRiskScore: initialTxs[0].riskScore,
      containers: createInitialContainers(),
      sources: this.buildSources('NORMAL'),
      transactions: initialTxs,
      selectedTx: initialTxs[0],
      contextSnapshot: this.buildContextSnapshot('NORMAL', initialTxs[0], false),
      bannerMessage: 'FDE Banking Mesh Nominal • All 5 Docker services HTTP 200 • Inference SLA <18 ms',
      bannerSeverity: 'emerald',
    };
  }

  public getState(): FdeEngineState {
    return this.state;
  }

  private emit(): void {
    if (this.onUpdate) {
      this.onUpdate(this.state);
    }
  }

  private buildSources(mode: ScenarioMode): ClientSourceStatus[] {
    if (mode === 'API_503') {
      return [
        { id: 'core', name: 'Core Banking REST API', protocol: 'REST / mTLS', status: 'TIMEOUT_503', latencyMs: 2480, recordsFed: 0 },
        { id: 'sarie', name: 'ISO 20022 SARIE / SWIFT Feed', protocol: 'pacs.008 Stream', status: 'FAILOVER_CACHE', latencyMs: 3.1, recordsFed: 418 },
        { id: 'kyc', name: 'KYC / AML Graph', protocol: 'Bolt / Cypher', status: 'CONNECTED', latencyMs: 8.4, recordsFed: 129 },
        { id: 'sama-vec', name: 'SAMA Policy Vector Store', protocol: 'pgvector HNSW', status: 'CONNECTED', latencyMs: 6.2, recordsFed: 18 },
      ];
    }

    return [
      { id: 'core', name: 'Core Banking REST API', protocol: 'REST / mTLS', status: 'CONNECTED', latencyMs: 9.8, recordsFed: 1420 },
      { id: 'sarie', name: 'ISO 20022 SARIE / SWIFT Feed', protocol: 'pacs.008 Stream', status: 'CONNECTED', latencyMs: 4.3, recordsFed: 892 },
      { id: 'kyc', name: 'KYC / AML Graph', protocol: 'Bolt / Cypher', status: 'CONNECTED', latencyMs: 6.7, recordsFed: 214 },
      { id: 'sama-vec', name: 'SAMA Policy Vector Store', protocol: 'pgvector HNSW', status: 'CONNECTED', latencyMs: 5.1, recordsFed: 24 },
    ];
  }

  private buildContextSnapshot(mode: ScenarioMode, tx: BankingTransaction, semanticCache: boolean): ContextWindowSnapshot {
    const sysTokens = 620;
    const bankTokens = mode === 'SMURFING' ? 2140 : mode === 'CREDIT' ? 1890 : 1240;
    const samaTokens = mode === 'NORMAL' ? 980 : 1640;
    const schemaTokens = 380;
    const totalTokens = sysTokens + bankTokens + samaTokens + schemaTokens;

    const piiRedactionExamples = [
      { field: 'IBAN', rawSample: 'SA4480000000608010167519', maskedValue: tx.maskedIban },
      { field: 'National ID / Iqama', rawSample: '1084927518', maskedValue: tx.maskedNationalId },
      { field: 'Card PAN', rawSample: '4847 8319 4401 9920', maskedValue: '4847 83** **** 9920' },
      { field: 'Mobile MSISDN', rawSample: '+966 55 812 9402', maskedValue: '+966 55 *** **02' },
    ];

    const verdictReason =
      mode === 'ATO'
        ? 'Account takeover vector detected: 9.8x 90d wire baseline + unrecognized IP/device ASN.'
        : mode === 'SMURFING'
          ? 'AML Rule 40 structuring ring: 6 sub-threshold SAR 49,500 legs linked to shared beneficiary graph.'
          : mode === 'API_503'
            ? 'Core Banking 503 mitigated via Circuit Breaker OPEN + Redis Semantic Cache failover.'
            : mode === 'CREDIT'
              ? 'Corporate SME Murabaha underwriting packet verified against IFRS-9 & SAMA DTI limits.'
              : 'Normal transactional velocity within 90-day customer baseline.';

    const promptInspectorText = [
      `### [1] SYSTEM_DIRECTIVE (${sysTokens} tok) | Zero-PII & SAMA Guardrail`,
      `You are FDE-BANKOPS Financial Decision Agent deployed inside Alinma Private VPC.`,
      `Rules: NEVER hallucinate balances. Cite SAMA CSF / AML Rule 40 IDs. Output strict Pydantic JSON.`,
      ``,
      `### [2] MASKED_BANKING_SOURCES (${bankTokens} tok) ${semanticCache ? '[SERVED VIA REDIS SEMANTIC CACHE]' : '[LIVE mTLS FEED]'}`,
      `> Core Banking REST: account=${tx.maskedIban} | id=${tx.maskedNationalId} | rail="${tx.rail}"`,
      `> ISO 20022 pacs.008: tx_id=${tx.id} | amt=SAR ${tx.amountSar.toLocaleString()} | target="${tx.merchantOrBeneficiary}"`,
      `> KYC/AML Graph: hops=${mode === 'SMURFING' ? '2-hop ring (6 linked mule nodes)' : mode === 'ATO' ? 'high-risk unverified offshore node' : '1-hop verified merchant'}`,
      `> SHAP Vector: ${tx.shapFeatures.map((s) => `${s.name}=${s.shapContribution >= 0 ? '+' : ''}${s.shapContribution.toFixed(2)}`).join(' | ')}`,
      ``,
      `### [3] SAMA_POLICY_VECTOR_STORE (${samaTokens} tok) [pgvector HNSW top-k=4]`,
      `- [SAMA-AML-R40] Split transfers < SAR 50,000 within 24h across linked devices mandate SAFIU STR.`,
      `- [SAMA-CSF-3.3.4] High-value SARIE wires with device drift require instant freeze + step-up MFA.`,
      `- [PDPL-ART-11] PII vault redaction verified: ${piiRedactionExamples.length} sensitive fields masked before LLM ingress.`,
      ``,
      `### [4] PYDANTIC_SCHEMA_CONTRACT (${schemaTokens} tok)`,
      `class BankingDecisionV2(BaseModel): tx_id: str; risk_score: int; verdict: Literal['APPROVED','CHALLENGE_MFA','BLOCKED']; str_required: bool`,
    ].join('\n');

    const validatedJsonOutput = JSON.stringify(
      {
        schema: 'BankingDecisionV2 (Pydantic v2.9 Validated)',
        tx_id: tx.id,
        rail: tx.rail,
        risk_score: tx.riskScore,
        verdict: tx.verdict,
        str_required: tx.riskScore >= 75,
        circuit_breaker_mode: semanticCache ? 'SEMANTIC_CACHE_FALLBACK' : 'LIVE_CORE_API',
        pii_leakage_detected: false,
        rationale: verdictReason,
      },
      null,
      2
    );

    return {
      systemPromptTokens: sysTokens,
      bankingSourceTokens: bankTokens,
      samaVectorTokens: samaTokens,
      schemaContractTokens: schemaTokens,
      totalTokens,
      maxContextTokens: 32768,
      piiFieldsMaskedCount: piiRedactionExamples.length,
      piiRedactionExamples,
      pydanticValid: true,
      schemaContractName: 'BankingDecisionV2 (Pydantic Strict)',
      promptInspectorText,
      validatedJsonOutput,
    };
  }

  public tickTelemetry(): void {
    // Subtle realistic jitter for Docker telemetry & live banking stream
    this.state.containers = this.state.containers.map((c) => {
      const cpuDelta = Math.round((Math.random() - 0.5) * 6);
      const ramDelta = Math.round((Math.random() - 0.5) * 14);
      const baseLat = c.httpStatus === 503 ? 1850 : c.id === 'redis' ? 1.8 : c.id === 'xgboost' ? 9.1 : 6.2;
      const latJitter = c.httpStatus === 503 ? (Math.random() - 0.5) * 300 : (Math.random() - 0.5) * 1.8;
      return {
        ...c,
        cpuPct: Math.min(98, Math.max(8, c.cpuPct + cpuDelta)),
        ramMb: Math.min(c.ramLimitMb - 40, Math.max(180, c.ramMb + ramDelta)),
        p95LatencyMs: Number(Math.max(1.1, baseLat + latJitter).toFixed(1)),
      };
    });

    if (this.state.mode === 'NORMAL') {
      this.txCounter += 1;
      const nextTx = buildBaselineTx(this.txCounter);
      this.state.transactions = [nextTx, ...this.state.transactions].slice(0, 7);
      this.state.selectedTx = nextTx;
      this.state.activeRiskScore = nextTx.riskScore;
      this.state.avgInferenceMs = nextTx.inferenceMs;
      this.state.contextSnapshot = this.buildContextSnapshot('NORMAL', nextTx, false);
    }

    this.emit();
  }

  public selectTransaction(txId: string): void {
    const found = this.state.transactions.find((t) => t.id === txId);
    if (!found) return;
    this.state.selectedTx = found;
    this.state.activeRiskScore = found.riskScore;
    this.state.contextSnapshot = this.buildContextSnapshot(this.state.mode, found, this.state.semanticCacheActive);
    this.emit();
  }

  public restartContainer(containerId: string): void {
    const target = this.state.containers.find((c) => c.id === containerId);
    if (!target) return;

    target.statusText = 'RESTARTING';
    target.httpStatus = 200;
    target.cpuPct = 14;
    target.p95LatencyMs = 4.2;
    this.state.bannerMessage = `Docker Restart Executed: ${target.image} gracefully recycled with zero dropped SARIE frames.`;
    this.state.bannerSeverity = 'cyan';
    this.emit();

    setTimeout(() => {
      target.statusText = 'HEALTHY';
      this.emit();
    }, 900);
  }

  public scaleContainer(containerId: string): void {
    const target = this.state.containers.find((c) => c.id === containerId);
    if (!target) return;

    target.replicas = target.replicas >= 6 ? 1 : target.replicas + 1;
    target.cpuPct = Math.max(12, Math.round(target.cpuPct * 0.72));
    target.p95LatencyMs = Number(Math.max(1.4, target.p95LatencyMs * 0.78).toFixed(1));
    target.statusText = 'HEALTHY';
    target.httpStatus = 200;
    this.state.bannerMessage = `Docker Horizontal Scale: ${target.image} scaled to ${target.replicas}x replicas — P95 latency improved to ${target.p95LatencyMs} ms.`;
    this.state.bannerSeverity = 'emerald';
    this.emit();
  }

  public injectAccountTakeover(): void {
    this.txCounter += 1;
    const atoTx: BankingTransaction = {
      id: `TX-${9900 + this.txCounter}-ATO`,
      timestamp: new Date().toISOString().slice(11, 19),
      rail: 'SARIE Instant Wire',
      amountSar: 480000,
      merchantOrBeneficiary: 'Offshore Mule IBAN #XX91 (Unverified)',
      maskedIban: 'SA03 8000 **** **** 9104',
      maskedNationalId: '108****921',
      inferenceMs: 14.6,
      riskScore: 96,
      verdict: 'BLOCKED',
      shapFeatures: [
        { name: 'Geo/Device Drift', rawValue: 'New ASN + SimSwap Flag', shapContribution: 0.44 },
        { name: 'Amount vs 90d Baseline', rawValue: '9.8x SAR Median (480k)', shapContribution: 0.31 },
        { name: 'Beneficiary Graph Risk', rawValue: '2-Hop Blacklisted Hub', shapContribution: 0.27 },
        { name: 'Velocity Z-Score', rawValue: '+4.6σ Burst in 90s', shapContribution: 0.19 },
      ],
      explanation:
        'BLOCKED (Risk 96/100): Account Takeover pattern detected via SHAP (+0.44 Geo/Device Drift, +0.31 Amount Spike). Instant SARIE escrow lock & SAMA STR payload generated.',
    };

    this.state.mode = 'ATO';
    this.state.circuitBreaker = 'CLOSED';
    this.state.semanticCacheActive = false;
    this.state.containers = createInitialContainers();
    this.state.containers[1].cpuPct = 76; // fraud-xgboost-engine
    this.state.containers[2].cpuPct = 68; // sama-aml-compliance
    this.state.sources = this.buildSources('ATO');
    this.state.transactions = [atoTx, ...this.state.transactions].slice(0, 7);
    this.state.selectedTx = atoTx;
    this.state.activeRiskScore = 96;
    this.state.avgInferenceMs = 14.6;
    this.state.contextSnapshot = this.buildContextSnapshot('ATO', atoTx, false);
    this.state.bannerMessage =
      'CRITICAL FRAUD INTERCEPT: Account Takeover SAR 480,000 SARIE Wire BLOCKED (Risk 96/100) • SAMA STR Dispatched.';
    this.state.bannerSeverity = 'rose';
    this.emit();
  }

  public injectAmlSmurfing(): void {
    this.txCounter += 1;
    const smurfTx: BankingTransaction = {
      id: `TX-${9900 + this.txCounter}-AML`,
      timestamp: new Date().toISOString().slice(11, 19),
      rail: 'Corporate Treasury',
      amountSar: 297000, // 6 x 49,500 structured transfers
      merchantOrBeneficiary: '6-Account Structuring Ring (6 × SAR 49,500)',
      maskedIban: 'SA71 2000 **** **** 4418',
      maskedNationalId: '104****603',
      inferenceMs: 15.8,
      riskScore: 91,
      verdict: 'BLOCKED',
      shapFeatures: [
        { name: 'Beneficiary Graph Risk', rawValue: '6 Linked Accounts -> 1 Hub', shapContribution: 0.48 },
        { name: 'Velocity Z-Score', rawValue: '+5.1σ (14m Window)', shapContribution: 0.29 },
        { name: 'Amount vs 90d Baseline', rawValue: '6 × SAR 49,500 (<50k Cap)', shapContribution: 0.22 },
        { name: 'Geo/Device Drift', rawValue: 'Shared Device Fingerprint', shapContribution: 0.14 },
      ],
      explanation:
        'BLOCKED (Risk 91/100): AML Rule 40 Smurfing Ring detected — 6 sub-threshold transfers (SAR 49,500 each, total SAR 297,000) converging on shared Neo4j beneficiary hub.',
    };

    this.state.mode = 'SMURFING';
    this.state.circuitBreaker = 'CLOSED';
    this.state.semanticCacheActive = false;
    this.state.containers = createInitialContainers();
    this.state.containers[2].cpuPct = 82; // sama-aml-compliance
    this.state.containers[3].cpuPct = 71; // pgvector-kyc-store
    this.state.sources = this.buildSources('SMURFING');
    this.state.transactions = [smurfTx, ...this.state.transactions].slice(0, 7);
    this.state.selectedTx = smurfTx;
    this.state.activeRiskScore = 91;
    this.state.avgInferenceMs = 15.8;
    this.state.contextSnapshot = this.buildContextSnapshot('SMURFING', smurfTx, false);
    this.state.bannerMessage =
      'AML RULE 40 VIOLATION: Multi-Account Smurfing Ring Detected (6 × SAR 49,500) • Beneficiary Hub Frozen & STR Ready.';
    this.state.bannerSeverity = 'rose';
    this.emit();
  }

  public simulateCoreApiSpike503(): void {
    this.txCounter += 1;
    const failoverTx: BankingTransaction = {
      id: `TX-${9900 + this.txCounter}-FDE`,
      timestamp: new Date().toISOString().slice(11, 19),
      rail: 'SARIE Instant Wire',
      amountSar: 31500,
      merchantOrBeneficiary: 'Riyadh Industrial Supply (Cached KYC)',
      maskedIban: 'SA55 1000 **** **** 3389',
      maskedNationalId: '102****114',
      inferenceMs: 12.1,
      riskScore: 18,
      verdict: 'APPROVED',
      shapFeatures: [
        { name: 'Velocity Z-Score', rawValue: '0.41σ (Redis Cache)', shapContribution: -0.17 },
        { name: 'Geo/Device Drift', rawValue: 'Trusted Device Hash', shapContribution: -0.22 },
        { name: 'Beneficiary Graph Risk', rawValue: '0.09 (Cached Graph)', shapContribution: -0.14 },
        { name: 'Amount vs 90d Baseline', rawValue: '1.19x Median', shapContribution: 0.06 },
      ],
      explanation:
        'FDE RESILIENCE PASS: Core Banking REST API returned HTTP 503. Circuit Breaker tripped OPEN, traffic routed to Redis Semantic Cache, and fde-context-router auto-scaled 1x → 3x.',
    };

    const containers = createInitialContainers();
    // Auto-scale router from 1 -> 3 and degrade Core REST dependency cleanly
    containers[0].replicas = 3;
    containers[0].autoScaled = true;
    containers[0].statusText = 'SCALING';
    containers[0].cpuPct = 84;
    containers[0].httpStatus = 200;

    containers[3].httpStatus = 503;
    containers[3].statusText = 'DEGRADED';
    containers[3].p95LatencyMs = 1940;
    containers[3].cpuPct = 91;

    containers[4].cpuPct = 66;
    containers[4].p95LatencyMs = 2.1; // redis-velocity-cache serving Semantic Cache

    this.state.mode = 'API_503';
    this.state.circuitBreaker = 'OPEN';
    this.state.semanticCacheActive = true;
    this.state.semanticCacheHitRatePct = 97.8;
    this.state.containers = containers;
    this.state.sources = this.buildSources('API_503');
    this.state.transactions = [failoverTx, ...this.state.transactions].slice(0, 7);
    this.state.selectedTx = failoverTx;
    this.state.activeRiskScore = 18;
    this.state.avgInferenceMs = 12.1;
    this.state.contextSnapshot = this.buildContextSnapshot('API_503', failoverTx, true);
    this.state.bannerMessage =
      'FDE CIRCUIT BREAKER OPEN (HTTP 503) • Failover to Redis Semantic Cache Active • fde-context-router Auto-Scaled 1x → 3x!';
    this.state.bannerSeverity = 'amber';
    this.emit();
  }

  public runCorporateCreditCase(): void {
    this.txCounter += 1;
    const creditTx: BankingTransaction = {
      id: `TX-${9900 + this.txCounter}-CRD`,
      timestamp: new Date().toISOString().slice(11, 19),
      rail: 'Murabaha Credit',
      amountSar: 850000,
      merchantOrBeneficiary: 'Najd Logistics SME Murabaha Facility',
      maskedIban: 'SA88 0500 **** **** 7740',
      maskedNationalId: '700****512',
      inferenceMs: 13.9,
      riskScore: 24,
      verdict: 'APPROVED',
      shapFeatures: [
        { name: 'Beneficiary Graph Risk', rawValue: '0.11 (Verified CR)', shapContribution: -0.21 },
        { name: 'Geo/Device Drift', rawValue: 'Corp Portal mTLS', shapContribution: -0.18 },
        { name: 'Velocity Z-Score', rawValue: '0.55σ Seasonal', shapContribution: 0.05 },
        { name: 'Amount vs 90d Baseline', rawValue: 'Murabaha CapEx', shapContribution: 0.12 },
      ],
      explanation:
        'Corporate Murabaha Credit packet evaluated (SAR 850,000 / 36 months): IFRS-9 Stage 1 ECL computed, SAMA DTI verified, and Pydantic BankingDecisionV2 validated.',
    };

    this.state.mode = 'CREDIT';
    this.state.circuitBreaker = 'CLOSED';
    this.state.semanticCacheActive = false;
    this.state.containers = createInitialContainers();
    this.state.sources = this.buildSources('CREDIT');
    this.state.transactions = [creditTx, ...this.state.transactions].slice(0, 7);
    this.state.selectedTx = creditTx;
    this.state.activeRiskScore = 24;
    this.state.avgInferenceMs = 13.9;
    this.state.contextSnapshot = this.buildContextSnapshot('CREDIT', creditTx, false);
    this.state.bannerMessage =
      'CORPORATE MURABAHA UNDERWRITING EXECUTED • IFRS-9 / Basel III Parameters Loaded & SAMA Policy Verified.';
    this.state.bannerSeverity = 'cyan';
    this.emit();
  }

  public resetEnvironment(): void {
    this.txCounter += 1;
    const cleanTx = buildBaselineTx(this.txCounter);
    this.state.mode = 'NORMAL';
    this.state.circuitBreaker = 'CLOSED';
    this.state.semanticCacheActive = false;
    this.state.semanticCacheHitRatePct = 91.4;
    this.state.containers = createInitialContainers();
    this.state.sources = this.buildSources('NORMAL');
    this.state.transactions = [cleanTx, buildBaselineTx(this.txCounter - 1), buildBaselineTx(this.txCounter - 2), buildBaselineTx(this.txCounter - 3)];
    this.state.selectedTx = cleanTx;
    this.state.activeRiskScore = cleanTx.riskScore;
    this.state.avgInferenceMs = cleanTx.inferenceMs;
    this.state.contextSnapshot = this.buildContextSnapshot('NORMAL', cleanTx, false);
    this.state.bannerMessage =
      'FDE Banking Mesh Reset • Circuit Breaker CLOSED • All 5 Docker containers HTTP 200 (<18 ms SLA).';
    this.state.bannerSeverity = 'emerald';
    this.emit();
  }
}
