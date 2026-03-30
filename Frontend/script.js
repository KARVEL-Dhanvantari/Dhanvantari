// ── CONFIG ──
const API_URL = "http://localhost:8000"; // 🔁 Change this to your deployed backend URL when hosting

// ── RISK MAP ──
const RISK_MAP = {
  safe:       { label: 'Safe ✓',    cls: 'risk-safe',       stroke: '#16a34a' },
  suspicious: { label: 'Suspicious', cls: 'risk-suspicious', stroke: '#d97706' },
  high:       { label: 'High Risk',  cls: 'risk-high',       stroke: '#dc2626' },
};

// ── FILE UPLOAD ──
const fileInput  = document.getElementById('fileInput');
const previewWrap = document.getElementById('previewWrap');
const previewImg  = document.getElementById('previewImg');
const previewBadge = document.getElementById('previewBadge');
const analyzeBtn  = document.getElementById('analyzeBtn');
const dropzone    = document.getElementById('dropzone');

let selectedFile = null; // store the actual File object for upload

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  selectedFile = file;
  showPreview(file);
});

// drag & drop
dropzone.addEventListener('dragover',  (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', ()  => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault(); dropzone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    selectedFile = file;
    showPreview(file);
  }
});

function showPreview(file) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    previewImg.src = ev.target.result;
    previewWrap.classList.add('show');
    previewBadge.textContent = file.name.substring(0, 22) + (file.name.length > 22 ? '…' : '');
    analyzeBtn.style.display = 'flex';
    document.getElementById('resultSection').classList.remove('show');
  };
  reader.readAsDataURL(file);
}

// ── ANALYSIS ──
async function startAnalysis() {
  if (!selectedFile) return;

  analyzeBtn.disabled = true;
  const loadingState = document.getElementById('loadingState');
  loadingState.classList.add('show');
  document.getElementById('resultSection').classList.remove('show');

  // Animate loading steps
  const steps = ['step1', 'step2', 'step3', 'step4'];
  let i = 0;
  const interval = setInterval(() => {
    if (i > 0) {
      const prev = document.getElementById(steps[i - 1]);
      prev.classList.remove('active');
      prev.classList.add('done');
      prev.innerHTML = `<div class="step-dot"></div> ` + prev.innerText.trim() + ' ✓';
    }
    if (i < steps.length) {
      document.getElementById(steps[i]).classList.add('active');
      i++;
    } else {
      clearInterval(interval);
    }
  }, 500);

  try {
    // 🔗 Send image to FastAPI backend
    const formData = new FormData();
    formData.append("file", selectedFile);

    const response = await fetch(`${API_URL}/analyze/`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();

    clearInterval(interval);
    loadingState.classList.remove('show');
    steps.forEach(s => {
      const el = document.getElementById(s);
      el.classList.remove('active', 'done');
    });

    // 🔁 Map backend response → showResult() shape
    showResult(mapBackendResponse(result));

  } catch (err) {
    clearInterval(interval);
    loadingState.classList.remove('show');
    steps.forEach(s => {
      const el = document.getElementById(s);
      el.classList.remove('active', 'done');
    });

    // Show error in result card
    showResult({
      score: 0,
      risk: 'high',
      pkg: '—', bar: '—', exp: '—',
      reasons: [
        { icon: '🚨', text: `Could not reach the analysis server.` },
        { icon: 'ℹ️', text: `Make sure your backend is running at ${API_URL}` },
        { icon: 'ℹ️', text: err.message },
      ]
    });
  }

  analyzeBtn.disabled = false;
}

/**
 * Maps the FastAPI /analyze/ response to the shape showResult() expects.
 *
 * Backend returns:
 *   { medicine, status, confidence, issues, raw_text }
 *
 * status values: "Likely Genuine" | "Suspicious" | "Likely Fake" | "Not in Database" | "Error"
 */
function mapBackendResponse(data) {
  const score = data.confidence ?? 0;

  // Map backend status → risk key
  let risk = 'high';
  if (data.status === 'Likely Genuine') risk = 'safe';
  else if (data.status === 'Suspicious')   risk = 'suspicious';

  // Derive metric labels from score + issues
  const hasBarIssue = data.issues?.some(i => i.toLowerCase().includes('barcode'));
  const hasExpIssue = data.issues?.some(i => i.toLowerCase().includes('expiry'));

  const pkg = score + '%';
  const bar = hasBarIssue ? Math.max(score - 20, 10) + '%' : score + '%';
  const exp = hasExpIssue ? Math.max(score - 15, 10) + '%' : score + '%';

  // Build reasons list
  const reasons = [];

  if (data.medicine && data.medicine !== 'Unknown' && data.medicine !== 'Error') {
    reasons.push({ icon: '💊', text: `Medicine identified: ${data.medicine}` });
  }

  if (data.issues && data.issues.length > 0) {
    data.issues.forEach(issue => reasons.push({ icon: '⚠️', text: issue }));
  } else {
    reasons.push({ icon: '✅', text: 'No issues detected in analysis' });
  }

  if (risk === 'safe') {
    reasons.push({ icon: '✅', text: 'Text and barcode patterns match reference database' });
  }

  if (data.raw_text) {
    reasons.push({ icon: 'ℹ️', text: `OCR text preview: "${data.raw_text.substring(0, 80)}${data.raw_text.length > 80 ? '…' : ''}"` });
  }

  return { score, risk, pkg, bar, exp, reasons };
}

// ── RENDER RESULT ──
function showResult(data) {
  const resultSection = document.getElementById('resultSection');
  resultSection.classList.add('show');

  document.getElementById('scoreNum').textContent = data.score;

  const circumference = 439.8;
  const offset = circumference - (data.score / 100) * circumference;
  const ring = document.getElementById('ringFg');
  const info = RISK_MAP[data.risk];
  ring.style.stroke = info.stroke;
  setTimeout(() => { ring.style.strokeDashoffset = offset; }, 50);

  const badge = document.getElementById('riskBadge');
  badge.className = 'risk-badge ' + info.cls;
  document.getElementById('riskLabel').textContent = info.label;

  document.getElementById('metricPkg').textContent = data.pkg;
  document.getElementById('metricBar').textContent = data.bar;
  document.getElementById('metricExp').textContent = data.exp;

  const list = document.getElementById('reasonsList');
  list.innerHTML = data.reasons.map(r =>
    `<div class="reason-item"><span class="reason-icon">${r.icon}</span>${r.text}</div>`
  ).join('');

  const note = document.getElementById('safetyNote');
  note.style.display = data.risk !== 'safe' ? 'flex' : 'none';

  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── RESET ──
function resetApp() {
  selectedFile = null;
  document.getElementById('resultSection').classList.remove('show');
  previewWrap.classList.remove('show');
  analyzeBtn.style.display = 'none';
  fileInput.value = '';
  document.getElementById('upload-section').scrollIntoView({ behavior: 'smooth' });
}

// ── DOWNLOAD REPORT ──
function downloadReport() {
  const score   = document.getElementById('scoreNum').textContent;
  const risk    = document.getElementById('riskLabel').textContent;
  const reasons = Array.from(document.querySelectorAll('.reason-item')).map(r => r.innerText).join('\n');
  const blob = new Blob([
    `DHANVANTARI - MEDICINE AUTHENTICITY REPORT\n${'='.repeat(44)}\n\nSafety Score: ${score}/100\nRisk Level:   ${risk}\n\nPackaging: ${document.getElementById('metricPkg').textContent}\nBarcode:   ${document.getElementById('metricBar').textContent}\nExpiry:    ${document.getElementById('metricExp').textContent}\n\nANALYSIS DETAILS\n${'-'.repeat(40)}\n${reasons}\n\nNOTE: Always verify with a licensed pharmacist if risk is high.\n\nGenerated by Dhanvantari · ${new Date().toLocaleString()}`
  ], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dhanvantari-report.txt';
  a.click();
}

// ── SCROLL HELPERS ──
function scrollToUpload() {
  document.getElementById('upload-section').scrollIntoView({ behavior: 'smooth' });
}
function scrollToHow() {
  document.querySelector('.how-section').scrollIntoView({ behavior: 'smooth' });
}

// ── THEME TOGGLE ──
const html       = document.documentElement;
const themeBtn   = document.getElementById('themeToggle');
const toggleIcon = document.querySelector('.toggle-icon');

const saved = localStorage.getItem('dhanvantari-theme');
if (saved) { html.setAttribute('data-theme', saved); updateIcon(saved); }

themeBtn.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('dhanvantari-theme', next);
  updateIcon(next);
});

function updateIcon(theme) {
  toggleIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
}
