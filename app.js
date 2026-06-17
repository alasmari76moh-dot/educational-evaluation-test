const LS_KEY = 'exam_progress_v2';

const state = {
  currentIndex: 0,
  answers: {}, // question id -> option letter
  submitted: false,
};

const questions = EXAM_DATA.questions || [];
const totalQuestions = questions.length;

const domains = [
  { name: 'تعريفات التقويم وأنماطه', start: 1, end: 20 },
  { name: 'المعايير والأدوات والمستويات', start: 21, end: 30 },
  { name: 'التقويم المؤسسي والبرامجي والمفاهيم', start: 31, end: 50 },
  { name: 'الأهداف والجودة والمعايير والمؤشرات', start: 51, end: 70 },
  { name: 'مؤشرات الأداء والنماذج والتصميم و CIPP', start: 71, end: 100 },
];

function init() {
  loadProgress();
  bindEvents();
  render();
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (typeof saved.currentIndex === 'number') state.currentIndex = saved.currentIndex;
      if (saved.answers && typeof saved.answers === 'object') state.answers = saved.answers;
      if (saved.submitted) state.submitted = true;
    }
  } catch (e) {
    console.error('Failed to load progress', e);
  }
}

function saveProgress() {
  try {
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        currentIndex: state.currentIndex,
        answers: state.answers,
        submitted: state.submitted,
      })
    );
  } catch (e) {
    console.error('Failed to save progress', e);
  }
}

function clearProgress() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch (e) {
    console.error('Failed to clear progress', e);
  }
}

function bindEvents() {
  document.getElementById('btn-restart').addEventListener('click', restartExam);
}

function render() {
  updateProgress();
  if (state.submitted) {
    showResults();
  } else {
    showExam();
  }
}

function showExam() {
  document.getElementById('exam-screen').classList.remove('hidden');
  document.getElementById('results-screen').classList.add('hidden');
  document.getElementById('results-actions').classList.add('hidden');
  document.getElementById('progress-area').classList.remove('hidden');

  renderQuestion();
}

function renderQuestion() {
  const q = questions[state.currentIndex];
  const container = document.getElementById('question-card');
  const selected = state.answers[q.id] || '';
  const isLast = state.currentIndex === totalQuestions - 1;

  container.innerHTML = `
    <h2 class="question-text">${q.id}. ${escapeHtml(q.stem)}</h2>
    <div class="options-list">
      ${q.options
        .map(
          (opt) => `
        <label class="option-label" for="opt-${opt.label}">
          <input
            type="radio"
            name="answer"
            id="opt-${opt.label}"
            class="option-radio"
            value="${opt.label}"
            ${selected === opt.label ? 'checked' : ''}
          />
          <span class="option-letter">${escapeHtml(opt.label)}</span>
          <span class="option-text">${escapeHtml(opt.text)}</span>
        </label>
      `
        )
        .join('')}
    </div>
    <div class="nav-buttons">
      <button class="btn btn-secondary" id="btn-prev" type="button">السابق</button>
      <button class="btn btn-primary" id="btn-next" type="button">${isLast ? 'السؤال الأخير' : 'التالي'}</button>
      <button class="btn btn-danger" id="btn-submit" type="button">تسليم الاختبار</button>
    </div>
  `;

  container.querySelectorAll('input[name="answer"]').forEach((radio) => {
    radio.addEventListener('change', (e) => {
      state.answers[q.id] = e.target.value;
      saveProgress();
      updateProgress();
      updateNavButtons();
    });
  });

  document.getElementById('btn-prev').addEventListener('click', goPrev);
  document.getElementById('btn-next').addEventListener('click', goNext);
  document.getElementById('btn-submit').addEventListener('click', confirmSubmit);

  updateNavButtons();
}

function updateNavButtons() {
  const q = questions[state.currentIndex];
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  if (btnPrev) btnPrev.disabled = state.currentIndex === 0;
  if (btnNext) {
    btnNext.disabled = state.currentIndex === totalQuestions - 1;
  }
}

function updateProgress() {
  const answeredCount = Object.keys(state.answers).length;
  const percent = Math.round((answeredCount / totalQuestions) * 100);
  document.getElementById('progress-text').textContent = `تمت الإجابة على ${answeredCount} من ${totalQuestions}`;
  document.getElementById('progress-percent').textContent = `${percent}%`;
  document.getElementById('progress-fill').style.width = `${percent}%`;
}

function goPrev() {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    renderQuestion();
    saveProgress();
  }
}

function goNext() {
  const q = questions[state.currentIndex];

  if (!state.answers[q.id]) {
    showModal('تنبيه', 'يجب اختيار إجابة قبل الانتقال للسؤال التالي.', [
      { text: 'موافق', class: 'btn btn-primary', action: closeModal },
    ]);
    return;
  }

  if (state.currentIndex < totalQuestions - 1) {
    state.currentIndex++;
    renderQuestion();
    saveProgress();
  }
}

function findFirstUnanswered() {
  return questions.findIndex((q) => !state.answers[q.id]);
}

function confirmSubmit() {
  const answeredCount = Object.keys(state.answers).length;
  const unanswered = totalQuestions - answeredCount;

  if (unanswered > 0) {
    const first = findFirstUnanswered();
    if (first !== -1) {
      state.currentIndex = first;
      renderQuestion();
      saveProgress();
    }
    showModal(
      'تنبيه',
      'لم تكتمل جميع الإجابات. الرجاء إكمال الأسئلة المتبقية.',
      [{ text: 'موافق', class: 'btn btn-primary', action: closeModal }]
    );
  } else {
    submitExam();
  }
}

function submitExam() {
  closeModal();
  state.submitted = true;
  saveProgress();
  render();
}

function restartExam() {
  showModal(
    'إعادة الاختبار',
    'هل أنت متأكد من مسح جميع إجاباتك والبدء من جديد؟',
    [
      { text: 'إلغاء', class: 'btn btn-secondary', action: closeModal },
      {
        text: 'إعادة',
        class: 'btn btn-danger',
        action: () => {
          state.currentIndex = 0;
          state.answers = {};
          state.submitted = false;
          clearProgress();
          closeModal();
          render();
        },
      },
    ]
  );
}

function computeScore() {
  let correct = 0;
  questions.forEach((q) => {
    if (state.answers[q.id] === q.correct) correct++;
  });
  const percentage = Math.round((correct / totalQuestions) * 100);
  return { correct, percentage };
}

function getGrade(percentage) {
  if (percentage >= 90) return { label: 'ممتاز', class: 'grade-excellent' };
  if (percentage >= 80) return { label: 'جيد جدًا', class: 'grade-very-good' };
  if (percentage >= 70) return { label: 'جيد', class: 'grade-good' };
  if (percentage >= 60) return { label: 'مقبول', class: 'grade-pass' };
  return { label: 'يحتاج مراجعة مركزة', class: 'grade-fail' };
}

function showResults() {
  document.getElementById('exam-screen').classList.add('hidden');
  document.getElementById('results-screen').classList.remove('hidden');
  document.getElementById('results-actions').classList.remove('hidden');
  document.getElementById('progress-area').classList.add('hidden');

  const { correct, percentage } = computeScore();
  const grade = getGrade(percentage);

  document.getElementById('score-card').innerHTML = `
    <h2 class="score-title">نتيجة الاختبار</h2>
    <div class="score-value">${correct}/${totalQuestions}</div>
    <div class="score-detail">النسبة المئوية: ${percentage}%</div>
    <div class="score-detail">الدرجة: ${grade.label}</div>
    <span class="grade-badge ${grade.class}">${grade.label}</span>
  `;

  renderDomainTable();
  renderReview();
}

function renderDomainTable() {
  const rows = domains.map((d) => {
    const qs = questions.filter((q) => q.id >= d.start && q.id <= d.end);
    const total = qs.length;
    const correct = qs.filter((q) => state.answers[q.id] === q.correct).length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    return { ...d, total, correct, pct };
  });

  document.getElementById('domain-table').innerHTML = `
    <thead>
      <tr>
        <th>المجال</th>
        <th>عدد الأسئلة</th>
        <th>الإجابات الصحيحة</th>
        <th>النسبة المئوية</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r) => `
        <tr>
          <td>${escapeHtml(r.name)}</td>
          <td>${r.total}</td>
          <td>${r.correct}</td>
          <td>${r.pct}%</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  `;
}

function getOptionText(q, label) {
  const opt = q.options.find((o) => o.label === label);
  return opt ? opt.text : '';
}

function renderReview() {
  const list = document.getElementById('review-list');
  list.innerHTML = questions
    .map((q) => {
      const userAnswer = state.answers[q.id] || '';
      const isCorrect = userAnswer === q.correct;
      const statusText = isCorrect ? 'صحيحة' : 'خاطئة';
      const statusClass = isCorrect ? 'correct' : 'incorrect';
      const userText = userAnswer ? `${escapeHtml(userAnswer)} - ${escapeHtml(getOptionText(q, userAnswer))}` : 'لم يتم الإجابة';
      const correctText = `${escapeHtml(q.correct)} - ${escapeHtml(getOptionText(q, q.correct))}`;

      return `
        <div class="review-item ${statusClass}">
          <div class="review-header">
            <span class="review-question">${q.id}. ${escapeHtml(q.stem)}</span>
            <span class="review-status ${statusClass}">${statusText}</span>
          </div>
          <div class="review-answer-row">
            <div>
              <span class="review-answer-label">إجابتك:</span>
              <span class="review-answer-value ${isCorrect ? 'correct' : 'incorrect'}">${userText}</span>
            </div>
            <div>
              <span class="review-answer-label">الإجابة الصحيحة:</span>
              <span class="review-answer-value correct">${correctText}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join('');
}

function showModal(title, text, buttons) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true">
      <h3 class="modal-title">${escapeHtml(title)}</h3>
      <p class="modal-text">${escapeHtml(text)}</p>
      <div class="modal-actions">
        ${buttons
          .map(
            (b, i) =>
              `<button class="${b.class}" data-index="${i}" type="button">${escapeHtml(b.text)}</button>`
          )
          .join('')}
      </div>
    </div>
  `;

  overlay.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index, 10);
      buttons[index].action();
    });
  });

  document.body.appendChild(overlay);
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.remove();
}

function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
