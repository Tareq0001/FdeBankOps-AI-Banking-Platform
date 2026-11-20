/**
 * FDE-BANKOPS: Application Entrypoint & Real-Time UI Orchestrator
 * Exclusive Architect: أ. طارق ابوعشي | Tareq Abuashi — Forward Deployed AI & FinTech Systems Engineer
 */

import './style.css';
import { audioEngine } from './engine/audioEngine';
import {
  evaluateComplianceMatrix,
  evaluateCreditRisk,
  generateStrPayload,
  type CreditInput,
} from './engine/creditCompliance';
import { FdeBankOpsEngine, type FdeEngineState } from './engine/fdeEngine';
import { BankingCanvas } from './components/BankingCanvas';
import { mountDossierModal } from './components/DossierModal';

function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing DOM element #${id}`);
  return el;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function init(): void {
  const canvasEl = $('banking-canvas') as HTMLCanvasElement;
  const bankingCanvas = new BankingCanvas(canvasEl);

  mountDossierModal(document.getElementById('open-dossier-btn'));

  // Audio toggle
  const audioBtn = $('audio-toggle-btn');
  const audioText = $('audio-status-text');
  audioBtn.addEventListener('click', () => {
    const muted = audioEngine.toggleMute();
    audioBtn.classList.toggle('active', !muted);
    audioText.textContent = muted ? 'Audio: OFF' : 'Audio: ON';
  });

  // Engine setup
  const engine = new FdeBankOpsEngine((state) => {
    renderState(state);
  });

  function renderState(state: FdeEngineState): void {
    const tx = state.selectedTx;

    // 1. Update 60fps Canvas
    bankingCanvas.updateState(tx, state.mode, state.circuitBreaker === 'OPEN');

    // 2. Top Telemetry Ribbon
    const meshPill = $('mesh-status-pill');
    const meshText = $('mesh-status-text');
    meshPill.className = 'status-pill';
    if (state.mode === 'ATO' || state.mode === 'SMURFING') {
      meshPill.classList.add('status-alert');
      meshText.textContent = state.mode === 'ATO' ? 'FRAUD INTERCEPTED' : 'AML RULE 40 BREACH';
    } else if (state.mode === 'API_503') {
      meshPill.classList.add('status-warn');
      meshText.textContent = 'CIRCUIT BREAKER OPEN';
    } else {
      meshPill.classList.add('status-ready');
      meshText.textContent = 'FDE MESH NOMINAL';
    }

    $('telem-inference').textContent = `${state.avgInferenceMs.toFixed(1)} ms (<18ms)`;
    $('telem-risk').textContent = `${state.activeRiskScore} / 100`;
    $('telem-tokens').textContent = `${state.contextSnapshot.totalTokens.toLocaleString()} / ${state.contextSnapshot.maxContextTokens.toLocaleString()}`;
    $('telem-pii').textContent = `${state.contextSnapshot.piiFieldsMaskedCount}/4 Fields Masked`;
    $('telem-cb').textContent = state.circuitBreaker;
    $('telem-cache').textContent = `${state.semanticCacheHitRatePct.toFixed(1)}%${state.semanticCacheActive ? ' (FAILOVER)' : ''}`;

    // Banner
    const banner = $('scenario-banner');
    banner.className = `scenario-banner ${state.bannerSeverity}`;
    $('scenario-banner-text').textContent = state.bannerMessage;

    // Verdict & Fault Mode Badges
    const verdictBadge = $('active-verdict-badge');
    verdictBadge.className = `panel-badge ${tx.verdict === 'BLOCKED' ? 'rose' : 'emerald'}`;
    verdictBadge.textContent = `${tx.verdict} (${tx.riskScore}/100)`;

    const faultModeBadge = $('fault-mode-badge');
    faultModeBadge.className = `panel-badge ${
      state.mode === 'ATO' || state.mode === 'SMURFING'
        ? 'rose'
        : state.mode === 'API_503'
          ? 'gold'
          : state.mode === 'CREDIT'
            ? 'cyan'
            : 'emerald'
    }`;
    faultModeBadge.textContent = `MODE: ${state.mode}`;

    // 3. Transaction Stream List
    $('tx-explanation-line').textContent = tx.explanation;
    const txListEl = $('tx-stream-list');
    txListEl.innerHTML = state.transactions
      .map((item) => {
        const isSelected = item.id === tx.id;
        const isBlocked = item.verdict === 'BLOCKED';
        return `
          <div class="tx-row ${isSelected ? 'selected' : ''} ${isBlocked ? 'blocked' : ''}" data-tx-id="${escapeHtml(item.id)}">
            <span>${escapeHtml(item.id)}</span>
            <span>${escapeHtml(item.rail)}</span>
            <span>${escapeHtml(item.merchantOrBeneficiary)}</span>
            <span>SAR ${item.amountSar.toLocaleString()}</span>
            <span>${item.inferenceMs.toFixed(1)}ms</span>
            <span class="tx-verdict ${isBlocked ? 'bad' : 'ok'}">${item.verdict}</span>
          </div>
        `;
      })
      .join('');

    txListEl.querySelectorAll<HTMLElement>('.tx-row').forEach((row) => {
      row.addEventListener('click', () => {
        const id = row.dataset.txId;
        if (id) {
          audioEngine.play('click');
          engine.selectTransaction(id);
        }
      });
    });

    // 4. Docker Container Telemetry Grid
    const healthyCount = state.containers.filter((c) => c.httpStatus === 200).length;
    const dockerHealthBadge = $('docker-health-badge');
    dockerHealthBadge.className = `panel-badge ${healthyCount === 5 ? 'emerald' : 'gold'}`;
    dockerHealthBadge.textContent = `${healthyCount} / 5 HTTP 200`;

    const dockerGrid = $('docker-grid');
    dockerGrid.innerHTML = state.containers
      .map((c) => {
        const cardCls =
          c.httpStatus === 503
            ? 'docker-card degraded'
            : c.statusText === 'SCALING'
              ? 'docker-card scaling'
              : 'docker-card';
        const httpCls = c.httpStatus === 200 ? 'http-pill h200' : 'http-pill h503';
        return `
          <div class="${cardCls}">
            <div class="docker-head">
              <div>
                <div class="docker-image">${escapeHtml(c.image)}</div>
                <div class="docker-role">${escapeHtml(c.role)} &bull; ${c.replicas}x</div>
              </div>
              <span class="${httpCls}">HTTP ${c.httpStatus}</span>
            </div>
            <div class="docker-metrics">
              <span>CPU: <strong>${c.cpuPct}%</strong></span>
              <span>RAM: <strong>${c.ramMb} MB</strong></span>
              <span>P95: <strong>${c.p95LatencyMs} ms</strong></span>
              <span>State: <strong>${c.statusText}</strong></span>
            </div>
            <div class="docker-actions">
              <button class="btn-docker" data-docker-restart="${c.id}">Restart</button>
              <button class="btn-docker" data-docker-scale="${c.id}">Scale +1 (${c.replicas}x)</button>
            </div>
          </div>
        `;
      })
      .join('');

    dockerGrid.querySelectorAll<HTMLButtonElement>('[data-docker-restart]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cid = btn.dataset.dockerRestart;
        if (cid) {
          audioEngine.play('recovery');
          engine.restartContainer(cid);
        }
      });
    });

    dockerGrid.querySelectorAll<HTMLButtonElement>('[data-docker-scale]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cid = btn.dataset.dockerScale;
        if (cid) {
          audioEngine.play('recovery');
          engine.scaleContainer(cid);
        }
      });
    });

    // 5. Client Banking Sources & Context Engineering
    const sourcesEl = $('sources-grid');
    sourcesEl.innerHTML = state.sources
      .map((s) => {
        const cls =
          s.status === 'TIMEOUT_503'
            ? 'source-chip err'
            : s.status === 'FAILOVER_CACHE'
              ? 'source-chip failover'
              : 'source-chip';
        const badgeCls = s.status === 'TIMEOUT_503' ? 'rose' : s.status === 'FAILOVER_CACHE' ? 'gold' : 'emerald';
        return `
          <div class="${cls}">
            <div class="source-top">
              <span>${escapeHtml(s.name)}</span>
              <span class="panel-badge ${badgeCls}">${s.status}</span>
            </div>
            <div class="source-sub">${escapeHtml(s.protocol)} &bull; ${s.latencyMs} ms &bull; ${s.recordsFed} recs</div>
          </div>
        `;
      })
      .join('');

    const snap = state.contextSnapshot;
    const total = snap.totalTokens;
    $('token-breakdown-label').textContent =
      `Sys ${snap.systemPromptTokens} + Bank ${snap.bankingSourceTokens} + SAMA ${snap.samaVectorTokens} + Schema ${snap.schemaContractTokens} = ${total.toLocaleString()} tok`;

    const scale = Math.max(1, total);
    ($('tok-seg-sys') as HTMLElement).style.width = `${(snap.systemPromptTokens / scale) * 100}%`;
    ($('tok-seg-bank') as HTMLElement).style.width = `${(snap.bankingSourceTokens / scale) * 100}%`;
    ($('tok-seg-sama') as HTMLElement).style.width = `${(snap.samaVectorTokens / scale) * 100}%`;
    ($('tok-seg-schema') as HTMLElement).style.width = `${(snap.schemaContractTokens / scale) * 100}%`;

    $('prompt-inspector-code').textContent = snap.promptInspectorText;
    $('pydantic-json-code').textContent = snap.validatedJsonOutput;
    $('pii-vault-table').innerHTML = snap.piiRedactionExamples
      .map(
        (row) => `
        <div class="pii-row">
          <span>${escapeHtml(row.field)}</span>
          <span class="pii-raw">${escapeHtml(row.rawSample)}</span>
          <span class="pii-masked">${escapeHtml(row.maskedValue)}</span>
        </div>
      `
      )
      .join('');

    // 6. SAMA / AML Compliance Matrix & STR Payload
    const controls = evaluateComplianceMatrix(state.mode);
    $('compliance-matrix').innerHTML = controls
      .map((ctrl) => {
        const cls = ctrl.status === 'BREACH' ? 'comp-card breach' : ctrl.status === 'WARN' ? 'comp-card warn' : 'comp-card';
        const badge = ctrl.status === 'BREACH' ? 'rose' : ctrl.status === 'WARN' ? 'gold' : 'emerald';
        return `
          <div class="${cls}">
            <div class="comp-head">
              <span class="comp-name">${escapeHtml(ctrl.framework)}</span>
              <span class="panel-badge ${badge}">${ctrl.status}</span>
            </div>
            <div class="comp-detail">${escapeHtml(ctrl.code)} &bull; ${escapeHtml(ctrl.detail)}</div>
          </div>
        `;
      })
      .join('');

    const triggerType =
      state.mode === 'ATO'
        ? 'ACCOUNT_TAKEOVER'
        : state.mode === 'SMURFING'
          ? 'AML_STRUCTURING'
          : 'BASELINE_MONITOR';
    const strText = generateStrPayload({
      caseId: `SAFIU-${tx.id}`,
      triggerType,
      riskScore: tx.riskScore,
      amountSar: tx.amountSar,
      rail: tx.rail,
      maskedIban: tx.maskedIban,
      maskedNationalId: tx.maskedNationalId,
      shapTopDrivers: tx.shapFeatures.map(
        (f) => `${f.name}: ${f.rawValue} (SHAP ${f.shapContribution >= 0 ? '+' : ''}${f.shapContribution.toFixed(2)})`
      ),
    });
    $('str-payload-code').textContent = strText;
  }

  // Context Subtabs switching
  document.querySelectorAll<HTMLButtonElement>('[data-ctx-tab]').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      const target = tabBtn.dataset.ctxTab;
      if (!target) return;
      audioEngine.play('click');
      document.querySelectorAll('[data-ctx-tab]').forEach((b) => b.classList.remove('active'));
      tabBtn.classList.add('active');
      document.querySelectorAll('.ctx-pane').forEach((pane) => pane.classList.remove('active'));
      $(`ctx-pane-${target}`).classList.add('active');
    });
  });

  // Credit Risk Underwriting Calculator
  const crSegment = $('cr-segment') as HTMLSelectElement;
  const crIncome = $('cr-income') as HTMLInputElement;
  const crAmount = $('cr-amount') as HTMLInputElement;
  const crObligations = $('cr-obligations') as HTMLInputElement;
  const crTenor = $('cr-tenor') as HTMLInputElement;
  const crSimah = $('cr-simah') as HTMLInputElement;
  const crCollateral = $('cr-collateral') as HTMLInputElement;

  function updateCreditPanel(): void {
    const colVal = Number(crCollateral.value);
    $('cr-collateral-val').textContent = `${colVal}%`;

    const input: CreditInput = {
      applicantType: crSegment.value as CreditInput['applicantType'],
      monthlyIncomeSar: Number(crIncome.value) || 12000,
      requestedAmountSar: Number(crAmount.value) || 100000,
      existingObligationsSar: Number(crObligations.value) || 0,
      tenorMonths: Number(crTenor.value) || 36,
      simahScore: Number(crSimah.value) || 680,
      collateralCoveragePct: colVal,
    };

    const res = evaluateCreditRisk(input);
    const badge = $('credit-verdict-badge');
    badge.textContent = res.recommendation;
    badge.className = `panel-badge ${
      res.recommendation === 'Murabaha Tier-A Approved'
        ? 'emerald'
        : res.recommendation === 'Manual Underwriting'
          ? 'gold'
          : 'rose'
    }`;

    $('credit-kpi-grid').innerHTML = `
      <div class="kpi-tile"><div class="kpi-label">PD % (Default Prob)</div><div class="kpi-val">${res.pdPct}%</div></div>
      <div class="kpi-tile"><div class="kpi-label">LGD % (Loss Given)</div><div class="kpi-val">${res.lgdPct}%</div></div>
      <div class="kpi-tile"><div class="kpi-label">SAMA DTI %</div><div class="kpi-val">${res.dtiPct}%</div></div>
      <div class="kpi-tile"><div class="kpi-label">IFRS-9 ECL (SAR)</div><div class="kpi-val">SAR ${res.eclSar.toLocaleString()}</div></div>
      <div class="kpi-tile"><div class="kpi-label">Basel III RWA</div><div class="kpi-val">SAR ${res.rwaSar.toLocaleString()}</div></div>
      <div class="kpi-tile"><div class="kpi-label">Installment / Mo</div><div class="kpi-val">SAR ${res.monthlyInstallmentSar.toLocaleString()}</div></div>
    `;

    $('credit-rationale').innerHTML = `<strong>${escapeHtml(res.ifrsStage)}:</strong> ${escapeHtml(res.rationale)}`;
  }

  [crSegment, crIncome, crAmount, crObligations, crTenor, crSimah, crCollateral].forEach((el) => {
    el.addEventListener('input', updateCreditPanel);
    el.addEventListener('change', updateCreditPanel);
  });

  // Fault Injection Actions
  $('btn-inject-ato').addEventListener('click', () => {
    audioEngine.play('alert');
    engine.injectAccountTakeover();
  });

  $('btn-inject-smurfing').addEventListener('click', () => {
    audioEngine.play('alert');
    engine.injectAmlSmurfing();
  });

  $('btn-simulate-503').addEventListener('click', () => {
    audioEngine.play('recovery');
    engine.simulateCoreApiSpike503();
  });

  $('btn-run-credit').addEventListener('click', () => {
    audioEngine.play('click');
    crSegment.value = 'Corporate SME Murabaha';
    crIncome.value = '95000';
    crAmount.value = '850000';
    crObligations.value = '14000';
    crTenor.value = '36';
    crSimah.value = '735';
    crCollateral.value = '55';
    updateCreditPanel();
    engine.runCorporateCreditCase();
  });

  $('btn-reset-env').addEventListener('click', () => {
    audioEngine.play('recovery');
    crSegment.value = 'Retail Salary-Assigned';
    crIncome.value = '24000';
    crAmount.value = '180000';
    crObligations.value = '2200';
    crTenor.value = '48';
    crSimah.value = '745';
    crCollateral.value = '40';
    updateCreditPanel();
    engine.resetEnvironment();
  });

  // Generate & Copy STR Payload button
  $('btn-generate-str').addEventListener('click', () => {
    audioEngine.play('click');
    const code = $('str-payload-code').textContent ?? '';
    navigator.clipboard?.writeText(code).catch(() => {});
    const fb = $('str-copy-feedback');
    fb.textContent = 'STR JSON Copied to Clipboard!';
    setTimeout(() => {
      fb.textContent = '';
    }, 2400);
  });

  // Initial render
  updateCreditPanel();
  renderState(engine.getState());

  // Live 2.4s telemetry & banking rail heartbeat
  window.setInterval(() => {
    engine.tickTelemetry();
    if (engine.getState().mode === 'NORMAL') {
      audioEngine.play('tx');
    }
  }, 2400);
}

init();
