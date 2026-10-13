(() => {
  'use strict';
  const VIEWS = ['overview', 'navigation', 'vehicle', 'climate', 'media', 'charging'];
  const LABELS = {overview:'总览',navigation:'导航',vehicle:'车辆',climate:'舒适',media:'音乐',charging:'充电'};
  const TRACKS = [
    {title:'Slow Morning', artist:'LUMA Sound Studio', mood:'清晨 / AMBIENT', duration:228, cover:'morning'},
    {title:'Coastline', artist:'LUMA Sound Studio', mood:'海岸 / DOWNTEMPO', duration:254, cover:'coast'},
    {title:'After the Rain', artist:'LUMA Sound Studio', mood:'雨后 / ELECTRONIC', duration:196, cover:'rain'}
  ];
  const freshState = () => ({mode:'parked',left:22,right:23,sync:false,power:true,ac:true,fan:3,locked:true,lights:false,target:80,track:0,playing:false,progress:42,routeActive:false});
  const params = new URLSearchParams(location.search);
  const embedded = params.get('embed') === '1';
  let selectionPill = null;
  const storageKey = `luma-cockpit-v2${embedded?'-embed':''}`;
  let state = freshState();
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey));
    if (saved && typeof saved === 'object') {
      const base = freshState();
      for (const key of Object.keys(base)) {
        if (typeof saved[key] === typeof base[key]) state[key] = saved[key];
      }
    }
  } catch (_) { /* Private browsing may disable session storage. */ }
  const clamp = (v,min,max) => Math.max(min,Math.min(max,Number.isFinite(v)?Math.round(v):min));
  state.mode = state.mode === 'driving' ? 'driving' : 'parked';
  state.left = clamp(state.left,16,30); state.right = clamp(state.right,16,30); state.fan = clamp(state.fan,1,5); state.track = clamp(state.track,0,2); state.target = clamp(state.target,70,100); state.progress = clamp(state.progress,0,TRACKS[state.track].duration);
  if (state.sync) state.right = state.left;
  state.playing = false;
  let currentView = VIEWS.includes(params.get('view')) ? params.get('view') : 'overview';
  let parentRequest = 0;
  let toastTimer;
  const dialogFocus = new Map();
  const content = document.getElementById('view-content');
  const cockpit = document.getElementById('cockpit');
  const dialog = document.getElementById('route-dialog');
  const resetDialog = document.getElementById('reset-dialog');
  const dialogs = [dialog, resetDialog];
  const icon = (name,cls='') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const cover = () => `./hmi-assets/album-${TRACKS[state.track].cover}.svg`;
  const fmt = (n) => `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
  const save = () => {try { sessionStorage.setItem(storageKey,JSON.stringify(state)); } catch (_) {}};
  const pressed = (v) => v ? 'true' : 'false';
  const controls = (large=false) => `<div class="media-controls ${large?'large-controls':''}"><button type="button" data-action="track-step" data-delta="-1" aria-label="上一首">${icon('prev')}</button><button type="button" class="play-button" data-action="play" aria-label="${state.playing?'暂停模拟播放':'开始模拟播放'}" aria-pressed="${pressed(state.playing)}">${icon(state.playing?'pause':'play')}</button><button type="button" data-action="track-step" data-delta="1" aria-label="下一首">${icon('next')}</button></div>`;
  const car = (extra='') => `<div class="car-stage ${extra}"><span class="stage-orbit" aria-hidden="true"></span><img class="car-image" src="./assets/hmi-silver-car.png" alt="原创无品牌银白色概念旅行车，AI辅助视觉" draggable="false"><span class="car-light-glow" aria-hidden="true"></span><span class="car-floor-label">AI 辅助概念车视觉</span></div>`;
  const parkOnly = (description='') => `${state.mode === 'driving' ? ' aria-disabled="true"' : ''}${description ? ` aria-describedby="${description}"` : ''}`;
  const contextNote = (id, text, restricted=false) => `<p id="${id}" class="context-note ${restricted?'is-restricted':''}">${restricted?icon('lock'):''}<span>${text}</span></p>`;
  const pill = (label,tone='ready') => `<span class="pill" data-tone="${tone}"><i class="status-dot"></i>${label}</span>`;
  function overviewView() {
    return `<div class="view overview-view"><section class="panel welcome-panel" aria-label="车辆总览"><div class="welcome-heading"><p class="section-label">GOOD MORNING.</p><h2>每一次出发，刚刚好。</h2><p>${state.mode==='driving'?'行程信息在前，常用控制始终可达。':'确认车况与电量，再从熟悉的路线出发。'}</p>${pill(state.mode==='parked'?'已驻车':'驾驶演示')}</div>${car()}<div class="vehicle-metrics"><div class="metric"><small>剩余续航</small><strong>326<span>km</span></strong><p class="metric-note">情境估值</p></div><div class="metric"><small>电池电量</small><strong>68<span>%</span></strong><p class="metric-note">虚构车况示例</p></div><div class="metric"><small>当前状态</small><strong>${state.mode==='parked'?'P':'D'}<span>${state.mode==='parked'?'驻车':'演示'}</span></strong><p class="metric-note">${state.locked?'车门已锁':'车门已解锁'}</p></div></div></section><div class="overview-side"><section class="panel mini-navigation" aria-label="导航摘要"><div class="mini-map" aria-hidden="true"></div><div class="panel-kicker"><span>${state.routeActive?'路线演示中':'今日通勤 · 待开始'}</span>${icon('nav')}</div><div class="mini-route"><div class="turn-tile">${icon(state.routeActive?'turn':'nav')}</div><div><strong>${state.routeActive?'650':'18'} <span class="metric-unit">${state.routeActive?'m':'min'}</span></strong><p>${state.routeActive?'右转，进入林荫大道':'查看路线，准备出发'}</p></div></div><div class="mini-destination"><span>云栖创意园<br><small>18 min · 7.8 km · 虚构路线</small></span><button type="button" class="text-button" data-view="navigation">${state.routeActive?'查看导航':'查看路线'}</button></div></section><section class="panel mini-player" aria-label="媒体摘要"><div class="panel-kicker"><span>此刻，听见从容</span>${icon('music')}</div><div class="mini-track"><img class="mini-album" src="${cover()}" alt="原创抽象唱片封面"><div><h3>${TRACKS[state.track].title}</h3><p>${TRACKS[state.track].artist}</p></div></div><div class="mini-playbar"><span data-playback-label>${state.playing?'模拟播放中':'静音播放演示'}</span>${controls()}</div></section></div></div>`;
  }
  function navigationView() {
    const restricted=state.mode==='driving';
    return `<section class="view navigation-view ${state.routeActive?'route-is-active':'route-is-ready'}" aria-label="模拟导航">
      <img class="nav-map" src="./hmi-assets/luma-map.svg" alt="虚构城市道路示意，浅蓝色路线沿滨河路转入林荫大道到达云栖创意园">
      <div class="map-compass" aria-label="地图朝北">N</div><div class="nav-chip">云栖创意园</div>
      <div class="nav-directions"><p class="eyeline">${state.routeActive?'路线演示中 · 静态场景':'通勤路线 · 待开始'}</p>
        <div class="nav-turn">${icon(state.routeActive?'turn':'nav')}<div><strong>${state.routeActive?'650':'7.8'} <small>${state.routeActive?'m':'km'}</small></strong><p>${state.routeActive?'右转进入林荫大道':'途经滨河路、林荫大道'}</p></div></div>
        <div class="route-line"></div><div class="route-destination"><p class="eyeline">目的地</p><h2>云栖创意园</h2>
          <div class="route-data"><div><strong>08:42</strong><small>示例到达时间</small></div><div><strong>18 <span class="metric-unit">min</span></strong><small>${state.routeActive?'剩余':'全程'} 7.8 km</small></div></div>
        </div><div class="nav-controls"><button type="button" class="primary-button" data-action="route-start" aria-pressed="${pressed(state.routeActive)}">${icon(state.routeActive?'pause':'nav')}${state.routeActive?'结束路线演示':'开始路线演示'}</button><button type="button" class="secondary-button" data-action="route-details"${parkOnly('route-context')}>路线详情</button></div>
        ${contextNote('route-context',restricted?'驾驶演示中收起详细路线，驻车后可查看。':'先查看路线，再开始演示。地图与数值不会实时变化。',restricted)}
      </div><div class="map-bottom"><span>500 m</span><span>原创示意图 · 非实时导航</span></div>
    </section>`;
  }
  function vehicleView() {
    return `<div class="view vehicle-view"><section class="panel vehicle-visual ${state.lights?'lights-on':''}" aria-label="车辆视觉与状态"><div class="view-header"><div><p class="section-label">YOUR LUMA</p><h2>车辆状态，一目了然。</h2></div>${pill(state.mode==='parked'?'已驻车':'驾驶中 · 模拟')}</div>${car()}<div class="vehicle-sensors"><div>前轮胎压<strong>2.5 / 2.5 <small>bar</small></strong></div><div>后轮胎压<strong>2.6 / 2.6 <small>bar</small></strong></div><div>车外温度<strong>24°</strong></div></div></section><section class="panel vehicle-settings" aria-label="车辆设置"><h3 class="settings-heading">车辆快捷控制</h3>${contextNote('vehicle-context',state.mode==='driving'?'驾驶演示中保留状态查看；车锁与迎宾灯光请驻车后调整。':'已驻车，可切换车锁与迎宾灯光的模拟状态。',state.mode==='driving')}<button type="button" class="setting-control" data-action="lock" aria-pressed="${pressed(state.locked)}"${parkOnly('vehicle-context')}>${icon(state.locked?'lock':'unlock')}<span class="setting-name">${state.locked?'车门已锁':'车门已解锁'}<small>${state.mode==='parked'?'点击切换模拟状态':'驻车后可操作'}</small></span><span class="toggle ${state.locked?'on':''}" aria-hidden="true"></span></button><button type="button" class="setting-control" data-action="lights" aria-pressed="${pressed(state.lights)}"${parkOnly('vehicle-context')}>${icon('light')}<span class="setting-name">迎宾灯光<small>${state.mode==='parked'?(state.lights?'显示开启':'显示关闭'):'驻车后可操作'}</small></span><span class="toggle ${state.lights?'on':''}" aria-hidden="true"></span></button><div class="vehicle-status-list"><div><span>门窗</span><b>全部关闭</b></div><div><span>胎压</span><b><i class="status-dot"></i> 正常 · 示例</b></div><div><span>车辆电量</span><b>68%</b></div><div><span>剩余续航</span><b>326 km · 估值</b></div></div><p class="setting-footnote">仅切换网页显示状态，无真实车辆连接。<br>AI 辅助概念车视觉 · 所有车况均为虚构。</p></section></div>`;
  }
  const dial = (side,label) => `<div class="temperature-dial"><div class="temperature-ring"><div class="dial-inner"><small>${label}</small><div class="dial-number">${state[side]}<span>°</span></div><p>${state.power?'设定温度 / °C':'空调已关闭'}</p></div></div><div class="dial-stepper"><button type="button" data-action="temp" data-zone="${side}" data-delta="-1" aria-label="${label}降低一度" ${state[side]===16?'disabled':''}>−</button><button type="button" data-action="temp" data-zone="${side}" data-delta="1" aria-label="${label}升高一度" ${state[side]===30?'disabled':''}>+</button></div></div>`;
  function climateView() {
    return `<section class="view panel climate-view" aria-label="双区气候与舒适"><div class="view-header"><div><p class="section-label">MAKE YOURSELF AT HOME.</p><h2>刚好的温度。</h2><p class="view-subtitle" id="climate-context">${state.power?(state.sync?'双区同步 · 以主驾温度为准':'双区独立 · 16–30°C 可调'):'空调关闭 · 温度设置已保留，开启后生效'}</p></div>${pill(state.power?'空调已开启':'空调已关闭',state.power?'ready':'muted')}</div><div class="climate-body">${dial('left','主驾')}<div class="airflow ${state.power?'':'is-off'}" aria-hidden="true"><svg viewBox="0 0 120 180" fill="none"><path d="M32 155V42c0-16 10-25 28-25s28 9 28 25v113M32 55h56M32 130h56" stroke="#71879a" stroke-width="1" opacity=".38"/><path d="M40 155V67c0-10 7-14 20-14s20 4 20 14v88" stroke="#8b9fb1" opacity=".2"/><path d="M41 50C11 70 14 118 40 144M52 50c-18 30-13 65 1 94M68 50c18 30 13 65-1 94M79 50c30 20 27 68 1 94" class="air"/></svg><p>${state.power?`柔和送风 · ${state.fan} 档`:'设置已保留'}</p></div>${dial('right','副驾')}</div><div class="climate-options"><button type="button" class="climate-option" data-action="sync" aria-pressed="${pressed(state.sync)}">${icon('repeat')}双区同步</button><button type="button" class="climate-option" data-action="ac" aria-pressed="${pressed(state.ac&&state.power)}" aria-describedby="climate-context"${state.power?'':' aria-disabled="true"'}>${icon('climate')}A/C</button><button type="button" class="climate-option" data-action="power" aria-pressed="${pressed(state.power)}">${icon('power')}${state.power?'空调开启':'空调关闭'}</button></div></section>`;
  }
  function mediaView() {
    const t=TRACKS[state.track];
    return `<div class="view media-view"><section class="panel album-panel" aria-label="唱片封面"><div class="panel-kicker"><span>LUMA SOUNDS</span><span>${String(state.track+1).padStart(2,'0')} / 03</span></div><img class="album-art" src="${cover()}" alt="${t.title} 原创抽象封面"><div class="album-caption"><span>A MOMENT FOR YOURSELF.</span><span>ORIGINAL CONCEPT</span></div></section><section class="panel media-player" aria-label="音乐播放演示"><div class="panel-kicker"><span>${t.mood}</span>${icon('music')}</div><div class="now-playing"><h2>${t.title}</h2><p>${t.artist} · 虚构曲目</p></div>${contextNote('media-context',state.mode==='driving'?'驾驶演示中保留播放与上下首；进度和曲库请驻车后调整。':'模拟播放器 · 曲目与封面为原创示例，不输出声音。',state.mode==='driving')}<div class="track-timeline"><input type="range" id="track-progress" min="0" max="${t.duration}" value="${state.progress}" aria-label="模拟播放进度" aria-describedby="media-context" aria-valuetext="${fmt(state.progress)} / ${fmt(t.duration)}" ${state.mode==='driving'?'disabled':''}><div class="timeline-labels"><span id="elapsed-time">${fmt(state.progress)}</span><span>${fmt(t.duration)}</span></div></div>${controls(true)}<p class="playback-description" data-playback-label>${state.playing?'正在模拟播放 · 不输出声音':'静音播放演示 · 不输出声音'}</p><div class="track-list" role="group" aria-label="演示曲目列表">${TRACKS.map((item,i)=>`<button type="button" class="track-row ${state.track===i?'active':''}" data-action="select-track" data-track="${i}" aria-pressed="${pressed(state.track===i)}"${parkOnly('media-context')}><span>${String(i+1).padStart(2,'0')}</span><span>${item.title}</span><span>${state.mode==='driving'?icon('lock'):fmt(item.duration)}</span></button>`).join('')}</div></section></div>`;
  }
  const estimate = () => ({energy:((state.target-68)*.75).toFixed(1),time:Math.round((state.target-68)*.75/.6+5),range:Math.round(state.target*4.79)});
  function chargingView() {
    const e=estimate();
    return `<div class="view charging-view"><section class="panel charge-visual" aria-label="充电状态"><div class="view-header"><div><p class="section-label">PLAN YOUR NEXT CHARGE.</p><h2>下一程，蓄势待发。</h2><p class="view-subtitle">设置目标，预览本次补能计划。</p></div>${pill('未连接','muted')}</div>${car()}<div class="vehicle-metrics"><div class="metric"><small>当前续航</small><strong>326<span>km</span></strong><p class="metric-note">虚构估值</p></div><div class="metric"><small>目标续航</small><strong><span id="target-range" style="font:inherit;color:inherit;margin:0">${e.range}</span><span>km</span></strong><p class="metric-note">情境估算</p></div><div class="metric"><small>连接状态</small><strong style="font-size:18px">未连接</strong><p class="metric-note">仅规划演示</p></div></div><p class="setting-footnote">AI 辅助概念车视觉</p></section><section class="panel charge-controls" aria-label="充电目标设置"><div class="panel-kicker"><span>电池与补能</span>${icon('bolt')}</div><div class="charge-ring" aria-label="当前电量68%"><svg viewBox="0 0 160 160" aria-hidden="true"><circle class="ring-track" cx="80" cy="80" r="68"/><circle class="ring-progress" cx="80" cy="80" r="68"/><circle class="ring-target" id="target-ring" cx="80" cy="80" r="72" style="stroke-dashoffset:${452.4*(1-state.target/100)}"/></svg><strong>68<small>%</small></strong><span>当前电量 · 场景示例</span></div>${contextNote('charge-context',state.mode==='driving'?'驾驶演示中保留当前计划；驻车后可调整充电目标。':'仅规划演示 · 未连接充电设备',state.mode==='driving')}<div class="charge-target-heading"><span>充电目标</span><output id="target-label">${state.target}%</output></div><div class="target-options" role="group" aria-label="选择充电目标">${[80,90,100].map(n=>`<button type="button" class="${state.target===n?'active':''}" data-action="target" data-value="${n}" aria-pressed="${pressed(state.target===n)}"${parkOnly('charge-context')}>${n}%</button>`).join('')}</div><input class="charge-slider" id="charge-target" type="range" min="70" max="100" value="${state.target}" aria-label="调整充电目标" aria-describedby="charge-context" aria-valuetext="${state.target}%" ${state.mode==='driving'?'disabled':''}><div class="charge-estimate"><div>预计补能<strong><span id="charge-energy">${e.energy}</span> <small>kWh</small></strong></div><div>演示时长<strong>约 <span id="charge-time">${e.time}</span> <small>min</small></strong></div></div><p class="charging-note">基于虚构 75 kWh 电池与固定速率的简化演示。<br>不含实际充电曲线，无法用于车辆补能决策。</p></section></div>`;
  }
  const renderers={overview:overviewView,navigation:navigationView,vehicle:vehicleView,climate:climateView,media:mediaView,charging:chargingView};
  function focusKey(element) {
    if (!element || !content.contains(element)) return null;
    return ['data-action','data-zone','data-delta','data-track','data-value','id'].filter(a=>element.hasAttribute(a)).map(a=>`[${a}="${element.getAttribute(a)}"]`).join('');
  }
  function render(preserveFocus=true) {
    const key=preserveFocus?focusKey(document.activeElement):null;
    content.innerHTML=renderers[currentView]();
    document.getElementById('system-view').textContent=LABELS[currentView];
    document.title=`LUMA · ${LABELS[currentView]} | 通勤座舱`;
    cockpit.dataset.mode=state.mode;
    cockpit.dataset.power=state.power?'on':'off';
    cockpit.dataset.view=currentView;
    document.querySelectorAll('.app-nav [data-view], .scene-nav [data-view]').forEach(b=>{const on=b.dataset.view===currentView;b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false');});
    selectionPill?.update();
    document.querySelectorAll('[data-action="mode"]').forEach(b=>{const on=b.dataset.value===state.mode;b.classList.toggle('active',on);b.setAttribute('aria-pressed',pressed(on));});
    updateDock();
    if(key){const replacement=content.querySelector(key);if(replacement&&!replacement.disabled)replacement.focus({preventScroll:true});}
    save();
  }
  function updateDock() {
    document.getElementById('dock-left').innerHTML=`${state.left}<span>°</span>`;
    document.getElementById('dock-right').innerHTML=`${state.right}<span>°</span>`;
    document.getElementById('dock-fan-level').textContent=state.power?state.fan:'—';
    document.getElementById('dock-sync').setAttribute('aria-pressed',pressed(state.sync));
    document.getElementById('dock-power').setAttribute('aria-pressed',pressed(state.power));
    document.getElementById('dock-ac').setAttribute('aria-pressed',pressed(state.ac&&state.power));
    document.getElementById('dock-ac').setAttribute('aria-disabled',pressed(!state.power));
    document.getElementById('dock-power').setAttribute('aria-label',state.power?'关闭空调，保留温度设置':'开启空调，恢复温度设置');
    document.getElementById('dock-sync').textContent=state.sync?'同步开':'同步关';
    document.getElementById('mode-caption').textContent=state.mode==='parked'?'驻车演示 · 所有场景可体验':'驾驶演示 · 娱乐浏览与复杂设置已锁定';
    document.querySelectorAll('.climate-dock [data-action="temp"]').forEach(b=>{b.disabled=(b.dataset.delta==='-1'?state[b.dataset.zone]<=16:state[b.dataset.zone]>=30);});
    document.querySelectorAll('.climate-dock [data-action="fan"]').forEach(b=>{b.disabled=!state.power||(b.dataset.delta==='-1'?state.fan<=1:state.fan>=5);});
  }
  function notify(message) {
    const toast=document.getElementById('toast');
    clearTimeout(toastTimer);toast.textContent=message;toast.classList.add('show');
    toastTimer=setTimeout(()=>toast.classList.remove('show'),3500);
  }
  function setURL(replace=false) {
    const url=new URL(location.href);url.searchParams.set('view',currentView);
    if(embedded)url.searchParams.set('embed','1');
    history[replace||embedded?'replaceState':'pushState']({view:currentView},'',url);
  }
  function reportView(replace=false) {
    if(embedded&&window.parent!==window)window.parent.postMessage({type:'luma:view-change',view:currentView,replace,requestId:parentRequest},location.origin);
  }
  function navigate(view,{historyUpdate=true,focus=false}={}) {
    if(!VIEWS.includes(view))view='overview';
    const changed=view!==currentView;
    currentView=view;
    closeDialogs();
    if(changed) {
      setURL(!historyUpdate);
      if(historyUpdate)reportView();
    }
    render(false);
    if(focus)content.focus({preventScroll:true});
  }
  function needPark(message='请切换至驻车演示后再调整。') {
    if(state.mode==='driving'){notify(message);return true;}return false;
  }
  function closeDialogs() {dialogs.forEach(target=>{if(target.open)target.close();});}
  function openDialog(target) {
    if(target.open)return;
    closeDialogs();
    dialogFocus.set(target,document.activeElement);
    if(typeof target.showModal==='function')target.showModal();
    else notify('当前浏览器不支持确认弹窗，请使用较新的浏览器。');
  }
  function openRoute() {
    if(needPark('驾驶演示中详细路线已收起，请切换至驻车查看。'))return;
    openDialog(dialog);
  }
  function handleAction(button) {
    const action=button.dataset.action;
    if(action==='close-dialog'||action==='cancel-reset'){closeDialogs();return;}
    if(action==='route-details'){openRoute();return;}
    if(action==='mode') {
      if(state.mode===button.dataset.value){notify(state.mode==='parked'?'当前已是驻车演示。':'当前已是驾驶演示。');return;}
      state.mode=button.dataset.value==='driving'?'driving':'parked';
      closeDialogs();
      notify(state.mode==='driving'?'已进入驾驶演示，曲库与复杂设置已锁定。':'已进入驻车演示，全部场景可体验。');
    } else if(action==='reset') {
      openDialog(resetDialog);return;
    } else if(action==='confirm-reset') {
      if(!resetDialog.open)return;
      state=freshState();currentView='overview';closeDialogs();setURL(true);render(false);reportView(true);notify('演示已重置。');return;
    } else if(action==='temp') {
      const zone=button.dataset.zone;const next=clamp(state[zone]+Number(button.dataset.delta),16,30);
      state[zone]=next;if(state.sync){state.left=next;state.right=next;}
      notify(`${state.sync?'双区同步':zone==='left'?'主驾':'副驾'} ${next}°C${state.power?'':' · 空调关闭，设置已保留'}${next===16?' · 已达最低温度':next===30?' · 已达最高温度':''}`);
    } else if(action==='sync') {
      state.sync=!state.sync;if(state.sync)state.right=state.left;
      notify(state.sync?'双区同步已开启，以主驾温度为准。':'双区同步已关闭，可独立调整。');
    } else if(action==='power') {
      state.power=!state.power;notify(state.power?'空调已开启。':'空调已关闭，原设置已保留。');
    } else if(action==='ac') {
      if(!state.power){notify('请先开启空调，再切换 A/C。');return;}
      state.ac=!state.ac;notify(state.ac?'A/C 已开启。':'A/C 已关闭。');
    } else if(action==='fan') {
      if(!state.power){notify('请先开启空调。');return;}
      state.fan=clamp(state.fan+Number(button.dataset.delta),1,5);notify(`风量 ${state.fan} 档${state.fan===1?' · 已达最低风量':state.fan===5?' · 已达最高风量':''}`);
    } else if(action==='lock'||action==='lights') {
      if(needPark('驾驶演示中无法调整车辆控制，请先切换至驻车。'))return;
      if(action==='lock'){state.locked=!state.locked;notify(state.locked?'模拟状态：车门已锁。':'模拟状态：车门已解锁。');}
      else {state.lights=!state.lights;notify(state.lights?'迎宾灯光显示已开启。':'迎宾灯光显示已关闭。');}
    } else if(action==='play') {
      state.playing=!state.playing;
      if(state.progress>=TRACKS[state.track].duration)state.progress=0;
      notify(state.playing?'开始模拟播放，不会发出声音。':'模拟播放已暂停。');
    } else if(action==='track-step') {
      state.track=(state.track+Number(button.dataset.delta)+TRACKS.length)%TRACKS.length;state.progress=0;
      notify(`已切换：${TRACKS[state.track].title}`);
    } else if(action==='select-track') {
      if(needPark('驾驶演示中曲库浏览已锁定，仍可使用上一首与下一首。'))return;
      const selected=clamp(Number(button.dataset.track),0,2);
      if(state.track===selected){notify(`当前曲目：${TRACKS[selected].title}`);return;}
      state.track=selected;state.progress=0;notify(`已选择：${TRACKS[state.track].title}`);
    } else if(action==='target') {
      if(needPark('驾驶演示中不能修改充电目标，请先切换至驻车。'))return;
      state.target=clamp(Number(button.dataset.value),70,100);notify(`充电目标 ${state.target}% · 仅演示估算`);
    } else if(action==='route-start') {
      state.routeActive=!state.routeActive;
      notify(state.routeActive?'路线演示已开始，地图与数值为静态情境示例。':'路线演示已结束。');
    } else return;
    render();
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button, a[data-view]');
    if(!button||button.disabled)return;
    if(button.dataset.view){
      if(button.tagName==='A') {
        if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
        event.preventDefault();
      }
      navigate(button.dataset.view);return;
    }
    if(button.dataset.action)handleAction(button);
  });
  document.querySelector('.luma-symbol').addEventListener('click',event=>{event.preventDefault();navigate('overview');});
  content.addEventListener('input',event=>{
    if(event.target.id==='track-progress') {
      if(state.mode==='driving'){event.target.value=state.progress;return;}
      state.progress=clamp(Number(event.target.value),0,TRACKS[state.track].duration);
      event.target.setAttribute('aria-valuetext',`${fmt(state.progress)} / ${fmt(TRACKS[state.track].duration)}`);
      document.getElementById('elapsed-time').textContent=fmt(state.progress);save();
    } else if(event.target.id==='charge-target') {
      if(state.mode==='driving'){event.target.value=state.target;return;}
      state.target=clamp(Number(event.target.value),70,100);event.target.setAttribute('aria-valuetext',`${state.target}%`);
      const e=estimate();
      document.getElementById('target-label').textContent=`${state.target}%`;
      document.getElementById('target-range').textContent=e.range;
      document.getElementById('charge-energy').textContent=e.energy;
      document.getElementById('charge-time').textContent=e.time;
      document.getElementById('target-ring').style.strokeDashoffset=452.4*(1-state.target/100);
      document.querySelectorAll('[data-action="target"]').forEach(b=>{const on=Number(b.dataset.value)===state.target;b.classList.toggle('active',on);b.setAttribute('aria-pressed',pressed(on));});save();
    }
  });
  content.addEventListener('change',event=>{if(event.target.id==='charge-target')notify(`充电目标 ${state.target}% · 仅演示估算`);});
  dialogs.forEach(target=>{
    target.addEventListener('click',event=>{if(event.target===target){const r=target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)target.close();}});
    target.addEventListener('close',()=>{const previous=dialogFocus.get(target);if(previous?.isConnected)previous.focus({preventScroll:true});dialogFocus.delete(target);});
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.getElementById('toast').classList.remove('show');closeDialogs();}});
  window.addEventListener('popstate',()=>{const v=new URLSearchParams(location.search).get('view');navigate(VIEWS.includes(v)?v:'overview',{historyUpdate:false});});
  // Only the same-origin embedding page can control this preview.
  window.addEventListener('message',event=>{
    if(!embedded||event.origin!==location.origin||event.source!==window.parent||!event.data||typeof event.data!=='object')return;
    if(event.data.type==='luma:request-ready')window.parent.postMessage({type:'luma:ready'},location.origin);
    if(event.data.type==='luma:set-view'&&VIEWS.includes(event.data.view)&&Number.isSafeInteger(event.data.requestId)&&event.data.requestId>0) {
      parentRequest=event.data.requestId;
      navigate(event.data.view,{historyUpdate:false});
    }
  });
  setInterval(()=>{
    if(!state.playing||document.hidden)return;
    state.progress+=1;
    if(state.progress>=TRACKS[state.track].duration){state.progress=TRACKS[state.track].duration;state.playing=false;render();return;}
    const progress=document.getElementById('track-progress');
    if(progress&&document.activeElement!==progress){progress.value=state.progress;progress.setAttribute('aria-valuetext',`${fmt(state.progress)} / ${fmt(TRACKS[state.track].duration)}`);}
    const elapsed=document.getElementById('elapsed-time');if(elapsed)elapsed.textContent=fmt(state.progress);save();
  },1000);
  setURL(true);render(false);
  selectionPill = embedded ? null : window.PortfolioMotion?.createPillNav(document.querySelector('.scene-nav'));
  if(embedded&&window.parent!==window)window.parent.postMessage({type:'luma:ready'},location.origin);
})();
