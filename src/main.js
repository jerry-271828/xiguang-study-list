import './style.css';
import { PageFlip } from 'page-flip';

const START = new Date(2026, 6, 13);
const END = new Date(2026, 7, 29);
const STORE_KEY = 'xiguang-study-v1';
const DAY_MS = 86400000;
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物'];
const QUOTES = [
  '晨光落在书页上，今天也有新的远方。', '把心安放在笔尖，微小的坚持自会发亮。',
  '风从窗边经过，也替你翻开崭新一页。', '不必追赶时光，专注本身就是抵达。',
  '愿今日落下的每一笔，都通往澄明之境。', '慢一点也无妨，星辰从不催促花开。',
  '在安静的字里行间，与更好的自己相逢。', '夏日悠长，愿你的努力清澈而有回声。',
  '把难题折成纸舟，让思考带它渡岸。', '今日的风很轻，适合认真，也适合相信。',
  '沿着知识的细线走，终会看见辽阔图景。', '每一次凝神，都是在为未来积攒月光。',
  '愿你有沉静的勇气，也有向上的锋芒。', '书页沙沙，正是光阴赠你的温柔回信。',
  '将纷杂留在窗外，让一颗心落回此刻。', '一点一滴的明白，会汇成自己的星河。',
  '今天写下的答案，会在远方开出花来。', '愿你穿过困惑，仍保有清亮的眼睛。',
  '夏风有信，所有认真都不会被辜负。', '把今日过得扎实，明日便自有从容。',
  '纸上有山海，心中有不疾不徐的航程。', '让每一次思索，都成为通向自由的小径。',
  '愿你的专注如树荫，安静而深长。', '无需惊艳时光，只需温柔地坚持。',
  '一页一页走过，也是在丈量梦想的边界。', '愿今日思路清明，落笔皆有回响。',
  '把心事交给晚风，把此刻留给成长。', '那些看似缓慢的脚步，也在靠近山顶。',
  '灯影温柔，愿你与知识坦然相坐。', '在无人喝彩的时刻，也认真种下春天。',
  '愿每一个问号，最终都长成明亮的答案。', '夏色正浓，你的心也可向远处舒展。',
  '静下来的时间，会把你带到更深的地方。', '今天多懂一点，世界便多打开一扇窗。',
  '愿疲惫止于晚风，收获留在心中。', '不要小看一寸光阴，它能照亮很长的路。',
  '笔尖所至，皆是你与未来的轻声约定。', '愿你心有清泉，忙而不乱，行而不倦。',
  '把复杂拆成一步，路便在脚下生长。', '暮色会来，而你已为今天点亮一盏灯。',
  '愿今日的你，比昨日更靠近心中的岸。', '从容不是停步，是知道每一步都算数。',
  '知识如微雨，静静润亮思绪的枝叶。', '愿你守住节奏，也守住眼里的星光。',
  '日子轻轻向前，你也在悄悄变得丰盈。', '认真是一种柔韧的力量，日日皆可生长。',
  '愿这段盛夏，最终被你写成金色篇章。', '山高路远，今日的你已走过珍贵一程。'
];

const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const fromKey = key => { const [year, month, day] = key.split('-').map(Number); return new Date(year, month - 1, day); };
const addDays = (date, count) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
const inRange = date => date >= START && date <= END;
const allDates = Array.from({ length: Math.round((END - START) / DAY_MS) + 1 }, (_, index) => addDays(START, index));
const quoteFor = date => QUOTES[Math.max(0, Math.min(QUOTES.length - 1, Math.round((date - START) / DAY_MS)))];
const mondayOf = date => addDays(date, date.getDay() === 0 ? -6 : 1 - date.getDay());
const sundayOf = date => addDays(mondayOf(date), 6);
const weekId = date => dateKey(mondayOf(date));

function defaultData() {
  return {
    version: 1,
    days: {},
    likes: {},
    likeTimes: {},
    exemptions: {},
    spins: {},
    examBonusUsed: 0
  };
}

function loadData() {
  try { return { ...defaultData(), ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') }; }
  catch { return defaultData(); }
}

let data = loadData();
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => localStorage.setItem(STORE_KEY, JSON.stringify(data)), 80);
}

function workItems(date) {
  const oddDay = [1, 3, 5].includes(date.getDay());
  return [
    { text: oddDay ? '语文点线面' : '英语教材深研', subject: oddDay ? '语文' : '英语' },
    { text: `${oddDay ? '化学' : '数学'}错题/知识点收集整理`, subject: oddDay ? '化学' : '数学' },
    { text: `${oddDay ? '化学' : '数学'}错题深研`, subject: oddDay ? '化学' : '数学' },
    { text: '生物', subject: '生物', editable: 'suffix' },
    { text: '物理错题/知识点收集整理', subject: '物理' },
    { text: '', subject: null, editable: 'full' },
    { text: '生物课本', subject: '生物', editable: 'suffix', tail: '阅读研习' },
    { text: '物理错题深研', subject: '物理' }
  ];
}

function dayRecord(date) {
  const key = dateKey(date);
  if (!data.days[key]) data.days[key] = { items: {}, journal: '', saturday: [''] };
  return data.days[key];
}

function itemText(date, index) {
  const record = dayRecord(date);
  if (date.getDay() === 6) return record.saturday[index] || '';
  const template = workItems(date)[index];
  const extra = record.items[index]?.extra || '';
  if (template.editable === 'full') return extra;
  return [template.text, extra, template.tail].filter(Boolean).join('');
}

function itemCounted(date, index) {
  return itemText(date, index).trim().length > 0;
}

function itemStatus(date, index) {
  const exemption = data.exemptions[dateKey(date)]?.[index] || data.exemptions[dateKey(date)]?.__all;
  if (exemption) return 'exempt';
  return dayRecord(date).items[index]?.status || 'open';
}

function setItemStatus(date, index) {
  if (itemStatus(date, index) === 'exempt') return 'exempt';
  const record = dayRecord(date);
  const current = record.items[index]?.status || 'open';
  const next = current === 'open' || current === 'missed' ? 'done' : 'missed';
  record.items[index] = { ...record.items[index], status: next };
  save();
  return next;
}

function weekDates(date) {
  const monday = mondayOf(date);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function computeStats(dates) {
  const stats = { planChars: 0, journalChars: 0, total: 0, done: 0, missed: 0, open: 0, subjects: {}, byWeek: {} };
  SUBJECTS.forEach(subject => stats.subjects[subject] = 0);
  dates.filter(inRange).forEach(date => {
    const max = date.getDay() === 6 ? dayRecord(date).saturday.length : 8;
    for (let index = 0; index < max; index++) {
      const text = itemText(date, index).trim();
      stats.planChars += text.length;
      if (!text) continue;
      stats.total++;
      const status = itemStatus(date, index);
      if (status === 'done' || status === 'exempt') stats.done++;
      else if (status === 'missed') {
        stats.missed++;
        if (date.getDay() !== 6) {
          const subject = workItems(date)[index].subject;
          if (subject) stats.subjects[subject]++;
        }
      } else stats.open++;
    }
    stats.journalChars += (dayRecord(date).journal || '').trim().length;
  });
  return stats;
}

function nextWorkday(after) {
  let date = addDays(after, 1);
  while (date.getDay() === 0 || date.getDay() === 6 || !inRange(date)) {
    if (date > END) return null;
    date = addDays(date, 1);
  }
  return date;
}

function nextWeekday(after, weekday) {
  let date = addDays(after, 1);
  while (date.getDay() !== weekday) date = addDays(date, 1);
  return inRange(date) ? date : null;
}

window.__study = { data, allDates, computeStats };

const app = document.querySelector('#app');
let selectedDate = new Date(START);
let currentView = 'day';
let previousView = 'day';
let menuOpen = false;
let pageMotion = '';
let wheelResult = '';
let wheelResultType = '';
let wheelOffset = 0;
let wheelSpinning = false;
let statsReturnDate = new Date(START);

const icons = {
  menu: '<svg viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h14"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4a5.5 5.5 0 0 0 1-8.9Z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
  warn: '<svg viewBox="0 0 24 24"><path d="M12 8v5M12 17h.01"/></svg>',
  arrow: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>'
};

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const formatDate = date => `${String(date.getMonth() + 1).padStart(2, '0')} / ${String(date.getDate()).padStart(2, '0')}`;
const isLiked = date => Boolean(data.likes[dateKey(date)]);

function header(title = '') {
  return `<header class="topbar">
    <button class="icon-button menu-trigger" data-action="menu" aria-label="${menuOpen ? '收起' : '展开'}工具栏" aria-expanded="${menuOpen}" aria-controls="menu-sheet">${menuOpen ? icons.close : icons.menu}</button>
    ${title ? `<div class="view-title">${title}</div>` : '<div></div>'}
    <span class="topbar-spacer" aria-hidden="true"></span>
  </header>`;
}

function toolbar() {
  const onSundayStats = currentView === 'day' && selectedDate.getDay() === 0;
  return `<div id="menu-sheet" class="menu-sheet ${menuOpen ? 'is-open' : ''}" aria-hidden="${!menuOpen}">
    <div class="menu-head"><span>隙光</span><small>2026 · 盛夏清单</small><button data-action="close-menu" aria-label="收起工具栏">${icons.close}</button></div>
    <nav>
      <button data-nav="day"><i>日</i><span>日视图</span></button>
      <button data-nav="week"><i>周</i><span>周视图</span></button>
      <button data-nav="month"><i>月</i><span>月视图</span></button>
      <button data-nav="${onSundayStats ? 'return-day' : 'sunday'}"><i>${onSundayStats ? '返' : '统'}</i><span>${onSundayStats ? '返回日清单' : '本周统计'}</span></button>
      <button data-nav="total"><i>总</i><span>总统计</span></button>
      <button data-nav="favorites"><i>赠</i><span>赠语收藏</span></button>
      <button data-nav="wheel"><i>转</i><span>摸鱼转盘</span></button>
    </nav>
  </div><div class="menu-scrim ${menuOpen ? 'is-open' : ''}" data-action="close-menu"></div>`;
}

function quoteBlock(date) {
  return `<section class="quote-wrap">
    <button class="quote" data-action="copy-quote" aria-label="复制今日赠语">
      <span class="quote-mark">“</span><span>${quoteFor(date)}</span><small>${icons.copy} 轻触复制</small>
    </button>
    <button class="like ${isLiked(date) ? 'is-liked' : ''}" data-action="like" aria-label="收藏赠语" aria-pressed="${isLiked(date)}">${icons.heart}</button>
  </section>`;
}

function statusMeta(status) {
  return {
    label: status === 'done' || status === 'exempt' ? '已完成' : status === 'missed' ? '未完成' : '标记完成',
    icon: status === 'missed' ? icons.warn : icons.check,
    pressed: status === 'done' || status === 'exempt'
  };
}

function statusButton(date, index, large = false) {
  const status = itemStatus(date, index);
  const meta = statusMeta(status);
  return `<button class="status-button ${large ? 'large' : ''}" data-status-index="${index}" aria-label="${meta.label}" aria-pressed="${meta.pressed}">
    ${meta.icon}
  </button>`;
}

function weekdayItems(date) {
  const record = dayRecord(date);
  return workItems(date).map((item, index) => {
    const status = itemStatus(date, index);
    const extra = record.items[index]?.extra || '';
    let content;
    if (item.editable === 'full') {
      content = `<span class="line-input-shell full"><span class="line-input-rules" aria-hidden="true"></span><textarea class="line-input full" rows="1" data-extra-index="${index}" aria-label="第 ${index + 1} 项内容">${escapeHtml(extra)}</textarea></span>`;
    } else if (item.editable === 'suffix') {
      content = `<span>${item.text}</span><span class="line-input-shell"><span class="line-input-rules" aria-hidden="true"></span><textarea class="line-input" rows="1" data-extra-index="${index}" aria-label="补充第 ${index + 1} 项">${escapeHtml(extra)}</textarea></span>${item.tail ? `<span>${item.tail}</span>` : ''}`;
    } else content = `<span>${item.text}</span>`;
    return `<div class="task ${status}" data-task-index="${index}" style="--item-order:${index}">
      <span class="task-number">${index + 1}.</span>
      <div class="task-content">${content}</div>
      ${statusButton(date, index)}
    </div>`;
  }).join('');
}

function saturdayItems(date) {
  const record = dayRecord(date);
  return record.saturday.map((text, index) => {
    const status = itemStatus(date, index);
    return `<div class="task saturday-task ${status}" data-task-index="${index}" style="--item-order:${index}">
      <span class="task-number">${index + 1}.</span>
      <textarea rows="1" data-saturday-index="${index}" aria-label="第 ${index + 1} 项">${escapeHtml(text)}</textarea>
      ${statusButton(date, index, true)}
    </div>`;
  }).join('');
}

function dateHeading(date, subtitle) {
  return `<div class="date-heading">
    <button class="day-arrow prev" data-action="prev-day" aria-label="上一天" ${date <= START ? 'disabled' : ''}>${icons.arrow}</button>
    <div><strong>${formatDate(date)}</strong><span>星期${WEEKDAYS[date.getDay()]} · ${subtitle}</span></div>
    <button class="day-arrow" data-action="next-day" aria-label="下一天" ${date >= END ? 'disabled' : ''}>${icons.arrow}</button>
  </div>`;
}

function dayView() {
  const day = selectedDate.getDay();
  if (day === 0) return sundayView(selectedDate);
  const saturday = day === 6;
  return `<main class="page day-page ${pageMotion}">
    ${header()}
    ${quoteBlock(selectedDate)}
    ${dateHeading(selectedDate, saturday ? '自由书写' : '循序而行')}
    ${saturday ? `<h1 class="saturday-title">今日总目标</h1><section class="task-list saturday-list">${saturdayItems(selectedDate)}</section>` : `<section class="task-list">${weekdayItems(selectedDate)}</section>`}
    ${saturday ? '' : `<section class="journal"><label for="journal">日结 / 日记</label><textarea id="journal" placeholder="今日留下的光……">${escapeHtml(dayRecord(selectedDate).journal)}</textarea><span>自动保存</span></section>`}
    <button class="week-stat-jump" data-nav="sunday"><span>本周小结</span>${icons.arrow}</button>
  </main>`;
}

function statCards(stats) {
  return `<div class="stat-grid">
    <div><strong>${stats.planChars}</strong><span>计划字数</span></div>
    <div><strong>${stats.journalChars}</strong><span>日记字数</span></div>
    <div><strong>${stats.total}</strong><span>计划项</span></div>
    <div><strong>${stats.done}</strong><span>已完成</span></div>
    <div><strong>${stats.missed}</strong><span>未完成</span></div>
    <div><strong>${stats.open}</strong><span>进行中</span></div>
  </div>`;
}

function subjectBars(stats) {
  const max = Math.max(1, ...Object.values(stats.subjects));
  return `<div class="subject-bars">${SUBJECTS.map(subject => `<div><span>${subject}</span><i><b style="width:${stats.subjects[subject] / max * 100}%"></b></i><em>${stats.subjects[subject]}</em></div>`).join('')}</div>`;
}

function sundayView(date) {
  const dates = weekDates(date);
  const stats = computeStats(dates);
  const number = Math.floor((mondayOf(date) - START) / (7 * DAY_MS)) + 1;
  return `<main class="page stats-page ${pageMotion}">
    ${header('周统计')}
    ${quoteBlock(date)}
    <section class="stats-hero"><small>WEEK ${String(Math.max(1, number)).padStart(2, '0')}</small><h1>${formatDate(dates[0])} — ${formatDate(dates[6])}</h1><p>把一周的细小光亮，轻轻收拢。</p></section>
    ${statCards(stats)}
    <section class="stat-section"><div class="section-title"><h2>未完成分布</h2><span>按学科</span></div>${subjectBars(stats)}</section>
    <button class="week-stat-jump reverse" data-action="return-day">${icons.arrow}<span>返回日清单</span></button>
  </main>`;
}

function miniDay(date, index) {
  const stats = computeStats([date]);
  return `<button class="mini-day ${dateKey(date) === dateKey(selectedDate) ? 'selected' : ''} ${!inRange(date) ? 'muted' : ''}" data-date="${dateKey(date)}" style="--item-order:${index}" ${!inRange(date) ? 'disabled' : ''}>
    <span>${WEEKDAYS[date.getDay()]}</span><strong>${date.getDate()}</strong>
    <i><b style="width:${stats.total ? stats.done / stats.total * 100 : 0}%"></b></i>
    <small>${stats.done}/${stats.total}</small>
  </button>`;
}

function weekView() {
  const dates = weekDates(selectedDate);
  const stats = computeStats(dates);
  return `<main class="page overview-page">${header('周视图')}
    <section class="overview-intro"><small>${formatDate(dates[0])} — ${formatDate(dates[6])}</small><h1>这一周，慢慢走。</h1></section>
    <div class="week-strip">${dates.map(miniDay).join('')}</div>
    <div class="week-progress"><span>本周进度</span><strong>${stats.total ? Math.round(stats.done / stats.total * 100) : 0}%</strong><i><b style="width:${stats.total ? stats.done / stats.total * 100 : 0}%"></b></i></div>
    <button class="outline-action" data-nav="sunday">查看本周统计 ${icons.arrow}</button>
  </main>`;
}

function monthView() {
  const month = selectedDate.getMonth();
  const first = new Date(2026, month, 1);
  const gridStart = addDays(first, -(first.getDay() || 7) + 1);
  const dates = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
  return `<main class="page overview-page month-page">${header('月视图')}
    <section class="month-head"><button data-action="prev-month" ${month === 6 ? 'disabled' : ''}>${icons.arrow}</button><div><small>2026</small><h1>${month + 1} 月</h1></div><button data-action="next-month" ${month === 7 ? 'disabled' : ''}>${icons.arrow}</button></section>
    <div class="month-weekdays">${['一','二','三','四','五','六','日'].map(day => `<span>${day}</span>`).join('')}</div>
    <div class="month-grid">${dates.map((date, index) => {
      const stats = computeStats([date]);
      const available = inRange(date) && date.getMonth() === month;
      return `<button data-date="${dateKey(date)}" class="calendar-day ${available ? '' : 'muted'} ${dateKey(date) === dateKey(selectedDate) ? 'selected' : ''}" style="--item-order:${index % 7}" ${available ? '' : 'disabled'}><span>${date.getDate()}</span><i class="${stats.missed ? 'has-missed' : ''}">${stats.total ? Math.round(stats.done / stats.total * 100) : ''}</i></button>`;
    }).join('')}</div>
    <div class="month-legend"><span><i></i>完成度</span><span><i class="missed"></i>有未完成项</span></div>
  </main>`;
}

function winRecords() {
  return Object.entries(data.spins).flatMap(([date, spins]) => (spins.results || []).filter(result => result.type !== 'none').map(result => ({ date, ...result })));
}

function allStatsView() {
  const stats = computeStats(allDates);
  const weeks = [];
  for (let monday = new Date(START); monday <= END; monday = addDays(monday, 7)) {
    const weekStats = computeStats(weekDates(monday));
    weeks.push({ monday, ...weekStats });
  }
  const fullWeeks = weeks.filter(week => week.total > 0 && week.open === 0 && week.missed === 0).length;
  const wins = winRecords();
  const winKinds = {};
  wins.forEach(win => winKinds[win.label] = (winKinds[win.label] || 0) + 1);
  const luck = Math.min(100, Math.round((wins.reduce((sum, win) => sum + (win.rarity || 1), 0) / Math.max(1, Object.values(data.spins).reduce((sum, item) => sum + (item.results?.length || 0), 0))) * 9));
  const maxMissed = Math.max(1, ...weeks.map(week => week.missed));
  return `<main class="page stats-page total-page">${header('总统计')}
    <section class="stats-hero"><small>07.13 — 08.29</small><h1>盛夏总览</h1><p>时间没有远去，它在这里留下纹理。</p></section>
    ${statCards(stats)}
    <section class="highlight-stats"><div><span>满勤周</span><strong>${fullWeeks}<small> 周</small></strong></div><div><span>中奖次数</span><strong>${wins.length}<small> 次</small></strong></div><div><span>欧皇指数</span><strong>${luck}<small> / 100</small></strong></div></section>
    <section class="stat-section"><div class="section-title"><h2>未完成分布</h2><span>按周</span></div><div class="weekly-bars">${weeks.map((week, index) => `<div title="第${index + 1}周"><i style="height:${Math.max(3, week.missed / maxMissed * 100)}%"></i><span>W${index + 1}</span><em>${week.missed}</em></div>`).join('')}</div></section>
    <section class="stat-section"><div class="section-title"><h2>未完成分布</h2><span>按学科</span></div>${subjectBars(stats)}</section>
    <section class="stat-section"><div class="section-title"><h2>中奖项目</h2><span>${wins.length ? '幸运有迹可循' : '静候好运'}</span></div><div class="win-list">${Object.entries(winKinds).length ? Object.entries(winKinds).map(([label, count]) => `<div><span>${escapeHtml(label)}</span><strong>${count}</strong></div>`).join('') : '<p>还没有中奖记录</p>'}</div></section>
  </main>`;
}

function favoritesView() {
  const favorites = allDates.filter(date => isLiked(date)).sort((first, second) => data.likeTimes[dateKey(first)] - data.likeTimes[dateKey(second)]);
  return `<main class="page favorites-page">${header('赠语收藏')}
    <section class="favorites-head"><small>${favorites.length} 则</small><h1>被你留下的句子</h1></section>
    <div class="favorite-list">${favorites.length ? favorites.map((date, index) => `<article style="--item-order:${index}"><span>${String(index + 1).padStart(2, '0')}</span><button data-copy-date="${dateKey(date)}">${quoteFor(date)}</button><small>${formatDate(date)}</small><button class="remove-like" data-like-date="${dateKey(date)}" aria-label="取消收藏">${icons.heart}</button></article>`).join('') : '<div class="empty-state"><span>♡</span><p>喜欢的赠语，会在这里悄悄汇集。</p></div>'}</div>
  </main>`;
}

function todaySpinKey() {
  const now = new Date();
  return dateKey(now);
}

function spinRecord() {
  const key = todaySpinKey();
  if (!data.spins[key]) data.spins[key] = { regularUsed: false, bonusGranted: 0, bonusUsed: 0, results: [] };
  return data.spins[key];
}

function availableSpins() {
  const record = spinRecord();
  return (record.regularUsed ? 0 : 1) + record.bonusGranted - record.bonusUsed;
}

const WHEEL_TONES = {
  '未中': { tone: 'blank', dots: 0 },
  '免任务': { tone: 'sage', dots: 1 },
  '免周六': { tone: 'gold', dots: 2 },
  '免一天': { tone: 'gold', dots: 2 },
  '免一周': { tone: 'gold', dots: 3 }
};

function wheelFace(segments) {
  const px = (radius, angle) => (50 + radius * Math.sin(angle * Math.PI / 180)).toFixed(2);
  const py = (radius, angle) => (50 - radius * Math.cos(angle * Math.PI / 180)).toFixed(2);
  const OUTER = 45.5, INNER = 32.5, LABEL_R = 39.8, DOT_R = 34.6;
  const defs = [], wedges = [], labels = [], marks = [];
  segments.forEach((segment, index) => {
    const center = index * 45;
    const meta = WHEEL_TONES[segment] || WHEEL_TONES['未中'];
    const from = center - 22.5, to = center + 22.5;
    wedges.push(`<path class="wedge ${meta.tone}" d="M ${px(OUTER, from)} ${py(OUTER, from)} A ${OUTER} ${OUTER} 0 0 1 ${px(OUTER, to)} ${py(OUTER, to)} L ${px(INNER, to)} ${py(INNER, to)} A ${INNER} ${INNER} 0 0 0 ${px(INNER, from)} ${py(INNER, from)} Z"/>`);
    let startAngle = center - 17, endAngle = center + 17;
    const reverse = index >= 3 && index <= 5;
    if (reverse) [startAngle, endAngle] = [endAngle, startAngle];
    defs.push(`<path id="wheel-path-${index}" d="M ${px(LABEL_R, startAngle)} ${py(LABEL_R, startAngle)} A ${LABEL_R} ${LABEL_R} 0 0 ${reverse ? 0 : 1} ${px(LABEL_R, endAngle)} ${py(LABEL_R, endAngle)}"/>`);
    labels.push(`<text class="${meta.tone === 'blank' ? 'is-blank' : 'is-prize'}"><textPath href="#wheel-path-${index}" startOffset="50%">${segment}</textPath></text>`);
    for (let dot = 0; dot < meta.dots; dot++) {
      const angle = center + (dot - (meta.dots - 1) / 2) * 3.4;
      marks.push(`<circle class="rarity ${meta.tone}" cx="${px(DOT_R, angle)}" cy="${py(DOT_R, angle)}" r=".7"/>`);
    }
  });
  const separators = segments.map((_, index) => {
    const angle = index * 45 + 22.5;
    return `<line class="separator" x1="${px(INNER, angle)}" y1="${py(INNER, angle)}" x2="${px(OUTER, angle)}" y2="${py(OUTER, angle)}"/>`;
  }).join('');
  const ticks = Array.from({ length: 64 }, (_, index) => {
    const angle = index * 5.625;
    const major = index % 8 === 4;
    return `<line class="${major ? 'tick-major' : 'tick'}" x1="${px(major ? 46.4 : 47.5, angle)}" y1="${py(major ? 46.4 : 47.5, angle)}" x2="${px(48.8, angle)}" y2="${py(48.8, angle)}"/>`;
  }).join('');
  return `<svg class="wheel-face" viewBox="0 0 100 100" aria-hidden="true">
    <defs>${defs.join('')}</defs>
    <circle class="ring-rim" cx="50" cy="50" r="49"/>
    ${ticks}${wedges.join('')}
    <circle class="ring-line" cx="50" cy="50" r="${OUTER}"/>
    <circle class="ring-line" cx="50" cy="50" r="${INNER}"/>
    ${separators}
    <circle class="ring-dash" cx="50" cy="50" r="21"/>
    ${labels.join('')}${marks.join('')}
  </svg>`;
}

const probRow = (tone, dots, label, odds) => `<div class="prob-row"><i class="prob-marks ${tone}">${'<b></b>'.repeat(dots)}</i><span>${label}</span><u></u><em>${odds}</em></div>`;

function wheelView() {
  const baseSegments = ['未中', '免任务', '未中', '免任务', '未中', '免周六', '免一周', '免一天'];
  const segments = baseSegments.map((_, index) => baseSegments[(index + wheelOffset) % baseSegments.length]);
  const resultTone = !wheelResult ? '' : wheelResultType === 'none' ? 'is-miss' : 'is-win';
  return `<main class="page wheel-page">${header('摸鱼转盘')}
    <section class="wheel-head"><small>今日剩余 ${availableSpins()} 次</small><h1>让一点好运，替你松开时间。</h1></section>
    <div class="wheel-stage">
      <svg class="stage-marks" viewBox="0 0 100 100" aria-hidden="true"><path d="M4 1.6v4.8M1.6 4h4.8M96 1.6v4.8M93.6 4h4.8M4 93.6v4.8M1.6 96h4.8M96 93.6v4.8M93.6 96h4.8"/></svg>
      <div class="wheel-pointer" aria-hidden="true"><svg viewBox="0 0 44 62"><path class="pointer-tail" d="M17.5 27.5 22 59l4.5-31.5Z"/><circle class="pointer-ring" cx="22" cy="17" r="13"/><circle class="pointer-core" cx="22" cy="17" r="5"/><circle class="pointer-glint" cx="20.4" cy="15.4" r="1.2"/></svg></div>
      <div class="wheel">${wheelFace(segments)}</div>
      <div class="wheel-hub" aria-hidden="true"><b>隙光</b><small>GOOD LUCK</small></div>
    </div>
    <div class="wheel-result ${wheelResult ? 'show' : ''} ${resultTone}">${wheelResult
      ? `<span class="result-slip"><i class="result-seal">${wheelResultType === 'none' ? '空' : '中'}</i><span>${wheelResult}</span></span>`
      : '<span class="result-hint">每日普通机会 1 次 · 零点刷新</span>'}</div>
    <div class="wheel-actions">
      <button class="primary" data-action="spin" ${availableSpins() <= 0 ? 'disabled' : ''}>转动一次</button>
      <button data-action="exam-spin" ${data.examBonusUsed >= 3 ? 'disabled' : ''}>确认完成试卷 · ${data.examBonusUsed}/3</button>
    </div>
    <section class="probability">
      <div class="section-title"><h2>可能遇见</h2><span>转出的好运</span></div>
      <div class="probability-list">
        ${probRow('sage', 1, '免下一个工作日某项任务', '8%')}
        ${probRow('gold', 2, '免周六努力', '0.5%')}
        ${probRow('gold', 2, '免下个对应工作日全天', '0.5%')}
        ${probRow('gold', 3, '免下一周工作日', '0.001%')}
      </div>
    </section>
  </main>`;
}

function choosePrize() {
  const roll = Math.random() * 100;
  if (roll < 0.001) return { type: 'week', label: '免下一周工作日', rarity: 10 };
  if (roll < 0.501) {
    const weekday = 1 + Math.floor(Math.random() * 5);
    return { type: 'day', weekday, label: `免下一个星期${WEEKDAYS[weekday]}全天`, rarity: 7 };
  }
  if (roll < 1.001) return { type: 'saturday', label: '免周六努力', rarity: 5 };
  if (roll < 9.001) {
    const index = Math.floor(Math.random() * 8);
    return { type: 'task', index, label: `免下一个工作日第 ${index + 1} 项`, rarity: 2 };
  }
  return { type: 'none', label: '这次风轻轻掠过', rarity: 0 };
}

function setExempt(date, indices, reason) {
  if (!date || !inRange(date)) return false;
  const key = dateKey(date);
  if (!data.exemptions[key]) data.exemptions[key] = {};
  indices.forEach(index => data.exemptions[key][index] = reason);
  return true;
}

function setDayExempt(date, reason) {
  if (!date || !inRange(date)) return false;
  const key = dateKey(date);
  if (!data.exemptions[key]) data.exemptions[key] = {};
  data.exemptions[key].__all = reason;
  return true;
}

function applyPrize(prize) {
  const now = new Date();
  const base = now < START ? addDays(START, -1) : now;
  if (prize.type === 'task') {
    const target = nextWorkday(base);
    if (!target) return '假期将尽，这份好运先替你珍藏。';
    if (prize.index === 5 && !itemText(target, 5).trim()) {
      const leaveBlank = window.confirm('下一个工作日第 6 项尚未填写。确认保持留空吗？\n确认后，该项概率将平分给其余七项。');
      if (leaveBlank) {
        const alternatives = [0, 1, 2, 3, 4, 6, 7];
        prize.index = alternatives[Math.floor(Math.random() * alternatives.length)];
        prize.label = `免下一个工作日第 ${prize.index + 1} 项`;
      }
    }
    setExempt(target, [prize.index], prize.label);
    return `${formatDate(target)} · 第 ${prize.index + 1} 项已免除`;
  }
  if (prize.type === 'saturday') {
    const target = nextWeekday(base, 6);
    if (!target) return '假期将尽，这份好运先替你珍藏。';
    setDayExempt(target, prize.label);
    return `${formatDate(target)} · 今日总目标已免除`;
  }
  if (prize.type === 'day') {
    const target = nextWeekday(base, prize.weekday);
    if (!target) return '假期将尽，这份好运先替你珍藏。';
    if (!itemText(target, 5).trim()) window.confirm('目标日期第 6 项尚未填写，确认保持留空吗？');
    setExempt(target, Array.from({ length: 8 }, (_, index) => index), prize.label);
    return `${formatDate(target)} · 全天任务已免除`;
  }
  if (prize.type === 'week') {
    let monday = mondayOf(addDays(base, 7));
    if (monday <= base) monday = addDays(monday, 7);
    if (monday > END) return '假期将尽，这份好运先替你珍藏。';
    window.confirm('下一周工作日中的第 6 项若未填写，将保持留空。确认领取整周免除？');
    for (let offset = 0; offset < 5; offset++) setExempt(addDays(monday, offset), Array.from({ length: 8 }, (_, index) => index), prize.label);
    return `${formatDate(monday)} 起 · 下一周工作日已免除`;
  }
  return prize.label;
}

function performSpin(isBonus = false) {
  const record = spinRecord();
  if (availableSpins() <= 0 || wheelSpinning) return;
  if (isBonus) record.bonusUsed++;
  else if (!record.regularUsed) record.regularUsed = true;
  else record.bonusUsed++;
  const prize = choosePrize();
  const result = applyPrize(prize);
  record.results.push({ ...prize, result, at: Date.now() });
  save();
  const candidateIndices = prize.type === 'none' ? [0, 2, 4]
    : prize.type === 'task' ? [1, 3]
    : prize.type === 'saturday' ? [5]
    : prize.type === 'week' ? [6]
    : [7];
  const targetOffset = candidateIndices[Math.floor(Math.random() * candidateIndices.length)];
  const relativeIndex = (targetOffset - wheelOffset + 8) % 8;
  const wheel = document.querySelector('.wheel');
  const pointer = document.querySelector('.wheel-pointer');
  const spinButton = document.querySelector('[data-action="spin"]');
  const examButton = document.querySelector('[data-action="exam-spin"]');
  wheelSpinning = true;
  pointer?.classList.add('is-spinning');
  if (spinButton) spinButton.disabled = true;
  if (examButton) examButton.disabled = true;
  const finish = () => {
    wheelOffset = targetOffset;
    wheelResult = result;
    wheelResultType = prize.type;
    wheelSpinning = false;
    render();
  };
  if (!wheel?.animate) { finish(); return; }
  const finalDeg = -1440 - relativeIndex * 45;
  const animation = wheel.animate(
    [{ transform: 'rotate(0deg)' }, { transform: `rotate(${finalDeg}deg)` }],
    { duration: 3000, easing: 'cubic-bezier(.12,.68,.16,1)', fill: 'forwards' }
  );
  animation.finished
    .then(() => wheel.animate(
      [{ transform: `rotate(${finalDeg}deg)` }, { transform: `rotate(${finalDeg + 1.8}deg)` }, { transform: `rotate(${finalDeg}deg)` }],
      { duration: 300, easing: 'ease-in-out', fill: 'forwards' }
    ).finished)
    .catch(() => {})
    .then(finish);
}

function render() {
  const content = currentView === 'day' ? dayView()
    : currentView === 'week' ? weekView()
    : currentView === 'month' ? monthView()
    : currentView === 'total' ? allStatsView()
    : currentView === 'favorites' ? favoritesView()
    : currentView === 'wheel' ? wheelView()
    : dayView();
  app.innerHTML = `${content}${toolbar()}<div id="toast" class="toast"></div>`;
  pageMotion = '';
  autoGrowTextareas();
  markPageTurnDirty();
}

function finishPageAnimations() {
  const page = document.querySelector('.page');
  page?.getAnimations({ subtree: true }).forEach(animation => {
    if (animation.effect?.getTiming().iterations === Infinity) return;
    try { animation.finish(); } catch {}
  });
}

function syncTaskStatus(button, status) {
  const task = button.closest('.task');
  if (!task) return;
  const meta = statusMeta(status);
  task.classList.remove('open', 'done', 'missed', 'exempt');
  task.classList.add(status);
  button.setAttribute('aria-label', meta.label);
  button.setAttribute('aria-pressed', String(meta.pressed));
  button.innerHTML = meta.icon;
}

function setMenuVisibility(open) {
  menuOpen = open;
  const sheet = document.querySelector('.menu-sheet');
  const scrim = document.querySelector('.menu-scrim');
  const trigger = document.querySelector('.menu-trigger');
  sheet?.classList.toggle('is-open', open);
  sheet?.setAttribute('aria-hidden', String(!open));
  scrim?.classList.toggle('is-open', open);
  if (trigger) {
    trigger.innerHTML = open ? icons.close : icons.menu;
    trigger.setAttribute('aria-label', `${open ? '收起' : '展开'}工具栏`);
    trigger.setAttribute('aria-expanded', String(open));
  }
}

function toast(message) {
  const element = document.querySelector('#toast');
  if (!element) return;
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 1800);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('赠语已复制'); }
  catch { toast('长按文字即可复制'); }
}

function changeView(view) {
  activePageTurn?.finishImmediately(false);
  if (view === 'sunday') {
    previousView = currentView === 'day' ? 'day' : currentView;
    statsReturnDate = new Date(selectedDate);
    const sunday = sundayOf(selectedDate);
    selectedDate = sunday;
    currentView = 'day';
  } else if (view === 'return-day') {
    selectedDate = new Date(statsReturnDate);
    currentView = previousView;
  } else currentView = view;
  menuOpen = false;
  render();
}

let lineInputMeasure;
let lineLayoutMeasure;
let lineLayoutRange;
function measuredLineInputWidth(element) {
  if (!lineInputMeasure) {
    lineInputMeasure = document.createElement('span');
    lineInputMeasure.setAttribute('aria-hidden', 'true');
    lineInputMeasure.dataset.lineInputMeasure = 'width';
    Object.assign(lineInputMeasure.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      visibility: 'hidden',
      pointerEvents: 'none',
      whiteSpace: 'pre'
    });
    document.body.append(lineInputMeasure);
  }
  const style = getComputedStyle(element);
  lineInputMeasure.style.font = style.font;
  lineInputMeasure.style.letterSpacing = style.letterSpacing;
  lineInputMeasure.style.paddingLeft = style.paddingLeft;
  lineInputMeasure.style.paddingRight = style.paddingRight;
  lineInputMeasure.textContent = element.value || ' ';
  const width = Math.ceil(lineInputMeasure.getBoundingClientRect().width + 2);
  lineInputMeasure.textContent = '';
  return width;
}

function measuredVisualLineWidths(element, shell, minWidth) {
  if (!lineLayoutMeasure) {
    lineLayoutMeasure = document.createElement('div');
    lineLayoutMeasure.setAttribute('aria-hidden', 'true');
    lineLayoutMeasure.dataset.lineInputMeasure = 'layout';
    Object.assign(lineLayoutMeasure.style, {
      position: 'fixed',
      left: '-10000px',
      top: '0',
      visibility: 'hidden',
      pointerEvents: 'none',
      margin: '0',
      padding: '0',
      border: '0',
      whiteSpace: 'pre-wrap'
    });
    document.body.append(lineLayoutMeasure);
    lineLayoutRange = document.createRange();
  }
  const style = getComputedStyle(element);
  const paddingX = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
  const paddingY = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
  const lineHeight = Number.parseFloat(style.lineHeight) || 1;
  Object.assign(lineLayoutMeasure.style, {
    width: `${Math.max(1, element.clientWidth - paddingX)}px`,
    font: style.font,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    overflowWrap: style.overflowWrap,
    wordBreak: style.wordBreak,
    direction: style.direction,
    tabSize: style.tabSize
  });
  const value = element.value;
  lineLayoutMeasure.textContent = value ? `${value}${value.endsWith('\n') ? '\u200b' : ''}` : '\u200b';
  const measureRect = lineLayoutMeasure.getBoundingClientRect();
  lineLayoutRange.selectNodeContents(lineLayoutMeasure);
  const lineCount = Math.max(1, Math.round((element.scrollHeight - paddingY) / lineHeight));
  const widths = Array(lineCount).fill(0);
  [...lineLayoutRange.getClientRects()].forEach(rect => {
    const lineIndex = Math.max(0, Math.min(lineCount - 1, Math.round((rect.top - measureRect.top) / lineHeight)));
    widths[lineIndex] = Math.max(widths[lineIndex], rect.right - measureRect.left);
  });
  const measuredWidths = widths.map(width => Math.min(shell.clientWidth, Math.max(minWidth, Math.ceil(width + paddingX))));
  lineLayoutMeasure.textContent = '';
  lineLayoutRange.selectNodeContents(lineLayoutMeasure);
  return measuredWidths;
}

function syncLineInputRules(element, shell, minWidth) {
  const rules = shell.querySelector('.line-input-rules');
  if (!rules) return;
  const widths = measuredVisualLineWidths(element, shell, minWidth);
  while (rules.children.length < widths.length) {
    const rule = document.createElement('span');
    rule.className = 'line-input-rule';
    rules.append(rule);
  }
  while (rules.children.length > widths.length) rules.lastElementChild.remove();
  widths.forEach((width, index) => rules.children[index].style.width = `${width}px`);
}

function autoGrowLineInput(element) {
  const container = element.closest('.task-content');
  const shell = element.closest('.line-input-shell');
  if (!container || !shell) return;
  const children = [...container.children];
  const containerStyle = getComputedStyle(container);
  const shellStyle = getComputedStyle(shell);
  const gap = Number.parseFloat(containerStyle.columnGap) || 0;
  const occupiedWidth = children
    .filter(child => child !== shell)
    .reduce((total, child) => total + child.getBoundingClientRect().width, 0);
  const minWidth = Number.parseFloat(shellStyle.minWidth) || 42;
  const maxWidth = Math.max(minWidth, container.clientWidth - occupiedWidth - gap * Math.max(0, children.length - 1));
  const nextWidth = Math.min(maxWidth, Math.max(minWidth, measuredLineInputWidth(element)));
  shell.style.width = `${nextWidth}px`;
  element.style.height = 'auto';
  element.style.height = `${Math.ceil(element.scrollHeight)}px`;
  syncLineInputRules(element, shell, minWidth);
}

function autoGrowTextareas() {
  document.querySelectorAll('.line-input').forEach(autoGrowLineInput);
  document.querySelectorAll('.saturday-task textarea').forEach(element => {
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  });
}

let activePageTurn = null;
let pageTurnEngine = null;
let pageTurnStyles = '';
let pageTurnDirty = true;
let pageTurnPrewarmSerial = 0;
let pageTurnPrewarmTimer = 0;

function serializedPageStyles() {
  if (pageTurnStyles) return pageTurnStyles;
  pageTurnStyles = Array.from(document.styleSheets).map(sheet => {
    try { return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n'); }
    catch { return ''; }
  }).join('\n');
  return pageTurnStyles;
}

function clonePageSnapshot(source) {
  const snapshot = source.cloneNode(true);
  snapshot.classList.add('page-turn-snapshot');
  const sourceFields = source.querySelectorAll('input, textarea, select');
  const snapshotFields = snapshot.querySelectorAll('input, textarea, select');
  sourceFields.forEach((field, index) => {
    const copy = snapshotFields[index];
    if (!copy) return;
    copy.value = field.value;
    if ('checked' in field) copy.checked = field.checked;
  });
  return snapshot;
}

function pageSnapshotForDate(date) {
  const currentDate = selectedDate;
  const template = document.createElement('template');
  try {
    selectedDate = new Date(date);
    template.innerHTML = dayView().trim();
  } finally {
    selectedDate = currentDate;
  }
  const snapshot = template.content.firstElementChild;
  snapshot?.classList.add('page-turn-snapshot');
  return snapshot;
}

function preparePageTurnSnapshot(snapshot) {
  snapshot.querySelectorAll('.line-input').forEach(autoGrowLineInput);
  snapshot.querySelectorAll('.saturday-task textarea').forEach(element => {
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  });
}

function createPageTurnEngine(oldRect, viewportTop, turnHeight, startPage, pages, snapshots) {
  const host = document.createElement('div');
  host.className = 'page-turn-host';
  host.dataset.pageTurnModel = 'st-page-flip';
  host.setAttribute('aria-hidden', 'true');
  host.inert = true;
  Object.assign(host.style, {
    position: 'fixed',
    zIndex: '30',
    left: `${oldRect.left}px`,
    top: `${viewportTop}px`,
    width: `${oldRect.width}px`,
    height: `${turnHeight}px`,
    pointerEvents: 'none',
    overflow: 'hidden',
    visibility: 'hidden'
  });

  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `${serializedPageStyles()}
    :host { display:block; color:var(--ink); font-family:'Urbanist','PingFang SC',sans-serif; }
    .stf__parent { position:absolute !important; inset:0; display:block; box-sizing:border-box; transform:translateZ(0); touch-action:pan-y; }
    .stf__wrapper { position:absolute; inset:0; width:100%; height:100%; box-sizing:border-box; overflow:hidden; }
    .stf__block { position:absolute; width:100%; height:100%; box-sizing:border-box; perspective:2000px; }
    .stf__item { display:none; position:absolute; transform-style:preserve-3d; }
    .stf__outerShadow, .stf__innerShadow, .stf__hardShadow, .stf__hardInnerShadow { position:absolute; left:0; top:0; pointer-events:none; }
    .page-turn-page { overflow:hidden; background:var(--paper); }
    .page-turn-snapshot.page {
      position:absolute;
      top:var(--turn-content-top);
      left:0;
      width:100%;
      min-height:100vh;
      margin:0;
      border-color:rgba(34,38,34,.1);
      box-shadow:none;
      background:var(--paper);
    }
    .page-turn-snapshot.page::before { position:absolute; }
    .page-turn-snapshot *, .page-turn-snapshot *::before, .page-turn-snapshot *::after {
      animation:none !important;
      transition:none !important;
      caret-color:transparent !important;
    }
  `;
  const book = document.createElement('div');
  book.className = 'page-turn-book';
  shadow.append(style, book);
  document.body.append(host);

  const pageFlip = new PageFlip(book, {
    width: Math.round(oldRect.width),
    height: Math.round(turnHeight),
    size: 'fixed',
    startPage,
    drawShadow: true,
    flippingTime: 520,
    usePortrait: true,
    autoSize: false,
    maxShadowOpacity: .32,
    showCover: false,
    mobileScrollSupport: true,
    useMouseEvents: false,
    showPageCorners: false,
    disableFlipByClick: true
  });
  pageFlip.on('flip', event => {
    pageTurnEngine?.controller?.onFlip(Number(event.data));
  });
  pageFlip.on('changeState', event => {
    host.dataset.pageTurnState = String(event.data);
    if (event.data === 'read') pageTurnEngine?.controller?.onRead();
  });
  pageFlip.loadFromHTML(pages);
  snapshots.forEach(preparePageTurnSnapshot);
  pageFlip.update();
  return {
    host,
    book,
    pageFlip,
    width: oldRect.width,
    height: turnHeight,
    controller: null,
    currentIndex: startPage,
    dateKeys: [],
    preparedDate: '',
    contentOffsetY: 0
  };
}

function buildPageTurnPages(date, oldPage, contentOffsetY) {
  const dates = [];
  const previous = addDays(date, -1);
  const next = addDays(date, 1);
  if (inRange(previous)) dates.push(previous);
  const currentIndex = dates.length;
  dates.push(new Date(date));
  if (inRange(next)) dates.push(next);

  const snapshots = dates.map(item => dateKey(item) === dateKey(date)
    ? clonePageSnapshot(oldPage)
    : pageSnapshotForDate(item));
  snapshots.forEach(snapshot => snapshot.style.setProperty('--turn-content-top', `${contentOffsetY}px`));
  const pages = snapshots.map(snapshot => {
    const page = document.createElement('div');
    page.className = 'page-turn-page';
    page.dataset.density = 'soft';
    page.append(snapshot);
    return page;
  });
  return { dates, dateKeys: dates.map(dateKey), currentIndex, snapshots, pages };
}

function preparePageTurnEngine(date = selectedDate) {
  if (activePageTurn || currentView !== 'day') return null;
  const oldPage = document.querySelector('.page');
  if (!oldPage) return null;
  const oldRect = oldPage.getBoundingClientRect();
  const viewportTop = Math.max(0, oldRect.top);
  const viewportBottom = Math.min(innerHeight, oldRect.bottom);
  const turnHeight = Math.max(1, viewportBottom - viewportTop);
  const contentOffsetY = oldRect.top - viewportTop;
  const built = buildPageTurnPages(date, oldPage, contentOffsetY);

  if (!pageTurnEngine) {
    pageTurnEngine = createPageTurnEngine(
      oldRect,
      viewportTop,
      turnHeight,
      built.currentIndex,
      built.pages,
      built.snapshots
    );
  } else {
    const sameSize = Math.abs(pageTurnEngine.width - oldRect.width) <= 1 &&
      Math.abs(pageTurnEngine.height - turnHeight) <= 1;
    if (!sameSize) return null;
    pageTurnEngine.host.style.left = `${oldRect.left}px`;
    pageTurnEngine.host.style.top = `${viewportTop}px`;
    pageTurnEngine.pageFlip.getRender().finishAnimation();
    pageTurnEngine.pageFlip.updateFromHtml(built.pages);
    built.snapshots.forEach(preparePageTurnSnapshot);
    pageTurnEngine.pageFlip.turnToPage(built.currentIndex);
    pageTurnEngine.pageFlip.update();
  }

  pageTurnEngine.host.style.visibility = 'hidden';
  pageTurnEngine.currentIndex = built.currentIndex;
  pageTurnEngine.dateKeys = built.dateKeys;
  pageTurnEngine.preparedDate = dateKey(date);
  pageTurnEngine.contentOffsetY = contentOffsetY;
  pageTurnDirty = false;
  return pageTurnEngine;
}

function schedulePageTurnPrewarm(delay = 70) {
  const serial = ++pageTurnPrewarmSerial;
  clearTimeout(pageTurnPrewarmTimer);
  if (currentView !== 'day' || activePageTurn) return;
  pageTurnPrewarmTimer = window.setTimeout(() => {
    if (serial !== pageTurnPrewarmSerial || currentView !== 'day' || activePageTurn) return;
    const run = () => {
      if (serial === pageTurnPrewarmSerial && !activePageTurn) preparePageTurnEngine(selectedDate);
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 240 });
    else run();
  }, delay);
}

function markPageTurnDirty() {
  pageTurnDirty = true;
  schedulePageTurnPrewarm();
}

function getPreparedPageTurnEngine() {
  if (!pageTurnEngine || pageTurnDirty || pageTurnEngine.preparedDate !== dateKey(selectedDate)) {
    return preparePageTurnEngine(selectedDate);
  }
  return pageTurnEngine;
}

function createPageTurnController(engine, targetDate, direction, touchY = null) {
  const targetIndex = engine.currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= engine.dateKeys.length) return null;
  let progress = 0;
  let settled = false;
  let liveCommitted = false;
  let userTouchStarted = false;
  let lastPoint = null;
  let fallbackTimer = 0;
  let programmaticFrame = 0;
  const viewportTop = Number.parseFloat(engine.host.style.top) || 0;
  const startY = Math.max(2, Math.min(engine.height - 2, (touchY ?? viewportTop + engine.height * .35) - viewportTop));
  const startPoint = { x: direction > 0 ? engine.width - 2 : 2, y: startY };

  const commitLivePage = () => {
    if (liveCommitted) return;
    selectedDate = new Date(targetDate);
    pageMotion = '';
    render();
    finishPageAnimations();
    liveCommitted = true;
  };

  const cleanup = () => {
    if (settled) return;
    settled = true;
    clearTimeout(fallbackTimer);
    cancelAnimationFrame(programmaticFrame);
    engine.host.style.visibility = 'hidden';
    engine.controller = null;
    if (activePageTurn === controller) activePageTurn = null;
    schedulePageTurnPrewarm(40);
  };

  const setProgress = value => {
    progress = Math.max(0, Math.min(1, value));
    if (!userTouchStarted) {
      engine.pageFlip.startUserTouch(startPoint);
      engine.pageFlip.userMove({ x: direction > 0 ? engine.width - 10 : 10, y: startY }, true);
      userTouchStarted = true;
    }
    lastPoint = {
      x: direction > 0 ? engine.width * (1 - progress * 2) : engine.width * progress * 2,
      y: startY
    };
    engine.pageFlip.userMove(lastPoint, true);
    engine.host.dataset.pageTurnProgress = progress.toFixed(3);
  };

  const controller = {
    direction,
    targetDate: new Date(targetDate),
    host: engine.host,
    setProgress,
    get progress() { return progress; },
    commitLivePage,
    onFlip(index) { if (index === targetIndex) commitLivePage(); },
    onRead: cleanup,
    startProgrammatic() {
      fallbackTimer = window.setTimeout(() => { commitLivePage(); cleanup(); }, 1200);
      const startedAt = performance.now();
      const duration = 360;
      const tick = now => {
        if (settled) return;
        const elapsed = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - elapsed, 3);
        setProgress(eased * .82);
        if (elapsed < 1) programmaticFrame = requestAnimationFrame(tick);
        else engine.pageFlip.userStop(lastPoint, false);
      };
      programmaticFrame = requestAnimationFrame(tick);
    },
    settle(commit) {
      if (!userTouchStarted) return cleanup();
      setProgress(commit ? Math.max(progress, .54) : Math.min(progress, .42));
      engine.pageFlip.userStop(lastPoint, false);
      fallbackTimer = window.setTimeout(() => { if (commit) commitLivePage(); cleanup(); }, 1200);
    },
    finishImmediately(commit = progress >= .46) {
      engine.pageFlip.getRender().finishAnimation();
      engine.pageFlip.turnToPage(commit ? targetIndex : engine.currentIndex);
      if (commit) commitLivePage();
      cleanup();
    }
  };
  engine.host.dataset.pageTurn = direction > 0 ? 'next' : 'prev';
  engine.host.style.visibility = 'visible';
  engine.controller = controller;
  activePageTurn = controller;
  return controller;
}

function beginGesturePageTurn(direction, touchY) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
  const targetDate = addDays(selectedDate, direction);
  if (!inRange(targetDate)) return null;
  const engine = getPreparedPageTurnEngine();
  return engine ? createPageTurnController(engine, targetDate, direction, touchY) : null;
}

function switchDay(direction) {
  activePageTurn?.finishImmediately(true);
  const next = addDays(selectedDate, direction);
  if (!inRange(next)) return;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const oldPage = document.querySelector('.page');
  if (reducedMotion || !oldPage) {
    selectedDate = next;
    pageMotion = '';
    render();
    return;
  }
  const engine = getPreparedPageTurnEngine();
  const turn = engine ? createPageTurnController(engine, next, direction) : null;
  if (!turn) {
    selectedDate = next;
    render();
    finishPageAnimations();
    return;
  }
  turn?.commitLivePage();
  requestAnimationFrame(() => turn?.startProgrammatic());
}

app.addEventListener('click', event => {
  const actionElement = event.target.closest('[data-action]');
  const navElement = event.target.closest('[data-nav]');
  const dateElement = event.target.closest('[data-date]');
  const statusElement = event.target.closest('[data-status-index]');
  if (statusElement) {
    const status = setItemStatus(selectedDate, Number(statusElement.dataset.statusIndex));
    syncTaskStatus(statusElement, status);
    markPageTurnDirty();
    return;
  }
  if (dateElement && !dateElement.disabled) {
    selectedDate = fromKey(dateElement.dataset.date);
    currentView = 'day'; render(); return;
  }
  if (navElement) { changeView(navElement.dataset.nav); return; }
  if (!actionElement) {
    const copyFavorite = event.target.closest('[data-copy-date]');
    const removeLike = event.target.closest('[data-like-date]');
    if (copyFavorite) copyText(quoteFor(fromKey(copyFavorite.dataset.copyDate)));
    if (removeLike) {
      delete data.likes[removeLike.dataset.likeDate]; delete data.likeTimes[removeLike.dataset.likeDate]; save(); render();
    }
    return;
  }
  const action = actionElement.dataset.action;
  if (action === 'menu') setMenuVisibility(!menuOpen);
  if (action === 'close-menu') setMenuVisibility(false);
  if (action === 'prev-day') switchDay(-1);
  if (action === 'next-day') switchDay(1);
  if (action === 'copy-quote') copyText(quoteFor(selectedDate));
  if (action === 'like') {
    const key = dateKey(selectedDate);
    if (data.likes[key]) { delete data.likes[key]; delete data.likeTimes[key]; }
    else { data.likes[key] = true; data.likeTimes[key] = Date.now(); }
    const liked = Boolean(data.likes[key]);
    actionElement.classList.toggle('is-liked', liked);
    actionElement.setAttribute('aria-pressed', String(liked));
    save(); markPageTurnDirty();
  }
  if (action === 'return-day') { selectedDate = new Date(statsReturnDate); currentView = previousView; render(); }
  if (action === 'prev-month') { selectedDate = new Date(2026, 6, 13); render(); }
  if (action === 'next-month') { selectedDate = new Date(2026, 7, 1); render(); }
  if (action === 'spin') performSpin(false);
  if (action === 'exam-spin') {
    if (data.examBonusUsed >= 3) return;
    data.examBonusUsed++;
    spinRecord().bonusGranted++;
    save(); performSpin(true);
  }
});

app.addEventListener('input', event => {
  const extraIndex = event.target.dataset.extraIndex;
  const saturdayIndex = event.target.dataset.saturdayIndex;
  if (extraIndex !== undefined) {
    const record = dayRecord(selectedDate);
    record.items[extraIndex] = { ...record.items[extraIndex], extra: event.target.value };
    save();
    autoGrowLineInput(event.target);
    markPageTurnDirty();
  }
  if (saturdayIndex !== undefined) {
    const record = dayRecord(selectedDate);
    const index = Number(saturdayIndex);
    record.saturday[index] = event.target.value;
    if (index === record.saturday.length - 1 && event.target.value.includes('\n')) {
      const parts = event.target.value.split('\n');
      record.saturday[index] = parts.shift();
      record.saturday.push(parts.join('\n'));
      save(); render();
      requestAnimationFrame(() => document.querySelector(`[data-saturday-index="${index + 1}"]`)?.focus());
      return;
    }
    save(); autoGrowTextareas(); markPageTurnDirty();
  }
  if (event.target.id === 'journal') {
    dayRecord(selectedDate).journal = event.target.value;
    save(); markPageTurnDirty();
  }
});

let gesture = null;
const SWIPE_AXIS_THRESHOLD = 8;
function isInputTarget(target) { return Boolean(target.closest('input, textarea, [contenteditable]')); }
app.addEventListener('touchstart', event => {
  if (event.touches.length === 2) {
    const [first, second] = event.touches;
    gesture = { pinch: true, startDistance: Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY) };
    event.preventDefault();
  } else if (event.touches.length === 1 && !isInputTarget(event.target)) {
    activePageTurn?.finishImmediately(true);
    const touch = event.touches[0];
    gesture = {
      pinch: false,
      x: touch.clientX,
      y: touch.clientY,
      lastX: touch.clientX,
      lastAt: performance.now(),
      velocityX: 0,
      axis: null,
      turn: null
    };
  }
}, { passive: false });

app.addEventListener('touchmove', event => {
  if (gesture?.pinch && event.touches.length === 2) {
    const [first, second] = event.touches;
    gesture.lastDistance = Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY);
    event.preventDefault();
  } else if (gesture && !gesture.pinch && event.touches.length === 1) {
    const touch = event.touches[0];
    const deltaX = touch.clientX - gesture.x;
    const deltaY = touch.clientY - gesture.y;
    const now = performance.now();
    const elapsed = Math.max(1, now - gesture.lastAt);
    const instantVelocity = (touch.clientX - gesture.lastX) / elapsed;
    gesture.velocityX = gesture.velocityX * .58 + instantVelocity * .42;
    gesture.lastX = touch.clientX;
    gesture.lastAt = now;
    if (!gesture.axis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) >= SWIPE_AXIS_THRESHOLD) {
      gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
    }
    if (gesture.axis === 'horizontal') {
      event.preventDefault();
      if (currentView !== 'day') return;
      if (!gesture.turn && Math.abs(deltaX) > 12) {
        gesture.turn = beginGesturePageTurn(deltaX < 0 ? 1 : -1, gesture.y);
      }
      if (gesture.turn) {
        const travel = gesture.turn.direction > 0 ? -deltaX : deltaX;
        const turnDistance = Math.min(innerWidth, 780) * .86;
        gesture.turn.setProgress(travel / turnDistance);
      }
    }
  }
}, { passive: false });

app.addEventListener('touchend', event => {
  if (!gesture) return;
  if (gesture.pinch && event.touches.length < 2) {
    const ratio = (gesture.lastDistance || gesture.startDistance) / gesture.startDistance;
    if (ratio < .78) changeView(currentView === 'day' ? 'week' : currentView === 'week' ? 'month' : 'month');
    else if (ratio > 1.22) changeView(currentView === 'month' ? 'week' : currentView === 'week' ? 'day' : 'day');
  } else if (!gesture.pinch && gesture.turn) {
    const directionalVelocity = gesture.turn.direction > 0 ? -gesture.velocityX : gesture.velocityX;
    const commit = gesture.turn.progress >= .46 || (gesture.turn.progress >= .08 && directionalVelocity > .42);
    gesture.turn.settle(commit);
  } else if (!gesture.pinch && currentView === 'day') {
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - gesture.x;
    const deltaY = touch.clientY - gesture.y;
    if (Math.abs(deltaX) > 65 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) switchDay(deltaX < 0 ? 1 : -1);
  }
  gesture = null;
}, { passive: true });

app.addEventListener('touchcancel', () => {
  gesture?.turn?.settle(false);
  gesture = null;
});

window.addEventListener('keydown', event => {
  if (currentView !== 'day' || menuOpen || isInputTarget(event.target)) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  switchDay(event.key === 'ArrowRight' ? 1 : -1);
});

window.addEventListener('beforeunload', () => localStorage.setItem(STORE_KEY, JSON.stringify(data)));
window.addEventListener('resize', () => requestAnimationFrame(autoGrowTextareas));
document.fonts?.ready.then(autoGrowTextareas);
render();
