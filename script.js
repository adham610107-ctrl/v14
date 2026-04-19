// ============================================================
// PRO EXAM v12 — Main Script
// Full Google Sheets CloudDB sync per-user stats,
// AutoKick, EyeComfort dark mode fix, BuyCoffee(7x magic),
// Certificate mobile, iOS notch, Timer fix
// ============================================================

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzC4-Axk2bQsnHJYxMhzn0fblk48j2fWAheHhCxJF5as8fH-NKlIgV0-C7uO6mQfHAM/exec";
const DB_URL            = "https://script.google.com/macros/s/AKfycbz5f2V0eKXyglWPZ6tiWC0P1ASBjJc4d_9nKfWoCYJSHhPJSn5opLxkIRamjfp3UuiyMA/exec";

const subjectNames = {
    musiqa_nazariyasi:  "Musiqa nazariyasi",
    cholgu_ijrochiligi: "Cholg'u ijrochiligi",
    vokal_ijrochiligi:  "Vokal ijrochiligi",
    metodika_repertuar: "Metodika"
};

// ===== GOOGLE SHEETS DB =====
async function dbSave(key, value) {
    try {
        await fetch(DB_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'set', key, value: JSON.stringify(value) })
        });
    } catch(e) { console.warn('dbSave:', e); }
}
async function dbLoad(key) {
    try {
        const r = await fetch(DB_URL + '?action=get&key=' + encodeURIComponent(key));
        const j = await r.json();
        if (j && j.value != null) return JSON.parse(j.value);
    } catch(e) { console.warn('dbLoad:', e); }
    return null;
}
async function saveLeaderboard(user, score, subject, mode) {
    try {
        await fetch(DB_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'leaderboard', user, score, subject, mode, date: new Date().toISOString() })
        });
    } catch(e) {}
}
async function sendLog(type, data) {
    try {
        await fetch(DB_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'log', type, data, user: localStorage.getItem('pro_exam_name') || 'unknown', date: new Date().toISOString() })
        });
    } catch(e) {}
}

// Throttled db save — avoid spam while answering
let dbSaveTimer = null;
function scheduledDbSave() {
    if (dbSaveTimer) clearTimeout(dbSaveTimer);
    dbSaveTimer = setTimeout(() => {
        if (currentUser) dbSave('stats_' + currentUser, stats);
    }, 2000);
}

// ===== INDEXEDDB — PWA Device ID =====
const IDB_NAME = 'adham_pro_db', IDB_VERSION = 1;
let dbInstance = null;
function openIDB() {
    return new Promise((res,rej) => {
        if (dbInstance) { res(dbInstance); return; }
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = e => { const db=e.target.result; if(!db.objectStoreNames.contains('kv')) db.createObjectStore('kv',{keyPath:'key'}); };
        req.onsuccess = e => { dbInstance=e.target.result; res(dbInstance); };
        req.onerror = () => rej(req.error);
    });
}
async function idbGet(key) {
    try {
        const db = await openIDB();
        return new Promise((res,rej) => {
            const tx = db.transaction('kv','readonly');
            const req = tx.objectStore('kv').get(key);
            req.onsuccess = () => res(req.result ? req.result.value : null);
            req.onerror = () => rej(req.error);
        });
    } catch(e) { return localStorage.getItem(key); }
}
async function idbSet(key, value) {
    try {
        const db = await openIDB();
        return new Promise((res,rej) => {
            const tx = db.transaction('kv','readwrite');
            tx.objectStore('kv').put({key,value});
            tx.oncomplete = () => res(true);
            tx.onerror = () => rej(tx.error);
        });
    } catch(e) { localStorage.setItem(key,value); }
}
async function getOrCreateDeviceId() {
    let d = await idbGet('adham_pro_device_id');
    if (!d) { d = 'dev_'+Math.random().toString(36).substr(2,9)+'_'+Date.now(); await idbSet('adham_pro_device_id',d); }
    return d;
}

// ===== PWA — BUG FIX #3: Strengthen install prompt =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () =>
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(e  => console.log('SW error:', e))
    );
}
let deferredPrompt = null;

// Store prompt as soon as browser fires it
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const b = document.getElementById('install-app-btn');
    if (b) b.classList.remove('hidden');
    console.log('PWA install prompt ready');
});

// Attach click handler after DOM ready
document.addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('install-app-btn');
    if (!b) return;
    b.addEventListener('click', async () => {
        if (!deferredPrompt) {
            console.warn('No install prompt available');
            return;
        }
        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('PWA install outcome:', outcome);
            if (outcome === 'accepted') b.classList.add('hidden');
        } catch (err) {
            console.error('Install prompt error:', err);
        } finally {
            deferredPrompt = null;
        }
    });
});

window.addEventListener('appinstalled', () => {
    const b = document.getElementById('install-app-btn');
    if (b) b.classList.add('hidden');
    deferredPrompt = null;
    console.log('PWA installed successfully');
});

// Dashboard install tugmasi uchun handler
function triggerInstall() {
    if (!deferredPrompt) return;
    try {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(({ outcome }) => {
            if (outcome === 'accepted') {
                const b = document.getElementById('install-app-btn');
                if (b) b.classList.add('hidden');
            }
            deferredPrompt = null;
        });
    } catch(err) {}
}

// ===== SECURITY =====
function copyCard() {
    const el = document.getElementById("card-num") || document.getElementById("card-num-donate");
    const t  = el ? el.innerText : "9860350141282409";
    navigator.clipboard.writeText(t).then(()=>alert("✓ Karta raqami nusxalandi: "+t)).catch(()=>alert("Karta: "+t));
}
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', function(e) {
    if (e.keyCode===123||(e.ctrlKey&&e.shiftKey&&(e.keyCode===73||e.keyCode===74))||(e.ctrlKey&&e.keyCode===85)) { e.preventDefault(); return false; }
    if (e.ctrlKey&&e.keyCode===67) { e.preventDefault(); alert("⚠ Nusxalash (Ctrl+C) qat'iyan taqiqlangan!"); return false; }
});
let cheatWarnings = 0;
document.addEventListener("visibilitychange", () => {
    const ts = document.getElementById("test-screen");
    if (ts && !ts.classList.contains("hidden") && document.hidden) {
        cheatWarnings++;
        if (cheatWarnings >= 3) { alert("❌ 3 marta oynadan chiqdingiz. Sessiya avtomatik yakunlandi!"); finishExam(true); }
        else alert(`⚠ OGOHLANTIRISH (${cheatWarnings}/3)\nBoshqa oynaga o'tish test sessiyasini yakunlaydi!`);
    }
});

// ===== AUTOKICK — every 30s =====
let blockCheckInterval=null, heartbeatInterval=null;
async function checkAdminBlock() {
    const savedName = localStorage.getItem('pro_exam_name');
    if (!savedName) return;
    try {
        const r = await fetch(GOOGLE_SCRIPT_URL, { method:'POST', body: JSON.stringify({action:"check_block",login:savedName}) });
        const result = await r.json();
        if (result.blocked) {
            sendLog('autokick', {reason:'admin_block',login:savedName});
            if (blockCheckInterval) clearInterval(blockCheckInterval);
            if (heartbeatInterval)  clearInterval(heartbeatInterval);
            localStorage.removeItem('pro_exam_auth');
            localStorage.removeItem('pro_exam_name');
            clearInterval(timerInterval);
            alert("🚫 Admin tomonidan bloklangansiz!\nSiz tizimdan chiqarildi.");
            setTimeout(() => location.reload(), 500);
            return;
        }
        // Backend isDemo=false qaytarsa (promoted!) — darhol blurlarni yulib tashlaymiz
        if (typeof result.isDemo !== 'undefined') {
            const wasDemo = isDemoUser;
            isDemoUser = result.isDemo === true;
            localStorage.setItem('pro_exam_demo', isDemoUser ? 'true' : 'false');
            if (!isDemoUser) localStorage.removeItem('pro_exam_demo');
            // Promoted bo'ldi — blurlarni olib tashlaymiz, qayta kirish shart emas
            if (wasDemo && !isDemoUser) {
                applyDemoUI(); // isDemoUser=false bo'lganda barcha blurlarni tozalaydi
                // Demo badge ni ham olib tashlaymiz
                const badge = document.getElementById('demo-nav-badge');
                if (badge) badge.remove();
                // Blockcheck va heartbeat ni ishga tushiramiz
                startBlockCheck(); startHeartbeat();
                // Xursandchilik 🎉
                confetti({ particleCount: 180, spread: 80, origin: { y: 0.6 } });
                setTimeout(() => alert('🎉 Tabriklaymiz! Siz endi TO\'LIQ versiyaga o\'tdingiz!\nBarcha imkoniyatlar ochildi.'), 300);
            }
        }
    } catch(e) {}
}
function startBlockCheck() {
    if (blockCheckInterval) clearInterval(blockCheckInterval);
    blockCheckInterval = setInterval(() => {
        const a = localStorage.getItem('pro_exam_auth');
        if (a === 'true') checkAdminBlock(); else { clearInterval(blockCheckInterval); blockCheckInterval=null; }
    }, 30000);
}
function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(() => { const a=localStorage.getItem('pro_exam_auth'); if(a==='true'&&!document.hidden) checkAdminBlock(); }, 45000);
}

// ===== AUTH =====
// ===== DEMO REJIM =====
let isDemoUser = false;
const DEMO_DAILY_LIMIT = 5;

function getDemoTestsToday() {
    const today = new Date().toISOString().slice(0,10);
    const saved = JSON.parse(localStorage.getItem('demo_tests') || '{"date":"","count":0}');
    if (saved.date !== today) return 0;
    return saved.count;
}
function incrementDemoTests() {
    const today = new Date().toISOString().slice(0,10);
    const saved = JSON.parse(localStorage.getItem('demo_tests') || '{"date":"","count":0}');
    const count = saved.date === today ? saved.count + 1 : 1;
    localStorage.setItem('demo_tests', JSON.stringify({date: today, count}));
    return count;
}
function checkDemoLimit() {
    if (!isDemoUser) return true; // paid user — cheksiz
    const used = getDemoTestsToday();
    if (used >= DEMO_DAILY_LIMIT) {
        showDemoBlockModal('Siz bugun demo testlar limitini to\'ldirdingiz (5/5). Ertaga qayta urinib ko\'ring yoki litsenziya oling.');
        return false;
    }
    return true;
}
function showDemoBlockModal(msg) {
    const m = document.getElementById('modal-demo-block');
    const msgEl = document.getElementById('demo-block-msg');
    if (msgEl && msg) msgEl.innerText = msg;
    if (m) m.style.display = 'flex';
}
function toggleKeygenField() {
    const toggle = document.getElementById('keygen-toggle');
    const field  = document.getElementById('keygen-field');
    const btn    = document.getElementById('btn-auth');
    const hint   = document.getElementById('demo-hint');
    if (toggle.checked) {
        field.classList.remove('hidden');
        btn.innerText  = "Kirish · Tasdiqlash";
        if (hint) hint.classList.add('hidden');
    } else {
        field.classList.add('hidden');
        btn.innerText  = "Demo rejimda kirish";
        if (hint) hint.classList.remove('hidden');
    }
}

async function authenticateUser() {
    const loginVal  = document.getElementById('auth-login').value.trim();
    const passVal   = document.getElementById('auth-password').value.trim();
    const toggle    = document.getElementById('keygen-toggle');
    const hasKeygen = toggle && toggle.checked;
    const keygenVal = hasKeygen ? (document.getElementById('auth-keygen')?.value.trim() || '') : '';
    const errorEl   = document.getElementById('auth-error');
    const btn       = document.getElementById('btn-auth');

    if (!loginVal || !passVal) {
        errorEl.innerText = "Login va Parol majburiy!";
        errorEl.classList.remove('hidden'); return;
    }

    // DOIM backend ga so'rov yuboramiz — demo/paid qarorini SERVER beradi
    // (checkbox faqat keygen maydonini ko'rsatish/yashirish uchun)
    btn.innerText = "Tekshirilmoqda..."; btn.disabled = true;
    errorEl.classList.add('hidden');
    try {
        const deviceId = await getOrCreateDeviceId();
        const r = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ login: loginVal, password: passVal, keygen: keygenVal, deviceId })
        });
        const result = await r.json();
        if (result.success) {
            // isDemoUser ni FAQAT backend javobidan olamiz — checkbox emas!
            isDemoUser = result.isDemo === true;
            localStorage.setItem('pro_exam_auth', 'true');
            localStorage.setItem('pro_exam_name', result.name || loginVal);
            if (isDemoUser) localStorage.setItem('pro_exam_demo', 'true');
            else localStorage.removeItem('pro_exam_demo');
            const snEl = document.getElementById('student-name');
            if (snEl) snEl.value = result.name || loginVal;
            try { sendLog('login', { login: loginVal, deviceId, isDemo: isDemoUser }); } catch(e) {}
            switchScreen('auth-screen', 'welcome-screen');
            if (isDemoUser) {
                alert('⚡ Siz DEMO rejimidasiz!\nKuniga 5 ta test ishlash ruxsat etiladi.\nBa\'zi funksiyalar cheklangan.');
            } else {
                startBlockCheck(); startHeartbeat();
            }
        } else {
            errorEl.innerText = result.message || "Xato login yoki parol!";
            errorEl.classList.remove('hidden');
        }
    } catch(e) {
        errorEl.innerText = "Tarmoqda xatolik. Internetni tekshiring.";
        errorEl.classList.remove('hidden');
        console.error('Auth error:', e);
    } finally {
        btn.innerText = hasKeygen ? "Kirish · Tasdiqlash" : "Demo rejimda kirish";
        btn.disabled = false;
    }
}

// ===== AUDIO & PARTICLES =====
const audioCtx = new (window.AudioContext||window.webkitAudioContext)();
function playFeedback(type) {
    if (audioCtx.state==='suspended') audioCtx.resume();
    const osc=audioCtx.createOscillator(), gain=audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    if (type==='correct') {
        osc.type='sine'; osc.frequency.setValueAtTime(600,audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200,audioCtx.currentTime+0.12);
        gain.gain.setValueAtTime(0.28,audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+0.12);
        osc.start(); osc.stop(audioCtx.currentTime+0.12); if("vibrate"in navigator)navigator.vibrate(50);
    } else {
        osc.type='sawtooth'; osc.frequency.setValueAtTime(280,audioCtx.currentTime); osc.frequency.exponentialRampToValueAtTime(90,audioCtx.currentTime+0.22);
        gain.gain.setValueAtTime(0.28,audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01,audioCtx.currentTime+0.22);
        osc.start(); osc.stop(audioCtx.currentTime+0.22); if("vibrate"in navigator)navigator.vibrate([150,100,150]);
    }
}
function createParticles(event) {
    if (!event) return;
    const x=event.clientX, y=event.clientY;
    for (let i=0;i<14;i++) {
        const p=document.createElement('div'); p.className='magic-particle'; document.body.appendChild(p);
        const dx=(Math.random()-0.5)*130, dy=(Math.random()-0.5)*130;
        p.style.left=x+'px'; p.style.top=y+'px';
        p.animate([{transform:'translate(0,0) scale(1)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(0)`,opacity:0}],{duration:620,easing:'ease-out'});
        setTimeout(()=>p.remove(),620);
    }
}
function speakQuestion(idx) {
    if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const msg=new SpeechSynthesisUtterance(currentTest[idx].q); msg.lang='uz-UZ'; msg.rate=0.9; window.speechSynthesis.speak(msg); }
    else alert("Brauzer ovozli o'qishni qo'llab-quvvatlamaydi.");
}
let comboCount=0, hackerStreak=0, lastAnswerTime=0, totalErrorsInTest=0;
function showComboBadge() { const b=document.getElementById('combo-badge'); b.innerText=`COMBO x${comboCount} 🔥`; b.classList.remove('hidden'); b.style.animation='none'; void b.offsetWidth; b.style.animation='comboPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards'; setTimeout(()=>b.classList.add('hidden'),2000); }
function showHackerBadge() { const b=document.getElementById('hacker-badge'); b.classList.remove('hidden'); b.style.animation='none'; void b.offsetWidth; b.style.animation='comboPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards'; setTimeout(()=>b.classList.add('hidden'),3000); }

// ===== STREAK & GREETING =====
function updateDailyStreak() {
    const today=new Date().toDateString(), lastDate=localStorage.getItem('adham_last_date');
    let streak=parseInt(localStorage.getItem('adham_streak'))||0;
    if (lastDate!==today) {
        const yesterday=new Date(); yesterday.setDate(yesterday.getDate()-1);
        streak=(lastDate===yesterday.toDateString())?streak+1:1;
        localStorage.setItem('adham_last_date',today); localStorage.setItem('adham_streak',streak);
    }
    const e1=document.getElementById('streak-count'), e2=document.getElementById('streak-dash');
    if(e1)e1.innerText=streak; if(e2)e2.innerText=streak;
}
// Soat boshlangan vaqti (last online uchun)
let sessionStartTime = Date.now();

// ===== RAQAMLI SOAT & LAST ONLINE =====
function startDashClock() {
    function tick() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2,'0');
        const m = String(now.getMinutes()).padStart(2,'0');
        const s = String(now.getSeconds()).padStart(2,'0');
        const clk = document.getElementById('dash-clock');
        if (clk) clk.innerText = `${h}:${m}:${s}`;

        // Platformada faollik: sessiya boshidan HOZIRGA qadar o'tgan vaqt (davomiylik)
        const diffSec = Math.floor((Date.now() - sessionStartTime) / 1000);
        const lo = document.getElementById('dash-last-online');
        if (lo) {
            const mm = Math.floor(diffSec / 60);
            const ss = diffSec % 60;
            const hh = Math.floor(mm / 60);
            const rmm = mm % 60;
            if (hh > 0) lo.innerText = `Platformada faollik: ${hh}:${String(rmm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
            else        lo.innerText = `Platformada faollik: ${mm}:${String(ss).padStart(2,'0')}`;
        }
    }
    tick();
    setInterval(tick, 1000);
}

function updateGreeting() {
    const h=new Date().getHours();
    const t=h>=5&&h<12?"Xayrli tong":h>=12&&h<18?"Xayrli kun":h>=18&&h<22?"Xayrli kech":"Xayrli tun";
    const el=document.getElementById('greeting-text'); if(el)el.innerText=t;
}

// ===== GLOBAL STATE =====
let bank=[],currentTest=[],userAnswers=[],currentIndex=0;
let currentUser=null, timerInterval;
let stats=JSON.parse(localStorage.getItem('adham_pro_stats'))||{learned:[],errors:[],history:[]};
let pendingSubject=null, pendingLevelQs=[], testType=null;
let diffTime=900, orderMode='random', isExamMode=false;
let testModeName="";
let donateShownCount=parseInt(localStorage.getItem('adham_donate_count'))||0;
let currentRentgenView='all', currentChartPeriod='daily';

function forceCloseAllModals() { document.querySelectorAll('.modal-overlay').forEach(m=>m.style.display='none'); }
function closeModal(e,id) { if(e.target.id===id) document.getElementById(id).style.display='none'; }
function closeModalDirect(id) { document.getElementById(id).style.display='none'; }

// ===== DATA LOADING =====
async function loadData() {
    const files=['musiqa_nazariyasi.json','cholgu_ijrochiligi.json','vokal_ijrochiligi.json','metodika_repertuar.json'];
    let globalId=1;
    for (const f of files) {
        try {
            const res=await fetch(f); const data=await res.json(); const subName=f.replace('.json','');
            data.forEach(q=>{
                const opts=q.options.filter(o=>o!==null&&o!==undefined&&o.toString().trim()!=='');
                const uniqueOpts=[...new Set(opts)]; const correctText=q.options[q.answer];
                if(uniqueOpts.length===3) uniqueOpts.push("Barcha javoblar to'g'ri");
                bank.push({id:globalId++,subject:subName,q:q.q,originalOpts:uniqueOpts,correctText});
            });
        } catch(e) { console.warn(f+' topilmadi'); }
    }
    const el=document.getElementById('max-learned-total'); if(el)el.innerText=`/ ${bank.length}`;
}

// ===== LOAD USER STATS FROM GOOGLE SHEETS =====
async function loadUserStats(userName) {
    try {
        const cloudStats = await dbLoad('stats_' + userName);
        if (cloudStats) {
            const localRaw    = localStorage.getItem('adham_pro_stats');
            const localStats  = localRaw ? JSON.parse(localRaw) : {learned:[],errors:[],history:[]};
            // Merge learned (cloud + local union — most progress wins)
            const mergedLearned = [...new Set([...(localStats.learned||[]), ...(cloudStats.learned||[])])];
            // Errors: remove any that are now in learned
            const mergedErrors  = [...new Set([...(localStats.errors||[]), ...(cloudStats.errors||[])])].filter(id=>!mergedLearned.includes(id));
            // History: merge by date, take max values
            const histMap={};
            [...(cloudStats.history||[]), ...(localStats.history||[])].forEach(h=>{
                if (!histMap[h.date]) histMap[h.date]={...h};
                else { histMap[h.date].correct=Math.max(histMap[h.date].correct,h.correct||0); histMap[h.date].errors=Math.max(histMap[h.date].errors,h.errors||0); }
            });
            const mergedHistory=Object.values(histMap).sort((a,b)=>a.date.localeCompare(b.date));
            stats={learned:mergedLearned, errors:mergedErrors, history:mergedHistory};
            localStorage.setItem('adham_pro_stats', JSON.stringify(stats));
            // Push merged back to cloud
            dbSave('stats_' + userName, stats);
        }
    } catch(e) { console.warn('loadUserStats error:', e); }
}

// ===== iOS NOTCH FIX =====
function applyIOSNotchFix() {
    const isIOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    if (isIOS) {
        document.body.classList.add('ios-device');
        const s=document.createElement('style');
        s.textContent=`:root{--safe-top:env(safe-area-inset-top,44px);--safe-bottom:env(safe-area-inset-bottom,34px);}.ios-device .global-nav{padding-top:calc(env(safe-area-inset-top,0px)+12px)!important;backdrop-filter:blur(40px) saturate(180%)!important;-webkit-backdrop-filter:blur(40px) saturate(180%)!important;}.ios-device .hero-overlay{padding-top:calc(env(safe-area-inset-top,0px)+20px);padding-bottom:calc(env(safe-area-inset-bottom,0px)+20px);}`;
        document.head.appendChild(s);
    }
}

// ===== INIT =====
// ===== VAQTGA QARAB AVTOMATIK TEMA =====
function applyTimeBasedTheme() {
    // Foydalanuvchi qo'lda o'zgartirgan bo'lsa — unga hurmat
    const manualTheme = localStorage.getItem('theme_manual');
    if (manualTheme) return;

    const h = new Date().getHours();
    const shouldBeDark = (h >= 19 || h < 7); // 19:00 — 07:00 dark
    const isDark = document.body.classList.contains('dark-mode');
    const slider = document.getElementById('theme-slider');

    if (shouldBeDark && !isDark) {
        document.body.classList.replace('light-mode','dark-mode');
        if (slider) slider.checked = true;
        localStorage.setItem('theme','dark');
    } else if (!shouldBeDark && isDark) {
        document.body.classList.replace('dark-mode','light-mode');
        if (slider) slider.checked = false;
        localStorage.setItem('theme','light');
    }
}

window.onload = async () => {
    await loadData();
    const isAuth=localStorage.getItem('pro_exam_auth');
    if (isAuth==='true') {
        const name=localStorage.getItem('pro_exam_name')||'Talaba';
        isDemoUser = localStorage.getItem('pro_exam_demo') === 'true';
        const snEl=document.getElementById('student-name'); if(snEl)snEl.value=name;
        const dnEl=document.getElementById('display-name'); if(dnEl)dnEl.innerText=name;
        currentUser=name;
        document.getElementById('global-nav').classList.remove('hidden');
        applyDemoUI();
        const authScreen=document.getElementById('auth-screen');
        if (authScreen&&!authScreen.classList.contains('hidden')) switchScreen('auth-screen','welcome-screen');
        // CloudDB demo uchun ham ishlaydi
        await loadUserStats(name);
        if (!isDemoUser) { checkAdminBlock(); startBlockCheck(); startHeartbeat(); }
    }
    // Avval saqlangan manual tema, aks holda vaqtga qarab
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        if (savedTheme==='dark') { document.body.classList.replace('light-mode','dark-mode'); const s=document.getElementById('theme-slider'); if(s)s.checked=true; }
    } else {
        applyTimeBasedTheme();
    }
    if (localStorage.getItem('comfort_eye')==='on') applyComfortEye(true);
    applyIOSNotchFix();
    startDashClock();
    updateDashboardStats(); updateDailyStreak(); updateGreeting(); updateProgressChart(currentChartPeriod); updateCategoryProgress();
    // Har soatda tema tekshirilsin
    setInterval(applyTimeBasedTheme, 60 * 60 * 1000);
};

// ===== THEME & COMFORT EYE — v13 =====
function toggleTheme() {
    // Qo'lda o'zgartirilsa — avtomatik rejimni bekor qilish
    localStorage.setItem('theme_manual', '1');
    const slider = document.getElementById('theme-slider');
    if (slider && slider.checked) {
        document.body.classList.replace('light-mode', 'dark-mode');
        localStorage.setItem('theme', 'dark');
        // Dark mode + comfort-eye: filter olib tashlanadi, faqat icon "on" ko'rinadi
        if (document.body.classList.contains('comfort-eye')) {
            document.body.classList.remove('comfort-eye');
            document.body.classList.add('comfort-eye-stored');
        }
    } else {
        document.body.classList.replace('dark-mode', 'light-mode');
        localStorage.setItem('theme', 'light');
        // Light modega o'tganda stored comfort-eye ni qaytarish
        if (document.body.classList.contains('comfort-eye-stored') ||
            localStorage.getItem('comfort_eye') === 'on') {
            document.body.classList.remove('comfort-eye-stored');
            applyComfortEye(true);
        }
    }
}

// COMFORT EYE — to'liq body filter (sepia+warm)
// Dark modeda: filter olib tashlanadi, faqat ogohlantirish ko'rsatiladi
// pointer-events muammosi: filter body ga qo'llansa stacking context buzilishi mumkin,
// shuning uchun faqat filter ishlatamiz (blur emas), va modal/button larga z-index ta'sir qilmaydi
function applyComfortEye(on) {
    const btn = document.getElementById('comfortEyeToggle');
    const oe  = document.getElementById('eye-open-icon');
    const ce  = document.getElementById('eye-closed-icon');
    const isDark = document.body.classList.contains('dark-mode');

    if (on) {
        if (isDark) {
            // Dark modeda filter ishlatilmaydi — ogohlantirish ko'rsatiladi
            showComfortEyeDarkWarning();
            // Icon ni "on" ko'rinishda qoldirish (preference saqlansin)
            if (btn) btn.classList.add('eye-active');
            if (oe)  oe.classList.add('active-eye');
            if (ce)  ce.classList.remove('active-eye');
            localStorage.setItem('comfort_eye', 'on');
            document.body.classList.add('comfort-eye-stored');
            return;
        }
        document.body.classList.add('comfort-eye');
        document.body.classList.remove('comfort-eye-stored');
        if (btn) btn.classList.add('eye-active');
        if (oe)  oe.classList.add('active-eye');
        if (ce)  ce.classList.remove('active-eye');
        localStorage.setItem('comfort_eye', 'on');
    } else {
        document.body.classList.remove('comfort-eye');
        document.body.classList.remove('comfort-eye-stored');
        if (btn) btn.classList.remove('eye-active');
        if (ce)  ce.classList.add('active-eye');
        if (oe)  oe.classList.remove('active-eye');
        localStorage.setItem('comfort_eye', 'off');
    }
}

function showComfortEyeDarkWarning() {
    // Non-blocking toast notification
    let toast = document.getElementById('comfort-eye-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'comfort-eye-toast';
        toast.style.cssText = `
            position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
            background:rgba(30,30,30,0.95); color:#FFD580; font-weight:700;
            padding:12px 20px; border-radius:14px; font-size:0.88rem;
            z-index:99999; pointer-events:none; text-align:center;
            border:1px solid rgba(255,210,100,0.3); max-width:280px;
            backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);
            box-shadow:0 8px 24px rgba(0,0,0,0.5);
            animation:toastIn 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
        `;
        toast.innerHTML = `🌙 Qorong'i rejimda ko'z qulayligi<br><span style="opacity:0.75;font-weight:500">Yorug' rejimga o'tsangiz to'liq ishlaydi</span>`;
        document.body.appendChild(toast);
    }
    toast.style.display = 'block';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => { toast.style.display = 'none'; toast.style.animation = ''; }, 300);
    }, 2800);
}

function toggleComfortEye() {
    const isOn = document.body.classList.contains('comfort-eye') ||
                 document.body.classList.contains('comfort-eye-stored');
    applyComfortEye(!isOn);
}

// ===== SCREEN NAV =====
function switchScreen(hideId,showId) {
    forceCloseAllModals();
    document.querySelectorAll('.screen').forEach(s=>{s.classList.remove('active');s.classList.add('hidden');});
    const el=document.getElementById(showId); if(el){el.classList.remove('hidden');el.classList.add('active');}
}

// handleLogin — loads user stats from CloudDB before dashboard
// Demo UI: blur va bloklar
function applyDemoUI() {
    if (!isDemoUser) {
        // Paid user — hamma blur va blokni olib tashlaymiz
        document.querySelectorAll('.demo-blur-wrap').forEach(el => {
            el.style.filter = ''; el.style.pointerEvents = ''; el.style.position = '';
        });
        document.querySelectorAll('.demo-lock-overlay').forEach(el => el.remove());
        const eb = document.getElementById('error-work-btn');
        if (eb) { eb.onclick = () => prepareTest('errors'); }
        const examBtn = document.querySelector('.btn-exam');
        if (examBtn) { examBtn.onclick = () => startExamMode(); }
        return;
    }
    // Demo user — blur qo'shish
    const blurSelectors = ['.stat-card', '.progress-chart-wrap', '.rentgen-dashboard-wrap'];
    blurSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.classList.add('demo-blur-wrap');
            el.style.filter = 'blur(3px)';
            el.style.position = 'relative';
            // Ikkinchi marta qo'shilmasin
            if (!el.querySelector('.demo-lock-overlay')) {
                const ov = document.createElement('div');
                ov.className = 'demo-lock-overlay';
                ov.innerHTML = '🔒';
                ov.onclick = () => showDemoBlockModal('Bu funksiya to\'liq versiyada mavjud. Litsenziya oling.');
                el.appendChild(ov);
            }
        });
    });
    // Xatolar ustida ishlash — to'liq blok
    const eb = document.getElementById('error-work-btn');
    if (eb) { eb.onclick = (e) => { e.preventDefault(); showDemoBlockModal('Xatolar ustida ishlash faqat to\'liq versiyada.'); }; }
    // Imtihon mode — to'liq blok
    const examBtn = document.querySelector('.btn-exam');
    if (examBtn) { examBtn.onclick = (e) => { e.preventDefault(); showDemoBlockModal('Imtihon Mode faqat to\'liq versiyada.'); }; }
    // Demo badge
    const nav = document.getElementById('global-nav');
    if (nav && !document.getElementById('demo-nav-badge')) {
        const badge = document.createElement('div');
        badge.id = 'demo-nav-badge';
        badge.className = 'demo-badge';
        badge.innerHTML = 'DEMO';
        badge.onclick = () => showDemoBlockModal('Demo rejimdan chiqish uchun litsenziya kalit oling.');
        nav.querySelector('.nav-right').prepend(badge);
    }
}

async function handleLogin() {
    const name=document.getElementById('student-name').value.trim();
    if (name.length<2) return alert("Ismingizni kiriting!");
    if (name.toLowerCase()==='adham') alert("Assalomu alaykum, Admin (Creator)! 🔑\nSizga maxsus rejim yoqildi.");
    currentUser=name;
    const dnEl=document.getElementById('display-name'); if(dnEl)dnEl.innerText=name;
    if (audioCtx.state==='suspended') audioCtx.resume();
    document.getElementById('global-nav').classList.remove('hidden');
    // Show loading while fetching cloud stats
    const loginBtn=document.querySelector('#welcome-screen .btn-primary');
    if(loginBtn){loginBtn.innerText="☁ Yuklanmoqda...";loginBtn.disabled=true;}
    await loadUserStats(name);
    if(loginBtn){loginBtn.innerText="Sessiyani Boshlash 🚀";loginBtn.disabled=false;}
    sessionStartTime = Date.now();
    switchScreen('welcome-screen','dashboard-screen');
    applyDemoUI();
    updateDashboardStats(); updateGreeting(); updateProgressChart(currentChartPeriod); updateCategoryProgress(); showRentgenOnDashboard();
}

function goHome() {
    clearInterval(timerInterval); forceCloseAllModals();
    document.getElementById('exit-test-btn').classList.add('hidden');
    const etBarH=document.getElementById('exam-timer-bar');if(etBarH)etBarH.classList.add('hidden');
    document.getElementById('restart-mini-btn').classList.add('hidden');
    document.body.classList.remove('boss-fight-mode');
    const bw=document.getElementById('boss-fight-warning'); if(bw)bw.classList.add('hidden');
    if('speechSynthesis' in window)window.speechSynthesis.cancel();
    stopWaterLoop();
    cheatWarnings=0;comboCount=0;hackerStreak=0;totalErrorsInTest=0;
    switchScreen('test-screen','dashboard-screen');
    updateDashboardStats(); updateProgressChart(currentChartPeriod); updateCategoryProgress(); showRentgenOnDashboard();
}
function confirmExit() {
    const hasErrors = stats.errors && stats.errors.length > 0;
    const answeredCount = userAnswers.filter(a => a !== null).length;
    const wrongCount = userAnswers.filter(a => a !== null && !a.isCorrect).length;

    // Foydalanuvchiga chiqishni tasdiqlash va xatolar taklifini ko'rsatish
    let msg = "Testdan chiqishni xohlaysizmi?\nJoriy test natijalari yo\'qoladi.";
    if (wrongCount > 0 || hasErrors) {
        msg += `\n\n⚠ Sizda ${wrongCount > 0 ? wrongCount + ' ta test xatosi' : stats.errors.length + ' ta saqlangan xato'} bor.\nChiqgandan so\'ng Xatolar ustida ishlashga o\'tilsinmi?`;
    }

    const confirmed = confirm(msg);
    if (!confirmed) return;

    // Chiqish
    goHome();

    // Xatolar bo'lsa taklifni ko'rsatish
    if (wrongCount > 0 || hasErrors) {
        setTimeout(() => {
            const goToErrors = confirm(
                "💡 Xatolar ustida ishlash\n\n" +
                "Noto\'g\'ri javob bergan savollarni qayta mashq qilmoqchimisiz?\n\n" +
                "✅ Ha — Xatolar rejimi boshlanadi\n❌ Yo\'q — Asosiy menyu"
            );
            if (goToErrors && stats.errors.length > 0) {
                prepareTest('errors');
            } else if (goToErrors && stats.errors.length === 0) {
                // Test paytidagi xatolarni qo'shib olish
                const sessionErrors = currentTest.filter((q, idx) => userAnswers[idx] && !userAnswers[idx].isCorrect).map(q => q.id);
                if (sessionErrors.length > 0) {
                    sessionErrors.forEach(id => { if (!stats.errors.includes(id)) stats.errors.push(id); });
                    localStorage.setItem('adham_pro_stats', JSON.stringify(stats));
                    updateDashboardStats();
                    prepareTest('errors');
                }
            }
        }, 400);
    }
}
function logout(){if(confirm("Tizimdan chiqishni xohlaysizmi?")){sendLog('logout',{});localStorage.removeItem('pro_exam_auth');if(blockCheckInterval)clearInterval(blockCheckInterval);if(heartbeatInterval)clearInterval(heartbeatInterval);location.reload();}}

// ===== DASHBOARD STATS — saves to localStorage + Google Sheets =====
function updateDashboardStats() {
    stats.learned=[...new Set(stats.learned)]; stats.errors=[...new Set(stats.errors)];
    localStorage.setItem('adham_pro_stats',JSON.stringify(stats));
    // Cloud save (throttled)
    if (currentUser) scheduledDbSave();
    const lc=document.getElementById('learned-count'),ec=document.getElementById('error-count');
    if(lc)lc.innerText=stats.learned.length; if(ec)ec.innerText=stats.errors.length;
    const eb=document.getElementById('error-work-btn'); if(eb)eb.disabled=stats.errors.length===0;
}
function updateCategoryProgress(){
    ['musiqa_nazariyasi','cholgu_ijrochiligi','vokal_ijrochiligi','metodika_repertuar'].forEach(sub=>{
        const subQs=bank.filter(q=>q.subject===sub); if(!subQs.length)return;
        const learned=subQs.filter(q=>stats.learned.includes(q.id)).length;
        const pct=Math.round((learned/subQs.length)*100);
        const el=document.getElementById('prog-'+sub); if(el)el.innerText=pct+'%';
    });
}
function setChartPeriod(period,btn){currentChartPeriod=period;document.querySelectorAll('.chart-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');updateProgressChart(period);}
function getHistoryByPeriod(period){
    const history=stats.history||[],now=new Date();let labels=[],correctData=[],errorData=[];
    if(period==='daily'){for(let i=6;i>=0;i--){const d=new Date(now);d.setDate(d.getDate()-i);const key=d.toISOString().slice(0,10);const entry=history.find(h=>h.date===key)||{correct:0,errors:0};labels.push(d.toLocaleDateString('uz',{weekday:'short'}));correctData.push(entry.correct||0);errorData.push(entry.errors||0);}}
    else if(period==='weekly'){for(let i=5;i>=0;i--){const ws=new Date(now);ws.setDate(ws.getDate()-ws.getDay()-i*7);const we=new Date(ws);we.setDate(we.getDate()+6);const sk=ws.toISOString().slice(0,10),ek=we.toISOString().slice(0,10);const we2=history.filter(h=>h.date>=sk&&h.date<=ek);labels.push(ws.getDate()+'/'+(ws.getMonth()+1));correctData.push(we2.reduce((s,e)=>s+(e.correct||0),0));errorData.push(we2.reduce((s,e)=>s+(e.errors||0),0));}}
    else{for(let i=5;i>=0;i--){const m=new Date(now.getFullYear(),now.getMonth()-i,1);const key=m.toISOString().slice(0,7);const me=history.filter(h=>h.date.startsWith(key));labels.push(m.toLocaleDateString('uz',{month:'short'}));correctData.push(me.reduce((s,e)=>s+(e.correct||0),0));errorData.push(me.reduce((s,e)=>s+(e.errors||0),0));}}
    return{labels,correctData,errorData};
}
function updateProgressChart(period){
    const canvas=document.getElementById('progressChart');if(!canvas)return;
    const ctx=canvas.getContext('2d');const{labels,correctData,errorData}=getHistoryByPeriod(period);
    const dpr=window.devicePixelRatio||1,W=canvas.offsetWidth||300,H=100;
    canvas.width=W*dpr;canvas.height=H*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);
    const maxVal=Math.max(...correctData,...errorData,1),padL=6,padR=6,padT=10,padB=18,chartW=W-padL-padR,chartH=H-padT-padB,n=labels.length,step=chartW/(n-1||1);

    // FIX: fill va stroke ajratildi — to'g'ri mix-blend-mode siz ikkalasi ham ko'rinadi
    function drawFill(data,color,alpha){
        ctx.save();
        ctx.beginPath();
        data.forEach((v,i)=>{const x=padL+i*step,y=padT+chartH-(v/maxVal)*chartH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
        ctx.lineTo(padL+(n-1)*step,padT+chartH);
        ctx.lineTo(padL,padT+chartH);
        ctx.closePath();
        const grad=ctx.createLinearGradient(0,padT,0,padT+chartH);
        const rgb=color.slice(4,-1); // 'rgb(r,g,b)' => 'r,g,b'
        grad.addColorStop(0,`rgba(${rgb},${alpha})`);
        grad.addColorStop(1,`rgba(${rgb},0)`);
        ctx.fillStyle=grad;
        ctx.fill();
        ctx.restore();
    }
    function drawStroke(data,color){
        ctx.save();
        ctx.beginPath();
        data.forEach((v,i)=>{const x=padL+i*step,y=padT+chartH-(v/maxVal)*chartH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
        ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';
        ctx.stroke();
        // Dots
        data.forEach((v,i)=>{
            if(v===0)return; // 0 qiymatli nuqtalarni chizmaymiz
            const x=padL+i*step,y=padT+chartH-(v/maxVal)*chartH;
            ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);
            ctx.fillStyle=color;ctx.fill();
        });
        ctx.restore();
    }
    // Avval filllar (pastda), keyin strokelar (ustda) — ikkalasi ham aniq ko'rinadi
    drawFill(correctData,'rgb(48,209,88)',0.22);
    drawFill(errorData,'rgb(255,69,58)',0.18);
    drawStroke(correctData,'rgb(48,209,88)');
    drawStroke(errorData,'rgb(255,69,58)');
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--text-sec').trim()||'#6B7280';ctx.font='600 9px DM Sans,sans-serif';ctx.textAlign='center';labels.forEach((l,i)=>ctx.fillText(l,padL+i*step,H-3));
}
function showRentgenOnDashboard(){if(!bank.length)return;const w=document.getElementById('rentgen-dashboard-wrap');if(w){w.style.display='block';updateDashboardRentgen('all');}}
function setRentgenView(view,btn){currentRentgenView=view;document.querySelectorAll('.rentgen-filter .rentgen-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');updateDashboardRentgen(view);}
function updateDashboardRentgen(view){
    const container=document.getElementById('rentgen-dashboard-bars');if(!container)return;container.innerHTML='';
    ['musiqa_nazariyasi','cholgu_ijrochiligi','vokal_ijrochiligi','metodika_repertuar'].forEach(sub=>{
        const subQs=bank.filter(q=>q.subject===sub);if(!subQs.length)return;
        const lc=subQs.filter(q=>stats.learned.includes(q.id)).length,ec=subQs.filter(q=>stats.errors.includes(q.id)).length;
        let value,color,suffix;
        if(view==='errors'){value=Math.round((ec/subQs.length)*100);color='var(--error)';suffix=`${ec} xato`;}
        else if(view==='learned'){value=Math.round((lc/subQs.length)*100);color='var(--success)';suffix=`${lc} to'g'ri`;}
        else{value=Math.round((lc/subQs.length)*100);color=value>=80?'var(--success)':value>=50?'var(--warning)':'var(--error)';suffix=value+'%';}
        container.innerHTML+=`<div class="rentgen-item"><div class="rentgen-label"><span>${subjectNames[sub]}</span><span style="color:${color}">${suffix}</span></div><div class="rentgen-bar-bg"><div class="rentgen-bar-fill" style="width:${value}%;background:${color};"></div></div></div>`;
    });
}

// ===== TEST ENGINE =====
function openLevels(sub,title){
    forceCloseAllModals();pendingSubject=sub;document.getElementById('modal-subject-title').innerText=title;
    const grid=document.getElementById('level-grid-box');grid.innerHTML='';
    let subQs=bank.filter(q=>q.subject===sub);
    for(let i=0;i<10;i++){let start=i*20,end=start+20;if(start>=subQs.length)break;const chunk=subQs.slice(start,end);const learned=chunk.filter(q=>stats.learned.includes(q.id)).length;const isDone=learned===chunk.length;const btn=document.createElement('button');btn.className='lvl-btn';btn.innerHTML=`<b>${i+1}-Daraja</b><span style="font-size:0.78rem;color:${isDone?'var(--success)':'var(--text-sec)'};">${learned}/${chunk.length} ✓</span>`;btn.onclick=()=>{pendingLevelQs=chunk;testType='level';openSetup();};grid.appendChild(btn);}
    document.getElementById('modal-level').style.display='flex';
}
function openChapters(){
    forceCloseAllModals();const grid=document.getElementById('chapters-grid-box');grid.innerHTML='';
    const cleanBank=[...bank].sort((a,b)=>a.id-b.id);const chunks=Math.ceil(cleanBank.length/20);
    for(let i=0;i<chunks;i++){let start=i*20,end=Math.min(start+20,cleanBank.length);const chunk=cleanBank.slice(start,end);const learned=chunk.filter(q=>stats.learned.includes(q.id)).length;const isDone=learned===chunk.length;const btn=document.createElement('button');btn.className='lvl-btn';btn.innerHTML=`<b>${start+1}–${end}</b><span style="font-size:0.78rem;color:${isDone?'var(--success)':'var(--warning)'};">${learned}/${end-start} ✓</span>`;btn.onclick=()=>{pendingLevelQs=chunk;testType='chapter';openSetup();};grid.appendChild(btn);}
    document.getElementById('modal-chapters').style.display='flex';
}
function prepareTest(type){
    if(isDemoUser&&type==='errors'){showDemoBlockModal('Xatolar ustida ishlash faqat to\'liq versiyada.');return;}
    if(!checkDemoLimit())return;
    forceCloseAllModals();
    if(type==='errors'&&stats.errors.length===0)return alert("Hozircha xatolar topilmadi!");
    testType=type;openSetup();
}
function openSetup(){
    forceCloseAllModals();
    const animToggle = document.getElementById('anim-toggle');
    if (animToggle) animToggle.checked = animationsEnabled;
    const txt = document.getElementById('anim-status-text');
    if (txt) txt.innerText = animationsEnabled ? "✨ Yoqilgan (60fps suv fizikasi)" : "⚡ O'chirilgan (batareya tejamkor)";
    document.getElementById('setup-screen').style.display='flex';
}
function setDifficulty(level,btn){document.querySelectorAll('.difficulty-control .seg-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');diffTime=level==='easy'?1200:level==='medium'?900:600;}
function setOrder(mode,btn){document.querySelectorAll('.order-control .seg-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');orderMode=mode;}
function applySetup(){
    forceCloseAllModals();isExamMode=false;cheatWarnings=0;comboCount=0;hackerStreak=0;totalErrorsInTest=0;
    document.body.classList.remove('boss-fight-mode');let pool=[];const cleanBank=[...bank].sort((a,b)=>a.id-b.id);
    if(testType==='level'||testType==='chapter'){pool=[...pendingLevelQs];testModeName=testType==='level'?`${pendingSubject} daraja`:"Bob rejimi";}
    else if(testType==='mix_800'){pool=[...cleanBank].sort(()=>Math.random()-0.5).slice(0,20);testModeName="Aralash Smart Mix";}
    else if(testType==='errors'){pool=cleanBank.filter(q=>stats.errors.includes(q.id)).sort(()=>Math.random()-0.5).slice(0,20);testModeName="Xatolar ustida ishlash";}
    else if(testType==='sub_mix'){pool=cleanBank.filter(q=>q.subject===pendingSubject).sort(()=>Math.random()-0.5).slice(0,20);testModeName=(subjectNames[pendingSubject]||pendingSubject)+" aralash";}
    if(orderMode==='random')pool=pool.sort(()=>Math.random()-0.5);else pool=pool.sort((a,b)=>a.id-b.id);
    // Demo user faqat 5 ta savol oladi
    if(isDemoUser) pool = pool.slice(0, 5);
    currentTest=pool;
    if(isDemoUser) incrementDemoTests();
    startTestSession();
}
function startExamMode(){
    if(isDemoUser){showDemoBlockModal('Imtihon Mode faqat to\'liq versiyada mavjud.');return;}
    forceCloseAllModals();testType='exam';isExamMode=true;testModeName="Imtihon Mode · Boss Fight";
    cheatWarnings=0;comboCount=0;hackerStreak=0;totalErrorsInTest=0;
    let examQs=[];['musiqa_nazariyasi','cholgu_ijrochiligi','vokal_ijrochiligi','metodika_repertuar'].forEach(sub=>{const sQs=bank.filter(q=>q.subject===sub).sort(()=>Math.random()-0.5).slice(0,15);examQs=examQs.concat(sQs);});
    currentTest=examQs.sort(()=>Math.random()-0.5);diffTime=3600;startTestSession();
}
function startTestSession(){
    switchScreen('dashboard-screen','test-screen');
    document.getElementById('exit-test-btn').classList.remove('hidden');
    const etBar=document.getElementById('exam-timer-bar');if(etBar)etBar.classList.remove('hidden');
    document.getElementById('restart-mini-btn').classList.add('hidden');
    sendLog('test_start',{mode:testModeName,count:currentTest.length});
    currentIndex=0;userAnswers=new Array(currentTest.length).fill(null);
    currentTest=currentTest.map(q=>{const shuffledOpts=[...q.originalOpts].sort(()=>Math.random()-0.5);return{...q,options:shuffledOpts,answer:shuffledOpts.indexOf(q.correctText)};});
    clearInterval(timerInterval);startTimer(diffTime);renderMap();renderAllQuestions();
    liquidGreenLevel=0;liquidRedLevel=0;
    Object.assign(waterPhysics,{posX:0,posY:0,velX:0,velY:0,slosX:0,slosY:0,slosVelX:0,slosVelY:0,targetX:0,targetY:0,prevTargetX:0,prevTargetY:0});
    _applyLiquidLevels();stopWaterLoop();
    // Suv div: animatsiya yoqilganda ko'rinadi, o'chirilganda butunlay g'oyib bo'ladi
    const liquidBg = document.getElementById('liquid-gyro-bg');
    if (liquidBg) liquidBg.style.opacity = animationsEnabled ? '1' : '0';
    if(animationsEnabled) initGyro();
}
function startTimer(seconds){
    let time=seconds;
    const timerEl=document.getElementById('exam-timer');
    const timerBar=document.getElementById('exam-timer-bar');
    timerInterval=setInterval(()=>{
        time--;
        const m=Math.floor(time/60),s=time%60;
        if(timerEl)timerEl.innerText=`${m}:${s<10?'0'+s:s}`;
        // Oxirgi 60 soniyada "urgent" holat
        if(timerBar){
            if(time<=60&&time>0) timerBar.classList.add('urgent');
            else timerBar.classList.remove('urgent');
        }
        if(time<=0){clearInterval(timerInterval);showResult(userAnswers.filter(a=>a?.isCorrect).length);}
    },1000);
}
function renderMap(){const mapEl=document.getElementById('indicator-map');if(mapEl)mapEl.innerHTML=currentTest.map((_,i)=>`<div class="dot" id="dot-${i}" onclick="goTo(${i})">${i+1}</div>`).join('');}
function renderAllQuestions(){
    const area=document.getElementById('all-questions-area');if(!area)return;
    const isAdmin=(currentUser||'').toLowerCase()==='adham';
    area.innerHTML=currentTest.map((q,idx)=>{
        const opts=q.options.map((opt,optIdx)=>{const h=isAdmin&&optIdx===q.answer;return`<button class="option-btn${h?' admin-hint':''}" id="btn-${idx}-${optIdx}" onclick="checkAns(${idx},${optIdx},event)" ${userAnswers[idx]?'disabled':''}>${opt}</button>`;}).join('');
        return`<div class="q-block ${idx===currentIndex?'active-q':'blurred-q'}" id="q-block-${idx}"><div class="q-meta"><button class="tts-btn" onclick="speakQuestion(${idx})">🔊</button><div class="spin-box" id="spin-${idx}">${idx+1}</div><span>Savol ${idx+1} / ${currentTest.length}</span></div><div class="q-text">${q.q}</div><div class="options-box" id="opts-${idx}">${opts}</div></div>`;
    }).join('');
    updateMap();scrollToActive();runSpin(currentIndex);
}
function runSpin(idx){const spin=document.getElementById(`spin-${idx}`);if(!spin)return;let sc=0;const si=setInterval(()=>{spin.innerText=Math.floor(Math.random()*currentTest.length)+1;if(++sc>8){clearInterval(si);spin.innerText=idx+1;}},40);}
function updateFocus(){
    for(let i=0;i<currentTest.length;i++){const b=document.getElementById(`q-block-${i}`);if(b){if(i===currentIndex){b.classList.remove('blurred-q');b.classList.add('active-q');runSpin(i);}else{b.classList.remove('active-q');b.classList.add('blurred-q');}}}
    const bw=document.getElementById('boss-fight-warning');
    const isBoss=isExamMode&&currentTest.length>=5&&currentIndex>=currentTest.length-5;
    if(isBoss){
        document.body.classList.add('boss-fight-mode');
        if(bw){bw.classList.remove('hidden');bw.innerText=`⚠ BOSS FIGHT · OXIRGI ${currentTest.length-currentIndex} TA ⚠`;}
    } else {
        document.body.classList.remove('boss-fight-mode');
        if(bw)bw.classList.add('hidden');
    }
    scrollToActive();updateMap();
}
function scrollToActive(){const ab=document.getElementById(`q-block-${currentIndex}`);if(ab)ab.scrollIntoView({behavior:'smooth',block:'center'});const ad=document.getElementById(`dot-${currentIndex}`);if(ad)ad.scrollIntoView({behavior:'smooth',inline:'center'});}
function updateMap(){
    const answered=userAnswers.filter(a=>a!==null).length;const fe=document.getElementById('progress-fill');if(fe)fe.style.width=`${(answered/currentTest.length)*100}%`;
    currentTest.forEach((_,i)=>{const dot=document.getElementById(`dot-${i}`);if(dot){dot.className='dot';if(i===currentIndex)dot.classList.add('active-dot');if(userAnswers[i])dot.classList.add(userAnswers[i].isCorrect?'correct':'wrong');}});
    // Timer bar statistika yangilash
    const total = currentTest.length;
    const correctN = userAnswers.filter(a=>a&&a.isCorrect).length;
    const wrongN   = userAnswers.filter(a=>a&&!a.isCorrect).length;
    const twc=document.getElementById('timer-wrong-count');  if(twc)twc.innerText=wrongN;
    const twt=document.getElementById('timer-wrong-total');  if(twt)twt.innerText='/'+total;
    const trc=document.getElementById('timer-right-count');  if(trc)trc.innerText=correctN;
    const trt=document.getElementById('timer-right-total');  if(trt)trt.innerText='/'+total;
}

// ===== ANSWER =====
function checkAns(qIdx,optIdx,event){
    if(qIdx!==currentIndex||userAnswers[qIdx])return;
    const now=Date.now();if(now-lastAnswerTime<1500){hackerStreak++;if(hackerStreak===10)showHackerBadge();}else hackerStreak=0;lastAnswerTime=now;
    const isCorrect=optIdx===currentTest[qIdx].answer;userAnswers[qIdx]={selected:optIdx,isCorrect};
    const qId=currentTest[qIdx].id;const clickedBtn=document.getElementById(`btn-${qIdx}-${optIdx}`);
    
    // Barcha option tugmalarini disable qilish
    const optsBox=document.getElementById(`opts-${qIdx}`);
    const allBtns=optsBox?optsBox.getElementsByTagName('button'):[];
    for(const b of allBtns)b.disabled=true;
    
    if(isCorrect){
        if(!stats.learned.includes(qId))stats.learned.push(qId);
        stats.errors=stats.errors.filter(id=>id!==qId);
        clickedBtn.classList.add('magic-correct');
        playFeedback('correct');createParticles(event);
        comboCount++;if(comboCount>=3)showComboBadge();
        updateLiquid('correct');
        document.body.classList.add('ambient-success');
        setTimeout(()=>document.body.classList.remove('ambient-success'),650);
        // TO'G'RI: faqat xato variantlarni suvga tashlash (faqat anim yoqilganda)
        if(animationsEnabled) setTimeout(()=>{
            for(let i=0;i<allBtns.length;i++){
                if(allBtns[i]!==clickedBtn) dropToWater(allBtns[i], i * 60);
            }
        }, 300);
    } else {
        if(!stats.errors.includes(qId))stats.errors.push(qId);
        clickedBtn.classList.add('magic-wrong');
        playFeedback('wrong');
        comboCount=0;hackerStreak=0;totalErrorsInTest++;
        updateLiquid('wrong');
        document.body.classList.add('ambient-error');
        setTimeout(()=>document.body.classList.remove('ambient-error'),650);
        if(totalErrorsInTest===1)document.getElementById('restart-mini-btn').classList.remove('hidden');
        // XATO: BARCHA variantlarni suvga tashlash (faqat anim yoqilganda)
        if(animationsEnabled) setTimeout(()=>{
            for(let i=0;i<allBtns.length;i++) dropToWater(allBtns[i], i * 80);
        }, 250);
    }
    
    localStorage.setItem('adham_pro_stats',JSON.stringify(stats));
    scheduledDbSave();
    if(userAnswers.filter(a=>a!==null).length===currentTest.length)document.getElementById('finish-btn').classList.remove('hidden');
    setTimeout(()=>{const next=userAnswers.findIndex(a=>a===null);if(next!==-1){currentIndex=next;updateFocus();}},900);
}

// ===== SUVGA G'ARQ BO'LISH animatsiyasi =====
function dropToWater(btn, delayMs) {
    if(!btn)return;
    // Boshlang'ich pozitsiyani olish
    const rect = btn.getBoundingClientRect();
    const screenH = window.innerHeight;
    
    // Tugmani fixed pozitsiyaga o'tkazib, original joydan animatsiya boshlash
    const clone = btn.cloneNode(true);
    clone.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        margin: 0;
        z-index: 8000;
        pointer-events: none;
        transition: none;
        opacity: 1;
        border-radius: 12px;
        overflow: hidden;
        font-size: ${getComputedStyle(btn).fontSize};
        padding: ${getComputedStyle(btn).padding};
        background: ${getComputedStyle(btn).background};
        color: ${getComputedStyle(btn).color};
        border: ${getComputedStyle(btn).border};
        font-weight: ${getComputedStyle(btn).fontWeight};
    `;
    document.body.appendChild(clone);
    
    // Asl tugmani yashirish
    btn.style.visibility = 'hidden';
    btn.style.opacity = '0';
    
    // Animatsiya: pastga tushish + burish + kichrayish (suvga kirish)
    setTimeout(() => {
        const fallDistance = screenH - rect.top + 60;
        const randomX = (Math.random() - 0.5) * 80;
        const randomRot = (Math.random() - 0.5) * 40;
        
        clone.style.transition = `transform 0.75s cubic-bezier(0.55,0,1,0.45), opacity 0.55s ease-in 0.3s`;
        clone.style.transform = `translate(${randomX}px, ${fallDistance}px) rotate(${randomRot}deg) scale(0.3)`;
        clone.style.opacity = '0';
        
        // Suvga kirganda to'lqin impulse
        setTimeout(() => {
            addWaterSplash();
        }, 650);
        
        // Cloneni tozalash
        setTimeout(() => { 
            if(clone.parentNode) clone.parentNode.removeChild(clone);
        }, 900);
    }, delayMs);
}

// Suvga tushganda to'lqin impulsini kuchaytirish
function addWaterSplash() {
    const p = waterPhysics;
    // Random yo'nalishda kichik impulse berish
    p.slosVelX += (Math.random() - 0.5) * 0.4;
    p.slosVelY += Math.random() * 0.2 + 0.1; // Doim pastga (suv qo'zg'aladi)
    updateLiquid('splash');
}
function move(step){const n=currentIndex+step;if(n>=0&&n<currentTest.length){currentIndex=n;updateFocus();}}
function goTo(i){currentIndex=i;updateFocus();}
function confirmRestart(){document.getElementById('modal-restart').style.display='flex';}
function doRestart(){
    closeModalDirect('modal-restart');clearInterval(timerInterval);currentIndex=0;userAnswers=new Array(currentTest.length).fill(null);comboCount=0;hackerStreak=0;totalErrorsInTest=0;
    document.body.classList.remove('boss-fight-mode');document.getElementById('finish-btn').classList.add('hidden');document.getElementById('restart-mini-btn').classList.add('hidden');
    const bw=document.getElementById('boss-fight-warning');if(bw)bw.classList.add('hidden');startTimer(diffTime);renderAllQuestions();
}

// ===== FINISH & RESULTS =====
function finishExam(force=false){
    clearInterval(timerInterval);document.body.classList.remove('boss-fight-mode');
    const bw=document.getElementById('boss-fight-warning');if(bw)bw.classList.add('hidden');
    document.getElementById('restart-mini-btn').classList.add('hidden');
    const correctCount=userAnswers.filter(a=>a?.isCorrect).length;
    if(!isExamMode&&correctCount<currentTest.length&&!force){
        alert(`Natija: ${correctCount}/${currentTest.length}.\nQoidaga ko'ra, 100% to'g'ri bo'lmaguncha savollar qayta beriladi.`);
        currentTest=shuffleArray(currentTest).map(q=>{const ct=q.options[q.answer];const so=shuffleArray([...q.options]);return{...q,options:so,answer:so.indexOf(ct)};});
        userAnswers=new Array(currentTest.length).fill(null);currentIndex=0;totalErrorsInTest=0;comboCount=0;
        startTimer(diffTime);renderAllQuestions();document.getElementById('finish-btn').classList.add('hidden');
    }else{
        recordHistory(correctCount,currentTest.length-correctCount);
        showResult(correctCount);
        const pct=Math.round((correctCount/currentTest.length)*100);
        const subjects=[...new Set(currentTest.map(q=>q.subject))].join(',');
        saveLeaderboard(currentUser||'Unknown',pct,subjects,testModeName);
        sendLog('test_finish',{mode:testModeName,correct:correctCount,total:currentTest.length,pct});
        // Final sync to Google Sheets
        if(currentUser) dbSave('stats_'+currentUser, stats);
    }
}
function shuffleArray(arr){return arr.sort(()=>Math.random()-0.5);}
function recordHistory(correct,errors){
    const today=new Date().toISOString().slice(0,10);if(!stats.history)stats.history=[];
    const existing=stats.history.find(h=>h.date===today);
    if(existing){existing.correct+=correct;existing.errors+=errors;}
    else{stats.history.push({date:today,correct,errors});if(stats.history.length>180)stats.history.shift();}
    localStorage.setItem('adham_pro_stats',JSON.stringify(stats));
}
function showResult(correctCount){
    const percent=Math.round((correctCount/currentTest.length)*100);
    document.getElementById('result-percent').innerText=`${percent}%`;
    let msg='',color='';
    if(percent>=90){msg="Muhtasham natija! Siz haqiqiy mutaxassissiz. 🏆";color="var(--success)";confetti({particleCount:220,spread:90,origin:{y:0.6}});
        // Sertifikat faqat PAID userlarga
        if(!isDemoUser) document.getElementById('cert-btn').style.display='block';
        else { document.getElementById('cert-btn').style.display='none'; setTimeout(()=>showDemoBlockModal('Sertifikat faqat to\'liq versiya foydalanuvchilari uchun!'),600); }
    }
    else if(percent>=70){msg="Yaxshi ko'rsatkich! Akademik cho'qqiga oz qoldi. 👍";color="var(--primary)";document.getElementById('cert-btn').style.display='none';}
    else if(percent>=50){msg="Qoniqarli! Intellektual salohiyatingiz bundan baland. 📚";color="var(--warning)";document.getElementById('cert-btn').style.display='none';}
    else{msg="Chuqur tahlil qiling va qayta urinib ko'ring! ⚠";color="var(--error)";document.getElementById('cert-btn').style.display='none';}
    document.getElementById('result-msg').innerText=msg;
    const donut=document.getElementById('result-donut');donut.style.borderColor=color;donut.style.boxShadow=`0 0 35px ${color}`;document.getElementById('result-percent').style.color=color;
    renderRentgenBars('all');renderTradingChart();forceCloseAllModals();document.getElementById('modal-result').style.display='flex';
    donateShownCount++;
    localStorage.setItem('adham_donate_count', donateShownCount);
    // Har 3 testdan keyin Buy Me Coffee modali
    if (donateShownCount % 3 === 0) {
        setTimeout(() => { forceCloseAllModals(); showBuyCoffeeModal(); }, 3000);
    }
}

// ===== BUY ME COFFEE =====
function showBuyCoffeeModal(){const modal=document.getElementById('modal-donate');if(!modal)return;modal.style.display='flex';const content=modal.querySelector('.modal-content');if(content){content.style.animation='none';void content.offsetWidth;content.style.animation='coffeeModalIn 0.6s cubic-bezier(0.175,0.885,0.32,1.275) forwards';}}
function closeCoffeeModal(){const modal=document.getElementById('modal-donate');if(!modal)return;const content=modal.querySelector('.modal-content');for(let i=0;i<20;i++)spawnMagicStar(content);if(content){content.style.animation='coffeeModalOut 0.7s cubic-bezier(0.68,-0.55,0.265,1.55) forwards';setTimeout(()=>{modal.style.display='none';content.style.animation='';},700);}else modal.style.display='none';}
function spawnMagicStar(anchor){const rect=anchor?anchor.getBoundingClientRect():{left:window.innerWidth/2,top:window.innerHeight/2,width:0,height:0};const star=document.createElement('div');star.className='coffee-magic-star';star.innerText=['☕','⭐','✨','💛','🎉','🌟'][Math.floor(Math.random()*6)];star.style.left=(rect.left+rect.width/2)+'px';star.style.top=(rect.top+rect.height/2)+'px';document.body.appendChild(star);const angle=Math.random()*Math.PI*2,dist=80+Math.random()*120,dx=Math.cos(angle)*dist,dy=Math.sin(angle)*dist;star.animate([{transform:'translate(0,0) scale(0.5) rotate(0deg)',opacity:1},{transform:`translate(${dx}px,${dy}px) scale(1.5) rotate(${Math.random()*360}deg)`,opacity:0}],{duration:700+Math.random()*300,easing:'ease-out'});setTimeout(()=>star.remove(),1100);}

// ===== RENTGEN =====
function setResultRentgenView(view,btn){document.querySelectorAll('.rentgen-filter-result .rentgen-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderRentgenBars(view);}
function renderRentgenBars(view){
    const bc=document.getElementById('rentgen-bars');if(!bc)return;bc.innerHTML='';
    const subjectsInTest=[...new Set(currentTest.map(q=>q.subject))];
    subjectsInTest.forEach(sub=>{
        const subQs=currentTest.filter(q=>q.subject===sub);
        const subCorrect=subQs.filter((q)=>{const idx=currentTest.indexOf(q);return userAnswers[idx]&&userAnswers[idx].isCorrect;}).length;
        const subPercent=Math.round((subCorrect/subQs.length)*100),subError=100-subPercent;
        let barColor,subMsg,displayValue;
        if(view==='errors'){displayValue=subError;barColor=subError>50?'var(--error)':'var(--warning)';subMsg=`${subQs.length-subCorrect} xato`;}
        else if(view==='learned'){displayValue=subPercent;barColor=subPercent>=90?'var(--success)':subPercent>=60?'var(--warning)':'var(--error)';subMsg=`${subCorrect} to'g'ri`;}
        else{displayValue=subPercent;barColor=subPercent>=90?'var(--success)':subPercent>=60?'var(--warning)':'var(--error)';subMsg=subPercent>=90?'(Ajoyib!)':subPercent>=60?'(Yaxshi)':'(Kuchsiz)';}
        bc.innerHTML+=`<div class="rentgen-item"><div class="rentgen-label"><span>${subjectNames[sub]||sub} ${view==='all'?subMsg:''}</span><span style="color:${barColor}">${view==='all'?subPercent+'%':(view==='errors'?(subQs.length-subCorrect)+' xato':subCorrect+" to'g'ri")}</span></div><div class="rentgen-bar-bg"><div class="rentgen-bar-fill" style="width:${displayValue}%;background:${barColor};"></div></div></div>`;
    });
}
function renderTradingChart(){
    const canvas=document.getElementById('tradingChart');if(!canvas)return;const ctx=canvas.getContext('2d');const dpr=window.devicePixelRatio||1,W=canvas.offsetWidth||380,H=90;canvas.width=W*dpr;canvas.height=H*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,W,H);
    const ca=[],ea=[];let c=0,e=0;userAnswers.forEach(ans=>{if(ans===null)return;if(ans.isCorrect)c++;else e++;ca.push(c);ea.push(e);});if(!ca.length)return;
    const maxVal=Math.max(...ca,...ea,1),padL=6,padR=6,padT=8,padB=6,chartW=W-padL-padR,chartH=H-padT-padB,n=ca.length,step=n>1?chartW/(n-1):chartW;
    function drawTL(data,color){ctx.beginPath();data.forEach((v,i)=>{const x=padL+i*step,y=padT+chartH-(v/maxVal)*chartH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});const grad=ctx.createLinearGradient(0,padT,0,padT+chartH);const rgba=color.includes('48,209')?'48,209,88':'255,69,58';grad.addColorStop(0,`rgba(${rgba},0.2)`);grad.addColorStop(1,`rgba(${rgba},0)`);ctx.lineTo(padL+(n-1)*step,padT+chartH);ctx.lineTo(padL,padT+chartH);ctx.closePath();ctx.fillStyle=grad;ctx.fill();ctx.beginPath();data.forEach((v,i)=>{const x=padL+i*step,y=padT+chartH-(v/maxVal)*chartH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});ctx.strokeStyle=color;ctx.lineWidth=2;ctx.lineJoin='round';ctx.stroke();}
    drawTL(ea,'rgb(255,69,58)');drawTL(ca,'rgb(48,209,88)');
}

// ===== CERTIFICATE =====
function showCertificate(){
    const today=new Date();const dateStr=`${today.getDate().toString().padStart(2,'0')}.${(today.getMonth()+1).toString().padStart(2,'0')}.${today.getFullYear()}`;
    document.getElementById('cert-student-name').innerText=currentUser||"Noma'lum Talaba";
    document.getElementById('cert-mode-name').innerText=testModeName||"Test";
    document.getElementById('cert-score').innerText=document.getElementById('result-percent').innerText;
    document.getElementById('cert-global-stats').innerText=`${stats.learned.length}/${bank.length}`;
    document.getElementById('cert-date').innerText=dateStr;
    const barsEl=document.getElementById('cert-subject-bars');
    if(barsEl){barsEl.innerHTML='';const subjectsInTest=[...new Set(currentTest.map(q=>q.subject))];subjectsInTest.forEach(sub=>{const subQs=currentTest.filter(q=>q.subject===sub);const subCorrect=subQs.filter((q)=>{const idx=currentTest.indexOf(q);return userAnswers[idx]&&userAnswers[idx].isCorrect;}).length;const pct=Math.round((subCorrect/subQs.length)*100);barsEl.innerHTML+=`<div class="cert-sub-bar-wrap"><span class="cert-sub-label">${subjectNames[sub]||sub}</span><div class="cert-sub-bar-bg"><div class="cert-sub-bar-fill" style="width:${pct}%"></div></div><span class="cert-sub-pct">${pct}%</span></div>`;});}
    forceCloseAllModals();document.getElementById('modal-cert').style.display='flex';
    confetti({particleCount:300,spread:130,origin:{y:0.5},colors:['#D4AF37','#FFF8E7','#FFFFFF']});
}
async function downloadCertificate(){
    const certEl=document.getElementById('printable-cert');if(!certEl)return;
    const btn=document.querySelector('.cert-download-btn');
    if(btn){btn.innerText='⏳ Tayyorlanmoqda...';btn.disabled=true;}
    try{
        // html-to-image — glassmorphism va CSS effektlarni to'g'ri oladi
        const dataUrl = await htmlToImage.toPng(certEl, {
            pixelRatio: 3,
            backgroundColor: null,  // shaffof fon (CSS background saqlanadi)
            cacheBust: true,
            style: { borderRadius: '10px' }
        });
        const link=document.createElement('a');
        link.download=`muttest_Sertifikat_${(currentUser||'Talaba').replace(/\s/g,'_')}.png`;
        link.href=dataUrl; link.click();
        sendLog('cert_download',{user:currentUser,mode:testModeName});
    }catch(e){
        // Fallback: html2canvas
        try{
            const canvas=await html2canvas(certEl,{scale:2,backgroundColor:'#0A0A0A',useCORS:true});
            const link=document.createElement('a');
            link.download='muttest_Sertifikat.png';
            link.href=canvas.toDataURL('image/png');link.click();
        }catch(e2){window.print();}
    }finally{if(btn){btn.innerText='⬇ Yuklab olish (PNG)';btn.disabled=false;}}
}

// ============================================================
// LIQUID GYROSCOPE — Haqiqiy suv fizikasi effekti
// ============================================================
let liquidGreenLevel = 0;
let liquidRedLevel   = 0;
let gyroX = 0, gyroY = 0;
let gyroVelX = 0, gyroVelY = 0;
let gyroActive = false;

// ============================================================
// REAL WATER PHYSICS — Butilkadagi haqiqiy suv fizikasi
// ============================================================
let gyroRafId = null;
let animationsEnabled = localStorage.getItem('anim_enabled') === 'true';

function toggleAnimations(checkbox) {
    if (checkbox.checked && !animationsEnabled) {
        // Confirm dialog
        // Eski dialog bo'lsa o'chirish
        const old = document.getElementById('anim-confirm-dialog');
        if (old) old.remove();

        const modal = document.createElement('div');
        modal.id = 'anim-confirm-dialog'; // Hardcoded ID — confirmAnim aniq topadi
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
        modal.dataset.checkbox = ''; // checkbox referansi saqlanmaydi — ID orqali topamiz
        modal.innerHTML = `
            <div style="background:var(--card-solid);border-radius:20px;padding:28px;max-width:340px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="font-size:2rem;margin-bottom:10px;">⚡</div>
                <h3 style="font-family:'Playfair Display',serif;margin-bottom:10px;color:var(--text);">Fizika Animatsiyasi</h3>
                <p style="color:var(--text-2);font-size:0.92rem;line-height:1.6;margin-bottom:20px;">
                    Bu animatsiyalar <b>akkumulyator quvvatini ko'proq sarflaydi</b>.<br>Yoqishni xohlaysizmi?
                </p>
                <div style="display:flex;gap:10px;">
                    <button onclick="confirmAnim(false)" style="flex:1;padding:13px;border-radius:12px;background:var(--card-alt);border:1px solid var(--glass-border);color:var(--text);font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;">O'chirish</button>
                    <button onclick="confirmAnim(true)" style="flex:2;padding:13px;border-radius:12px;background:var(--primary);color:#fff;border:none;font-weight:800;cursor:pointer;font-family:'DM Sans',sans-serif;">Tushundim ✓</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    } else if (!checkbox.checked) {
        animationsEnabled = false;
        localStorage.setItem('anim_enabled', 'false');
        stopWaterLoop();
        const txt = document.getElementById('anim-status-text');
        if (txt) txt.innerText = "⚡ O'chirilgan (batareya tejamkor)";
    }
}
function confirmAnim(yes) {
    // ID orqali aniq topamiz — DOM traversal yo'q
    const modal = document.getElementById('anim-confirm-dialog');
    const checkbox = document.getElementById('anim-toggle');
    const txt = document.getElementById('anim-status-text');
    if (yes) {
        animationsEnabled = true;
        localStorage.setItem('anim_enabled', 'true');
        if (checkbox) checkbox.checked = true;
        if (txt) txt.innerText = "✨ Yoqilgan (60fps suv fizikasi)";
    } else {
        animationsEnabled = false;
        localStorage.setItem('anim_enabled', 'false');
        if (checkbox) checkbox.checked = false;
        if (txt) txt.innerText = "⚡ O'chirilgan (batareya tejamkor)";
    }
    if (modal) modal.remove();
}

// Fizika holati
const waterPhysics = {
    // Qurilma burchagi (maqsad)
    targetX: 0, targetY: 0,
    // Hozirgi holat
    posX: 0, posY: 0,
    // Tezlik (inertiya)
    velX: 0, velY: 0,
    // Siltanish amplitudasi (qo'shimcha to'lqin)
    slosX: 0, slosY: 0,
    slosVelX: 0, slosVelY: 0,
    // Oxirgi delta uchun
    prevTargetX: 0, prevTargetY: 0,
    // Fizika konstantalari
    DAMPING:   0.88,   // Inertiya so'nishi (0.85-0.92 natural ko'rinadi)
    SPRING:    0.14,   // Bahor kuchi (qurilma holatiga tortish)
    SLOSH_DAMPING: 0.92, // Siltanish so'nishi
    SLOSH_SPRING:  0.08, // Siltanish bahori
    MAX_TILT:  18,     // Maksimal og'ish (piksel)
    MAX_SLOSH: 10,     // Maksimal siltanish
};

function initGyro() {
    if (gyroActive || !window.DeviceOrientationEvent) {
        // Gyro yo'q qurilmalarda ham rAF loop ishlasin (animatsiya uchun)
        startWaterLoop();
        return;
    }
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ — birinchi touch eventida so'rash
        const askOnce = () => {
            DeviceOrientationEvent.requestPermission()
                .then(state => {
                    if (state === 'granted') { attachGyroListener(); gyroActive = true; }
                })
                .catch(() => {});
            document.removeEventListener('touchstart', askOnce);
        };
        document.addEventListener('touchstart', askOnce, { once: true });
        startWaterLoop();
    } else {
        attachGyroListener();
        gyroActive = true;
        startWaterLoop();
    }
}

function attachGyroListener() {
    window.addEventListener('deviceorientation', (e) => {
        // gamma: chapga/o'ngga (-90..90), beta: oldinga/orqaga (-180..180)
        const gamma = Math.max(-45, Math.min(45, e.gamma || 0));
        const beta  = Math.max(-30, Math.min(30, (e.beta  || 0) - 45));
        
        // Normalizatsiya: -1..1 oraliqqa
        waterPhysics.targetX = gamma / 45;
        waterPhysics.targetY = beta  / 30;
    }, { passive: true });
}

function startWaterLoop() {
    if (gyroRafId) return;
    function loop() {
        const p = waterPhysics;
        
        // Siltanish: maqsad o'zgarganda impulse qo'shish
        const dX = p.targetX - p.prevTargetX;
        const dY = p.targetY - p.prevTargetY;
        p.slosVelX += dX * 0.6;
        p.slosVelY += dY * 0.4;
        p.prevTargetX = p.targetX;
        p.prevTargetY = p.targetY;
        
        // Asosiy harakat (spring towards target)
        p.velX = p.velX * p.DAMPING + (p.targetX - p.posX) * p.SPRING;
        p.velY = p.velY * p.DAMPING + (p.targetY - p.posY) * p.SPRING;
        p.posX += p.velX;
        p.posY += p.velY;
        
        // Siltanish fizikasi (spring towards 0)
        p.slosVelX = p.slosVelX * p.SLOSH_DAMPING - p.slosX * p.SLOSH_SPRING;
        p.slosVelY = p.slosVelY * p.SLOSH_DAMPING - p.slosY * p.SLOSH_SPRING;
        p.slosX += p.slosVelX;
        p.slosY += p.slosVelY;
        
        // Clamp
        p.posX = Math.max(-1.2, Math.min(1.2, p.posX));
        p.posY = Math.max(-1.0, Math.min(1.0, p.posY));
        p.slosX = Math.max(-1, Math.min(1, p.slosX));
        p.slosY = Math.max(-0.6, Math.min(0.6, p.slosY));
        
        applyGyroTransform();
        gyroRafId = requestAnimationFrame(loop);
    }
    gyroRafId = requestAnimationFrame(loop);
}

function stopWaterLoop() {
    if (gyroRafId) { cancelAnimationFrame(gyroRafId); gyroRafId = null; }
}

function applyGyroTransform() {
    const inner = document.getElementById('liquid-gyro-inner');
    if (!inner) return;
    const p = waterPhysics;
    const totalX = p.posX + p.slosX * 0.6;
    const totalY = p.posY + p.slosY * 0.5;
    const tx  = totalX * p.MAX_TILT;
    const ty  = totalY * p.MAX_TILT * 0.6;
    const rot = totalX * 4.5;
    // will-change: transform — GPU layer uchun (smooth animation)
    inner.style.transform = `translate3d(${tx}px,${ty}px,0) rotate(${rot}deg)`;
}

function updateLiquid(type) {
    if (type === 'correct') {
        const correctCount = (userAnswers||[]).filter(a => a?.isCorrect).length;
        const total = (currentTest||[]).length || 20;
        liquidGreenLevel = Math.min(78, (correctCount / total) * 82);
    } else if (type === 'wrong') {
        liquidRedLevel = Math.min(40, liquidRedLevel + 14);
        setTimeout(() => { liquidRedLevel = Math.max(0, liquidRedLevel - 10); _applyLiquidLevels(); }, 1600);
    } else if (type === 'splash') {
        // Suvga tushganda qisqa impulse — suv biroz siltanadi
        liquidRedLevel = Math.min(liquidRedLevel + 4, 40);
        setTimeout(() => { liquidRedLevel = Math.max(0, liquidRedLevel - 4); _applyLiquidLevels(); }, 800);
    } else if (type === 'reset') {
        liquidGreenLevel = 0; liquidRedLevel = 0;
    }
    _applyLiquidLevels();
}

function _applyLiquidLevels() {
    const wg1=document.getElementById('wg1'), wg2=document.getElementById('wg2');
    const wr1=document.getElementById('wr1'), wr2=document.getElementById('wr2');
    if (!wg1) return;
    wg1.style.bottom = `${-85 + liquidGreenLevel}%`;
    wg2.style.bottom = `${-92 + liquidGreenLevel * 0.88}%`;
    if (liquidRedLevel > 0) {
        wr1.style.opacity = '0.55';
        wr2.style.opacity = '0.40';
        wr1.style.bottom  = `${-95 + liquidRedLevel}%`;
        wr2.style.bottom  = `${-102 + liquidRedLevel * 0.8}%`;
    } else {
        wr1.style.opacity = '0';
        wr2.style.opacity = '0';
    }
}
