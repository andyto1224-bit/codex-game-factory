import { AudioManager, MockPlatformAdapter } from '@factory/game-core';
import { gsap } from 'gsap';
import { GameApp } from './core/GameApp';
import { installTestBridge } from './core/TestBridge';
import { GameSession } from './gameplay/state/GameSession';
import { SampleScene } from './gameplay/SampleScene';
import { icon } from './ui/icons';
import './ui/tokens.css';

const dictionary = {
  brand: 'FACTORY · PLAY LAB', title: '星光练习场', intro: '一颗星球，一点好心情。',
  start: '开始游戏', score: '星光', pause: '暂停', paused: '歇一小会', resume: '继续游戏',
  reviveTitle: '再收集一些？', reviveHint: '试玩：模拟激励视频，再获得一次机会。',
  revive: '复活', finish: '结束本局', gameover: '闪耀的一局', retry: '再玩一次', busy: '准备中…',
};
// 在组合入口装配平台服务；VITE_PLATFORM 只是目标标记，当前仍是无网络 Mock。
const platform = new MockPlatformAdapter({ platform: import.meta.env.VITE_PLATFORM ?? 'mock', dictionary });
const t = (key: keyof typeof dictionary): string => platform.translate(key);
const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas');
const ui = document.querySelector<HTMLDivElement>('#ui-root');
if (!canvas || !ui) throw new Error('Missing #game-canvas or #ui-root');
const root = ui;
const session = new GameSession();
const audio = new AudioManager();
let busy = false;
let disposed = false;
let removeBridge = (): void => {};
let pressContext = gsap.context(() => {});
const app = new GameApp(canvas, () => pause('background'));
const scene = new SampleScene(tap);

function button(action: string, label: string, symbol?: 'play' | 'pause' | 'retry', secondary = false): string {
  return `<button type="button" class="button${secondary ? ' secondary' : ''}" data-action="${action}"${busy ? ' disabled' : ''}>${symbol ? icon(symbol) : ''}${label}</button>`;
}
/** 根据纯状态快照呈现五屏，并同步暂停状态；不在渲染函数中结算玩法。 */
function render(): void {
  const state = session.snapshot();
  const changed = root.dataset.screen !== state.screen;
  root.dataset.screen = state.screen;
  pressContext.revert();
  const panel = (title: string, body: string): string => `<section class="screen"><div class="panel"><div class="eyebrow">${t('brand')}</div><h1>${title}</h1>${body}</div></section>`;
  if (state.screen === 'start') root.innerHTML = panel(t('title'), `<p>${t('intro')}</p>${button('start', t('start'), 'play')}`);
  if (state.screen === 'hud') root.innerHTML = `<div class="hud"><div class="metric">${t('score')} <span class="number" aria-live="polite">${state.score}</span></div>${button('pause', t('pause'), 'pause')}</div>${state.score === 0 ? '<div class="ftue" aria-hidden="true"></div>' : ''}`;
  if (state.screen === 'pause') root.innerHTML = panel(t('paused'), button('resume', t('resume'), 'play'));
  if (state.screen === 'revive') root.innerHTML = panel(t('reviveTitle'), `<p>${t('reviveHint')}</p><div class="actions">${button('revive', busy ? t('busy') : t('revive'), 'play')}${button('finish', t('finish'), undefined, true)}</div>`);
  if (state.screen === 'gameover') root.innerHTML = panel(t('gameover'), `<p>${t('score')} <span class="number">${state.score}</span></p>${button('start', t('retry'), 'retry')}`);
  app.setPaused(state.screen !== 'hud');
  if (changed && state.screen !== 'hud') root.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
}
function start(seed = 1): void {
  if (disposed || busy) return;
  session.start(seed);
  platform.track('game_start', { seed });
  render();
  canvas?.focus({ preventScroll: true });
}
function pause(reason = 'user'): void {
  if (session.snapshot().screen !== 'hud') return;
  session.pause();
  platform.track('game_pause', { reason });
  render();
}
function resume(): void {
  if (session.snapshot().screen !== 'pause' || document.hidden) return;
  session.resume();
  platform.track('game_resume');
  render();
}
function tap(): void {
  if (!session.tap()) return;
  const state = session.snapshot();
  scene.pulse();
  audio.playTone({ frequency: 440 * 2 ** (Math.min(state.score, 12) / 12) });
  if (state.screen === 'revive') platform.track('revive_offer', { score: state.score });
  if (state.screen === 'gameover') platform.track('game_over', { score: state.score });
  render();
}
/** 广告等待期间锁按钮，按结果复活；销毁后到达的异步结果不再更新界面。 */
async function revive(): Promise<void> {
  if (busy || session.snapshot().screen !== 'revive') return;
  busy = true;
  render();
  let rewarded = false;
  try { rewarded = (await platform.showRewardedAd('revive')).rewarded; } catch { /* Continue to settlement. */ }
  if (disposed) return;
  busy = false;
  session.revive(rewarded);
  platform.track('revive_result', { rewarded });
  if (!rewarded) platform.track('game_over', { score: session.snapshot().score });
  render();
}
const click = (event: MouseEvent): void => {
  const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[data-action]') : null;
  if (!target || target.disabled) return;
  switch (target.dataset.action) {
    case 'start': start(); break;
    case 'pause': pause(); break;
    case 'resume': resume(); break;
    case 'revive': void revive(); break;
    case 'finish':
      session.revive(false);
      platform.track('game_over', { score: session.snapshot().score });
      render();
      break;
  }
};
const press = (event: PointerEvent): void => {
  const target = event.target instanceof Element ? event.target.closest('button') : null;
  if (!target || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  pressContext.add(() => { gsap.to(target, { scale: event.type === 'pointerdown' ? 0.94 : 1, duration: 0.1, overwrite: true }); });
};
const key = (event: KeyboardEvent): void => {
  if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); tap(); }
};
root.addEventListener('click', click);
root.addEventListener('pointerdown', press);
root.addEventListener('pointerup', press);
root.addEventListener('pointercancel', press);
root.addEventListener('pointerout', press);
canvas.addEventListener('keydown', key);

/** HMR/页面离开共用释放入口；监听、测试桥、Tween、音频和场景均成对清理。 */
async function destroy(): Promise<void> {
  if (disposed) return;
  disposed = true;
  removeBridge();
  pressContext.revert();
  root.removeEventListener('click', click);
  root.removeEventListener('pointerdown', press);
  root.removeEventListener('pointerup', press);
  root.removeEventListener('pointercancel', press);
  root.removeEventListener('pointerout', press);
  canvas?.removeEventListener('keydown', key);
  window.removeEventListener('pagehide', pagehide);
  await Promise.all([audio.destroy(), app.destroy()]);
}
const pagehide = (event: PageTransitionEvent): void => { if (!event.persisted) void destroy(); };
window.addEventListener('pagehide', pagehide);
if (import.meta.hot) import.meta.hot.dispose(() => { void destroy(); });

try {
  await app.init();
  await app.scenes.change(scene);
  render();
  removeBridge = installTestBridge({ ready: true, getSnapshot: () => session.snapshot(), start, pause: () => pause(), resume });
} catch (error) {
  await destroy();
  root.innerHTML = '<section class="screen"><div class="panel error" role="alert"></div></section>';
  const alert = root.querySelector('[role="alert"]');
  if (alert) alert.textContent = `启动失败，请刷新重试。\n${error instanceof Error ? error.message : String(error)}`;
  console.error(error);
}
