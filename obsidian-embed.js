'use strict';

// This personal concept has its own isolated, opt-in demo. It never participates
// in the New Commute showroom's navigation, history, motion or saved state.
(() => {
  const toggle = document.querySelector('#obsidian-toggle');
  const panel = document.querySelector('#obsidian-demo');
  const mount = document.querySelector('#obsidian-mount');
  const close = document.querySelector('#obsidian-close');
  const status = document.querySelector('#obsidian-demo-status');
  if (!toggle || !panel || !mount || !close || !status) return;

  let frame = null;
  const closeDemo = (restoreFocus = false) => {
    if (!frame) return;
    frame.remove(); // Stop timers and discard the sandbox's transient demo state.
    frame = null;
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = '在本页体验';
    status.textContent = '点击体验后加载';
    if (restoreFocus) toggle.focus({preventScroll:true});
  };

  const openDemo = () => {
    if (frame) return;
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.textContent = '收起演示';
    status.textContent = '正在加载五模块演示…';
    const nextFrame = document.createElement('iframe');
    nextFrame.id = 'obsidian-frame';
    nextFrame.title = 'OBSIDIAN 智能座舱五模块交互演示（模拟数据）';
    nextFrame.setAttribute('sandbox', 'allow-scripts');
    nextFrame.setAttribute('referrerpolicy', 'no-referrer');
    nextFrame.src = './obsidian/index.html';
    nextFrame.addEventListener('load', () => {
      if (frame === nextFrame) status.textContent = '五模块交互 · 虚构数据演示';
    });
    frame = nextFrame;
    mount.append(frame);
  };

  toggle.hidden = false;
  toggle.addEventListener('click', () => frame ? closeDemo() : openDemo());
  close.addEventListener('click', () => closeDemo(true));
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeDemo(true);
  });
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.filter === 'experience') closeDemo();
    });
  });
})();
