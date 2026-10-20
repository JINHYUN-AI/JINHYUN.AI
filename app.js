/* JINHYUN.AI v2 웹앱
 * - 새 풀스크린 스냅 덱(홈페이지) + 구글 시트 실시간 연동
 * - 문의·AI 비서·관리자 기능은 기존 코드를 그대로 아래에 이어 붙임(레거시 구간)
 */
var currentLang = (function () { try { return localStorage.getItem('site_lang') || 'kr'; } catch (e) { return 'kr'; } })();

(function () {
  'use strict';
  var LITE = document.documentElement.classList.contains('lite');
  var AUTO = !LITE && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function api(fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    return new Promise(function (ok, fail) { var r = google.script.run.withSuccessHandler(ok).withFailureHandler(fail); r[fn].apply(r, args); });
  }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pkey(p) { var m = /(\d{4})\.(\d{2})/.exec(p || ''); return m ? (+m[1]) * 100 + (+m[2]) : 0; }
  function isKr() { return currentLang !== 'en'; }

  var deck = $('#deck'), frame = $('#frame'), slides = $$('.slide');
  var state = { systems: [], profile: { items: [], copyright: [] }, metrics: {}, week: [], banners: [], promo: '' };

  /* ---------- 언어 ---------- */
  var EN = {
    nav_home: 'Home', nav_sol: 'Solutions', nav_prof: 'Profile & Tech', nav_hum: 'Humanism', btn_inquiry: 'Contact',
    prof_h: '25 years in the field,<br>proven record<span class="lime">.</span>', st_prob: 'Problem', st_sol: 'Solution', st_res: 'Result', st_sys: 'Systems', st_prof: 'Profile', st_tech: 'Tech',
    sys_h: 'Systems I developed<span class="lime">.</span>', tech_h: 'Running on Google<br>tech stack<span class="lime">.</span>',
    greet: "Hello, I'm <b>Jang Jin-hyun</b>, the coding secretary general.", greet2: 'See how much changes when a 25-year social welfare practitioner writes the code personally, shown through office automation and AI agents.',
    hero_tag: 'SOCIAL WELFARE × AI · SECRETARY GENERAL, LIGHTHOUSE HOUSE',
    hero_h: '<span class="ko">Weekend code</span><br><span class="ko">rewrites welfare\'s</span><br><span class="ko">Monday<em>.</em></span>',
    hero_sub: 'AI-powered admin automation, built by a practitioner who knows the field. We give the time spent on paperwork back to people.',
    hero_cta1: 'View portfolio', hero_cta2: 'Ask the AI assistant', today: "Today's line", tomorrow: "Tomorrow's line", rec: 'Monday 09:00',
    prob_h: 'Buried in<br>paperwork.', prob_p: 'Counseling, schedules, reports, all by hand. The time to sit down with the people who matter disappears.',
    prob_chart: 'WEEKLY TASK LOAD · CONCEPT', b1: 'Docs & schedules', b2: 'Case notes', b3: 'Reports', b4: 'Minutes', b5: 'Time with people',
    illu: 'ILLUSTRATIVE · concept only, not real figures',
    sol_h: 'Built in the field,<br>automated by AI<span class="lime">.</span>', sol_p: 'I turned the daily frustrations of running a facility straight into code. Repetitive work now runs by itself on Google Workspace.',
    log1: 'Colloquial field notes converted into structured daily records', log2: 'Results of 37 indicators filled into forms automatically', log3: 'Stays stable even beyond traffic limits', sample: 'sample',
    res_h: 'Time returned<br>to people<span class="lime">.</span>', res_p: 'Conversation moves into the space paperwork leaves. Before any number changes, the faces in the field do.',
    concept: 'The chart below is a concept diagram', cross: 'Crossover · the moment time comes back', g_hi1: 'Counseling', g_lo1: 'Admin time', before: 'Before', after: 'After',
    q_home: 'Home', q_phil: 'Story', q_sol: 'Solutions', q_prof: 'Profile', q_tech: 'Tech', q_contact: 'Contact', q_ai: 'AI Chat', sol_sub: '4/4 · Systems I built · click a card for details', prof_label: 'Profile & expertise',
    tech_sub: '2/2 · Reliable on Google Cloud', tech_note: 'Bar length = number of tools per layer'
  };
  $$('[data-t]').forEach(function (el) { el.dataset.kr = el.innerHTML; });
  function applyStatic() {
    $$('[data-t]').forEach(function (el) {
      var k = el.dataset.t;
      if (isKr()) el.innerHTML = el.dataset.kr; else if (EN[k] != null) el.innerHTML = EN[k];
    });
    document.documentElement.lang = isKr() ? 'ko' : 'en';
    var LG = { kr: { contact_title: '문의하기', form_subject: '제목', form_contact: '기관전화번호 / 연락처', form_message: '문의내용', form_submit: '📨 문의하기 전송', modal_func: '주요 기능', modal_effect: '기대 효과', modal_detail: '상세 설명', demo_btn: '시연해보기' }, en: { contact_title: 'Contact Us', form_subject: 'Subject', form_contact: 'Contact Info', form_message: 'Message', form_submit: '📨 Send Message', modal_func: 'Functions', modal_effect: 'Expected Effects', modal_detail: 'Description', demo_btn: 'Try Demo' } };
    $$('[data-i18n]').forEach(function (el) { var v = LG[isKr() ? 'kr' : 'en'][el.getAttribute('data-i18n')]; if (v) el.innerText = v; });
    $$('.lg').forEach(function (b) { var l = b.dataset.lang || (b.id === 'lang-en' ? 'en' : 'kr'); b.classList.toggle('on', l === currentLang); });
  }
  function setLang(l) {
    currentLang = l; try { localStorage.setItem('site_lang', l); } catch (e) { }
    applyStatic(); applyHum(); loadAll(); loadProfile(); renderResult(); renderPortfolio();
  }
  $$('.lg').forEach(function (b) { b.addEventListener('click', function () { setLang(b.dataset.lang || (b.id === 'lang-en' ? 'en' : 'kr')); }); });

  /* ---------- 숫자 유틸 ---------- */
  function countUp(el) {
    var to = +el.dataset.to; if (isNaN(to)) return; var t0 = null;
    (function st(ts) { if (!t0) t0 = ts; var k = Math.max(0, Math.min(1, (ts - t0) / 1200)); k = 1 - Math.pow(1 - k, 4); el.textContent = Math.round(to * k); if (k < 1) requestAnimationFrame(st); })(performance.now());
  }
  function numHtml(n, unit) { return '<b><span class="cnt" data-to="' + esc(n) + '">' + esc(n) + '</span><i>' + esc(unit) + '</i></b>'; }
  function isNum(v) { return v !== '' && !isNaN(Number(String(v).replace(/,/g, ''))); }
  function runCounts() { var s = slides[curIdx]; if (!s) return; var scope = (s._panels && s._panels.length) ? s._panels[s._p] : s; $$('.cnt', scope).forEach(countUp); }

  /* ---------- 상단: 시계·티커 ---------- */
  function renderTicker() {
    var parts = [isKr() ? '주말의 코드가, 복지의 월요일을 바꿉니다' : "Weekend code rewrites welfare's Monday", 'SOCIAL WELFARE × AI'].concat(state.banners.map(function (b) { return String(b.title || '').replace(/<br\s*\/?>/gi, ' '); }).filter(Boolean)).concat(['JINHYUN.AI']);
    var line = parts.join('  //  ') + '  //  ';
    var h = esc(line).replace(/\/\//g, '<b>//</b>');
    var tk = $('#tick'); if (!tk) return;
    tk.innerHTML = '<span>' + h + h + '</span><span>' + h + h + '</span>';
  }
  renderTicker();

  /* ---------- 운영철학(요일별) ---------- */
  var DN = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  var todayIdx = (new Date().getDay() + 6) % 7, curDay = todayIdx;
  function clean(t) { return String(t || '').replace(/^["“”\s]+|["“”\s]+$/g, ''); }
  function oneLine(t) { return String(t || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean).join(' '); }
  function renderAbout() {
    var w = state.week; if (!w.length) return;
    setDay(todayIdx);
  }
  function setDay(i) {
    var row = state.week.filter(function (x) { return x.day === i + 1; })[0]; if (!row) return; curDay = i;
    $$('.day').forEach(function (b) { b.classList.toggle('on', b.textContent === DN[i]); });
    $('#quote').textContent = clean(row.slogan); $('#philo').textContent = oneLine(row.philosophy);
  }

  /* ---------- 솔루션 카드 ---------- */
  var MT = [0, 0, 0, 0, 0], RT = ['0deg', '0deg', '0deg', '0deg', '0deg'];
  var partSel = 0, fEl = $('#filters'), sc = $('#showcase');
  function toSys(r) {
    var m = /Part\s*(\d)/i.exec(r.category || ''); var d = String(r.detail || '').split(/\n*\s*(더 궁금하시면|If you have)/)[0].trim();
    return { p: m ? +m[1] : 0, pn: String(r.category || '').replace(/^Part\s*\d\s*\.?\s*/i, ''), n: r.name || '', g: r.goal || '', f: r.functions || '', e: r.effects || '', d: d, u: (r.demoUrl && String(r.demoUrl).trim().indexOf('http') === 0) ? String(r.demoUrl).trim() : '' };
  }
  function renderFilters() {
    var scn = $('#sysCount'); if (scn) scn.textContent = state.systems.length;
    var parts = []; state.systems.forEach(function (s) { if (parts.map(function (x) { return x[0]; }).indexOf(s.p) < 0) parts.push([s.p, s.pn]); });
    parts.sort(function (a, b) { return a[0] - b[0]; });
    var list = [[0, isKr() ? '전체' : 'All']].concat(parts.map(function (x) { return [x[0], x[1]]; }));
    fEl.innerHTML = '';
    list.forEach(function (pt) {
      var n = pt[0] ? state.systems.filter(function (s) { return s.p === pt[0]; }).length : state.systems.length;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (pt[0] === partSel ? ' on' : ''); b.textContent = pt[1] + ' · ' + n;
      b.onclick = function () { partSel = pt[0]; $$('.chip', fEl).forEach(function (x) { x.classList.toggle('on', x === b); }); renderCards(); };
      fEl.appendChild(b);
    });
  }
  function renderCards() {
    var list = state.systems.filter(function (s) { return !partSel || s.p === partSel; });
    sc.innerHTML = ''; sc.scrollLeft = 0;
    list.forEach(function (s, i) {
      var n = state.systems.indexOf(s) + 1, b = document.createElement('button'); b.type = 'button'; b.className = 'card';
      b.style.setProperty('--i', Math.min(i, 7)); b.style.setProperty('--mt', MT[i % 5] + 'px'); b.style.setProperty('--r', RT[i % 5]);
      b.innerHTML = '<span class="no">' + String(n).padStart(2, '0') + '</span><span class="lab">// PART ' + s.p + '</span><h4></h4><p class="g"></p><p class="fn"></p><span class="foot"><span></span><span>' + (s.u ? '● ' + (isKr() ? '영상' : 'Demo') + ' →' : '→') + '</span></span>';
      $('h4', b).textContent = s.n; $('p.g', b).textContent = s.g; $('p.fn', b).textContent = s.f.replace(/\n+/g, ' · '); $('.foot span', b).textContent = s.e;
      b.addEventListener('animationend', function (e) { if (e.animationName === 'cardIn') b.classList.add('ready'); });
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        b.style.setProperty('--mx', (e.clientX - r.left) + 'px'); b.style.setProperty('--my', (e.clientY - r.top) + 'px');
        b.style.setProperty('--ry', ((x - .5) * 8) + 'deg'); b.style.setProperty('--rx', ((.5 - y) * 8) + 'deg');
      });
      b.addEventListener('pointerleave', function () { b.style.setProperty('--rx', '0deg'); b.style.setProperty('--ry', '0deg'); });
      b.onclick = function () { openSheet(s); }; sc.appendChild(b);
    });
    var nDemo = state.systems.filter(function (s) { return s.u; }).length;
    $('#railinfo').textContent = state.systems.length + ' SYSTEMS · ' + nDemo + ' DEMO FILMS / ' + list.length + (isKr() ? ' · 카드를 눌러 상세 보기' : ' · click a card for details');
    prog();
  }
  function prog() { var w = sc.scrollWidth, c = sc.clientWidth, bar = $('#railprog'); if (w <= c + 2) { bar.style.width = '100%'; bar.style.left = '0'; return; } bar.style.width = (c / w * 100) + '%'; bar.style.left = (sc.scrollLeft / w * 100) + '%'; }
  sc.addEventListener('scroll', prog, { passive: true });
  $('#railL').onclick = function () { sc.scrollBy({ left: -sc.clientWidth * .7, behavior: 'smooth' }); };
  $('#railR').onclick = function () { sc.scrollBy({ left: sc.clientWidth * .7, behavior: 'smooth' }); };

  var sheet = $('#sheet'), veil = $('#veil');
  function openSheet(s) {
    $('#sCat').textContent = 'PART ' + s.p + ' · ' + s.pn; $('#sTitle').textContent = s.n; $('#sGoal').textContent = 'GOAL · ' + s.g;
    $('#sFn').textContent = s.f || '-'; $('#sEf').textContent = s.e || '-'; $('#sDe').textContent = s.d || '-';
    var dm = $('#sDemo'), box = $('#sPlayer'), mm = s.u ? /\/d\/([\w-]+)/.exec(s.u) : null, yt = s.u ? ytId(s.u) : ''; stopPlayer();
    dm.textContent = isKr() ? '새 탭에서 열기 ↗' : 'Open in new tab ↗';
    if (s.u) {
      dm.href = s.u; dm.style.display = 'inline-block';
      dm.onclick = function () { if (typeof logFootprint === 'function') logFootprint('Demo', '영상 새 탭', s.n); };
      if (yt) {
        box.hidden = false; box.classList.remove('playing');
        box.style.backgroundImage = 'linear-gradient(rgba(17,19,24,.35), rgba(17,19,24,.55)), url(https://img.youtube.com/vi/' + yt + '/hqdefault.jpg)';
        box.innerHTML = '<button class="play" type="button" aria-label="' + (isKr() ? '시연영상 재생' : 'Play demo') + '">▶</button><span class="lab"></span>';
        $('.lab', box).textContent = s.n + (isKr() ? ' · 시연영상' : ' · demo');
        var startYt = function (auto) {
          box.classList.add('playing'); box.style.backgroundImage = 'none';
          box.innerHTML = ytFrame(yt, s.n, auto);
          if (auto) soundBtn(box);
          if (typeof logFootprint === 'function') logFootprint('Demo', auto ? '영상 자동재생' : '영상 시연 클릭', s.n);
        };
        $('.play', box).onclick = function () { startYt(false); };
        if (AUTO) startYt(true);
      } else if (mm) {
        var id = mm[1];
        box.hidden = false; box.classList.remove('playing');
        box.style.backgroundImage = 'linear-gradient(rgba(17,19,24,.35), rgba(17,19,24,.55)), url(https://drive.google.com/thumbnail?id=' + id + '&sz=w800)';
        box.innerHTML = '<button class="play" type="button" aria-label="' + (isKr() ? '시연영상 재생' : 'Play demo') + '">▶</button><span class="lab"></span>';
        $('.lab', box).textContent = s.n + (isKr() ? ' · 시연영상' : ' · demo');
        $('.play', box).onclick = function () {
          box.classList.add('playing'); box.style.backgroundImage = 'none';
          box.innerHTML = '<iframe src="https://drive.google.com/file/d/' + id + '/preview" allow="autoplay; fullscreen" allowfullscreen title="' + esc(s.n) + '"></iframe>';
          if (typeof logFootprint === 'function') logFootprint('Demo', '영상 시연 클릭', s.n);
        };
      }
    } else { dm.removeAttribute('href'); dm.style.display = 'none'; }
    sheet.classList.add('open'); veil.classList.add('open'); deck.classList.add('locked'); sheet.setAttribute('aria-hidden', 'false');
    if (typeof logFootprint === 'function') logFootprint('Systems', '카드 상세보기', s.n);
  }
  function stopPlayer() { var b = $('#sPlayer'); if (b) { b.innerHTML = ''; b.hidden = true; b.style.backgroundImage = ''; b.classList.remove('playing'); } }
  function closeSheet() { stopPlayer(); sheet.classList.remove('open'); veil.classList.remove('open'); deck.classList.remove('locked'); sheet.setAttribute('aria-hidden', 'true'); }
  $('#close').onclick = closeSheet; veil.onclick = closeSheet;

  /* ---------- 이력/전문성 ---------- */
  var PTABS = { kr: ['활동·자문', '연구·발표', '개발', '출강', '실무경력', '저작권'], en: ['Advisory', 'Research', 'Development', 'Teaching', 'Experience', 'Copyright'] };
  var PCATS = [['Activity'], ['Research'], ['Development'], ['Lecture'], ['Experience'], null];
  var pfT = $('#pfTabs'), pfL = $('#pfList'), mch = $('#mchart'), pfSel = 0;
  function cat(c) { return state.profile.items.filter(function (r) { return c.indexOf(r.c) >= 0; }); }
  function renderPortfolio() {
    var P = state.profile; if (!P.items.length && !P.copyright.length) return;
    pfT.innerHTML = '';
    var avail = PCATS.map(function (c) { return c ? cat(c).length > 0 : P.copyright.length > 0; }), nTab = 0;
    if (!avail[pfSel]) pfSel = Math.max(0, avail.indexOf(true));
    PTABS[isKr() ? 'kr' : 'en'].forEach(function (t, i) { if (!avail[i]) return; nTab++; var b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (i === pfSel ? ' on' : ''); b.dataset.k = i; b.textContent = t; b.onclick = function () { pfRender(i); }; pfT.appendChild(b); });
    pfT.style.setProperty('--n', nTab || 1); pfT.hidden = !nTab;
    var dev = cat(['Development']), act = cat(['Activity']), res = cat(['Research']);
    var devKeys = dev.map(function (r) { return pkey(r.p); }).filter(Boolean).sort(), span = devKeys.length ? (String(devKeys[0]).replace(/(\d{4})(\d{2})/, '$1.$2') + ' ~ ' + String(devKeys[devKeys.length - 1]).replace(/(\d{4})(\d{2})/, '$1.$2')) : '';
    var y = new Date().getFullYear() * 100 + 1, a26 = act.filter(function (r) { return pkey(r.p) >= y; }).length, r26 = res.filter(function (r) { return pkey(r.p) >= y; }).length, yr = new Date().getFullYear();
    var K = [
      [dev.length, isKr() ? '건' : '', isKr() ? '개발한 플랫폼' : 'Platforms built', span],
      [P.copyright.length, isKr() ? '종' : '', isKr() ? 'AI 소프트웨어 저작권 등록' : 'AI software copyrights', ''],
      [act.length, isKr() ? '건' : '', isKr() ? '위원·자문 등 외부 활동' : 'Committee & advisory roles', a26 ? (yr + (isKr() ? '년 ' : ': ') + a26 + (isKr() ? '건' : '')) : ''],
      [res.length, isKr() ? '편' : '', isKr() ? '연구·학술 발표·기고' : 'Research & publications', r26 ? (yr + (isKr() ? '년 ' : ': ') + r26 + (isKr() ? '편' : '')) : '']
    ];
    $('#pfK').innerHTML = K.map(function (k, i) { return '<div class="pf-k rise" style="--i:' + (i + 1) + '">' + numHtml(k[0], k[1] || '') + '<span>' + esc(k[2]) + (k[3] ? '<br><em>' + esc(k[3]) + '</em>' : '') + '</span></div>'; }).join('');
    pfRender(pfSel);
    renderResult(); renderHeroStats(); runCounts();
  }
  function playBars() { mch.classList.remove('go'); void mch.offsetWidth; mch.classList.add('go'); }
  function pfRender(k) {
    pfSel = k; $$('.chip', pfT).forEach(function (b) { b.classList.toggle('on', +b.dataset.k === k); });
    var cats = PCATS[k]; pfL.scrollTop = 0;
    if (!cats) {
      mch.hidden = true;
      pfL.innerHTML = '<div class="cr-grid">' + state.profile.copyright.map(function (c, i) { return '<div class="cr-card" style="--i:' + i + '"><span class="id">' + esc(c.id) + '</span><span class="nm">' + esc(c.n) + '</span><span class="rl">' + esc(c.r) + '</span><span class="ft">' + esc(c.f) + '</span></div>'; }).join('') + '</div>';
      return;
    }
    var rows = cat(cats).sort(function (a, b) { return pkey(b.p) - pkey(a.p); });
    if (cats[0] === 'Development' && rows.length) {
      var ks = rows.map(function (r) { return pkey(r.p); }).filter(Boolean), minK = Math.min.apply(null, ks), maxK = Math.max.apply(null, ks), cnt = {}, keys = [];
      for (var y = Math.floor(minK / 100), m = minK % 100; y * 100 + m <= maxK;) { var kk = y * 100 + m; cnt[kk] = 0; keys.push(kk); m++; if (m > 12) { m = 1; y++; } }
      rows.forEach(function (r) { var kk = pkey(r.p); if (cnt[kk] !== undefined) cnt[kk]++; });
      var mx = Math.max.apply(null, keys.map(function (q) { return cnt[q]; })) || 1, cy = new Date().getFullYear() * 100 + 1;
      mch.innerHTML = '<span class="cap">' + (isKr() ? '월별 신규 개발' : 'NEW PLATFORMS PER MONTH') + ' · ' + rows.length + (isKr() ? '건 / ' + keys.length + '개월' : ' / ' + keys.length + ' mo') + '</span>' +
        keys.map(function (q, i) { return '<i class="' + (q >= cy ? 'on' : '') + '" style="--h:' + Math.max(cnt[q] ? 18 : 4, cnt[q] / mx * 100) + ';--k:' + i + '" title="' + Math.floor(q / 100) + '.' + String(q % 100).padStart(2, '0') + ' · ' + cnt[q] + '"></i>'; }).join('');
      mch.hidden = false; playBars();
    } else { mch.hidden = true; }
    var cy2 = new Date().getFullYear() * 100 + 1;
    pfL.innerHTML = rows.map(function (r, i) { return '<div class="pf-item' + (pkey(r.p) >= cy2 || /현재|present|ongoing/i.test(r.p) ? ' new' : '') + '" style="--i:' + Math.min(i, 14) + '"><span class="pp">' + esc(r.p).replace('~', '~<br class="pbr">') + '</span><span class="tt">' + esc(r.t) + '</span><span class="oo">' + esc(r.o) + '</span></div>'; }).join('');
  }

  /* ---------- 히어로 통계 · 변화(성과) ---------- */
  function mval(key) { var m = state.metrics[key]; return (m && isNum(m.value)) ? m : null; }
  function renderHeroStats() {
    var S = state.systems, nDemo = S.filter(function (s) { return s.u; }).length, items = [];
    if (S.length) items.push([S.length, isKr() ? '건' : '', isKr() ? '직접 만든 자동화 시스템' : 'Automation systems built']);
    if (nDemo) items.push([nDemo, isKr() ? '편' : '', isKr() ? '시연영상' : 'Demo films']);
    if (state.profile.copyright.length) items.push([state.profile.copyright.length, isKr() ? '종' : '', isKr() ? 'AI 저작권 등록' : 'AI copyrights registered']);
    var a = mval('행정시간단축률'); if (a) items.push([a.value, a.unit || '%', a.label || (isKr() ? '반복 행정 시간 단축' : 'Admin time saved')]);
    $('#heroStats').style.setProperty('--sn', items.length || 1);
    $('#heroStats').innerHTML = items.map(function (k) { return '<div class="stat">' + (isNum(k[0]) ? numHtml(k[0], k[1]) : '<b>' + esc(k[0]) + '<i>' + esc(k[1]) + '</i></b>') + '<span>' + esc(k[2]) + '</span></div>'; }).join('');
  }
  function renderResult() {
    var a = mval('행정시간단축률'), S = state.systems;
    if (a) { $('#kpiN').dataset.to = a.value; $('#kpiN').textContent = a.value; $('#kpiU').textContent = a.unit || '%'; $('#kpiL').textContent = a.label || (isKr() ? '반복 행정 시간 단축' : 'Admin time saved'); }
    else { $('#kpiN').dataset.to = S.length; $('#kpiN').textContent = S.length; $('#kpiU').textContent = isKr() ? '건' : ''; $('#kpiL').textContent = isKr() ? '직접 만든 자동화 시스템' : 'Automation systems built'; }
    var up = isKr() ? '시간 ↑' : 'time ↑', dn = a ? ('↓ ' + a.value + (a.unit || '%')) : '↓'; ['gUp', 'gUp2'].forEach(function (k) { var e = $('#' + k); if (e) e.textContent = up; }); ['gDown', 'gDown2'].forEach(function (k) { var e = $('#' + k); if (e) e.textContent = dn; });
    var P = state.profile, dev = cat(['Development']).length, act = cat(['Activity']).length, T = [];
    if (dev) T.push([dev, isKr() ? '건' : '', isKr() ? '개발한 플랫폼' : 'Platforms built']);
    if (P.copyright.length) T.push([P.copyright.length, isKr() ? '종' : '', isKr() ? 'AI 저작권 등록' : 'AI copyrights']);
    if (act) T.push([act, isKr() ? '건' : '', isKr() ? '위원·자문 등 외부 활동' : 'Committee & advisory roles']);
    var h = mval('월절감시간'); if (h) T.push([h.value, h.unit || (isKr() ? '시간' : 'h'), h.label || (isKr() ? '월 절감 시간' : 'Hours saved / month')]);
    var el = $('#tiles'); el.style.gridTemplateColumns = 'repeat(' + Math.max(T.length, 1) + ', 1fr)';
    el.innerHTML = T.map(function (k) { return '<div class="tile">' + (isNum(k[0]) ? numHtml(k[0], k[1]) : '<b>' + esc(k[0]) + esc(k[1]) + '</b>') + '<span>' + esc(k[2]) + '</span></div>'; }).join('');
  }

  /* ---------- 기술 / 푸터 / 영상 ---------- */
  function renderTech(groups) {
    var n = 0; groups.forEach(function (g) { n += g.items.length; });
    $('#techMeta').innerHTML = groups.length + ' LAYERS · ' + n + ' TOOLS<br><span style="color:var(--fg-40)">BUILT ON GOOGLE WORKSPACE</span>';
    $('#techs').innerHTML = groups.map(function (g, i) { return '<div class="tech" style="--i:' + i + '"><span class="k">0' + (i + 1) + '</span><h5>' + esc(g.category) + '</h5><div class="tags">' + g.items.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div><div class="meter" title="' + g.items.length + '"><i style="--w:' + (g.items.length / 4 * 100) + '%;--i:' + i + '"></i></div></div>'; }).join('');
  }
  function renderFooter(d) {
    if (!d) return;
    var ml = $('#footerMail'); if (ml && d.email) ml.innerHTML = '<span class="hv-ml">EMAIL</span><a href="mailto:' + esc(d.email) + '">' + esc(d.email) + '</a>';
    if (d.copyright) { var c = $('#footer-copyright'); if (c && c.firstChild) c.firstChild.textContent = String(d.copyright).replace(/<[^>]*>/g, '') + ' '; }
  }
  function promoPlay(auto) {
    var id = ytId(state.promo), box = $('#promo-video-container'); if (!id || !box || box.classList.contains('playing')) return;
    box.classList.add('playing'); box.insertAdjacentHTML('beforeend', ytFrame(id, '홍보영상', auto));
    if (auto) soundBtn(box);
    if (typeof logFootprint === 'function') logFootprint('Footer', auto ? '홍보영상 자동재생' : '홍보영상 재생');
  }
  function promoStop() {
    var box = $('#promo-video-container'); if (!box || !box.classList.contains('playing')) return;
    $$('iframe, .snd', box).forEach(function (n) { n.remove(); }); box.classList.remove('playing');
  }
  $('#playBtn').addEventListener('click', function () { promoPlay(false); });

  /* ---------- 데이터 로드 ---------- */
  /* ---------- 로딩 화면 + 캐시(재방문 즉시 표시) ---------- */
  var intro = $('#intro'), inBar = $('#inBar'), inMsg = $('#inMsg');
  var need = { getAboutWeek: 0, getSystemData: 0, getProfileData: 0, getMetricsData: 0 }, doneN = 0, introFin = false, progV = 0, introT0 = Date.now();
  var MSG = { kr: ['환경 구성 중', '데이터 불러오는 중', '이력·솔루션 동기화 중', '화면 구성 중'], en: ['Preparing environment', 'Loading data', 'Syncing profile & solutions', 'Building the view'] };
  function setProg(p) { progV = Math.max(progV, Math.min(100, p)); if (inBar) inBar.style.width = progV + '%'; if (inMsg) { var a = MSG[isKr() ? 'kr' : 'en']; inMsg.textContent = a[progV < 30 ? 0 : progV < 60 ? 1 : progV < 92 ? 2 : 3]; } }
  var introTick = intro ? setInterval(function () { var e = Date.now() - introT0; setProg(Math.max(88 * (1 - Math.exp(-e / 1500)), doneN / 4 * 90)); }, 60) : 0;
  function replayCurrent() { var s = slides[curIdx]; if (!s) return; var el = (s._panels && s._panels.length) ? s._panels[s._p] : s; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); runCounts(); }
  function finishIntro() {
    if (introFin) return; introFin = true; clearInterval(introTick);
    if (!intro) return;
    var wait = Math.max(0, 450 - (Date.now() - introT0));
    setTimeout(function () { setProg(100); setTimeout(function () { intro.classList.add('out'); replayCurrent(); setTimeout(function () { intro.classList.add('gone'); }, 400); }, 160); }, wait);
  }
  function introMark(fn) { if (need[fn] === 0) { need[fn] = 1; doneN++; if (doneN >= 4) finishIntro(); } }
  setTimeout(finishIntro, 6000);
  function cachedApi(fn, L, render) {
    var k = 'jh2|' + fn + '|' + L, raw = null, c = null;
    try { raw = localStorage.getItem(k); c = raw ? JSON.parse(raw) : null; } catch (e) { c = null; }
    if (c != null) { try { render(c); } catch (e) { warn(e); } introMark(fn); }
    return api(fn, L).then(function (d) { var s = JSON.stringify(d); try { localStorage.setItem(k, s); } catch (e) { } if (s !== raw) render(d); introMark(fn); return d; }, function (e) { introMark(fn); throw e; });
  }

  function loadAll() {
    var L = isKr() ? 'kr' : 'en';
    cachedApi('getAboutWeek', L, function (d) { state.week = d || []; renderAbout(); }).catch(function () {
      api('getAboutData', L).then(function (a) { if (!a) return; state.week = [{ day: todayIdx + 1, slogan: a.slogan, philosophy: a.philosophy, branding: a.branding }]; renderAbout(); }).catch(warn);
    });
    cachedApi('getSystemData', L, function (d) { state.systems = (d || []).map(toSys); window.JH_SYS = state.systems.map(function (x) { return x.n; }).filter(Boolean); partSel = 0; renderFilters(); renderCards(); renderHeroStats(); renderResult(); }).catch(function (e) { warn(e); sc.innerHTML = '<p style="color:var(--fg-60);padding:20px">데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>'; });
    cachedApi('getTools', L, renderTech).catch(warn);
    cachedApi('getFooterData', L, renderFooter).catch(warn);
    cachedApi('getMetricsData', L, function (d) { state.metrics = d || {}; renderHeroStats(); renderResult(); }).catch(warn);
  }
  function warn(e) { if (window.console) console.warn('[JINHYUN.AI]', e && e.message ? e.message : e); }
  var profLoaded = false;
  function loadProfile() { cachedApi('getProfileData', isKr() ? 'kr' : 'en', function (d) { state.profile = d || { items: [], copyright: [] }; profLoaded = true; renderPortfolio(); }).catch(warn); }
  /* 문의 화면 영상: 구글 시트 '에이전트 영상' 탭 A2의 유튜브 주소를 사용합니다(시트만 바꾸면 즉시 반영, 배포 불필요).
     시트 값이 비었거나 유튜브 주소가 아닐 때만 아래 기본 영상(2026 춘계학술대회 발표)을 보여 줍니다. 영상 아래 제목은 유튜브에서 자동으로 가져옵니다. */
  var PROMO_FALLBACK = 'https://youtu.be/w4rMsyA4v_k';
  function ytFrame(id, title, auto) {
    return '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1&modestbranding=1' + (auto ? '&mute=1&enablejsapi=1' : '') + '" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="' + esc(title) + '"></iframe>';
  }
  function soundBtn(box) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'snd'; b.textContent = isKr() ? '소리 켜기' : 'SOUND ON';
    b.onclick = function () {
      var f = $('iframe', box); if (f && f.contentWindow) {
        [{ func: 'unMute', args: [] }, { func: 'setVolume', args: [100] }, { func: 'playVideo', args: [] }].forEach(function (c) { f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: c.func, args: c.args }), '*'); });
      }
      b.remove();
    };
    box.appendChild(b);
  }
  function ytId(u) { var m = String(u || '').match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/)([\w-]{11})/); return m ? m[1] : ''; }
  function setPromo(u) {
    var id = ytId(u) ? u : PROMO_FALLBACK; id = ytId(id);
    state.promo = 'https://youtu.be/' + id;
    var box = $('#promo-video-container'), lb = $('#promoLab'), pb = $('#playBtn');
    if (pb) pb.style.display = '';
    box.style.backgroundImage = 'linear-gradient(rgba(17,19,24,.35), rgba(17,19,24,.55)), url(https://img.youtube.com/vi/' + id + '/hqdefault.jpg)';
    box.style.backgroundSize = 'cover'; box.style.backgroundPosition = 'center';
    if (lb) lb.textContent = 'PROMO FILM';
    try {
      var xhr = new XMLHttpRequest(); xhr.open('GET', 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://youtu.be/' + id)); xhr.timeout = 6000;
      xhr.onload = function () { try { var j = JSON.parse(xhr.responseText); if (lb && j.title && state.promo.indexOf(id) > -1) lb.textContent = j.title + (j.author_name ? ' · ' + j.author_name : ''); } catch (e) { } };
      xhr.send();
    } catch (e) { }
  }
  setPromo(PROMO_FALLBACK);
  var HUM = {
    kr: { t: '기술은 차갑게,\n현장은 따뜻하게.', d: '코딩하는 사무국장 장진현 | Human-in-the-Loop | Digital Humanism | 기술은 도구, 주인공은 사람 | 서류는 코드에게, 사람은 사람에게\n사람이 다시, 사람에게 집중하는 시간.' },
    en: { t: 'Technology stays cool,\nthe field stays warm.', d: 'The Coding Secretary General, Jang Jin-hyun | Human-in-the-Loop | Digital Humanism | Technology is the tool, people are the point | Paperwork to code, people to people\nTime for people to focus on people again.' }
  };
  var humSheet = { t: '', d: '' }, typeT = 0, typeText = '';
  function typeLoop(list) {
    clearTimeout(typeT); var el = $('#humTyped'); if (!el) return;
    if (!list || !list.length) { el.textContent = ''; return; }
    typeText = list;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = list[0]; return; }
    var k = 0, i = 0, del = false;
    (function tick() {
      if (typeText !== list) return;
      var text = list[k];
      el.textContent = text.slice(0, i);
      if (!del && i >= text.length) { del = true; typeT = setTimeout(tick, 3200); return; }
      if (del && i <= 0) { del = false; k = (k + 1) % list.length; typeT = setTimeout(tick, 650); return; }
      i += del ? -1 : 1; typeT = setTimeout(tick, del ? 26 : 90);
    })();
  }
  function applyHum() {
    var L = isKr() ? 'kr' : 'en', t = (isKr() && humSheet.t) || HUM[L].t, d = (isKr() && humSheet.d) || HUM[L].d;
    var tl = t.split(/\n/).map(function (x) { return esc(x); }).join('<br>'); tl = tl.replace(/\.$/, '<span class="lime">.</span>');
    var h = $('#humT'); if (h) h.innerHTML = tl;
    var ls = d.split(/\n/).filter(function (x) { return x.trim(); }), box = $('#humD');
    if (box) { box.innerHTML = '<p class="tp"><span id="humTyped"></span><i class="caret"></i></p>'; typeLoop((ls[0] || '').split('|').map(function (x) { return x.trim(); }).filter(Boolean)); }
  }
  applyHum();
  cachedApi('getPromoData', '-', function (o) { o = o || {}; setPromo(o.url); humSheet = { t: o.title || '', d: o.desc || '' }; applyHum(); }).catch(function (e) { warn(e); api('getPromoVideoUrl').then(function (u) { setPromo(u); }).catch(warn); });

  /* ---------- 히어로 배경: 점·점선 네트워크 (라임 + 앰버 소량, 마우스 반응) ---------- */
  function initNet() {
    var cv = $('#net'); if (!cv || !cv.getContext) return { on: function () { } };
    var ctx = cv.getContext('2d'), W = 0, H = 0, pts = [], raf = 0, running = false, mx = -999, my = -999, last = 0, zone = null, zt = 0;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function calcZone() {
      zone = null; if (W > 860) return;
      var mid = $('.home-mid'), foot = $('.home-foot'); if (!mid || !foot) return;
      var cr = cv.getBoundingClientRect(), a = mid.getBoundingClientRect(), b = foot.getBoundingClientRect();
      var y0 = a.bottom - cr.top + 14, y1 = b.top - cr.top - 14; if (y1 - y0 > 50) zone = { y0: y0, y1: y1 };
    }
    function mk() { var a = Math.random() * 6.283, s = .12 + Math.random() * .3, inZ = zone && Math.random() < .78; return { free: !inZ, x: Math.random() * W, y: inZ ? zone.y0 + Math.random() * (zone.y1 - zone.y0) : Math.random() * H, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 1 + Math.random() * 1.7, warm: Math.random() < .14, ph: Math.random() * 6.283 }; }
    function size() {
      var r = cv.getBoundingClientRect(), dpr = LITE ? 1 : Math.min(window.devicePixelRatio || 1, 2); if (!r.width || !r.height) return;
      W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      calcZone();
      var n = Math.round(Math.min(100, Math.max(26, W * H / 15000)));
      if (zone) n += Math.round(W * (zone.y1 - zone.y0) / 7000);
      if (LITE) n = Math.round(n * .5);
      pts.length = 0; while (pts.length < n) pts.push(mk());
      pts.forEach(function (p) { if (p.x > W) p.x = Math.random() * W; if (p.y > H) p.y = Math.random() * H; });
      if (!running) draw(0);
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      var L = Math.min(190, Math.max(110, W / 8.5)), i, j, p, q, dx, dy, d, a;
      if (zone) {
        var cy = (zone.y0 + zone.y1) / 2, rr = Math.max(W * .62, (zone.y1 - zone.y0) * .8), g = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, rr);
        g.addColorStop(0, 'rgba(195,244,0,.10)'); g.addColorStop(1, 'rgba(195,244,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, zone.y0 - rr, W, rr * 2 + (zone.y1 - zone.y0));
        L = Math.min(L, 120);
      }
      ctx.lineWidth = 1;
      for (i = 0; i < pts.length; i++) {
        p = pts[i];
        for (j = i + 1; j < pts.length; j++) {
          q = pts[j]; dx = p.x - q.x; dy = p.y - q.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < L) { a = (1 - d / L); ctx.strokeStyle = (p.warm || q.warm) ? 'rgba(245,185,122,' + (a * .42) + ')' : 'rgba(195,244,0,' + (a * .36) + ')'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
        }
        dx = p.x - mx; dy = p.y - my; d = Math.sqrt(dx * dx + dy * dy);
        if (d < 170) { a = (1 - d / 170); ctx.strokeStyle = 'rgba(244,244,240,' + (a * .45) + ')'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mx, my); ctx.stroke(); }
      }
      for (i = 0; i < pts.length; i++) {
        p = pts[i]; a = .5 + .4 * Math.sin(t / 900 + p.ph);
        ctx.fillStyle = p.warm ? 'rgba(245,185,122,' + (a * .3) + ')' : 'rgba(195,244,0,' + (a * .24) + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.2, 0, 6.283); ctx.fill();
        ctx.fillStyle = p.warm ? 'rgba(245,185,122,' + a + ')' : 'rgba(195,244,0,' + a + ')'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
    }
    function step(t) {
      raf = requestAnimationFrame(step); var k = Math.min(40, t - last) / 16.7; last = t;
      if ((zt = (zt + 1) % 45) === 0 && W <= 860) { var oz = zone; calcZone(); if (zone && !oz) { pts.length = 0; size(); } }
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i], dx = p.x - mx, dy = p.y - my, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120 && d > 0) { p.x += dx / d * .6 * k; p.y += dy / d * .6 * k; }
        p.x += p.vx * k; p.y += p.vy * k;
        if (zone && !p.free) { var ty = p.y < zone.y0 ? zone.y0 : (p.y > zone.y1 ? zone.y1 : p.y); p.vy += (ty - p.y) * .0009 * k; p.vy *= .999; if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10; continue; }
        if (p.x < -20) p.x = W + 20; else if (p.x > W + 20) p.x = -20; if (p.y < -20) p.y = H + 20; else if (p.y > H + 20) p.y = -20;
      }
      draw(t);
    }
    var s0 = $('#s0');
    if (s0) {
      s0.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }, { passive: true });
      s0.addEventListener('pointerleave', function () { mx = my = -999; });
    }
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 150); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && running) { cancelAnimationFrame(raf); raf = 0; } else if (!document.hidden && running && !raf) { last = performance.now(); raf = requestAnimationFrame(step); } });
    size();
    return {
      on: function (flag) {
        if (flag && !running) { running = true; if (!reduce) { last = performance.now(); raf = requestAnimationFrame(step); } else draw(0); }
        else if (!flag && running) { running = false; cancelAnimationFrame(raf); raf = 0; }
      }
    };
  }
  var net = initNet();

  /* 휴머니즘 화면 하단: 홈의 점·선을 물결 모양의 한 줄 사슬로 (라임 + 앰버 소량) */
  function initArt() {
    var cv = $('#net2'); if (!cv || !cv.getContext) return { on: function () { } };
    var ctx = cv.getContext('2d'), W = 0, H = 0, pts = [], raf = 0, running = false;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function size() {
      var r = cv.getBoundingClientRect(), dpr = LITE ? 1 : Math.min(window.devicePixelRatio || 1, 2); if (!r.width || !r.height) return;
      W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.max(10, Math.round(W / (LITE ? 80 : 44))); pts = [];
      for (var i = 0; i < n; i++) pts.push({ fx: i / (n - 1), ph: Math.random() * 6.283, r: 1.2 + Math.random() * 1.7, warm: Math.random() < .16, amp: .55 + Math.random() * .45, off: (Math.random() - .5) * .55 });
      draw(0);
    }
    function pos(p, t) { return [p.fx * W, H * .5 + Math.sin(t / 1500 + p.fx * 7) * H * .2 * p.amp + Math.sin(t / 950 + p.ph) * H * .05 + p.off * H * .36]; }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(195,244,0,0)'); g.addColorStop(1, 'rgba(195,244,0,.07)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      var P = pts.map(function (p) { return pos(p, t); }), i, a, b, k;
      ctx.lineWidth = 1;
      for (i = 0; i < P.length; i++) {
        for (k = 1; k <= 3; k++) {
          if (i + k >= P.length) break; a = P[i]; b = P[i + k];
          var warm = pts[i].warm || pts[i + k].warm, al = (k === 1 ? .55 : k === 2 ? .3 : .14);
          ctx.strokeStyle = warm ? 'rgba(245,185,122,' + (al * .8) + ')' : 'rgba(195,244,0,' + (al * .75) + ')';
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      }
      for (i = 0; i < P.length; i++) {
        var p = pts[i], al2 = .55 + .4 * Math.sin(t / 900 + p.ph);
        ctx.fillStyle = p.warm ? 'rgba(245,185,122,' + (al2 * .3) + ')' : 'rgba(195,244,0,' + (al2 * .25) + ')'; ctx.beginPath(); ctx.arc(P[i][0], P[i][1], p.r * 3.4, 0, 6.283); ctx.fill();
        ctx.fillStyle = p.warm ? 'rgba(245,185,122,' + al2 + ')' : 'rgba(195,244,0,' + al2 + ')'; ctx.beginPath(); ctx.arc(P[i][0], P[i][1], p.r, 0, 6.283); ctx.fill();
      }
    }
    function step(t) { raf = requestAnimationFrame(step); draw(t); }
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(size, 150); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && running) { cancelAnimationFrame(raf); raf = 0; } else if (!document.hidden && running && !raf && !reduce) { raf = requestAnimationFrame(step); } });
    size();
    return {
      on: function (flag) {
        if (flag && !running) { running = true; size(); if (!reduce) raf = requestAnimationFrame(step); else draw(0); }
        else if (!flag && running) { running = false; cancelAnimationFrame(raf); raf = 0; }
      }
    };
  }
  var art = initArt();

  /* ---------- 덱: 이동·활성화 ---------- */
  var pg = $('#pager'), curIdx = 0, sweep = $('#sweep');
  slides.forEach(function (s, i) { var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', s.dataset.name); b.onclick = function () { go(i); }; pg.appendChild(b); });
  function go(i) { closeMenu(); slides[i].scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  $$('[data-go]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); var t = +a.dataset.go; if (a.dataset.panel != null) { if (t === curIdx) setPanel(t, +a.dataset.panel); else { pendingPanel = +a.dataset.panel; go(t); } } else go(t); }); });
  var QMAP = [0, 1, 2, 3];
  var NAMES = ['HOME', 'SOLUTIONS', 'PROFILE', 'HUMANISM'];
  var pendingPanel = null;
  slides.forEach(function (s) { s._panels = $$('.panel', s); s._p = 0; });
  function label(i) { var s = slides[i], n = s._panels.length; $('#cur').textContent = NAMES[i] || ''; $('#curname').textContent = n ? ((s._p + 1) + '/' + n) : ''; }
  function setPanel(si, p) {
    var s = slides[si], ps = s._panels; if (!ps.length) return;
    p = Math.max(0, Math.min(ps.length - 1, p));
    var old = ps[s._p], pn = ps[p];
    if (old && old !== pn) { old.classList.remove('on', 'in'); $$('.card.ready', old).forEach(function (c) { c.classList.remove('ready'); }); }
    s._p = p; pn.classList.add('on'); void pn.offsetWidth;
    var th = pn.dataset.theme; s.classList.toggle('light', th === 'light'); s.classList.toggle('cine-slide', th === 'cine');
    $$('.ch-steps button', s).forEach(function (b, k) { b.classList.toggle('on', k === p); });
    var pos = $('.ch-pos', s); if (pos) pos.textContent = (p + 1) + '/' + ps.length;
    if (si === curIdx) {
      pn.classList.add('in'); frame.classList.toggle('light', th === 'light'); label(si); runCounts();
      if (pn.contains(mch) && !mch.hidden) playBars();
      if (typeof prog === 'function') prog();
      if (typeof logFootprint === 'function' && old !== pn) logFootprint(NAMES[si], '단계 이동', $('.ch-steps button.on span', s) ? $('.ch-steps button.on span', s).textContent : '');
    }
  }
  $$('.chapter').forEach(function (ch) { var s = ch.closest('.slide'), si = slides.indexOf(s); $$('[data-step]', ch).forEach(function (b) { b.addEventListener('click', function () { setPanel(si, +b.dataset.step); }); }); });
  function activate(i, first) {
    var prev = curIdx; curIdx = i; markQ(i); net.on(i === 0); art.on(i === 3);
    if (i === 3) { if (AUTO) setTimeout(function () { if (curIdx === 3) promoPlay(true); }, 700); } else promoStop();
    $$('button', pg).forEach(function (b, k) { b.classList.toggle('on', k === i); });
    slides.forEach(function (s, k) { if (k !== i) { s.classList.remove('in'); (s._panels || []).forEach(function (pn) { pn.classList.remove('in'); $$('.card.ready', pn).forEach(function (c) { c.classList.remove('ready'); }); }); } });
    var s = slides[i];
    if (s._panels.length) {
      var sp = pendingPanel != null ? pendingPanel : (first ? 0 : (prev > i ? s._panels.length - 1 : 0)); pendingPanel = null;
      setPanel(i, sp); s._panels[s._p].classList.add('in');
      frame.classList.toggle('light', s.classList.contains('light'));
    } else { s.classList.add('in'); frame.classList.toggle('light', s.classList.contains('light')); runCounts(); }
    label(i);
    if (!first) { sweep.classList.remove('go'); void sweep.offsetWidth; sweep.classList.add('go'); if (typeof logFootprint === 'function') logFootprint(s.dataset.name, '섹션 이동'); }
  }
  activate(0, true);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { var k = slides.indexOf(e.target); if (k !== curIdx) activate(k); } }); }, { root: deck, threshold: .6 });
    slides.forEach(function (s) { io.observe(s); });
  } else { slides.forEach(function (s) { s.classList.add('in'); }); }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeSheet(); closeMenu(); return; }
    var t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA') return;
    if (sheet.classList.contains('open') || document.querySelector('.modal-overlay.open')) return;
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && slides[curIdx] && slides[curIdx]._panels.length) { e.preventDefault(); setPanel(curIdx, slides[curIdx]._p + (e.key === 'ArrowRight' ? 1 : -1)); return; }
    if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); go(Math.min(slides.length - 1, curIdx + 1)); }
    if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); go(Math.max(0, curIdx - 1)); }
  });

  /* 가로 스와이프: 챕터 안 단계 이동 */
  (function () { var x0 = 0, y0 = 0, ok = false; deck.addEventListener('touchstart', function (e) { var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; ok = !(e.target.closest && e.target.closest('.showcase, .pf-list, #pfTabs, .modal-overlay')); }, { passive: true }); deck.addEventListener('touchend', function (e) { if (!ok) return; var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0, s = slides[curIdx]; if (!s || !s._panels.length) return; if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) setPanel(curIdx, s._p + (dx < 0 ? 1 : -1)); }, { passive: true }); })();

  /* 모바일 하단 퀵 메뉴: 현재 위치 표시 */
  function closeMenu() { }
  function markQ(i) {
    $$('#qmenu button').forEach(function (b) { b.classList.toggle('on', +b.dataset.q === QMAP[i]); });
    $$('.nav-links a').forEach(function (a) { var on = +a.dataset.go === QMAP[i]; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  }

  /* 시작 */
  applyStatic(); loadAll(); loadProfile();
  window.addEventListener('resize', prog);
})();

/* ===================================================================
 * 아래는 기존 사이트의 문의·AI 비서·관리자·방문기록 기능(변경 없이 유지)
 * =================================================================== */

    // Generic Close helper
    // Generic Close helper
    function closeModal(id) {
        document.getElementById(id).classList.remove('open');
    }

    // Contact Modal (문의 유형별 양식: 강의 의뢰 / 플랫폼 개발 / 기타)
    var ctType = null;
    var CT_EN = {
        lead: 'What would you like to ask about?', t_lecture: 'Lecture request', t_lecture_s: 'AI · smart work · office automation',
        t_platform: 'Platform / solution inquiry', t_platform_s: 'Adopt a built solution or custom development', t_other: 'Other inquiries here', back: '← Change type',
        l_date: 'Preferred date (1st / 2nd choice)', l_flex: 'Date is negotiable', l_target: 'Audience (multiple)', c_swk: 'Social workers', c_mgr: 'Managers', c_staff: 'General staff', c_etc: 'Other',
        l_count: 'Participants', l_region: 'Region (if offline)', p_region: 'e.g. Daejeon', l_mode: 'Format', m_off: 'Offline (in person)', m_on: 'Online', l_hours: 'Duration per day',
        hrs_hint: 'Online: from 1 hour. Offline: 3 hours or more.',
        l_topic: 'Topic (multiple)', s_ai: 'Using AI', s_sw: 'Smart work', s_auto: 'Office automation', s_vibe: 'Vibe coding', s_eval: 'Facility evaluation', s_case: 'Case management', s_etc: 'Other',
        l_note: 'Additional requests (optional)', p_lnote: 'Purpose, trainee level, anything else.',
        p_sol: 'Solutions of interest (multiple)', p_need: 'What do you need?', p_pneed: 'Which work would you like to automate? How is it handled now?',
        p_when: 'Desired timing (optional)', p_pwhen: 'e.g. first half of next year', p_budget: 'Budget range (optional)',
        b0: 'Undecided', b1: 'Under 5M KRW', b2: '5 – 15M KRW', b3: '15M KRW or more', f_name: 'Name / Organization'
    };
    function ctIsEn() { return typeof currentLang !== 'undefined' && currentLang === 'en'; }
    function ctT(ko, en) { return ctIsEn() ? en : ko; }
    function ctApply() {
        var en = ctIsEn();
        document.querySelectorAll('#contact-form [data-ct]').forEach(function (el) {
            if (el.dataset.kr == null) el.dataset.kr = el.textContent;
            var k = el.getAttribute('data-ct');
            el.textContent = (en && CT_EN[k] != null) ? CT_EN[k] : el.dataset.kr;
        });
        document.querySelectorAll('#contact-form [data-ctp]').forEach(function (el) {
            if (el.dataset.krp == null) el.dataset.krp = el.getAttribute('placeholder') || '';
            var k = el.getAttribute('data-ctp');
            el.setAttribute('placeholder', (en && CT_EN[k] != null) ? CT_EN[k] : el.dataset.krp);
        });
        if (typeof ctHrsRender === 'function') ctHrsRender();
    }
    function ctBuildSols() {
        var box = document.getElementById('ct-sols');
        if (!box) return;
        var names = (window.JH_SYS || []).slice();
        var html = names.map(function (n) { return '<button type="button" class="ct-chip" data-v="' + String(n).replace(/"/g, '&quot;') + '"></button>'; }).join('');
        html += '<button type="button" class="ct-chip ct-custom" data-v="맞춤 개발(새 플랫폼)"></button>';
        box.innerHTML = html;
        var chips = box.querySelectorAll('.ct-chip');
        names.forEach(function (n, i) { chips[i].textContent = n; });
        chips[chips.length - 1].textContent = ctT('+ 맞춤 개발 (새 플랫폼)', '+ Custom development');
    }
    function ctShow(type) {
        ctType = type;
        document.getElementById('ct-pick').style.display = type ? 'none' : 'block';
        document.getElementById('ct-body').style.display = type ? 'block' : 'none';
        document.querySelectorAll('#contact-form .ct-pane').forEach(function (p) { p.style.display = (p.getAttribute('data-pane') === type) ? 'block' : 'none'; });
        var names = { lecture: ctT('🎤 강의·출강 의뢰', '🎤 Lecture request'), platform: ctT('🛠 플랫폼·솔루션 개발 문의', '🛠 Platform inquiry'), other: ctT('💬 그 밖의 문의', '💬 Other inquiry') };
        document.getElementById('ct-typename').textContent = type ? names[type] : '';
        if (type === 'platform') ctBuildSols();
        document.getElementById('contact-status').innerText = '';
    }
    function ctPicked(id) {
        return Array.prototype.map.call(document.querySelectorAll('#' + id + ' .ct-chip.on'), function (c) { return c.getAttribute('data-v'); });
    }
    function ctVal(id) { var el = document.getElementById(id); return el ? String(el.value || '').trim() : ''; }

    function ctMode() { return ctPicked('ct-mode')[0] || ''; }
    function ctHrsRender() {
        var r = document.getElementById('ct-hrs');
        if (!r) return;
        var min = ctMode() === '오프라인(대면)' ? 3 : 1;
        if (+r.value < min) r.value = min;
        var touched = r.dataset.touched === '1';
        document.getElementById('ct-hrs-val').textContent = touched ? (r.value + ctT('시간', ' h')) : ctT('아래 막대를 움직여 선택', 'Drag the bar to select');
        document.querySelectorAll('#ct-ticks span').forEach(function (s) {
            s.classList.toggle('off', +s.textContent < min);
            s.classList.toggle('on', touched && +s.textContent === +r.value);
        });
        r.style.setProperty('--p', ((r.value - 1) / 7 * 100) + '%');
    }
    function ctHrsReset() {
        var r = document.getElementById('ct-hrs');
        if (!r) return;
        delete r.dataset.touched;
        r.value = 1;
        ctHrsRender();
    }

    function openContactModal(e) {
        if (e) e.preventDefault();
        ctApply();
        if (ctType) ctShow(ctType);
        document.getElementById('contact-modal').classList.add('open');
    }

    function submitContact(e) {
        e.preventDefault();
        if (!ctType) return;
        const btn = document.getElementById('contact-submit-btn');
        const status = document.getElementById('contact-status');
        const fail = function (msg) { status.innerText = msg; status.style.color = "#fa5252"; };

        const name = ctVal('contact-name'), contact = ctVal('contact-contact');
        let items = [], summary = '';

        if (ctType === 'lecture') {
            const d1 = ctVal('ct-date1'), d2 = ctVal('ct-date2'), flex = document.getElementById('ct-dateflex').checked;
            const target = ctPicked('ct-target'), topic = ctPicked('ct-topic'), mode = ctMode();
            const count = ctVal('ct-count'), region = ctVal('ct-region');
            const hr = document.getElementById('ct-hrs'), hours = hr.dataset.touched === '1' ? hr.value + '시간' : '';
            if (!d1 && !flex) return fail(ctT('희망 일자를 고르시거나 "날짜는 협의 가능"을 체크해 주세요.', 'Please pick a date or tick "Date is negotiable".'));
            if (!target.length) return fail(ctT('강의 대상을 선택해 주세요.', 'Please select the audience.'));
            if (!mode) return fail(ctT('진행 방식(오프라인/온라인)을 선택해 주세요.', 'Please choose offline or online.'));
            if (mode !== '온라인' && !region) return fail(ctT('오프라인 강의는 지역을 입력해 주세요.', 'Please enter the region for an offline session.'));
            if (!topic.length) return fail(ctT('강의 주제를 선택해 주세요.', 'Please select a topic.'));
            items = [
                ['희망일자(1순위)', d1], ['희망일자(2순위)', d2], ['날짜 협의', flex ? '가능' : ''], ['대상', target.join(', ')],
                ['인원', count ? count + '명' : ''], ['진행 방식', mode], ['지역', region],
                ['강의 시간(1일 기준)', hours], ['주제', topic.join(', ')], ['추가 요청사항', ctVal('ct-lnote')]
            ];
            summary = [d1 || (flex ? '일정협의' : ''), count ? count + '명' : '', hours, mode === '온라인' ? '온라인' : region, topic.join('·')].filter(Boolean).join(' / ');
        } else if (ctType === 'platform') {
            const sols = ctPicked('ct-sols'), need = ctVal('ct-pneed');
            if (!need) return fail(ctT('원하시는 내용을 적어 주세요.', 'Please describe what you need.'));
            items = [['관심 솔루션', sols.join(', ')], ['원하시는 내용', need], ['희망 시기', ctVal('ct-pwhen')], ['예산 규모', ctPicked('ct-budget')[0] || '']];
            summary = sols.length ? sols.join(', ') : '솔루션 미선택';
        } else {
            const title = ctVal('contact-title'), content = ctVal('contact-content');
            if (!title || !content) return fail(ctT('제목과 문의내용을 입력해 주세요.', 'Please enter a subject and message.'));
            items = [['제목', title], ['문의내용', content]];
            summary = title;
        }
        if (!name || !contact) return fail(ctT('성함/소속과 연락처를 입력해 주세요.', 'Please enter your name and contact.'));

        if (document.getElementById('contact-consent-hidden').value !== 'true') {
            return fail("개인정보 수집 및 이용에 동의해 주세요.");
        }

        items = items.filter(function (it) { return it[1]; });
        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = "Sending...";
        status.innerText = "";
        status.style.color = "var(--mantine-color-dark-1)";

        google.script.run
            .withSuccessHandler(res => {
                btn.disabled = false;
                btn.innerText = originalText;
                if (res.success) {
                    status.innerText = res.message;
                    status.style.color = "var(--mantine-color-teal-6)";
                    document.getElementById('contact-form').reset();
                    ctHrsReset();
                    document.querySelectorAll('#contact-form .ct-chip.on').forEach(function (c) { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
                    // 동의 상태 초기화
                    document.getElementById('contact-consent-hidden').value = 'false';
                    document.getElementById('contact-consent-area').style.display = 'block';
                    document.getElementById('contact-submit-btn').style.display = 'none';
                    setTimeout(() => { closeModal('contact-modal'); ctShow(null); }, 2000);
                } else {
                    status.innerText = "Error: " + res.message;
                    status.style.color = "#fa5252";
                }
            })
            .withFailureHandler(err => {
                btn.disabled = false;
                btn.innerText = originalText;
                status.innerText = "Connection Error: " + err.message;
                status.style.color = "#fa5252";
            })
            .sendInquiryTyped({ type: ctType, name: name, contact: contact, summary: summary, items: items });
    }

    // 개인정보동의·문의 유형 선택 이벤트 바인딩 (DOM 로드 후)
    document.addEventListener('DOMContentLoaded', () => {
        setupChatScrollIsolation();
        const cy = document.getElementById('consent-yes');
        const cn = document.getElementById('consent-no');
        if (cy) cy.onclick = () => {
            document.getElementById('contact-consent-hidden').value = 'true';
            document.getElementById('contact-consent-area').style.display = 'none';
            document.getElementById('contact-submit-btn').style.display = 'block';
        };
        if (cn) cn.onclick = () => {
            alert("개인정보 수집에 동의하셔야 문의 접수가 가능합니다.");
        };
        document.querySelectorAll('#contact-form [data-type]').forEach(function (b) {
            b.addEventListener('click', function () { ctShow(b.getAttribute('data-type')); });
        });
        const back = document.getElementById('ct-back');
        if (back) back.addEventListener('click', function () { ctShow(null); });
        const hrs = document.getElementById('ct-hrs');
        if (hrs) hrs.addEventListener('input', function () { hrs.dataset.touched = '1'; ctHrsRender(); });
        const form = document.getElementById('contact-form');
        if (form) form.addEventListener('click', function (ev) {
            const chip = ev.target.closest ? ev.target.closest('.ct-chip') : null;
            if (!chip) return;
            const on = !chip.classList.contains('on');
            if (chip.parentNode.classList.contains('ct-single')) {
                chip.parentNode.querySelectorAll('.ct-chip').forEach(function (c) { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
            }
            chip.classList.toggle('on', on);
            chip.setAttribute('aria-pressed', on ? 'true' : 'false');
            if (chip.parentNode.id === 'ct-mode') ctHrsRender();
        });
    });


    // --- AI Assistant Chat Logic ---
    let chatHistory = [];
    let isChatOpen = false;
    let isGreetingLoaded = false;
    let isChatScrollBound = false;

    function setupChatScrollIsolation() {
        if (isChatScrollBound) return;
        const chatWindow = document.getElementById('chat-window');
        const chatMessages = document.getElementById('chat-messages');
        if (!chatWindow || !chatMessages) return;

        chatWindow.addEventListener('wheel', function (e) {
            chatMessages.scrollTop += e.deltaY;
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });

        isChatScrollBound = true;
    }

    function addContactActionBtnToUI() {
        const container = document.getElementById('chat-messages');
        if (!container) return;
        const btnDiv = document.createElement('div');
        btnDiv.className = 'message bot';
        btnDiv.style.background = 'transparent';
        btnDiv.style.padding = '4px 0';
        btnDiv.innerHTML = `
            <button class="chat-action-btn" onclick="openContactModal(event)">
                <span>📨 강의의뢰 / 문의하기 양식 열기</span>
            </button>
        `;
        container.appendChild(btnDiv);
        container.scrollTop = container.scrollHeight;
    }

    function toggleChat() {
        const chatWindow = document.getElementById('chat-window');
        isChatOpen = !isChatOpen;
        var fab = document.getElementById('chat-fab'); if (fab) { fab.classList.remove('pop'); void fab.offsetWidth; fab.classList.add('pop'); }
        clearTimeout(window.__genieT);
        if (window.genieSmoke) window.genieSmoke();
        if (isChatOpen) {
            chatWindow.classList.remove('gout'); chatWindow.classList.remove('gin'); void chatWindow.offsetWidth;
            chatWindow.classList.add('open', 'gin');
            if (!(window.matchMedia && window.matchMedia('(max-width: 860px), (pointer: coarse)').matches)) document.getElementById('chat-input').focus();
            setupChatScrollIsolation();

            // 채팅창 열릴 때 말풍선 숨김
            hideChatWelcomeBubble();

            // 첫 오픈 시 동적 인사말 로드
            if (!isGreetingLoaded) {
                loadInitialGreeting();
            }
        } else {
            chatWindow.classList.remove('gin'); chatWindow.classList.add('gout');
            window.__genieT = setTimeout(function () { chatWindow.classList.remove('open', 'gout'); }, 500);
        }
    }

    // 챗봇 환영 말풍선 제어 (신규)
    const welcomeMessages = [
        "반갑습니다! 장진현 국장님 AI 비서입니다. 무엇을 도와드릴까요? ✨",
        "사회복지 행정 자동화, 실제 현장에서는 어떻게 쓰이는지 궁금하신가요? 🤖",
        "현장의 수고를 덜어내는 AI 기술, 그 비전을 비서가 상세히 안내해 드립니다. 🏢",
        "국장님의 20가지가 넘는 혁신 솔루션들! 제가 하나씩 설명해 드릴 수 있습니다. 🛠️",
        "어려운 복지 업무, AI와 함께라면 더 즐거워집니다. 대화를 시작해 보세요! 🙌"
    ];
    let welcomeMsgIndex = 0;
    let welcomeRotationInterval;

    function showChatWelcomeBubble() {
        if (isChatOpen) return;
        const bubble = document.getElementById('chat-welcome-bubble');
        if (bubble) {
            bubble.style.display = 'block';
            updateWelcomeText();
        }
    }

    function hideChatWelcomeBubble() {
        const bubble = document.getElementById('chat-welcome-bubble');
        if (bubble) {
            bubble.style.display = 'none';
            if (welcomeRotationInterval) clearInterval(welcomeRotationInterval);
        }
    }

    function updateWelcomeText() {
        const textEl = document.querySelector('#chat-welcome-bubble .bubble-text');
        if (textEl) {
            // 부드러운 전환 효과 준비
            textEl.style.opacity = '0';
            setTimeout(() => {
                textEl.innerText = welcomeMessages[welcomeMsgIndex];
                textEl.style.opacity = '1';
                welcomeMsgIndex = (welcomeMsgIndex + 1) % welcomeMessages.length;
            }, 300);
        }
    }

    function startWelcomeMessageRotation() {
        if (welcomeRotationInterval) clearInterval(welcomeRotationInterval);
        welcomeRotationInterval = setInterval(() => {
            if (!isChatOpen) {
                updateWelcomeText();
            }
        }, 20000); // 20초 주기
    }

    function loadInitialGreeting() {
        // 기존 환영 메시지 삭제
        const container = document.getElementById('chat-messages');
        container.innerHTML = '';

        const loadingId = addLoadingMessage();

        google.script.run
            .withSuccessHandler(greeting => {
                removeLoadingMessage(loadingId);
                addMessageToUI('bot', greeting);
                isGreetingLoaded = true;
            })
            .generateInitialGreeting();
    }

    function handleChatKey(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    }

    function sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (!message) return;

        // User message
        addMessageToUI('user', message);
        input.value = '';

        // Add loading state
        const loadingId = addLoadingMessage();

        // ✅ [수정4] chatHistory에서 text가 비어있는 항목을 미리 정제한 뒤 전송
        // user↔model 쌍이 맞지 않거나 빈 text가 있으면 Gemini API가 거부하므로 사전 필터링
        const safeHistory = chatHistory
            .filter(item => item && item.parts && item.parts[0] &&
                typeof item.parts[0].text === 'string' &&
                item.parts[0].text.trim() !== '')
            .slice(-6); // 최근 6개 교환만 유지

        google.script.run
            .withSuccessHandler(response => {
                removeLoadingMessage(loadingId);
                if (response.success && response.text && response.text.trim() !== '') {
                    // 액션 태그 추출 및 정제
                    const cleanText = response.text.replace(/\[ACTION:.*\]/g, '').trim();
                    addMessageToUI('bot', cleanText);

                    // ✅ 성공 시에만 대화 기록에 추가
                    chatHistory.push({ role: "user", parts: [{ text: message }] });
                    chatHistory.push({ role: "model", parts: [{ text: cleanText }] });

                    // 강의의뢰 및 공식 문의 연동 ([ACTION:OPEN_CONTACT] 또는 질문 키워드 감지 시 버튼 생성)
                    const isContactIntent = response.text.includes('[ACTION:OPEN_CONTACT]') ||
                                            /강의|특강|강연|교육 의뢰|세미나/i.test(message);
                    if (isContactIntent) {
                        addContactActionBtnToUI();
                    }

                    // 메일 발송 액션 감지
                    if (response.text.includes('[ACTION:SEND_EMAIL')) {
                        handleEmailAction(response.text);
                    }

                    if (response.botInfo) {
                        const infoText = response.botInfo.keyIndex 
                            ? `API.${response.botInfo.keyIndex}` 
                            : (response.botInfo.model || 'Gemini');
                        document.getElementById('chat-bot-info').innerText = `JINHYUN.AI 비서 (${infoText})`;
                    }
                } else {
                    const errMsg = response.message || "서버 응답 오류가 발생했습니다.";
                    addMessageToUI('bot', errMsg);
                    console.error("Chatbot Error:", response);
                }
            })
            .withFailureHandler(err => {
                removeLoadingMessage(loadingId);
                addMessageToUI('bot', "네트워크 통신 오류가 발생했습니다: " + err.message);
            })
            .getAssistantChatResponse(message, chatHistory.slice(-10)); // 넉넉하게 최근 10개 전송
    }

    function addMessageToUI(sender, text) {
        const container = document.getElementById('chat-messages');
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${sender}`;
        msgDiv.innerText = text;
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
    }

    function addLoadingMessage() {
        const container = document.getElementById('chat-messages');
        const loadingId = 'loading-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message bot loading';
        msgDiv.id = loadingId;
        msgDiv.innerHTML = '<div class="dot-loading"></div><div class="dot-loading"></div><div class="dot-loading"></div>';
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;
        return loadingId;
    }

    function removeLoadingMessage(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function handleEmailAction(text) {
        const tagMatch = text.match(/\[ACTION:SEND_EMAIL\|(.*)\]/);
        if (!tagMatch) return;

        const parts = tagMatch[1].split('|');
        const formData = {};
        parts.forEach(p => {
            const colonIndex = p.indexOf(':');
            if (colonIndex === -1) return;
            const key = p.substring(0, colonIndex).trim();
            const val = p.substring(colonIndex + 1).trim();

            if (key === '제목') formData.title = val;
            if (key === '성함') formData.name = val;
            if (key === '연락처') formData.contact = val;
            if (key === '내용') formData.content = val;
        });

        if (formData.title && formData.name && formData.content) {
            addMessageToUI('bot', "국장님께 내용을 전달해 드리기 전, 개인정보 수집 및 이용 동의가 필요합니다. 동의하시나요?");

            showChatbotConsent((agreed) => {
                if (agreed) {
                    addMessageToUI('bot', "감사합니다. 국장님께 지금 즉시 브리핑을 전달하겠습니다.");
                    google.script.run
                        .withSuccessHandler(res => {
                            if (res.success) {
                                addMessageToUI('bot', "알람: 국장님께 문의 내용과 대화 원문이 안전하게 전달되었습니다. 확인 후 연락드리겠습니다.");
                            }
                        })
                        .sendInquiryEmail(formData, chatHistory);
                } else {
                    addMessageToUI('bot', "동의하지 않으셔서 접수가 취소되었습니다. 더 궁금한 점이 있으시면 언제든 말씀해 주세요.");
                }
            });
        }
    }

    function showChatbotConsent(callback) {
        const container = document.getElementById('chat-messages');
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message bot';
        msgDiv.innerHTML = `
            <div style="display: flex; gap: 10px; margin-top: 10px; width: 100%; flex-wrap: nowrap;">
                <button id="cb-yes" class="consent-btn consent-btn-agree" style="flex:1; height:40px;">✅ 동의함</button>
                <button id="cb-no" class="consent-btn consent-btn-disagree" style="flex:1; height:40px;">❌ 동의안함</button>
            </div>
        `;
        container.appendChild(msgDiv);
        container.scrollTop = container.scrollHeight;

        document.getElementById('cb-yes').onclick = () => {
            msgDiv.remove();
            callback(true);
        };
        document.getElementById('cb-no').onclick = () => {
            msgDiv.remove();
            callback(false);
        };
    }

    // ===================================================
    // Admin Dashboard Logic
    // ===================================================
    let currentRecentChats = []; // 최근 챗봇 대화 상세보기를 위한 임시 저장소

    /**
     * 세션 ID 생성 및 가져오기 (브라우저 탭 세션 동안 유지)
     */
    function getSessionId() {
        let sessionId = sessionStorage.getItem('JH_SESSION_ID');
        if (!sessionId) {
            const now = new Date();
            const datePart = now.getFullYear() +
                String(now.getMonth() + 1).padStart(2, '0') +
                String(now.getDate()).padStart(2, '0');
            const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
            sessionId = `JH_${datePart}_${randomPart}`;
            sessionStorage.setItem('JH_SESSION_ID', sessionId);
        }
        return sessionId;
    }

    /**
     * 서버로 방문 로그 전송 (세션 ID 포함)
     */
    function logFootprint(section, action, detail = '') {
        const sessionId = getSessionId();
        const ua = navigator.userAgent;
        const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua) ? '모바일' : 'PC';
        const osBrowser = ua.substring(0, 80);

        const visitInfo = {
            sessionId: sessionId,
            device: isMobile,
            osBrowser: osBrowser,
            section: section,
            action: action,
            detail: detail,
            lang: typeof currentLang !== 'undefined' ? currentLang : 'kr'
        };

        // 백그라운드 기록
        google.script.run.logVisit(visitInfo);
    }

    // 페이지 로드 시 방문 기록 자동 저장
    window.addEventListener('load', () => {
        logFootprint('Home', '페이지 접속');
    });

    // 관리자 버튼 클릭 → 로그인 모달 오픈
    function openAdminModal() {
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-login-status').innerText = '';
        document.getElementById('admin-login-modal').classList.add('open');
        setTimeout(() => document.getElementById('admin-password').focus(), 300);
    }

    // 관리자 암호 제출
    function submitAdminLogin() {
        const pw = document.getElementById('admin-password').value;
        const statusEl = document.getElementById('admin-login-status');

        if (!pw) {
            statusEl.innerText = '암호를 입력해 주세요.';
            return;
        }

        statusEl.style.color = 'var(--mantine-color-dark-2)';
        statusEl.innerText = '인증 중...';

        google.script.run
            .withSuccessHandler(isValid => {
                if (isValid) {
                    window.__adminPw = pw;
                    closeModal('admin-login-modal');
                    openAdminDashboard();
                } else {
                    statusEl.style.color = '#fa5252';
                    statusEl.innerText = '❌ 암호가 올바르지 않습니다.';
                    document.getElementById('admin-password').value = '';
                    document.getElementById('admin-password').focus();
                }
            })
            .withFailureHandler(err => {
                statusEl.style.color = '#fa5252';
                statusEl.innerText = '연결 오류: ' + err.message;
            })
            .verifyAdminPassword(pw);
    }

    // 대시보드 모달 오픈 및 데이터 로드
    function openAdminDashboard() {
        document.getElementById('admin-dashboard-modal').classList.add('open');

        // 헤더 타이틀에 새로고침 버튼 추가 (중복 방지)
        const titleEl = document.getElementById('dashboard-refresh-time');
        if (titleEl && !document.getElementById('admin-refresh-btn')) {
            const refreshBtn = document.createElement('button');
            refreshBtn.id = 'admin-refresh-btn';
            refreshBtn.className = 'dashboard-refresh-btn';
            refreshBtn.innerText = '🔄 새로고침';
            refreshBtn.onclick = loadAdminDashboard;
            titleEl.parentElement.appendChild(refreshBtn);
        }

        loadAdminDashboard();
    }

    // 대시보드 데이터 로드
    function loadAdminDashboard() {
        const visitBody = document.getElementById('visit-log-body');
        const chatContainer = document.getElementById('chat-log-container');
        const timeEl = document.getElementById('dashboard-refresh-time');

        // 로딩 상태 표시
        visitBody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px; color:var(--mantine-color-dark-3);">⏳ 데이터 로드 중...</td></tr>`;
        chatContainer.innerHTML = `<div class="dashboard-loading">⏳ 대화 기록 로드 중...</div>`;

        google.script.run
            .withSuccessHandler(data => {
                const now = new Date();
                const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} 기준`;
                if (timeEl) timeEl.innerText = timeStr;

                if (!data.success) {
                    visitBody.innerHTML = `<tr><td colspan="3" style="color:#fa5252; padding:10px;">데이터 로드 실패: ${data.message}</td></tr>`;
                    return;
                }

                renderDashboard(data);
            })
            .withFailureHandler(err => {
                visitBody.innerHTML = `<tr><td colspan="3" style="color:#fa5252; padding:10px;">연결 오류: ${err.message}</td></tr>`;
            })
            .getAdminDashboardData(window.__adminPw);
    }

    // 대시보드 데이터 렌더링
    function renderDashboard(data) {
        // 1. 통계 카드
        const todayEl = document.getElementById('stat-today');
        const totalEl = document.getElementById('stat-total');
        const topSystemsEl = document.getElementById('stat-top-systems');

        if (todayEl) todayEl.innerText = data.stats.today || 0;
        if (totalEl) totalEl.innerText = data.stats.total || 0;

        // 인기 솔루션 렌더링
        if (topSystemsEl) {
            const topSystems = data.stats.topSystems || [];
            if (topSystems.length === 0) {
                topSystemsEl.innerHTML = `<div style="font-size: 0.85rem; color: var(--mantine-color-dark-2);">데이터 수집 중...</div>`;
            } else {
                topSystemsEl.innerHTML = topSystems.map((s, i) => `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.9rem; color:white; font-weight:600;">${i + 1}. ${s.name}</span>
                        <span style="font-size:0.75rem; color:var(--jh-blue); font-weight:700;">${s.count} clicks</span>
                    </div>
                `).join('');
            }
        }

        // 2. 방문 로그 테이블
        const visitBody = document.getElementById('visit-log-body');
        if (!data.recentVisits || data.recentVisits.length === 0) {
            visitBody.innerHTML = `<tr><td colspan="3" class="dashboard-empty">방문 기록이 없습니다.</td></tr>`;
        } else {
            visitBody.innerHTML = data.recentVisits.map(v => {
                // 시간 포맷 (HH:MM만 표시)
                const timeStr = String(v.time || '').substring(11, 16) || v.time;
                const dateStr = String(v.time || '').substring(0, 10);
                return `
                    <tr>
                        <td title="${v.time}">${dateStr}<br><span style="color:var(--mantine-color-dark-3);font-size:0.7rem;">${timeStr}</span></td>
                        <td title="${v.device}">${v.device || '-'}</td>
                        <td title="${v.action}">${v.action || '접속'}</td>
                    </tr>
                `;
            }).join('');
        }

        // 3. 챗봇 대화 로그
        const chatContainer = document.getElementById('chat-log-container');
        currentRecentChats = data.recentChats || []; // 데이터 저장

        if (currentRecentChats.length === 0) {
            chatContainer.innerHTML = `<div class="dashboard-empty">최근 챗봇 대화가 없습니다.</div>`;
        } else {
            chatContainer.innerHTML = currentRecentChats.map((c, idx) => {
                const timeStr = String(c.time || '').substring(0, 16).replace('T', ' ');
                // 목록에서는 적절히 생략 (상세보기에서 전체 확인)
                const q = String(c.question || '').length > 45 ? String(c.question).substring(0, 45) + '...' : c.question;
                const a = String(c.answer || '').length > 45 ? String(c.answer).substring(0, 45) + '...' : c.answer;

                return `
                    <div class="chat-log-item" onclick="openChatDetail(${idx})" style="cursor:pointer;">
                        <div class="chat-log-time">🕒 ${timeStr}</div>
                        <div class="chat-log-question">👤 ${q}</div>
                        <div class="chat-log-answer">🤖 ${a}</div>
                    </div>
                `;
            }).join('');
        }
    }

    // 챗봇 대화 상세보기 모달 열기
    function openChatDetail(idx) {
        const chat = currentRecentChats[idx];
        if (!chat) return;

        document.getElementById('detail-chat-time').innerText = `🕒 ${chat.time}`;
        document.getElementById('detail-chat-question').innerText = chat.question;
        document.getElementById('detail-chat-answer').innerText = chat.answer;

        document.getElementById('chat-detail-modal').classList.add('open');
    }

    // 대시보드 모달 바깥 클릭 닫기
    document.addEventListener('DOMContentLoaded', () => {
        const adminLoginModal = document.getElementById('admin-login-modal');
        const adminDashboardModal = document.getElementById('admin-dashboard-modal');
        if (adminLoginModal) {
            adminLoginModal.onclick = (e) => {
                if (e.target === adminLoginModal) closeModal('admin-login-modal');
            };
        }
        if (adminDashboardModal) {
            adminDashboardModal.onclick = (e) => {
                if (e.target === adminDashboardModal) closeModal('admin-dashboard-modal');
            };
        }
    });

/* 요술램프 연기 입자: AI 버튼 위치에서 퍼져 나감 */
window.genieSmoke = function () {
  var fab = document.getElementById('chat-fab'); if (!fab) return;
  var sm = document.getElementById('smoke');
  if (!sm) {
    sm = document.createElement('div'); sm.id = 'smoke';
    var h = ''; for (var i = 0; i < 9; i++) { var ang = (-100 + i * 22) * Math.PI / 180, d = 46 + (i % 3) * 22; h += '<span style="--k:' + i + ';--dx:' + Math.round(Math.cos(ang) * d) + 'px;--dy:' + Math.round(Math.sin(ang) * d - 24) + 'px"></span>'; }
    sm.innerHTML = h; document.body.appendChild(sm);
  }
  var r = fab.getBoundingClientRect(); sm.style.left = (r.left + r.width / 2) + 'px'; sm.style.top = (r.top + r.height / 2) + 'px';
  sm.classList.remove('go'); void sm.offsetWidth; sm.classList.add('go');
  clearTimeout(window.__smokeT); window.__smokeT = setTimeout(function () { sm.classList.remove('go'); }, 1400);
};

/* 팝업 바깥을 누르면 닫힘: 문의/관리자 등 모달 오버레이, AI 비서 창 */
document.addEventListener('click', function (e) {
  var t = e.target; if (!t || !t.closest) return;
  if (t.classList && t.classList.contains('modal-overlay') && t.classList.contains('open')) { t.classList.remove('open'); return; }
  if (typeof isChatOpen !== 'undefined' && isChatOpen) {
    if (t.closest('#chat-window') || t.closest('.chat-fab-container') || t.closest('[onclick*="toggleChat"]') || t.closest('.modal-overlay') || t.closest('.sheet')) return;
    toggleChat();
  }
});
