/**
 * 焼肉 黒耀 — script.js
 *
 * HeaderScroll  スクロールでヘッダー背景付与
 * Drawer        モバイルドロワー開閉
 * ScrollReveal  スクロールアニメーション
 * BackToTop     トップへ戻るボタン
 * SmoothScroll  アンカーリンクのスムーズスクロール
 * MenuTabs      メニュータブ切り替え
 * ContactForm   フォームバリデーション＋擬似送信
 */
(function(){
  'use strict';
 
  /* HeaderScroll */
  const HeaderScroll = {
    el:null,
    init(){
      this.el = document.getElementById('site-header');
      if(!this.el) return;
      window.addEventListener('scroll',()=>this.el.classList.toggle('is-scrolled',scrollY>60),{passive:true});
    }
  };
 
  /* Drawer */
  const Drawer = {
    open:false, btn:null, nav:null,
    init(){
      this.btn = document.getElementById('hamburger');
      this.nav = document.getElementById('drawer');
      if(!this.btn||!this.nav) return;
      this.btn.addEventListener('click',()=>this.open?this.close():this._open());
      this.nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>this.close()));
      document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&this.open)this.close(); });
    },
    _open(){
      this.open=true;
      this.btn.setAttribute('aria-expanded','true');
      this.btn.setAttribute('aria-label','メニューを閉じる');
      this.nav.classList.add('is-open');
      document.body.classList.add('is-locked');
    },
    close(){
      this.open=false;
      this.btn.setAttribute('aria-expanded','false');
      this.btn.setAttribute('aria-label','メニューを開く');
      this.nav.classList.remove('is-open');
      document.body.classList.remove('is-locked');
    }
  };
 
  /* ScrollReveal */
  const ScrollReveal = {
    init(){
      const els = document.querySelectorAll('[data-reveal]');
      if(!els.length) return;
      if(!('IntersectionObserver' in window)){
        els.forEach(e=>e.classList.add('is-on')); return;
      }
      const obs = new IntersectionObserver(entries=>{
        entries.forEach(en=>{
          if(!en.isIntersecting) return;
          en.target.classList.add('is-on');
          obs.unobserve(en.target);
        });
      },{threshold:.1,rootMargin:'0px 0px -48px 0px'});
      els.forEach(e=>obs.observe(e));
    }
  };
 
  /* BackToTop */
  const BackToTop = {
    init(){
      const el = document.getElementById('btt');
      if(!el) return;
      window.addEventListener('scroll',()=>el.classList.toggle('is-on',scrollY>600),{passive:true});
      el.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}));
    }
  };
 
  /* SmoothScroll */
  const SmoothScroll = {
    init(){
      document.querySelectorAll('a[href^="#"]').forEach(a=>{
        a.addEventListener('click',e=>{
          const id=a.getAttribute('href');
          if(id==='#') return;
          const target=document.querySelector(id);
          if(!target) return;
          e.preventDefault();
          const hh=document.querySelector('.site-header')?.offsetHeight??72;
          scrollTo({top:target.getBoundingClientRect().top+scrollY-hh-8,behavior:'smooth'});
        });
      });
    }
  };
 
  /* MenuTabs */
  const MenuTabs = {
    init(){
      const tabs   = document.querySelectorAll('.menu-tab');
      const panels = document.querySelectorAll('.menu-panel');
      if(!tabs.length) return;
      tabs.forEach(tab=>{
        tab.addEventListener('click',()=>{
          tabs.forEach(t=>{ t.classList.remove('is-active'); t.setAttribute('aria-selected','false'); });
          panels.forEach(p=>p.classList.remove('is-active'));
          tab.classList.add('is-active');
          tab.setAttribute('aria-selected','true');
          document.getElementById(tab.dataset.panel)?.classList.add('is-active');
        });
      });
    }
  };
 
  /* ContactForm */
  const ContactForm = {
    RULES:{
      name:    v=>v.trim().length>0   ||'お名前を入力してください',
      date:    v=>v!==''              ||'ご希望日を選択してください',
      guests:  v=>v!==''              ||'人数を選択してください',
      tel:     v=>/^[\d\-\+\(\)\s]{10,}$/.test(v.trim())||'正しい電話番号を入力してください',
      email:   v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())||'正しいメールアドレスを入力してください',
    },
    form:null, btn:null,
    init(){
      this.form=document.getElementById('reserve-form');
      this.btn=document.getElementById('form-submit');
      if(!this.form) return;
      Object.keys(this.RULES).forEach(name=>{
        const f=this.form.elements[name];
        if(!f) return;
        f.addEventListener('blur',()=>this._chk(f));
        f.addEventListener('change',()=>{ f.style.borderColor=''; });
      });
      this.form.addEventListener('submit',this._send.bind(this));
    },
    _chk(f){
      const r=this.RULES[f.name]; if(!r) return true;
      const ok=r(f.value)===true;
      f.style.borderColor=ok?'':'#c9682c';
      return ok;
    },
    _all(){
      let ok=true;
      Object.keys(this.RULES).forEach(n=>{ const f=this.form.elements[n]; if(f&&!this._chk(f))ok=false; });
      return ok;
    },
    async _send(e){
      e.preventDefault();
      if(!this._all()) return;
      if(this.btn){ this.btn.textContent='送信中...'; this.btn.disabled=true; }
      await new Promise(r=>setTimeout(r,1400));
      this.form.innerHTML=`
        <div style="text-align:center;padding:3rem 1rem">
          <div style="width:56px;height:56px;border-radius:50%;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;font-size:1.4rem;color:var(--gold)">✓</div>
          <p style="font-family:var(--f-jp);font-size:1.2rem;letter-spacing:.1em;color:var(--white);margin-bottom:1rem">ご予約を承りました</p>
          <p style="font-size:.85rem;color:var(--white-4);line-height:2;letter-spacing:.04em">確認のご連絡を差し上げます。<br>2営業日以内にご連絡いたします。</p>
        </div>`;
    }
  };
 
  /* Parallax */
  const Parallax = {
    els: [],
    ticking: false,
    init() {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      this.els = Array.from(document.querySelectorAll('.parallax-photo'));
      if (!this.els.length) return;
      window.addEventListener('scroll', this._run.bind(this), {passive:true});
    },
    _run() {
      if (this.ticking) return;
      this.ticking = true;
      requestAnimationFrame(() => {
        const sy = window.scrollY;
        this.els.forEach(el => {
          const rect = el.closest('[class]').getBoundingClientRect();
          const vy = window.innerHeight;
          if (rect.bottom < 0 || rect.top > vy) return;
          const ratio = (rect.top / vy - 0.5);
          el.style.transform = `translateY(${ratio * 40}px)`;
        });
        this.ticking = false;
      });
    }
  };
 
  /* 営業時間ステータス表示 */
  const HoursStatus = {
    /* 営業時間（曜日ごと）: [開始h, 開始m, 終了h, 終了m] / null=定休 */
    HOURS: {
      0: null,              // 日曜: 16-22:30
      1: [17,0, 23,30],    // 月
      2: [17,0, 23,30],    // 火
      3: [17,0, 23,30],    // 水
      4: [17,0, 23,30],    // 木
      5: [17,0, 23,30],    // 金
      6: [16,0, 23,30],    // 土
    },
    HOURS_SUN: [16,0, 22,30],
    init() {
      const el = document.getElementById('open-status');
      if (!el) return;
      const now  = new Date();
      const day  = now.getDay();
      const h    = now.getHours();
      const m    = now.getMinutes();
      const mins = h * 60 + m;
 
      let hours = this.HOURS[day];
      if (day === 0) hours = this.HOURS_SUN;
 
      let open = false;
      if (hours) {
        const start = hours[0] * 60 + hours[1];
        const end   = hours[2] * 60 + hours[3];
        open = mins >= start && mins < end;
      }
 
      if (open) {
        el.textContent = '営業中';
        el.className = 'status-badge status-badge--open';
      } else {
        el.textContent = '準備中';
        el.style.color = 'var(--white-4)';
        el.style.background = 'rgba(255,255,255,.05)';
        el.style.border = '1px solid rgba(255,255,255,.1)';
        el.style.borderRadius = '100px';
        el.style.fontSize = '.6rem';
        el.style.fontFamily = 'var(--f-ui)';
        el.style.letterSpacing = '.08em';
        el.style.padding = '3px 8px';
      }
    }
  };
 
  /* FAQ — アコーディオン制御
     ・<details> をそのまま使うのでJSが落ちても開閉自体は動く（PE設計）
     ・他のアイテムが開いていたら自動で閉じる（同時に1つだけ開く）
     ・初期表示で先頭1件だけ開いた状態にし、ファーストビューでの認知性UP */
  const Faq = {
    init() {
      const items = document.querySelectorAll('.faq-item');
      if (!items.length) return;
      items.forEach(d => {
        d.addEventListener('toggle', () => {
          if (!d.open) return;
          items.forEach(o => { if (o !== d && o.open) o.open = false; });
        });
      });
      // 初期表示：先頭1件を開く（任意。閉じておきたい場合はこの行を削除）
      items[0].open = true;
    }
  };
 
  /* モバイル/デスクトップで電車案内の表示切り替え */
  const TransitToggle = {
    init() {
      const mobileEl  = document.querySelector('.transit-mobile-only');
      const desktopEl = document.querySelector('.transit-desktop-only');
      if (!mobileEl || !desktopEl) return;
      const update = () => {
        const isMobile = window.matchMedia('(max-width:767px)').matches;
        mobileEl.style.display  = isMobile ? 'block' : 'none';
        desktopEl.style.display = isMobile ? 'none'  : 'block';
      };
      update();
      window.matchMedia('(max-width:767px)').addEventListener('change', update);
    }
  };
 
  /* Init */
  document.addEventListener('DOMContentLoaded',()=>{
    HeaderScroll.init();
    Drawer.init();
    ScrollReveal.init();
    BackToTop.init();
    SmoothScroll.init();
    MenuTabs.init();
    ContactForm.init();
    Parallax.init();
    HoursStatus.init();
    TransitToggle.init();
    Faq.init();
  });
 
})();
 
