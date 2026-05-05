/* ─── STATE ─── */
const state = {
  currentChapter: localStorage.getItem('fb_chapter') || 'intro',
  completed: JSON.parse(localStorage.getItem('fb_completed') || '[]'),
  data: JSON.parse(localStorage.getItem('fb_data') || '{}')
};

function saveState() {
  localStorage.setItem('fb_completed', JSON.stringify(state.completed));
  localStorage.setItem('fb_data', JSON.stringify(state.data));
}

function saveField(key, value) {
  state.data[key] = value;
  saveState();
}

function getField(key, fallback) {
  return state.data[key] ?? fallback ?? '';
}

/* ─── NAVIGATION ─── */
function navigate(id) {
  document.querySelectorAll('.chapter').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
    state.currentChapter = id;
    localStorage.setItem('fb_chapter', id);
    window.scrollTo(0, 0);
  }
  const navEl = document.querySelector(`[data-chapter="${id}"]`);
  if (navEl) navEl.classList.add('active');
  closeSidebar();
  updateProgress();
}

function markComplete(id) {
  if (!state.completed.includes(id)) {
    state.completed.push(id);
    saveState();
  }
  updateProgress();
  const items = Array.from(document.querySelectorAll('.nav-item'));
  const current = items.findIndex(i => i.dataset.chapter === id);
  if (current < items.length - 1) {
    navigate(items[current + 1].dataset.chapter);
  }
}

function updateProgress() {
  const total = document.querySelectorAll('.nav-item').length;
  const done = state.completed.length;
  const pct = total > 0 ? (done / total * 100) : 0;
  const bar = document.querySelector('.progress-bar-fill');
  const text = document.querySelector('.progress-text');
  if (bar) bar.style.width = pct + '%';
  if (text) text.textContent = `${done} of ${total} completed · ${Math.round(pct)}%`;
  document.querySelectorAll('.nav-item').forEach(item => {
    if (state.completed.includes(item.dataset.chapter)) {
      item.classList.add('completed');
      item.querySelector('.nav-check').innerHTML = '✓';
    }
  });
}

/* ─── MOBILE ─── */
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  document.querySelector('.sidebar-overlay').classList.toggle('show');
}

function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay').classList.remove('show');
}

/* ─── CALCULATORS ─── */
function calcFreedomNumber() {
  const fields = ['housing','food','transport','utilities','insurance','debt','subs','personal','dependents'];
  let total = 0;
  fields.forEach(f => {
    const v = parseFloat(document.getElementById('fn_' + f)?.value) || 0;
    saveField('fn_' + f, v);
    total += v;
  });
  const survival = Math.round(total * 0.85);
  const comfort = total;
  const freedom = Math.round(total * 1.15);
  document.getElementById('fn_result_survival').textContent = '$' + survival.toLocaleString();
  document.getElementById('fn_result_comfort').textContent = '$' + comfort.toLocaleString();
  document.getElementById('fn_result_freedom').textContent = '$' + freedom.toLocaleString();
  document.getElementById('fn_result_main').textContent = '$' + freedom.toLocaleString();

  const fearTax = parseFloat(document.getElementById('fn_feartax')?.value) || 0;
  saveField('fn_feartax', fearTax);
  const adjusted = freedom - fearTax;
  document.getElementById('fn_adjusted').textContent = '$' + adjusted.toLocaleString();

  const sideIncome = parseFloat(document.getElementById('fn_sideincome')?.value) || 0;
  saveField('fn_sideincome', sideIncome);
  const gap = Math.max(0, adjusted - sideIncome);
  document.getElementById('fn_gap').textContent = '$' + gap.toLocaleString();
  const daily = Math.round(gap / 30);
  document.getElementById('fn_daily').textContent = '$' + daily + '/day';

  saveField('freedomNumber', freedom);
  saveField('gap', gap);
}

function calcBuffer() {
  const fn = parseFloat(getField('freedomNumber', 0)) || parseFloat(document.getElementById('buf_fn')?.value) || 0;
  const months = parseInt(document.getElementById('buf_months')?.value) || 6;
  const current = parseFloat(document.getElementById('buf_current')?.value) || 0;
  const monthly = parseFloat(document.getElementById('buf_monthly')?.value) || 0;

  saveField('buf_fn', fn);
  saveField('buf_months', months);
  saveField('buf_current', current);
  saveField('buf_monthly', monthly);

  const target = fn * months;
  const remaining = Math.max(0, target - current);
  const monthsNeeded = monthly > 0 ? Math.ceil(remaining / monthly) : Infinity;

  document.getElementById('buf_target').textContent = '$' + target.toLocaleString();
  document.getElementById('buf_remaining').textContent = '$' + remaining.toLocaleString();
  document.getElementById('buf_timeline').textContent = monthsNeeded === Infinity ? '—' : monthsNeeded + ' months';

  const date = new Date();
  date.setMonth(date.getMonth() + monthsNeeded);
  document.getElementById('buf_date').textContent = monthsNeeded === Infinity ? 'Set a savings rate' : date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function calcCompensation() {
  const items = document.querySelectorAll('.comp-row');
  let totalLost = 0;
  items.forEach((row, i) => {
    const gross = parseFloat(row.querySelector('.comp-gross')?.value) || 0;
    const taxRate = parseFloat(row.querySelector('.comp-tax')?.value) || 30;
    const net = Math.round(gross * (1 - taxRate / 100));
    row.querySelector('.comp-net').textContent = '$' + net.toLocaleString();
    totalLost += net;
  });
  document.getElementById('comp_total').textContent = '$' + totalLost.toLocaleString();

  const bizGrowth = parseFloat(document.getElementById('comp_growth')?.value) || 0;
  const waitMonths = parseInt(document.getElementById('comp_wait')?.value) || 6;
  const oppCost = bizGrowth * waitMonths;
  document.getElementById('comp_opp').textContent = '$' + oppCost.toLocaleString();

  const net = totalLost - oppCost;
  document.getElementById('comp_verdict').textContent = net > 0
    ? `Waiting saves you $${net.toLocaleString()} net. Consider staying.`
    : `Leaving now gains you $${Math.abs(net).toLocaleString()} in growth. Consider going.`;
  document.getElementById('comp_verdict').className = 'result-note ' + (net > 0 ? '' : 'positive');
}

function calcWealth() {
  const fn = parseFloat(document.getElementById('wealth_fn')?.value) || parseFloat(getField('freedomNumber', 0)) || 0;
  const wealth = Math.round(fn * 1.45);
  document.getElementById('wealth_result').textContent = '$' + wealth.toLocaleString();
  document.getElementById('wealth_savings').textContent = '$' + Math.round(fn * 0.2).toLocaleString();
  document.getElementById('wealth_invest').textContent = '$' + Math.round(fn * 0.1).toLocaleString();
  document.getElementById('wealth_lifestyle').textContent = '$' + Math.round(fn * 0.1).toLocaleString();
}

/* ─── VALIDATION SCORECARD ─── */
function initScorecard() {
  document.querySelectorAll('.score-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const row = this.closest('.score-row');
      const rowIndex = Array.from(document.querySelectorAll('.score-row')).indexOf(row);
      row.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
      saveField('score_' + rowIndex, this.dataset.value);
      updateScore();
    });
  });
}

function updateScore() {
  let total = 0;
  let answered = 0;
  document.querySelectorAll('.score-row').forEach(row => {
    const sel = row.querySelector('.score-btn.selected');
    if (sel) {
      total += parseInt(sel.dataset.value);
      answered++;
    }
  });
  document.getElementById('score_total').textContent = total;
  const max = document.querySelectorAll('.score-row').length * 5;
  const el = document.getElementById('score_verdict');
  if (answered === 0) {
    el.textContent = 'Rate each question';
    el.className = 'score-verdict';
  } else if (total >= 20) {
    el.textContent = '✓ BUILD IT — Strong idea';
    el.className = 'score-verdict green';
  } else if (total >= 12) {
    el.textContent = '⟳ REFINE — Good potential, needs work';
    el.className = 'score-verdict gold';
  } else {
    el.textContent = '✗ PIVOT — Find a stronger idea';
    el.className = 'score-verdict red';
  }
}

/* ─── SPRINT TRACKER ─── */
function toggleSprint(day) {
  const card = document.querySelector(`.sprint-card[data-day="${day}"]`);
  card.classList.toggle('done');
  const key = 'sprint_day' + day;
  saveField(key, card.classList.contains('done'));
}

/* ─── INIT ─── */
document.addEventListener('DOMContentLoaded', () => {
  // Nav clicks
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigate(item.dataset.chapter));
  });

  // Restore saved input values
  document.querySelectorAll('[data-save]').forEach(input => {
    const key = input.dataset.save;
    const saved = getField(key);
    if (saved !== '') input.value = saved;
    input.addEventListener('input', () => saveField(key, input.value));
  });

  // Checkbox persistence
  document.querySelectorAll('.checklist-item input[type="checkbox"], .exercise-box input[type="checkbox"], .tool-body input[type="checkbox"]').forEach((cb, i) => {
    const key = 'cb_' + (cb.id || i);
    if (getField(key)) cb.checked = true;
    cb.addEventListener('change', () => saveField(key, cb.checked));
  });

  // Init & restore scorecard
  initScorecard();
  document.querySelectorAll('.score-row').forEach((row, i) => {
    const saved = getField('score_' + i);
    if (saved) {
      const btn = row.querySelector(`.score-btn[data-value="${saved}"]`);
      if (btn) btn.classList.add('selected');
    }
  });
  updateScore();

  // Update progress
  updateProgress();

  // Navigate to saved chapter
  navigate(state.currentChapter || 'intro');

  // Restore sprint cards
  for (let d = 1; d <= 7; d++) {
    if (getField('sprint_day' + d)) {
      const card = document.querySelector(`.sprint-card[data-day="${d}"]`);
      if (card) card.classList.add('done');
    }
  }

  // Recalculate all calculators if they have saved data
  if (getField('fn_housing') || getField('fn_food')) calcFreedomNumber();
  if (getField('buf_fn') || getField('buf_current')) calcBuffer();
  if (getField('wealth_fn')) calcWealth();
});

/* ─── RESET ─── */
function resetProgress() {
  if (confirm('Reset all progress and saved data? This cannot be undone.')) {
    localStorage.removeItem('fb_completed');
    localStorage.removeItem('fb_data');
    location.reload();
  }
}
