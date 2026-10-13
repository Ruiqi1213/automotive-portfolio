'use strict';

// Optional motion never owns content visibility or navigation state.
window.PortfolioMotion?.startHero(document.querySelector('#hero-title'));
window.PortfolioMotion?.startGlare(document.querySelector('#project-commute'));

// One real HMI preview, scaled as a complete 1440 × 900 screen at every size.
const previewStage = document.querySelector('#screen-stage');
const previewFrame = document.querySelector('#hmi-preview');
const showroom = document.querySelector('#hmi-showroom');
const isPlainClick = event => event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
let enterHmiShowroom = null;
if (previewStage && previewFrame) {
  const views = ['overview', 'navigation', 'vehicle', 'climate', 'media', 'charging'];
  const labels = {overview:'座舱总览', navigation:'导航', vehicle:'车辆状态', climate:'空调舒适', media:'音乐', charging:'充电'};
  const links = document.querySelectorAll('[data-preview-view]');
  let selectionPill = null;
  const readView = () => {
    const view = new URLSearchParams(location.search).get('view');
    return views.includes(view) ? view : 'overview';
  };
  let selectedView = readView();
  let previewReady = false;
  let previewRequest = 0;
  const showSelection = view => {
    selectedView = view;
    links.forEach(link => {
      const selected = link.dataset.previewView === view;
      link.classList.toggle('active', selected);
      if (selected) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    selectionPill?.update();
    previewFrame.title = `新通勤 HMI ${labels[view]}交互演示`;
    document.querySelectorAll('[data-full-demo]').forEach(link => {
      link.href = `./hmi.html?view=${view}`;
    });
  };
  const updateURL = (view, replace = false, enterShowroom = false) => {
    const url = new URL(location.href);
    url.searchParams.set('view', view);
    if (enterShowroom) url.hash = 'hmi-showroom';
    if (url.href === location.href) return;
    history[replace ? 'replaceState' : 'pushState'](history.state, '', url);
  };
  const sendView = () => previewFrame.contentWindow.postMessage({type:'luma:set-view', view:selectedView, requestId:++previewRequest}, location.origin);
  enterHmiShowroom = view => {
    if (!views.includes(view)) return;
    showSelection(view);
    updateURL(view, false, true);
    if (previewReady) sendView();
    // Move keyboard focus as well as the viewport; keep the iframe and its
    // controls alive so climate, media, and vehicle settings are preserved.
    showroom?.focus({preventScroll:true});
    showroom?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'start'});
  };
  document.querySelectorAll('[data-showroom-view]').forEach(link => link.addEventListener('click', event => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    enterHmiShowroom(link.dataset.showroomView);
  }));
  // The parent owns history. The embedded demo only replaces its own URL,
  // avoiding duplicate entries in the browser's joint iframe history.
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== previewFrame.contentWindow) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'luma:ready') {
      previewReady = true;
      sendView();
    } else if (data.type === 'luma:view-change' && data.requestId === previewRequest && views.includes(data.view)) {
      showSelection(data.view);
      updateURL(data.view, data.replace === true);
    }
  });
  previewFrame.addEventListener('load', () => {
    previewFrame.contentWindow.postMessage({type:'luma:request-ready'}, location.origin);
  });
  links.forEach(link => link.addEventListener('click', event => {
    // Queue early clicks until the iframe is ready. The real href still works
    // without JavaScript, with modifier keys, or through the full-demo link.
    if (!isPlainClick(event)) return;
    event.preventDefault();
    showSelection(link.dataset.previewView);
    updateURL(selectedView);
    if (previewReady) sendView();
  }));
  window.addEventListener('popstate', () => {
    showSelection(readView());
    if (previewReady) sendView();
  });
  showSelection(selectedView);
  selectionPill = window.PortfolioMotion?.createPillNav(document.querySelector('.screen-nav'));
  updateURL(selectedView, true);
  previewFrame.contentWindow.postMessage({type:'luma:request-ready'}, location.origin);
  const scalePreview = () => {
    const scale = previewStage.clientWidth / 1440;
    previewFrame.style.setProperty('--screen-scale', String(scale));
  };
  scalePreview();
  if ('ResizeObserver' in window) {
    new ResizeObserver(scalePreview).observe(previewStage);
  } else {
    window.addEventListener('resize', scalePreview, { passive: true });
  }
}

const vehicleImage = document.querySelector('.vehicle-render');
if (vehicleImage) {
  const showVehicle = () => {
    if (vehicleImage.naturalWidth > 0) vehicleImage.parentElement.classList.add('image-ready');
  };
  vehicleImage.addEventListener('load', showVehicle);
  vehicleImage.addEventListener('error', () => { vehicleImage.hidden = true; });
  if (vehicleImage.complete) showVehicle();
}


const projects = {
  control: {
    category: '经历复盘 / 一控多车辆 HMI',
    eyebrow: '04 / PROFESSIONAL HMI REDESIGN',
    title: '让复杂功能回到清楚的任务里',
    lead: '一控多车辆 HMI 改版。接手已有系统后，以操作员反馈为起点，重新梳理功能、信息与操作路径。',
    facts: [['项目时间', '2025.03—2025.08'], ['项目类型', '既有系统改版'], ['本人参与', 'PRD / 交互原型 / 部分高保真 / 验收跟进']],
    sections: [
      ['背景与问题', '<p>专业车辆控制场景中，已有功能并不等于清晰的使用体验。项目需要在既有系统基础上，回应操作员对于界面组织和使用过程的反馈。</p><p>本次复盘关注信息架构与交互表达，只保留通用设计方法。</p>'],
      ['我具体做了什么', '<ul><li><strong>先梳理，再调整：</strong>整理既有 60+ 功能按钮与面板，结合操作员反馈明确改版问题。</li><li><strong>重组信息：</strong>以任务阶段与使用频次作为组织维度，调整信息层级与引导式界面表达。</li><li><strong>把方案写清楚：</strong>输出 PRD 与交互原型，并参与部分高保真界面的完善。</li><li><strong>跟进落地：</strong>参与实车验收跟进。</li></ul>'],
      ['交付与验证', '<p>交付包括需求文档、交互原型及参与完成的部分高保真界面。</p><p>验证方式：操作员实车任务耗时对比，比较新旧方案的任务表现。定量结果未在本页展示。</p>'],
      ['设计思考', '<p>这段经历让我更重视“功能在哪里”与“用户此刻在做什么”之间的关系。改版不仅是调整界面样式，还需要把反馈、需求、交互与验收串起来。</p>']
    ],
    boundary: '页面图形为通用方法复盘示意，非原始控制界面。'
  },
  ai: {
    category: '经历复盘 / AI 科研产品',
    eyebrow: '03 / AI RESEARCH WORKSPACE',
    title: 'AI 智能写作台：把生成能力连成工作流程',
    lead: '在 AI 科研工作台相关实习中，参与功能设计、PRD 与交互原型，把科研写作拆成可以理解、编辑和继续推进的任务。',
    facts: [['产品方向', 'AI 科研工作台 / 知识库'], ['本人参与', '功能设计 / PRD / 交互原型'], ['展示方式', '经历复盘 + 独立概念图']],
    workflow: ['大纲', '知识检索', '章节生成', '润色', '引用溯源'],
    sections: [
      ['背景与问题', '<p>科研写作不是一次生成就结束。用户需要组织结构、找到相关资料，再逐步处理章节与表达，并检查内容的来源。</p><p>设计重点是让多个能力之间的关系清楚，使用户知道当前在做什么、下一步可以做什么。</p>'],
      ['我具体做了什么', '<ul><li><strong>梳理功能流程：</strong>围绕大纲、知识检索、章节生成、润色与引用溯源，设计连续的写作路径。</li><li><strong>明确需求表达：</strong>将功能逻辑、页面内容与操作关系写入 PRD。</li><li><strong>制作交互原型：</strong>让设计方案可以被讨论、检查与进一步实现。</li></ul>'],
      ['交付与呈现', '<p>实习经历中的本人参与为功能设计、PRD 与交互原型。下面这张界面图是另行制作的独立概念改版，用于表达对章节结构、修改权与引用核对的思考。</p><p>图中界面是新的概念探索，未用于实习项目的原始交付。</p>']
    ],
    image: './assets/ai-writing-concept.png',
    imageAlt: 'AI 写作独立概念改版，示意大纲、正文编辑与引用核对面板',
    imageCaption: '独立概念改版 / 演示内容 / 非实习原始交付 / 未经用户测试',
    boundary: '图中资料、状态与内容均为概念演示。引用溯源提供核对入口，生成内容仍需人工确认。'
  },
  roles: {
    category: '经历复盘 / 多角色 HMI',
    eyebrow: '05 / MULTI-ROLE INFORMATION ARCHITECTURE',
    title: '从不同角色出发，建立共同的理解',
    lead: '在另一个多角色 HMI 项目中，围绕角色、信息与屏幕的关系，梳理共享内容与角色专属内容的表达。',
    facts: [['项目重点', '角色—信息—屏幕映射'], ['本人参与', '需求梳理 / PRD / 交互原型'], ['项目呈现', '独立项目复盘']],
    sections: [
      ['背景与问题', '<p>在同一使用场景中，不同角色对信息的需要并不完全一致。设计既要形成共同理解，也需要让每个角色能够找到与自己有关的内容。</p>'],
      ['我具体做了什么', '<ul><li><strong>从角色看需求：</strong>先区分不同角色关注的信息，再讨论界面呈现。</li><li><strong>建立映射关系：</strong>梳理角色、信息与屏幕之间的对应，区分共享信息与角色信息。</li><li><strong>转化为可讨论的方案：</strong>通过 PRD 与交互原型表达信息组织与页面关系。</li></ul>'],
      ['交付与思考', '<p>这一项目体现的是多角色信息架构思考：哪些内容需要一致，哪些内容需要因角色而有所区别。</p><p>页面以抽象角色示意共享信息与角色信息之间的关系，便于讨论内容组织方法。</p>']
    ],
    boundary: '首页图形为角色与信息关系的复盘示意，非原始系统界面。'
  },
  commute: {
    category: '独立概念 / 网页交互',
    eyebrow: '01 / NEW COMMUTE · INTERACTIVE CONCEPT',
    title: '新通勤：围绕驾驶任务组织座舱交互',
    lead: '一个围绕日常通勤体验制作的车载 HMI 网页演示，用可点击的界面呈现信息与交互，而不止停留在静态视觉。',
    facts: [['作品属性', '独立概念探索'], ['交付形式', '浏览器内交互演示'], ['适用范围', '概念展示 / 交互讨论']],
    sections: [
      ['场景与设计目标', '<p>以日常通勤为概念场景，将出发前查看车况、途中获取导航信息与调整温度、驻车后浏览音乐及设置充电目标串成一段体验。</p><p>设计目标是让当前任务容易找到、操作结果清楚可见，并减少不同页面之间重复查找与设置。</p>'],
      ['可以如何体验', '<p>六个页面分别呈现座舱总览、导航、车辆状态、空调舒适、音乐与充电。打开演示后，尝试可用控件，观察内容与状态怎样变化。页面数据与情境均为演示用途。</p><p>它适合用来讨论信息层级与交互逻辑；对驾驶安全、可达性和真实设备适配的判断，仍需要真实环境中的进一步验证。</p>'],
      ['关键交互取舍', '<p><strong>高频入口保持稳定：</strong>六屏共用导航和底部空调区，页面切换保留温度与媒体状态。</p><p><strong>按使用情境限制操作：</strong>驾驶演示保留基础温控与播放操作，复杂车辆设置、曲库浏览和充电目标调整在驻车情境下体验。这里表达的是设计假设，不代表已经通过驾驶安全验证。</p>'],
      ['验证计划与交付边界', '<p>拟通过“查找续航、调整温度、切换任务、理解受限原因”等任务，记录首次点击、完成时间、误触与恢复路径；结合用户反馈迭代信息层级与控件尺寸。</p><p>当前交付为可交互网页概念，尚未开展真实驾驶环境的人因评估、触控适配与车规验证，不以演示效果替代这些验证。</p>']
    ],
    boundary: '网页交互概念，非 Android 或车规实现，不连接真实车辆。',
    cta: true
  },
  obsidian: {
    category: '独立概念 / 智能座舱 HMI',
    eyebrow: '02 / OBSIDIAN · SMART COCKPIT',
    title: 'OBSIDIAN：以黑金层级组织座舱体验',
    lead: '面向中高端新能源汽车的个人独立概念设计，围绕导航、多媒体、数字仪表、座舱舒适与个性化设置，呈现完整的五模块交互体验。',
    facts: [['作品属性', '个人独立概念'], ['交付形式', '五模块网页交互演示'], ['视觉方向', '黑金配色 / 信息层级']],
    sections: [
      ['场景与设计目标', '<p>以中高端新能源汽车座舱为概念场景，通过深色底面与金色强调，区分关键状态、常用入口和操作反馈，让复杂功能更容易辨认。</p>'],
      ['五个模块怎样连接', '<p>导航支持目的地选择、路线开启与缩放；多媒体支持曲目选择、播放与进度调整；数字仪表呈现模拟车速与驾驶模式。座舱舒适提供双区温控、同步与座椅调节，个性化设置集中管理氛围、亮度与交互偏好。</p>'],
      ['可操作的设计细节', '<p>可以尝试温度调节与双区同步、座椅加热和通风档位，以及舒适、运动、节能模式切换。底部导航通过更明确的图标、文字与选中状态强化识别，让五个模块的入口保持稳定。</p>'],
      ['当前交付边界', '<p>当前交付为浏览器中的交互概念。导航、仪表与车辆数据均为虚构演示，音乐展示播放状态与进度，不提供真实音频；所有控制均不连接真实车辆。驾驶安全、人因及真实设备适配仍需后续验证。</p>']
    ],
    boundary: '个人独立概念作品，非量产车机或车规实现；首页图片为原始概念视觉，实际操作请使用交互演示。'
  },
  table: {
    category: '独立概念 / 实体产品体验',
    eyebrow: '06 / PARKED WORKSPACE',
    title: '驻车随行工作台',
    lead: '把临时办公的准备与收纳连起来。以成人驻车后排短时工作为假设场景，探索可折叠桌面与随行小物收纳。',
    facts: [['设计方向', '驻车后排 / 短时工作'], ['当前阶段', '独立概念探索'], ['视觉形式', 'AI 辅助概念视觉']],
    sections: [
      ['概念问题', '<p>停稳之后，如何让桌面与零散小物就位，并在结束时一并收起？本轮从准备、展开、使用和收拢的连续动作出发，而不是只考虑一块展开的桌面。</p>'],
      ['本轮探索', '<ul><li><strong>动作连续性：</strong>关注桌面展开与收起的过程，以及小物在过程中的位置。</li><li><strong>空间关系：</strong>通过概念视觉表达桌面、支撑与收纳区域的关系。</li><li><strong>验证问题：</strong>把车型适配、头枕连接、稳定性与人体空间列为后续实测的重点。</li></ul>'],
      ['当前交付', '<p>当前交付为 AI 辅助概念视觉与设计假设，用来讨论产品方向和后续验证路径。尚未完成实物样机、结构强度或车辆环境下的工程验证。</p>']
    ],
    image: './assets/parked-table-concept.png',
    imageAlt: '驻车随行工作台的 AI 辅助概念视觉',
    imageCaption: 'AI 辅助概念视觉 / 仅为驻车使用场景假设 / 尚未工程验证',
    imageClass: 'table-detail',
    boundary: 'AI 辅助概念视觉，尚未工程验证。仅探索驻车使用；连接、承重、车型适配与安全性有待专业验证。'
  }
};

const dialog = document.querySelector('#project-dialog');
const dialogContent = document.querySelector('#dialog-content');
let previousFocus = null;

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function openProject(id, trigger) {
  const project = projects[id];
  if (!project || !dialog) return;
  previousFocus = trigger || document.activeElement;
  document.querySelector('#dialog-category').textContent = project.category;
  const body = makeElement('article', 'dialog-body');
  body.append(makeElement('div', 'dialog-eyebrow', project.eyebrow));
  const title = makeElement('h2', '', project.title);
  title.id = 'dialog-title';
  body.append(title, makeElement('p', 'dialog-lead', project.lead));
  const facts = makeElement('div', 'dialog-facts');
  project.facts.forEach(([label, value]) => {
    const fact = document.createElement('div');
    fact.append(makeElement('span', '', label), makeElement('strong', '', value));
    facts.append(fact);
  });
  body.append(facts);
  if (project.workflow) {
    const workflow = makeElement('div', 'workflow');
    workflow.setAttribute('aria-label', '科研写作任务流程');
    project.workflow.forEach(step => workflow.append(makeElement('span', '', step)));
    body.append(workflow);
  }
  project.sections.forEach(([heading, copy], index) => {
    const section = makeElement('section', 'detail-section');
    const h3 = document.createElement('h3');
    h3.append(makeElement('span', '', String(index + 1).padStart(2, '0')), document.createTextNode(heading));
    const content = document.createElement('div');
    content.innerHTML = copy; // Local, authored case-study content; no remote or visitor input.
    section.append(h3, content);
    body.append(section);
  });
  if (project.image) {
    const figure = makeElement('figure', `detail-image ${project.imageClass || ''}`);
    const img = document.createElement('img');
    img.src = project.image;
    img.alt = project.imageAlt;
    figure.append(img, makeElement('figcaption', '', project.imageCaption));
    body.append(figure);
  }
  const boundary = makeElement('aside', 'detail-boundary');
  boundary.append(makeElement('strong', '', '这份作品如何阅读'), makeElement('p', '', project.boundary));
  body.append(boundary);
  if (project.cta) {
    const link = makeElement('a', 'button dialog-cta', '在本页体验新通勤');
    link.href = '#hmi-showroom';
    link.addEventListener('click', event => {
      if (!isPlainClick(event) || !enterHmiShowroom) return;
      event.preventDefault();
      closeProject({restoreFocus:false});
      enterHmiShowroom('overview');
    });
    body.append(link);
  }
  dialogContent.replaceChildren(body);
  dialog.showModal();
  document.body.style.overflow = 'hidden';
  document.querySelector('.dialog-scroll').scrollTop = 0;
}

function closeProject({restoreFocus = true} = {}) {
  if (!restoreFocus) previousFocus = null;
  if (dialog.open) dialog.close();
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-project]').forEach(button => {
  button.addEventListener('click', () => openProject(button.dataset.project, button));
});
document.querySelectorAll('.close-dialog').forEach(button => button.addEventListener('click', closeProject));
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeProject();
});
dialog.addEventListener('close', () => {
  // A queued close event must not unlock or steal focus from a newer dialog.
  if (dialog.open) return;
  document.body.style.overflow = '';
  const focusTarget = previousFocus;
  previousFocus = null;
  if (focusTarget && document.contains(focusTarget)) focusTarget.focus({ preventScroll: true });
});

const filterLabels = { all: '全部', experience: '经历复盘', concept: '独立概念' };
document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    let count = 0;
    document.querySelectorAll('[data-filter]').forEach(item => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('.project[data-category]').forEach(project => {
      const visible = filter === 'all' || project.dataset.category === filter;
      project.hidden = !visible;
      if (visible) {
        count += 1;
      }
    });
    document.querySelector('#filter-status').textContent = `展示${filterLabels[filter]} ${count} 个项目`;
  });
});
