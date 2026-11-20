/**
 * FDE-BANKOPS: FDE & FinTech AI Architecture Dossier Modal
 * Exclusive Architect: أ. طارق ابوعشي | Tareq Abuashi — Forward Deployed AI & FinTech Systems Engineer
 */

export function mountDossierModal(openBtn: HTMLElement | null): void {
  const modal = document.createElement('div');
  modal.id = 'fde-dossier-modal';
  modal.className = 'dossier-modal hidden';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'dossier-title');

  modal.innerHTML = `
    <div class="dossier-backdrop" data-close-dossier></div>
    <div class="dossier-dialog glass-panel">
      <div class="dossier-header">
        <div>
          <span class="panel-badge gold">FDE &amp; FINTECH ARCHITECTURE DOSSIER</span>
          <h2 id="dossier-title">FDE-BANKOPS: Mathematical &amp; Systems Blueprint</h2>
          <p class="dossier-author">Exclusive Architect: <strong>أ. طارق ابوعشي | Tareq Abuashi — Forward Deployed AI &amp; FinTech Systems Engineer</strong></p>
        </div>
        <button id="close-dossier-btn" class="btn-icon" aria-label="Close Dossier">&times; Close</button>
      </div>

      <div class="dossier-body custom-scroll">
        <div class="dossier-grid">
          <div class="dossier-card">
            <h3>1. Forward Deployed Context Engineering</h3>
            <p>Assembles deterministic, zero-PII prompt context from 4 live client banking rails (Core REST, ISO 20022 SARIE/SWIFT, Neo4j KYC Graph, pgvector SAMA Policies) inside a bounded 32k-token budget with Pydantic v2 strict output contracts.</p>
            <pre class="formula-box">Context(x) = System ⊕ Mask_PII(Core, SARIE) ⊕ Graph_2Hop(KYC) ⊕ TopK_HNSW(SAMA)
Zero-PII Guarantee: PII_tokens_in_LLM_ingress == 0</pre>
          </div>

          <div class="dossier-card">
            <h3>2. SHAP TreeExplainer Fraud Attribution (&lt;18 ms)</h3>
            <p>Every SARIE wire, Mada POS, or Treasury transfer is scored by XGBoost v3.1 and decomposed additively via Shapley values so SAMA compliance officers see exact feature causality.</p>
            <pre class="formula-box">f(x) = φ₀ + Σ_{i=1}^{4} φ_i  (Velocity Z, Geo/Device Drift, Beneficiary Graph, 90d Baseline)
Risk(x) = 100 · σ(f(x))  ∈ [0, 100]</pre>
          </div>

          <div class="dossier-card">
            <h3>3. IFRS-9 Expected Credit Loss &amp; Basel III</h3>
            <p>Evaluates retail salary-assigned and corporate SME Murabaha applications against SAMA Responsible Lending DTI ceilings and international IFRS-9 provisioning stages.</p>
            <pre class="formula-box">PD = σ(-3.45 + 1.45·(750 - SIMAH)/140 + max(0, DTI - 33)·0.055)
ECL = PD × LGD × EAD   |   RWA = EAD × RW(PD, LGD)</pre>
          </div>

          <div class="dossier-card">
            <h3>4. SAMA AML Rule 40 &amp; Circuit Breaker Resilience</h3>
            <p>Detects multi-account structuring ("Smurfing" legs just beneath the SAR 50,000 CTR threshold) and auto-generates SAFIU STR payloads. Under Core Banking 503 latency spikes, the Circuit Breaker opens, routes to Redis Semantic Cache, and auto-scales Docker router replicas (1x → 3x).</p>
            <pre class="formula-box">IF Core_API == HTTP 503 OR P95 &gt; 1500ms:
  CircuitBreaker = OPEN → Failover(redis-velocity-cache:7.2) + Scale(router, 3x)</pre>
          </div>
        </div>

        <div class="dossier-footer-note">
          Built for <strong>Tuwaiq Academy Forward Deployed Engineer (FDE)</strong> &amp; <strong>Alinma Bank Future Bankers (مصرفيي المستقبل - مصرف الإنماء)</strong> • Architected exclusively by <strong>أ. طارق ابوعشي | Tareq Abuashi</strong>.
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.classList.add('hidden');
  const open = () => modal.classList.remove('hidden');

  openBtn?.addEventListener('click', open);
  modal.querySelector('#close-dossier-btn')?.addEventListener('click', close);
  modal.querySelector('[data-close-dossier]')?.addEventListener('click', close);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) close();
  });
}
