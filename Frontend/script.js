

// ── MOCK DATA ──
const SCENARIOS = [
  {
    score: 92,
    risk: 'safe',
    pkg: '94%', bar: '96%', exp: '91%',
    reasons: [
      { icon: '✅', text: 'Packaging typography matches official brand guidelines' },
      { icon: '✅', text: 'Barcode checksum verified successfully (GS1 standard)' },
      { icon: '✅', text: 'Expiry date format is valid and within shelf life' },
      { icon: '✅', text: 'Hologram pattern detected on seal area' },
      { icon: 'ℹ️', text: 'Slight label misalignment — within acceptable tolerance' },
    ]
  },
  {
    score: 61,
    risk: 'suspicious',
    pkg: '58%', bar: '72%', exp: '60%',
    reasons: [
      { icon: '⚠️', text: 'Font weight inconsistencies detected on batch number' },
      { icon: '⚠️', text: 'Barcode border slightly thicker than standard spec' },
      { icon: '✅', text: 'Expiry date format appears correct' },
      { icon: '⚠️', text: 'Color saturation differs from reference sample by 14%' },
      { icon: '⚠️', text: 'Missing secondary verification mark on blister pack' },
    ]
  },
  {
    score: 24,
    risk: 'high',
    pkg: '18%', bar: '30%', exp: '22%',
    reasons: [
      { icon: '🚨', text: 'Barcode fails GS1 checksum — likely counterfeit or tampered' },
      { icon: '🚨', text: 'Packaging color profile does not match any known batch' },
      { icon: '🚨', text: 'Expiry date formatting inconsistency detected' },
      { icon: '🚨', text: 'No hologram or anti-counterfeit marker found' },
      { icon: '🚨', text: 'Font used does not match manufacturer\'s official typeface' },
    ]
  }
];

const RISK_MAP = {
  safe: { label: 'Safe ✓', cls: 'risk-safe', stroke: '#16a34a' },
  suspicious: { label: 'Suspicious', cls: 'risk-suspicious', stroke: '#d97706' },
  high: { label: 'High Risk', cls: 'risk-high', stroke: '#dc2626' },
};

// ── FILE UPLOAD ──
const fileInput = document.getElementById('fileInput');
const previewWrap = document.getElementById('previewWrap');
const previewImg = document.getElementById('previewImg');
const previewBadge = document.getElementById('previewBadge');
const analyzeBtn = document.getElementById('analyzeBtn');
const dropzone = document.getElementById('dropzone');

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  showPreview(file);
});

// drag & drop
dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault(); dropzone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) showPreview(file);
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
function startAnalysis() {
  analyzeBtn.disabled = true;
  const loadingState = document.getElementById('loadingState');
  loadingState.classList.add('show');
  document.getElementById('resultSection').classList.remove('show');

  const steps = ['step1', 'step2', 'step3', 'step4'];
  let i = 0;
  const interval = setInterval(() => {
    if (i > 0) {
      const prev = document.getElementById(steps[i - 1]);
      prev.classList.remove('active'); prev.classList.add('done');
      prev.querySelector('.step-dot').textContent = '';
      prev.innerHTML = `<div class="step-dot"></div> ` + prev.innerText.trim() + ' ✓';
    }
    if (i < steps.length) {
      document.getElementById(steps[i]).classList.add('active');
      i++;
    } else {
      clearInterval(interval);
    }
  }, 500);

  setTimeout(() => {
    clearInterval(interval);
    loadingState.classList.remove('show');
    // Reset step styles
    steps.forEach(s => {
      const el = document.getElementById(s);
      el.classList.remove('active', 'done');
    });
    const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    showResult(scenario);
    analyzeBtn.disabled = false;
  }, 2400);
}

function showResult(data) {
  const resultSection = document.getElementById('resultSection');
  resultSection.classList.add('show');

  // Score
  document.getElementById('scoreNum').textContent = data.score;

  // Ring
  const circumference = 439.8;
  const offset = circumference - (data.score / 100) * circumference;
  const ring = document.getElementById('ringFg');
  const info = RISK_MAP[data.risk];
  ring.style.stroke = info.stroke;
  setTimeout(() => { ring.style.strokeDashoffset = offset; }, 50);

  // Risk badge
  const badge = document.getElementById('riskBadge');
  badge.className = 'risk-badge ' + info.cls;
  document.getElementById('riskLabel').textContent = info.label;

  // Metrics
  document.getElementById('metricPkg').textContent = data.pkg;
  document.getElementById('metricBar').textContent = data.bar;
  document.getElementById('metricExp').textContent = data.exp;

  // Reasons
  const list = document.getElementById('reasonsList');
  list.innerHTML = data.reasons.map(r =>
    `<div class="reason-item"><span class="reason-icon">${r.icon}</span>${r.text}</div>`
  ).join('');

  // Safety note
  const note = document.getElementById('safetyNote');
  note.style.display = data.risk !== 'safe' ? 'flex' : 'none';

  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetApp() {
  document.getElementById('resultSection').classList.remove('show');
  previewWrap.classList.remove('show');
  analyzeBtn.style.display = 'none';
  fileInput.value = '';
  document.getElementById('upload-section').scrollIntoView({ behavior: 'smooth' });
}

function downloadReport() {
  const score = document.getElementById('scoreNum').textContent;
  const risk = document.getElementById('riskLabel').textContent;
  const reasons = Array.from(document.querySelectorAll('.reason-item')).map(r => r.innerText).join('\n');
  const blob = new Blob([
    `DHANVANTARI - MEDICINE AUTHENTICITY REPORT\n${'='.repeat(44)}\n\nSafety Score: ${score}/100\nRisk Level:   ${risk}\n\nPackaging: ${document.getElementById('metricPkg').textContent}\nBarcode:   ${document.getElementById('metricBar').textContent}\nExpiry:    ${document.getElementById('metricExp').textContent}\n\nANALYSIS DETAILS\n${'-'.repeat(40)}\n${reasons}\n\nNOTE: Always verify with a licensed pharmacist if risk is high.\n\nGenerated by Dhanvantari · ${new Date().toLocaleString()}`
  ], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dhanvantari-report.txt';
  a.click();
}

function scrollToUpload() {
  document.getElementById('upload-section').scrollIntoView({ behavior: 'smooth' });
}

// ── THEME TOGGLE ──
const html = document.documentElement;
const themeBtn = document.getElementById('themeToggle');
const toggleIcon = document.querySelector('.toggle-icon');

// Load saved preference
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

