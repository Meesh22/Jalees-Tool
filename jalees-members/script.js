/**
 * ============================================================================
 * جليس | مجلس الأعضاء — المنطق المشترك للمشروع المساند
 * الصفحة الرئيسية: شبكة ٧٠ عضواً مقسّمة بأعمدة من قواسم العدد (١٠ / ٧ / ٥ / ٢)،
 * مع تصفية بحروف الهجاء وبحث فوري وأرقام مقاعد ثابتة.
 * صفحة العضو: اقتباساته ومقالاته وملخصاته.
 * ============================================================================
 */
'use strict';

const MEMBERS = window.JALEES_MEMBERS || [];
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toAr = (value) => String(value).replace(/\d/g, (d) => AR_DIGITS[Number(d)]);
const AVATAR_COLORS = [
  '#1E3A2B',
  '#2A4F3B',
  '#8C532D',
  '#A3503B',
  '#B1834A',
  '#3B6A51',
];

// ترتيب حروف الهجاء العربي
const ARABIC_ORDER = [
  'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س', 'ش',
  'ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي',
];

// تصحيح الحرف الأول (الهمزات والألف المقصورة…)
function firstLetter(name) {
  let c = String(name || '').trim().charAt(0);
  if (!c) return '#';
  c = c.replace(/[أإآٱ]/, 'ا').replace(/ى/, 'ي').replace(/ة/, 'ه');
  return c;
}

function initials(name) {
  const n = String(name || '').trim();
  return n.charAt(0) || 'ج';
}

function contentCount(member) {
  return (
    (member.quotes ? member.quotes.length : 0) +
    (member.articles ? member.articles.length : 0) +
    (member.summaries ? member.summaries.length : 0)
  );
}

function getMember(id) {
  return MEMBERS.find((m) => String(m.id) === String(id)) || null;
}

/* ==========================================================================
   الصفحة الرئيسية: شبكة الأعضاء + الحروف + البحث
   ========================================================================== */
function renderDirectory() {
  const grid = $('#members-grid');
  if (!grid) return;

  // رقم مقعد ثابت لكل عضو (١..٧٠)
  MEMBERS.forEach((m, i) => {
    m._seat = i + 1;
  });

  const countEl = $('#member-count');
  const search = $('#member-search');
  const alphaBar = $('#alpha-bar');
  const empty = $('#empty-state');

  if (countEl) countEl.textContent = toAr(MEMBERS.length);

  let activeLetter = 'all';

  // بناء شريط الحروف من الحروف الموجودة فعلاً
  const present = new Set(MEMBERS.map((m) => firstLetter(m.name)));
  const letters = ARABIC_ORDER.filter((l) => present.has(l));
  present.forEach((l) => {
    if (l !== '#' && !letters.includes(l)) letters.push(l); // حروف غير قياسية
  });

  if (alphaBar) {
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'alpha-btn active';
    allBtn.dataset.letter = 'all';
    allBtn.textContent = 'الكل';
    alphaBar.appendChild(allBtn);

    letters.forEach((letter) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'alpha-btn';
      btn.dataset.letter = letter;
      btn.textContent = letter;
      btn.setAttribute('role', 'tab');
      alphaBar.appendChild(btn);
    });

    alphaBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.alpha-btn');
      if (!btn) return;
      activeLetter = btn.dataset.letter;
      $$('.alpha-btn', alphaBar).forEach((b) =>
        b.classList.toggle('active', b === btn)
      );
      apply();
    });
  }

  function apply() {
    const term = search ? search.value.trim() : '';
    const needle = normalizeName(term);

    const list = MEMBERS.filter((m) => {
      const byLetter =
        activeLetter === 'all' || firstLetter(m.name) === activeLetter;
      const bySearch = !needle || normalizeName(m.name).includes(needle);
      return byLetter && bySearch;
    });

    render(list);
  }

  function render(list) {
    grid.innerHTML = '';
    if (!list.length) {
      if (empty) empty.hidden = false;
      grid.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    grid.hidden = false;

    const frag = document.createDocumentFragment();
    list.forEach((member) => {
      const color = member.avatar || AVATAR_COLORS[(member._seat - 1) % AVATAR_COLORS.length];
      const total = contentCount(member);

      const card = document.createElement('a');
      card.className = 'member-card';
      card.href = `member.html?id=${encodeURIComponent(member.id)}`;
      card.setAttribute('aria-label', `فتح مجلس ${member.name}`);
      card.innerHTML = `
        <span class="card-seat">${toAr(member._seat)}</span>
        <div class="card-avatar" style="background:${color}">${initials(member.name)}</div>
        <div class="card-body">
          <span class="card-role">${esc(member.role)}</span>
          <h3 class="card-name">${esc(member.name)}</h3>
          <div class="card-stats">${toAr(total)} محتوى</div>
        </div>
        <span class="card-open">افتح المجلس<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M10 6l6 6-6 6"/></svg></span>
      `;
      frag.appendChild(card);
    });
    grid.appendChild(frag);
  }

  if (search) {
    search.addEventListener('input', apply);
  }

  render(MEMBERS);
}

/* ==========================================================================
   صفحة العضو
   ========================================================================== */
function renderMemberDetail() {
  const params = new URLSearchParams(location.search);
  const member = getMember(params.get('id'));

  if (!member) {
    const root = $('#member-root');
    if (root) {
      root.innerHTML = `
        <div class="empty-state" style="max-width:660px">
          <div class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3 3-3M5 19h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/></svg></div>
          <h3>العضو غير موجود</h3>
          <p>لم نعثر على هذا العضو. <a href="index.html">عد إلى مجلس الأعضاء</a>.</p>
        </div>`;
    }
    return;
  }

  document.title = `${member.name} | مجلس جليس`;

  $$('.member-name-fill').forEach((el) => {
    el.textContent = member.name;
  });
  $$('.member-avatar-fill').forEach((el) => {
    el.textContent = initials(member.name);
    el.style.background = member.avatar || AVATAR_COLORS[0];
  });
  $$('.member-role-fill').forEach((el) => {
    el.textContent = member.role;
  });
  $$('.member-since-fill').forEach((el) => {
    el.textContent = member.since;
  });

  renderSection('quotes', member.quotes || [], renderQuoteCard);
  renderSection('articles', member.articles || [], renderArticleCard);
  renderSection('summaries', member.summaries || [], renderSummaryCard);

  // حالة عدم وجود محتوى
  const area = $('.content-area');
  if (area) {
    const old = area.querySelector('.member-empty-note');
    if (old) old.remove();
    if (contentCount(member) === 0) {
      const note = document.createElement('div');
      note.className = 'empty-state member-empty-note';
      note.style.padding = '44px 10px 10px';
      note.innerHTML = `
        <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10 4.8 7.5 4 4 4v15c3.5 0 6 .8 8 2.5 2-1.7 4.5-2.5 8-2.5V4c-3.5 0-6 .8-8 2.5Z"/><path d="M12 6.5V21"/></svg>
        <h3>لا يوجد محتوى بعد</h3>
        <p>لم تُضَف اقتباسات أو مقالات أو ملخصات لهذا العضو حتى الآن.</p>`;
      area.appendChild(note);
    }
  }
}

function renderSection(key, items, renderer) {
  const container = $(`#${key}-list`);
  const sec = $(`#sec-${key}`);
  if (!container) return;

  const head = $(`#${key}-head`);
  if (head) {
    const countEl = head.querySelector('.count');
    if (countEl) countEl.textContent = toAr(items.length);
  }

  if (!items.length) {
    container.hidden = true;
    if (sec) sec.hidden = true;
    return;
  }

  container.hidden = false;
  if (sec) sec.hidden = false;
  container.innerHTML = items.map(renderer).join('');
}

function renderQuoteCard(q) {
  return `
    <article class="quote-card">
      <span class="quote-mark">”</span>
      <div class="quote-text">${esc(q.text)}</div>
      <div class="quote-source">
        <strong>${esc(q.book || 'بدون مصدر')}</strong>
        ${q.date ? `<span>· ${esc(q.date)}</span>` : ''}
      </div>
    </article>
  `;
}

function renderArticleCard(a) {
  return `
    <article class="article-card">
      <div class="article-number">#</div>
      <div class="article-body">
        <h4 class="article-title">${esc(a.title)}</h4>
        <p class="article-excerpt">${esc(a.excerpt || '')}</p>
        <div class="article-meta">
          <span>${esc(a.date || '')}</span>
        </div>
        <a class="read-more" href="${esc(a.link || '#')}" target="_blank" rel="noopener">
          اقرأ المزيد<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M10 6l6 6-6 6"/></svg>
        </a>
      </div>
    </article>
  `;
}

function renderSummaryCard(s) {
  return `
    <article class="summary-card">
      <div class="summary-title">${esc(s.book || 'ملخص')}</div>
      ${s.author ? `<div class="summary-author">${esc(s.author)}</div>` : ''}
      <p class="summary-text">${esc(s.text || '')}</p>
      ${s.date ? `<div class="summary-date">${esc(s.date)}</div>` : ''}
    </article>
  `;
}

/* ==========================================================================
   أدوات مساعدة
   ========================================================================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function normalizeName(value) {
  return String(value || '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function esc(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ==========================================================================
   التهيئة
   ========================================================================== */
function init() {
  if ($('#members-grid')) {
    renderDirectory();
  } else if ($('#member-root')) {
    renderMemberDetail();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
