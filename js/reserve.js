/**
 * 焼肉 黒耀 — 予約システム script.js
 *
 * モジュール構成:
 *   Store        全予約状態を一元管理（日付/人数/時刻/フォーム）
 *   AvailData    空席ダミーデータの生成（実APIに差し替え可能）
 *   Calendar     カレンダーUI（月送り、日付選択、空き状況表示）
 *   Guests       人数選択UI
 *   TimeSlots    時間帯選択UI（○/△/×表示）
 *   Steps        ステップインジケーターの進捗管理
 *   Summary      右カラム予約サマリ＋進捗バー
 *   ContactForm  入力フォーム＋バリデーション
 *   App          全体の初期化と接続
 *
 * 実運用への差し替え：
 *   AvailData.fetch(date) を実APIコールに置き換えるだけで
 *   フロント側はそのまま動作します。
 */
(function () {
  'use strict';

  /* ============================================================
     ユーティリティ
     ============================================================ */
  const Util = {
    /** Date を YYYY-MM-DD 文字列に */
    ymd(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    },
    /** "YYYY-MM-DD" を「M/D（曜）」表示に */
    fmtDateJa(ymd) {
      if (!ymd) return '';
      const [y, m, d] = ymd.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const w = ['日', '月', '火', '水', '木', '金', '土'][dt.getDay()];
      return `${m}/${d}（${w}）`;
    },
    /** 文字列ハッシュ（決定論的擬似乱数のシードに） */
    hash(str) {
      let h = 0;
      for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
      }
      return Math.abs(h);
    },
  };

  /* ============================================================
     Store — 予約状態の一元管理（簡易 pub/sub）
     ============================================================ */
  const Store = {
    state: {
      date: null,       // "YYYY-MM-DD"
      guests: null,     // 2..8
      time: null,       // "HH:MM"
      form: {},         // {name, kana, tel, email, course, message, agree}
    },
    listeners: [],
    set(patch) {
      Object.assign(this.state, patch);
      this.listeners.forEach(fn => fn(this.state));
    },
    on(fn) { this.listeners.push(fn); },
    get() { return this.state; },
  };

  /* ============================================================
     AvailData — ダミー空き状況データ
     決定論的擬似乱数で「日付ごとに毎回同じ空き状況」を再現
     ============================================================ */
  const AvailData = {
    /** 営業時間帯（30分刻み） */
    TIME_SLOTS: [
      '17:00', '17:30', '18:00', '18:30',
      '19:00', '19:30', '20:00', '20:30',
      '21:00', '21:30',
    ],

    /** 曜日別営業ステータス: 0=日曜, 1=月... 6=土 */
    // 月曜定休と仮定（既存サイトのHoursStatusに揃える場合は適宜調整）
    isClosed(date) {
      // dateは Date オブジェクト
      // ここでは「定休日なし」として運用。実運用時は曜日や祝日カレンダーで判定。
      return false;
    },

    /** その日の空席状況を返す → { '17:00': 'ok'|'few'|'full', ... } */
    fetch(ymd) {
      const result = {};
      const seed = Util.hash(ymd);

      // 曜日で全体の混み具合を変える（金土は混雑、平日は空き多め）
      const [y, m, d] = ymd.split('-').map(Number);
      const dow = new Date(y, m - 1, d).getDay();
      const busy = (dow === 5 || dow === 6) ? 0.55 : 0.25; // 0=空き多, 1=満席

      this.TIME_SLOTS.forEach((t, i) => {
        // 19:00-20:30 はゴールデンタイムで満席率高め
        const isGolden = (i >= 4 && i <= 7);
        // 決定論的擬似乱数
        const r = ((seed * 9301 + i * 49297) % 233280) / 233280;
        const threshold = r + (isGolden ? -0.15 : 0) - busy;

        if (threshold < -0.15)      result[t] = 'full';
        else if (threshold < 0.15)  result[t] = 'few';
        else                        result[t] = 'ok';
      });

      return result;
    },

    /** 日付全体のサマリ状況（カレンダー表示用）→ 'ok'|'few'|'full'|'off' */
    summary(ymd, date) {
      if (this.isClosed(date)) return 'off';
      const slots = this.fetch(ymd);
      const counts = { ok: 0, few: 0, full: 0 };
      Object.values(slots).forEach(s => counts[s]++);
      if (counts.ok >= 4) return 'ok';
      if (counts.ok + counts.few >= 2) return 'few';
      return 'full';
    },
  };

  /* ============================================================
     Calendar — カレンダーUI
     ============================================================ */
  const Calendar = {
    grid: null, title: null, prev: null, next: null,
    cursor: null,       // 表示中の月（Date, 月初日）
    today: null,
    selected: null,     // "YYYY-MM-DD"
    maxAhead: 60,       // 何日先まで予約可能か

    init() {
      this.grid  = document.getElementById('rv-cal-grid');
      this.title = document.getElementById('rv-cal-title');
      this.prev  = document.getElementById('rv-cal-prev');
      this.next  = document.getElementById('rv-cal-next');
      if (!this.grid) return;

      this.today = new Date();
      this.today.setHours(0, 0, 0, 0);
      this.cursor = new Date(this.today.getFullYear(), this.today.getMonth(), 1);

      this.prev.addEventListener('click', () => this.shift(-1));
      this.next.addEventListener('click', () => this.shift(1));

      this.render();
    },

    shift(delta) {
      const next = new Date(this.cursor.getFullYear(), this.cursor.getMonth() + delta, 1);
      // 過去には戻らない
      const currentMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
      if (next < currentMonth) return;
      this.cursor = next;
      this.render();
    },

    render() {
      const y = this.cursor.getFullYear();
      const m = this.cursor.getMonth();
      this.title.textContent = `${y}年 ${m + 1}月`;

      // 前月ボタンの無効化判定
      const currentMonth = new Date(this.today.getFullYear(), this.today.getMonth(), 1);
      this.prev.disabled = this.cursor <= currentMonth;

      // グリッド生成
      this.grid.innerHTML = '';
      const firstDow = new Date(y, m, 1).getDay();
      const lastDate = new Date(y, m + 1, 0).getDate();
      const maxDate = new Date(this.today);
      maxDate.setDate(maxDate.getDate() + this.maxAhead);

      // 先頭の空セル
      for (let i = 0; i < firstDow; i++) {
        const empty = document.createElement('div');
        empty.className = 'rv-day rv-day--empty';
        this.grid.appendChild(empty);
      }

      // 日付セル
      for (let d = 1; d <= lastDate; d++) {
        const date = new Date(y, m, d);
        const ymd = Util.ymd(date);
        const dow = date.getDay();
        const isPast = date < this.today;
        const isOverMax = date > maxDate;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rv-day';
        btn.setAttribute('role', 'gridcell');
        btn.setAttribute('data-date', ymd);
        if (dow === 0) btn.classList.add('rv-day--sun');
        if (dow === 6) btn.classList.add('rv-day--sat');
        if (date.getTime() === this.today.getTime()) btn.classList.add('is-today');

        const numEl = document.createElement('span');
        numEl.className = 'rv-day__num';
        numEl.textContent = d;
        btn.appendChild(numEl);

        const markEl = document.createElement('span');
        markEl.className = 'rv-day__mark';
        btn.appendChild(markEl);

        if (isPast || isOverMax) {
          btn.classList.add('rv-day--past');
          btn.disabled = true;
          markEl.textContent = '';
        } else {
          const status = AvailData.summary(ymd, date);
          btn.classList.add(`rv-day--${status}`);
          markEl.textContent = { ok: '○', few: '△', full: '×', off: '休' }[status];
          btn.setAttribute('aria-label',
            `${y}年${m + 1}月${d}日 ${['日','月','火','水','木','金','土'][dow]}曜日 ` +
            { ok: '空席あり', few: '残りわずか', full: '満席', off: '定休日' }[status]
          );
          if (status === 'full' || status === 'off') {
            btn.disabled = true;
          } else {
            btn.addEventListener('click', () => this.select(ymd));
          }
        }

        // 選択中の維持
        if (this.selected === ymd) btn.classList.add('is-selected');

        this.grid.appendChild(btn);
      }
    },

    select(ymd) {
      this.selected = ymd;
      // 既存の選択ハイライトを更新
      this.grid.querySelectorAll('.rv-day').forEach(el => {
        el.classList.toggle('is-selected', el.dataset.date === ymd);
      });
      Store.set({ date: ymd, time: null }); // 日付変更時は時刻リセット
    },
  };

  /* ============================================================
     Guests — 人数選択UI
     ============================================================ */
  const Guests = {
    OPTIONS: [2, 3, 4, 5, 6, 7, 8],
    el: null,
    selected: null,

    init() {
      this.el = document.getElementById('rv-guests');
      if (!this.el) return;
      this.render();
    },

    render() {
      this.el.innerHTML = '';
      this.OPTIONS.forEach(n => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'rv-guest';
        btn.setAttribute('role', 'radio');
        btn.setAttribute('aria-checked', 'false');
        btn.setAttribute('data-guests', String(n));
        btn.innerHTML = `
          <span class="rv-guest__num">${n}</span>
          <span class="rv-guest__unit">名</span>
        `;
        btn.addEventListener('click', () => this.select(n));
        this.el.appendChild(btn);
      });
    },

    select(n) {
      this.selected = n;
      this.el.querySelectorAll('.rv-guest').forEach(b => {
        const on = Number(b.dataset.guests) === n;
        b.classList.toggle('is-selected', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      Store.set({ guests: n });
    },
  };

  /* ============================================================
     TimeSlots — 時間帯選択UI
     ============================================================ */
  const TimeSlots = {
    el: null,
    selected: null,
    currentDate: null,

    init() {
      this.el = document.getElementById('rv-time');
      if (!this.el) return;
      Store.on(state => this.update(state));
    },

    update(state) {
      // 日付と人数が両方そろってから時間帯を表示
      if (!state.date || !state.guests) {
        this.el.innerHTML = `
          <div class="rv-time__placeholder">
            日付と人数をお選びください。
          </div>`;
        this.currentDate = null;
        return;
      }

      // 同じ日付・人数で再描画はしない（パフォーマンス）
      const key = `${state.date}_${state.guests}`;
      if (this.currentDate === key) {
        // 選択中の同期だけ
        this.syncSelection(state.time);
        return;
      }
      this.currentDate = key;

      const slots = AvailData.fetch(state.date);
      const dateLabel = Util.fmtDateJa(state.date);

      let html = `
        <div class="rv-time__header">
          <p class="rv-time__date">
            <strong>${dateLabel}</strong>
            <span class="rv-time__sub">${state.guests}名様 / ご来店時刻をお選びください</span>
          </p>
        </div>
        <div class="rv-time__grid">
      `;

      AvailData.TIME_SLOTS.forEach(t => {
        const status = slots[t];
        const symbol = { ok: '○', few: '△', full: '×' }[status];
        const label  = { ok: '空席あり', few: '残りわずか', full: '満席' }[status];
        const disabled = status === 'full' ? 'disabled' : '';
        html += `
          <button type="button"
                  class="rv-slot rv-slot--${status}"
                  data-time="${t}"
                  aria-label="${t} ${label}"
                  ${disabled}>
            <span class="rv-slot__time">${t}</span>
            <span class="rv-slot__status" aria-hidden="true">${symbol}</span>
            <span class="rv-slot__label">${label}</span>
          </button>
        `;
      });

      html += '</div>';
      this.el.innerHTML = html;

      // クリックイベント
      this.el.querySelectorAll('.rv-slot:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => this.select(btn.dataset.time));
      });
    },

    select(t) {
      this.selected = t;
      this.syncSelection(t);
      Store.set({ time: t });
    },

    syncSelection(t) {
      if (!this.el) return;
      this.el.querySelectorAll('.rv-slot').forEach(b => {
        b.classList.toggle('is-selected', b.dataset.time === t);
      });
    },
  };

  /* ============================================================
     Steps — ステップインジケーター
     ============================================================ */
  const Steps = {
    items: null,
    init() {
      this.items = document.querySelectorAll('.rv-steps__item');
      Store.on(state => this.update(state));
    },
    update(state) {
      // 現在のステップ判定
      const filled = [!!state.date, !!state.guests, !!state.time, this._formOk(state.form)];
      let activeIdx = filled.findIndex(v => !v);
      if (activeIdx === -1) activeIdx = 3;

      this.items.forEach((el, i) => {
        el.classList.remove('is-active', 'is-done');
        if (filled[i]) el.classList.add('is-done');
        if (i === activeIdx) el.classList.add('is-active');
      });
    },
    _formOk(form) {
      return form && form.name && form.tel && form.email && form.agree;
    },
  };

  /* ============================================================
     Summary — 右カラム予約サマリ
     ============================================================ */
  const Summary = {
    elDate: null, elGuests: null, elTime: null, elCourse: null,
    elBar: null, elBarTxt: null, elSubmit: null,

    COURSE_LABELS: {
      '': '未定',
      'kiri': '桐コース',
      'take': '竹コース',
      'matsu': '松コース',
      'alacarte': '単品のみ',
    },

    init() {
      this.elDate    = document.getElementById('sum-date');
      this.elGuests  = document.getElementById('sum-guests');
      this.elTime    = document.getElementById('sum-time');
      this.elCourse  = document.getElementById('sum-course');
      this.elBar     = document.getElementById('sum-progress');
      this.elBarTxt  = document.getElementById('sum-progress-text');
      this.elSubmit  = document.getElementById('form-submit');

      Store.on(state => this.update(state));
    },

    update(state) {
      this._set(this.elDate,   state.date ? Util.fmtDateJa(state.date) : '未選択', !!state.date);
      this._set(this.elGuests, state.guests ? `${state.guests}名様` : '未選択', !!state.guests);
      this._set(this.elTime,   state.time || '未選択', !!state.time);
      const course = state.form?.course;
      this._set(this.elCourse, this.COURSE_LABELS[course || ''], !!course);

      // 進捗バー（4ステップ）
      const steps = [
        !!state.date,
        !!state.guests,
        !!state.time,
        this._formMinOk(state.form),
      ];
      const done = steps.filter(Boolean).length;
      const pct = Math.round((done / 4) * 100);
      this.elBar.style.width = `${pct}%`;
      this.elBarTxt.textContent = `入力進捗 ${pct}%`;

      // 送信ボタン活性化
      const allOk = steps.every(Boolean);
      this.elSubmit.disabled = !allOk;
    },

    _set(el, text, filled) {
      if (!el) return;
      el.textContent = text;
      el.classList.toggle('is-empty', !filled);
      el.classList.toggle('is-filled', filled);
    },

    _formMinOk(form) {
      // 必須項目のうち1つでも埋まれば中間進捗、すべて埋まればOK
      return !!(form && form.name && form.tel && form.email && form.agree);
    },
  };

  /* ============================================================
     ContactForm — 入力フォーム＋バリデーション
     ============================================================ */
  const ContactForm = {
    form: null,

    RULES: {
      name:  v => v.trim().length > 0 || 'お名前を入力してください',
      tel:   v => /^[\d\-\+\(\)\s]{10,}$/.test(v.trim()) || '正しい電話番号を入力してください',
      email: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || '正しいメールアドレスを入力してください',
      agree: f => f.checked || 'プライバシーポリシーへの同意が必要です',
    },

    init() {
      this.form = document.getElementById('reserve-form');
      if (!this.form) return;

      // 全フィールドの変更を Store に同期
      const fields = ['name', 'kana', 'tel', 'email', 'course-select', 'message'];
      fields.forEach(id => {
        const f = document.getElementById(id);
        if (!f) return;
        const key = id === 'course-select' ? 'course' : id;
        f.addEventListener('input',  () => this._syncForm(key, f.value));
        f.addEventListener('blur',   () => this._validateField(f));
        f.addEventListener('change', () => this._clearError(f));
      });
      // チェックボックス
      const agree = document.getElementById('agree');
      if (agree) {
        agree.addEventListener('change', () => {
          this._syncForm('agree', agree.checked);
          this._clearError(agree);
        });
      }

      this.form.addEventListener('submit', e => this._submit(e));
    },

    _syncForm(key, val) {
      const cur = { ...Store.get().form, [key]: val };
      Store.set({ form: cur });
    },

    _validateField(f) {
      const name = f.name || f.id;
      const rule = this.RULES[name];
      if (!rule) return true;
      const result = rule(f.type === 'checkbox' ? f : f.value);
      const ok = result === true;
      f.classList.toggle('is-invalid', !ok);
      const errEl = document.querySelector(`[data-err-for="${name}"]`);
      if (errEl) errEl.textContent = ok ? '' : String(result);
      return ok;
    },

    _clearError(f) {
      f.classList.remove('is-invalid');
      const errEl = document.querySelector(`[data-err-for="${f.name || f.id}"]`);
      if (errEl) errEl.textContent = '';
    },

    _validateAll() {
      let ok = true;
      ['name', 'tel', 'email'].forEach(n => {
        const f = this.form.elements[n];
        if (f && !this._validateField(f)) ok = false;
      });
      const agree = document.getElementById('agree');
      if (agree && !this._validateField(agree)) ok = false;
      return ok;
    },

    async _submit(e) {
      e.preventDefault();
      const state = Store.get();

      // ステップ未完了チェック
      const missing = [];
      if (!state.date)   missing.push('日付');
      if (!state.guests) missing.push('人数');
      if (!state.time)   missing.push('時刻');
      if (missing.length) {
        alert(`${missing.join('・')}を選択してください。`);
        return;
      }

      if (!this._validateAll()) return;

      // 送信中表示
      const btn = document.getElementById('form-submit');
      const origHTML = btn.innerHTML;
      btn.innerHTML = '送信中...';
      btn.disabled = true;

      // 擬似送信（実APIに置き換え可能）
      await new Promise(r => setTimeout(r, 1400));

      // 完了画面に差し替え
      this._showDone(state);
    },

    _showDone(state) {
      const courseLabel = Summary.COURSE_LABELS[state.form?.course || ''] || '未定';
      this.form.innerHTML = `
        <div class="rv-done">
          <div class="rv-done__icon" aria-hidden="true">✓</div>
          <p class="rv-done__title">ご予約を承りました</p>
          <div class="rv-done__detail">
            <dl>
              <div class="rv-done__row"><dt>ご来店日</dt><dd>${Util.fmtDateJa(state.date)}</dd></div>
              <div class="rv-done__row"><dt>ご来店時刻</dt><dd>${state.time}</dd></div>
              <div class="rv-done__row"><dt>人数</dt><dd>${state.guests}名様</dd></div>
              <div class="rv-done__row"><dt>コース</dt><dd>${courseLabel}</dd></div>
              <div class="rv-done__row"><dt>お名前</dt><dd>${this._esc(state.form.name)} 様</dd></div>
            </dl>
          </div>
          <p class="rv-done__note">
            ご登録のメールアドレスに確認メールをお送りしました。<br>
            当日のご来店、心よりお待ちしております。
          </p>
          <div class="rv-done__actions">
            <a href="index.html" class="btn btn--gold">
              ホームへ戻る
              <svg class="btn__arr" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4"/>
              </svg>
            </a>
          </div>
        </div>
      `;
      // 完了画面までスクロール
      this.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    _esc(s) {
      return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    },
  };

  /* ============================================================
     App — 初期化
     ============================================================ */
  const App = {
    init() {
      Calendar.init();
      Guests.init();
      TimeSlots.init();
      Steps.init();
      Summary.init();
      ContactForm.init();

      // 初回描画
      Store.set({});
    },
  };

  document.addEventListener('DOMContentLoaded', () => App.init());
})();
