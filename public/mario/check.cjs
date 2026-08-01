// 冒烟测试：在 Node 中 stub canvas/DOM，驱动游戏逻辑跑若干帧，检查崩溃与 NaN
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) { console.error('FAIL: no <script> found'); process.exit(1); }
const code = m[1];

const listeners = {};
const ctxStub = new Proxy({}, {
  get(t, p) {
    if (p === 'canvas') return canvasStub;
    if (p === 'createLinearGradient' || p === 'createRadialGradient') {
      return () => ({ addColorStop() {} });
    }
    if (!(p in t)) t[p] = () => undefined;
    return t[p];
  },
  set(t, p, v) { t[p] = v; return true; },
});
const canvasStub = {
  width: 960, height: 544, style: {},
  getContext: () => ctxStub,
  addEventListener: (t, fn) => { (listeners[t] ||= []).push(fn); },
};
const doc = {
  getElementById: () => canvasStub,
  addEventListener: (t, fn) => { (listeners[t] ||= []).push(fn); },
  createElement: () => ({ style: {}, getContext: () => ctxStub }),
};

const win = globalThis;
win.innerWidth = 1280; win.innerHeight = 800;
win.addEventListener = (t, fn) => { (listeners[t] ||= []).push(fn); };
win.removeEventListener = () => {};
win.navigator = { maxTouchPoints: 0 };
let rafCb = null;
win.requestAnimationFrame = fn => { rafCb = fn; };

let threw = null;
try {
  new Function('window', 'document', 'navigator', 'requestAnimationFrame', 'performance', code)(win, doc, win.navigator, win.requestAnimationFrame, performance);
} catch (e) { threw = e; }
if (threw) { console.error('FAIL: load threw:', threw); process.exit(1); }
console.log('OK: script loaded');

const key = (type, code) => (listeners[type] || []).forEach(f => f({ code, preventDefault() {} }));
const st = () => globalThis.__mario ? globalThis.__mario.getState() : null;

// 1) 标题 → 按 Enter 开始
key('keydown', 'Enter');
let s = st();
if (!s || s.state !== 'play') { console.error('FAIL: Enter did not start game:', s); process.exit(1); }
console.log('OK: Enter starts game, state=play');

// 2) 按住右键跑 40 帧（到达第一个栗子前），验证移动
key('keydown', 'ArrowRight');
let t = 0;
for (let i = 0; i < 40; i++) { t += 16.7; rafCb(t); }
s = st();
for (const k of ['score', 'lives', 'coins', 'timeLeft', 'x', 'y']) {
  if (!Number.isFinite(s[k])) { console.error('FAIL: non-finite', k, s[k]); process.exit(1); }
}
if (s.x < 200) { console.error('FAIL: player did not advance, x=' + s.x); process.exit(1); }
console.log('OK: move verified, x=' + s.x);

// 3) 跳跃测试：跑动中起跳（越过第一个栗子，模拟踩踏）
key('keydown', 'Space');
for (let i = 0; i < 30; i++) { t += 16.7; rafCb(t); }
key('keyup', 'Space');
for (let i = 0; i < 90; i++) { t += 16.7; rafCb(t); }
s = st();
if (s.state === 'gameover') { console.error('FAIL: unexpected game over'); process.exit(1); }
console.log('OK: jump ran, state=' + s.state, 'x=' + s.x);

// 4) 长时间运行（死亡循环 / 计时器衰减 / 敌人移动均不应崩溃）
for (let i = 0; i < 6000; i++) { t += 16.7; rafCb(t); }
key('keyup', 'ArrowRight');
s = st();
for (const k of ['score', 'lives', 'coins', 'timeLeft', 'x', 'y']) {
  if (!Number.isFinite(s[k])) { console.error('FAIL: non-finite', k, s[k]); process.exit(1); }
}
console.log('OK: long run, state=' + s.state, 'lives=' + s.lives, 'score=' + s.score, 'timeLeft=' + s.timeLeft);

// 5) 暂停：按 P 后时间不再流逝
const tBefore = st().timeLeft;
key('keydown', 'KeyP');
for (let i = 0; i < 300; i++) { t += 16.7; rafCb(t); }
key('keyup', 'KeyP');
if (st().timeLeft !== tBefore) { console.error('FAIL: pause did not freeze timer'); process.exit(1); }
console.log('OK: pause freezes timer (timeLeft=' + st().timeLeft + ')');

// 6) 胜利流程：传送到旗杆前，跑跳上楼梯 → 触发滑杆 → 通关画面 → 回标题
key('keydown', 'KeyP'); key('keyup', 'KeyP');   // 恢复暂停
globalThis.__mario.warp(89);
key('keydown', 'ArrowRight');
key('keydown', 'Space');
for (let i = 0; i < 300; i++) { t += 16.7; rafCb(t); }
key('keyup', 'Space');
s = st();
if (!['play', 'win'].includes(s.state)) { console.error('FAIL: win not triggered, state=' + s.state); process.exit(1); }
console.log('OK: flag touched, state=' + s.state, 'score=' + s.score, 'x=' + s.x, 'y=' + s.y);
for (let i = 0; i < 700; i++) { t += 16.7; rafCb(t); }   // 滑杆 + 走进城堡 + 通关画面
key('keyup', 'ArrowRight');
s = st();
if (s.state !== 'title') { console.error('FAIL: did not return to title, state=' + s.state); process.exit(1); }
if (s.score < 10000) { console.error('FAIL: no time bonus applied, score=' + s.score); process.exit(1); }
console.log('OK: course clear -> title, final score=' + s.score);
console.log('ALL PASS');
