'use strict';
const PUBLIC_ROLES=['customer','storefront'];
const UNPUBLISHED_ACTIONS=new Set(['support-view','operations-view','ops-tab','issue-seed','issue-detail','issue-verify','issue-resolve-sync','coupon-failure-demo','cancel-order-open','cancel-order-confirm','run-reconciliation','touch-preview','restore-return','support-redeem','pos-redeem','bind-customer','refund-open','refund-confirm','reserve-return','create-label','scan-label','cancel-return','free-return','ship-success','ship-fail','permission','pos-coupon-method','pos-coupon-apply','pos-coupon-clear','pos-scan-demo']);
document.addEventListener('click',event=>{
 const el=event.target.closest('button,a');
 if(!el)return;
 if(el.dataset.role&&!PUBLIC_ROLES.includes(el.dataset.role)||UNPUBLISHED_ACTIONS.has(el.dataset.action)){
  event.preventDefault();event.stopImmediatePropagation();
 }
},true);
document.addEventListener('submit',event=>{
 if(['search-form','pos-coupon-form'].includes(event.target.id)){event.preventDefault();event.stopImmediatePropagation();}
},true);
const publicBaseModal=modal;
modal=function(title,content,buttons=[]){publicBaseModal(title,content,buttons.filter(button=>!UNPUBLISHED_ACTIONS.has(button.action)));};


'use strict';
const TIERS=[{name:'Member',min:0,base:0,rate:1,response:'48 小时'},{name:'VIP1',min:150,base:.03,rate:1.1,response:'12 工作小时'},{name:'VIP2',min:500,base:.05,rate:1.2,response:'8 工作小时'},{name:'VIP3',min:1500,base:.1,rate:1.3,response:'4 工作小时'}];
const REWARDS=[{id:'c5',name:'$5 优惠券',cost:500,value:5,min:100,type:'coupon'},{id:'c10',name:'$10 优惠券',cost:1000,value:10,min:200,type:'coupon'},{id:'c20',name:'$20 优惠券',cost:2000,value:20,min:400,type:'coupon'},{id:'c30',name:'$30 优惠券',cost:3000,value:30,min:600,type:'coupon'},{id:'ship',name:'美国配送升级',cost:400,type:'shipping'},{id:'return',name:'美国免费退货权益',cost:500,type:'return'}];
const NAMES={overview:'会员总览',rewards:'兑换权益',wallet:'我的权益',points:'积分明细',tiers:'等级与权益',checkout:'购物车与结账',join:'加入会员',settings:'账户与计划'};
let role='customer',page='overview',device='desktop',scenario='vip2',filter='all',state;
const money=n=>'$'+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const number=n=>n.toLocaleString('en-US');
const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tierIndex=spend=>spend>=1500?3:spend>=500?2:spend>=150?1:0;
const tier=()=>TIERS[tierIndex(state.spend)];
const round=n=>Math.round((n+Number.EPSILON)*100)/100;
// Floor the payable merchandise amount before multiplying by the tier rate; retain fractional points.
const earnPoints=(net,rate)=>Math.floor(net)*Math.round(rate*10)/10;
function spendPoints(amount){state.points-=amount;let left=amount;for(const lot of state.lots.sort((a,b)=>a.expires-b.expires)){const take=Math.min(left,lot.amount);lot.amount-=take;left-=take;if(!left)break;}syncExpiry();}
function grantPoints(amount,expires=today()+365){const offset=Math.min(amount,Math.max(0,-state.points));state.points+=amount;if(amount>offset)state.lots.push({amount:amount-offset,expires});syncExpiry();}
function syncExpiry(){const lots=state.lots.filter(l=>l.amount>0).sort((a,b)=>a.expires-b.expires);state.expiryDay=lots.length?lots[0].expires:today()+365;state.expiring=lots.filter(l=>l.expires===state.expiryDay).reduce((a,b)=>a+b.amount,0);}
const today=()=>state.day;
const date=offset=>new Date(Date.UTC(2026,9,10+offset)).toISOString().slice(0,10);
function calculate({spend=860,quantity=3,price=56,promo=0,first=false,coupon=null}){
 const t=TIERS[tierIndex(spend)],subtotal=round(quantity*price),bundle=quantity>=12?.2:quantity>=6?.1:quantity>=3?.05:0;
 const base=round(subtotal*(1-t.base));
 const candidates=[{id:'member',name:bundle?'会员 + 满件优惠':'会员基础折扣',total:round(subtotal*(1-t.base)*(1-bundle)),detail:`${t.name} ${round(t.base*100)}% + ${round(bundle*100)}% 满件，顺序计算`,valid:true}];
 if(first)candidates.push({id:'first',name:'新客首单优惠',total:round(subtotal*(1-Math.max(.1,bundle))),detail:'首单 10% 与基础满件折扣取更优',valid:true});
 if(promo>0)candidates.push({id:'promo',name:'普通优惠码 / 临时促销',total:round(subtotal*(1-promo/100)),detail:`${promo}% 独立使用`,valid:true});
 if(coupon){const valid=base>=coupon.min;candidates.push({id:'coupon',name:`会员基础折扣 + ${coupon.name}`,total:valid?round(Math.max(0,base-coupon.value)):base,valid,detail:valid?'不与满件、首单、达人码或临时促销叠加':`会员折后商品金额未满 ${money(coupon.min)}`});}
 const chosen=candidates.filter(x=>x.valid).reduce((a,b)=>b.total<a.total?b:a);
 return {t,subtotal,base,bundle,candidates,chosen,points:earnPoints(chosen.total,t.rate)};
}
function init(which='vip2'){
 const spends={vip2:860,member:120,vip1:320,vip3:1720,new:0,low:860,downgrade:540,expiry:860,sync:860};
 state={day:0,spend:spends[which],points:which==='new'?0:which==='low'?120:which==='downgrade'?80:1280,joined:which!=='new',bonus:which!=='new',pending:which==='new'?[]:[{id:'p0',amount:187,due:8,name:'线上订单 #F10482 · 已发货',net:155.84,rate:1.2}],wallet:[],ledger:[{label:'LA 门店购物积分',amount:114,channel:'LA POS',status:'available',day:-7},{label:'线上订单购物积分',amount:252,channel:'官网',status:'available',day:-16},{label:'美国配送升级',amount:-400,channel:'官网',status:'available',day:-25}],audit:[],qty:3,promo:0,first:which==='new',coupon:null,ship:false,address:'us',fulfilled:false,bound:false,found:false,sync:which==='sync',permission:true,joinStep:0,email:'',refundNet:95,refundedNet:0,refundedPoints:0,refundDone:false,returnReason:'customer',returnState:'eligible',labelScanned:false,shipFulfilled:false,processed:false,expiredPoints:false,counter:0,expiring:which==='new'?0:Math.min(120,which==='downgrade'?80:1280),expiryDay:23};
 if(which==='new'){state.ledger=[];state.expiring=0;}
 if(which==='expiry')state.wallet.push({id:'w-expired',reward:'c5',status:'expired',created:-40,code:'FIO-EXPIRED-5'});
 state.email=which==='new'?'':'alex@example.com';state.name=which==='new'?'Fioboc Member':'Alex Morgan';state.memberId=which==='new'?'FIO-028165':'FIO-028164';state.originalOrder=which!=='new';state.lots=state.points>0?[{amount:Math.min(120,state.points),expires:23},...(state.points>120?[{amount:state.points-120,expires:300}]:[])]:[];syncExpiry();
 filter='all';
}
function log(label,amount,channel='官网'){state.ledger.unshift({label,amount,channel,status:'available',day:today()});state.audit.unshift({label,amount,day:today(),actor:role==='pos'?'门店员工 LA-04':role==='support'?'客服 CS-02':'会员本人'});}
function toast(message){document.getElementById('toasthost').innerHTML=`<div class="toast" role="status">${esc(message)}</div>`;clearTimeout(toast.timer);toast.timer=setTimeout(()=>document.getElementById('toasthost').innerHTML='',4500);}
function modal(title,content,buttons=[]){const previouslyFocused=document.activeElement;document.getElementById('modalhost').innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><button class="close" aria-label="关闭弹窗" data-action="close">×</button><div class="eyebrow muted">FIOBOC MEMBERSHIP</div><h2 id="modal-title">${title}</h2>${content}<div class="actions">${buttons.map(x=>`<button class="btn ${x.secondary?'secondary':''}" data-action="${x.action}" ${x.id?`data-id="${x.id}"`:''}>${x.text}</button>`).join('')}</div></section></div>`;modal.previous=previouslyFocused;document.querySelector('.modal .close').focus();}
function closeModal(){document.getElementById('modalhost').innerHTML='';if(modal.previous&&modal.previous.isConnected)modal.previous.focus();}
function activeWallet(){return state.wallet.filter(w=>w.status==='available'&&today()-w.created<30);}
function redeemOpen(id){const r=REWARDS.find(x=>x.id===id);if(!state.joined){page='join';render();return;}if(state.sync){toast('余额同步失败，请稍后重试；当前未扣分。');return;}if(state.points<r.cost){toast(`还差 ${number(r.cost-state.points)} 积分，待入账积分不能用于兑换。`);return;}
 const details=r.type==='coupon'?`官网与 LA POS 通用；会员折后商品金额满 ${money(r.min)} 可用；兑换后 30 天有效。仅叠加会员基础折扣，每单 1 张。未使用且兑换后 24 小时内可撤销。`:r.type==='shipping'?'仅美国本土 48 州、现货线上订单；标准配送升级一级。结账时选择适用订单，不承诺绝对到货日。未发货取消或未实际升级，退还 400 积分。':'美国线上合规订单可用，每次对应 1 个订单。兑换后联系客服核对原订单，签发退货标签。品牌错发、漏发、质量问题，以及线上订单到 LA 门店退货，均不需要兑换。';
 modal(`兑换${r.name}`,`<p>${details}</p><div class="detail"><div class="row between"><span>本次消耗</span><strong>${number(r.cost)} 积分</strong></div><div class="row between"><span>兑换后余额</span><strong>${number(state.points-r.cost)} 积分</strong></div></div><p>兑换积分不会改变会员等级。</p>`,[{text:'返回',action:'close',secondary:true},{text:'确认兑换',action:'redeem-confirm',id}]);
}
function redeem(id,channel='官网'){
 const r=REWARDS.find(x=>x.id===id);if(!state.joined||state.sync||state.points<r.cost)return null;
 spendPoints(r.cost);state.counter++;
 const w={id:'w'+state.counter,reward:id,status:'available',created:today(),code:`FIO-${String(state.counter).padStart(4,'0')}-${r.value||r.cost}`,order:null};state.wallet.unshift(w);log(`兑换${r.name}`,-r.cost,channel);return w;
}
function rewardCard(r){const available=state.joined&&!state.sync&&state.points>=r.cost;return `<article class="reward"><div class="reward-art ${r.type==='coupon'?'coupon':''}">${r.type==='coupon'?`<div class="ticket">$${r.value}</div>`:`<div class="reward-symbol">${r.type==='shipping'?'↗':'↶'}</div>`}</div><div class="rewardbody"><h3>${r.name}</h3><p>${r.type==='coupon'?`满 $${r.min} 可用 · 官网 / LA 门店`:r.type==='shipping'?'美国线上订单 · 标准配送升级一级':'美国线上订单 · 客服核单后出标签'}</p><div class="row between"><span class="cost">${number(r.cost)} <small>积分</small></span><button class="btn small secondary" data-action="redeem" data-id="${r.id}" ${state.joined&&!available?'disabled':''}>${!state.joined?'加入后兑换':state.sync?'稍后重试':available?'兑换':`差 ${number(r.cost-state.points)} 分`}</button></div></div></article>`;}
function shell(content){const current=tier();return `<div class="announcement">ONE MEMBERSHIP. ONLINE & IN LOS ANGELES.</div><header class="brandbar"><a href="#overview" class="logo">FIOBOC</a><nav class="brandnav" aria-label="品牌导航"><a href="https://www.fioboc.com/collections/new-in" target="_blank" rel="noopener">NEW ARRIVAL</a><a href="https://www.fioboc.com/collections/mens-collection" target="_blank" rel="noopener">MEN</a><a href="https://www.fioboc.com/collections/best-selling-products" target="_blank" rel="noopener">BEST SELLERS</a><a href="#tiers" class="current">MEMBERSHIP</a></nav><div class="brandicons"><button data-action="page" data-id="settings" aria-label="账户">♙</button><button data-action="page" data-id="checkout" aria-label="购物车">▢</button></div></header><div class="workspace"><aside class="sidebar"><div class="profile"><div class="avatar">${state.joined?'AM':'F'}</div><strong>${state.joined?esc(state.name):'Welcome to Fioboc'}</strong><div class="small muted">${state.joined?esc(state.email):'一个账户，线上线下通用'}</div><div style="margin-top:12px"><span class="pill sand">${state.joined?current.name:'尚未加入会员'}</span></div></div><div class="sidetitle">MY MEMBERSHIP</div><nav class="sidebuttons" aria-label="会员中心">${Object.entries(NAMES).map(([id,name])=>`<button data-action="page" data-id="${id}" class="${page===id?'active':''}" ${page===id?'aria-current="page"':''}>${name}<span>↗</span></button>`).join('')}</nav><div class="sidebarfoot"><span class="pill green"><i class="dot"></i>官网与 LA 门店通用</span><p class="muted" style="margin-top:10px">同一等级，同一积分余额。</p><div class="sidecode" style="margin-top:14px">MEMBER ID · ${state.memberId}</div></div></aside><main class="main" id="main-content">${content}</main></div>${footer()}`;}
function footer(){return `<footer class="footer"><span>© 2026 FIOBOC · Wear your comfort.</span><div class="links"><button class="link" data-action="notice">财务激励通知</button><button class="link" data-action="terms">会员计划条款</button><a href="https://www.fioboc.com/pages/privacy-policy" target="_blank" rel="noopener">隐私政策</a><button class="link" data-action="contact">联系我们</button></div></footer>`;}
function head(eyebrow,title,subtitle){return `<div class="pagehead"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${subtitle?`<p>${subtitle}</p>`:''}</div>`;}
function gate(content){return state.joined?content:`${head('MEMBERSHIP','加入会员，开启更多回馈','免费加入。线上与洛杉矶门店共用同一账户。')}<div class="empty"><h3>登录账户后，仍需选择加入会员计划</h3><p>完成邮箱验证并明确同意后，首次加入可获得 100 积分。</p><button class="btn" data-action="page" data-id="join">免费加入</button></div>`;}
function overview(){if(!state.joined)return join();const t=tier(),idx=tierIndex(state.spend),next=TIERS[idx+1],progress=next?Math.min(100,(state.spend-t.min)/(next.min-t.min)*100):100;return `${head('MY EVERYDAY ADVANTAGES',state.name==='Alex Morgan'?'你好，Alex。':'欢迎加入 Fioboc。','舒适的每一天，值得更多回馈。')} ${state.sync?'<div class="notice error" role="alert">积分同步暂时失败。以下为最近一次已同步数据，兑换与订单操作暂不可用。<button class="link" style="margin-left:10px" data-action="retry-sync">重新同步</button></div>':''}${state.points<0?'<div class="notice error" role="alert">退款后积分余额为负，暂不可兑换。客服将核对原订单和历史兑换记录。</div>':''}<div class="hero-grid"><section class="tiercard"><div class="row between"><span class="eyebrow">YOUR MEMBERSHIP</span><span class="pill">官网 + LA 门店</span></div><div class="tier">${t.name}</div><div class="small" style="margin-top:6px;color:#c5cdbd">${t.base?`专享 ${t.base*100}% 会员基础折扣`:'每次消费，离下一等级更近'}</div><div class="tierbottom"><div class="row between small"><span class="muted">近 12 个月净商品消费</span><strong class="num">${money(state.spend)}</strong></div><div class="track" role="progressbar" aria-label="升级进度" aria-valuenow="${round(progress)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress}%"></span></div><div class="row between small"><span>${next?`再消费 ${money(next.min-state.spend)} 升级 ${next.name}`:'已达到最高等级'}</span><button class="link" style="color:#e6decd" data-action="page" data-id="tiers">查看权益</button></div></div></section><section class="pointcard"><div class="row between"><span class="eyebrow muted">AVAILABLE POINTS</span><button class="link small" data-action="page" data-id="points">积分明细 ↗</button></div><div class="pointnumber num" id="balance">${number(state.points)}<span>可用积分</span></div><p class="small muted">每消费 $1 获得 ${t.rate} 积分</p><div class="pointfooter"><div><span>待入账</span><strong class="num">${number(state.pending.reduce((a,b)=>a+b.amount,0))} <small>分</small></strong></div><div><span>${state.expiring?date(state.expiryDay)+' 到期':'暂无待到期积分'}</span><strong class="num">${number(state.expiring)} <small>分</small></strong></div></div></section></div><div class="benefitstrip"><div><span class="icon">◇</span><div><strong>${round((t.rate-1)*100)}% 额外积分</strong><p class="small muted">每 $1 获 ${t.rate} 分</p></div></div><div><span class="icon">◷</span><div><strong>${t.response}首次响应</strong><p class="small muted">等级自动获得 · 不消耗积分</p></div></div><div><span class="icon">⇄</span><div><strong>线上线下，同享权益</strong><p class="small muted">LA 到店退货不消耗积分</p></div></div></div><div class="sectionhead"><h2>把积分，用在下一次舒适。</h2><button class="link small" data-action="page" data-id="rewards">查看全部 6 项权益 ↗</button></div><div class="rewardgrid">${[REWARDS[0],REWARDS[4],REWARDS[5]].map(rewardCard).join('')}</div><div class="feature-note"><div class="box">⌂</div><div style="flex:1"><div class="eyebrow muted">YOUR LOCAL FIOBOC</div><h3>洛杉矶门店，也是你的会员中心。</h3><p>免费门店自提 · 线上订单免费到店退 · 收银前出示会员邮箱</p></div><button class="link small" data-action="member-card">查看会员凭证 ↗</button></div>`;}
function rewards(){return gate(`${head('REDEEM YOUR POINTS','积分兑换','积分只用于兑换，不影响会员等级。')}<div class="row between"><span>可用余额 <strong class="num">${number(state.points)} 积分</strong></span><span class="pill">待入账积分不可兑换</span></div><div class="tabs" role="tablist" aria-label="权益类型">${[['all','全部权益'],['coupon','优惠券'],['service','服务权益']].map(([id,name])=>`<button role="tab" aria-selected="${filter===id}" class="${filter===id?'active':''}" data-action="reward-filter" data-id="${id}">${name}</button>`).join('')}</div><div class="rewardgrid">${REWARDS.filter(r=>filter==='all'||(filter==='coupon'?r.type==='coupon':r.type!=='coupon')).map(rewardCard).join('')}</div>`);}
function wallet(){return gate(`${head('MY REWARDS','我的权益','优惠券和服务权益分别管理，线上与门店共用。')}<div class="tabs" role="tablist" aria-label="权益状态">${[['all','全部'],['available','可用'],['used','已使用 / 已结束']].map(([id,name])=>`<button role="tab" aria-selected="${filter===id}" class="${filter===id?'active':''}" data-action="wallet-filter" data-id="${id}">${name}</button>`).join('')}</div>${state.wallet.filter(w=>filter==='all'||(filter==='available'?w.status==='available':['used','expired','canceled','consumed'].includes(w.status))).length?`<div class="wallet-grid">${state.wallet.filter(w=>filter==='all'||(filter==='available'?w.status==='available':['used','expired','canceled','consumed'].includes(w.status))).map(w=>{const r=REWARDS.find(x=>x.id===w.reward),labels={available:'可用',reserved:'已预留 / 标签待首扫',consumed:'已使用',used:'已使用',expired:'已过期',canceled:'已撤销 / 积分已退'};return `<article class="wallet"><div class="row between"><h3>${r.name}</h3><span class="pill ${w.status==='available'?'green':''}">${labels[w.status]}</span></div><p class="small muted">${r.type==='coupon'?`满 $${r.min} · ${date(w.created+30)} 到期 · 单次使用`:r.type==='return'?'联系客服核对美国线上原订单后使用':'结账时选择美国本土 48 州现货订单'}</p><div class="wallet-code">${esc(w.code)}</div><div class="row between"><span class="small muted">${date(w.created)} 兑换</span>${w.status==='available'?`<button class="link small" data-action="wallet-use" data-id="${w.id}">${r.type==='return'?'申请使用':'去结账使用'} ↗</button>`:''}</div>${w.status==='available'&&r.type==='coupon'&&today()===w.created?`<button class="link small" data-action="revoke" data-id="${w.id}" style="text-align:left;color:#7d806f">未使用，可在 24 小时内撤销兑换</button>`:''}</article>`;}).join('')}</div>`:`<div class="empty"><h3>暂无已兑换权益</h3><p>选择优惠券或服务权益，兑换后将显示在这里。</p><button class="btn" data-action="page" data-id="rewards">去兑换权益</button></div>`}<div class="notice">积分券：30 天有效，每单 1 张。退款按折后实付金额处理。服务：以实际履约记录为准，不换现金。</div>`);}
function points(){return gate(`${head('POINTS ACTIVITY','积分明细','消费积分在发货或提货后 30 天转为可用，获得后有效期 12 个月。')}<div class="row between"><div><span class="muted small">可用积分</span><h2 class="num">${number(state.points)}</h2></div><div style="text-align:right"><span class="muted small">待入账积分</span><h2 class="num">${number(state.pending.reduce((a,b)=>a+b.amount,0))}</h2></div></div><div class="tabs" role="tablist" aria-label="积分状态">${[['all','全部'],['pending','待入账'],['available','已入账 / 扣减']].map(([id,name])=>`<button role="tab" aria-selected="${filter===id}" class="${filter===id?'active':''}" data-action="points-filter" data-id="${id}">${name}</button>`).join('')}</div>${filter!=='available'?state.pending.map(p=>`<div class="ledger"><div><strong>${p.name}</strong><p class="small muted">净商品金额 ${money(p.net)} × ${p.rate} · ${p.due===null?'发货 / 提货后开始 30 天等待期':date(p.due)+' 可用'}</p></div><div style="text-align:right"><div class="change num">+${number(p.amount)}</div><span class="pill sand">待入账</span></div></div>`).join(''):''}${filter!=='pending'?state.ledger.map(l=>`<div class="ledger"><div><strong>${l.label}</strong><p class="small muted">${l.channel} · ${date(l.day)} · ${l.amount<0?'扣减':'已入账'}</p></div><div class="change num ${l.amount>0?'positive':'negative'}">${l.amount>0?'+':''}${number(l.amount)}</div></div>`).join(''):''}${((filter==='pending'&&!state.pending.length)||(filter==='available'&&!state.ledger.length)||(!state.pending.length&&!state.ledger.length))?'<div class="empty"><h3>暂无积分记录</h3></div>':''}<div class="notice">仅展示最近记录，余额包含历史积分。商品折后净金额计分，不含税、运费、礼品卡。先对商品应付小计向下取整，再乘以会员等级积分基数，保留乘积的小数。退款扣回原订单对应积分，可能形成待核对的负余额。</div>`);}
function tiers(){return `${head('GROW WITH FIOBOC','会员等级与权益','官网与 LA 门店的近 12 个月净商品消费合并计算。达到门槛立即升级，退款后重算。')}<div class="tablewrap"><table><thead><tr><th>会员权益</th>${TIERS.map(t=>`<th class="${state.joined&&t.name===tier().name?'activecol':''}">${t.name} ${state.joined&&t.name===tier().name?'<span class="pill green">当前</span>':''}</th>`).join('')}</tr></thead><tbody><tr><td>近 12 个月净消费</td><td>$0–149.99</td><td>$150–499.99</td><td>$500–1,499.99</td><td>≥ $1,500</td></tr>${[['会员基础折扣',...TIERS.map(t=>`${t.base*100}%`)],['每消费 $1 获积分',...TIERS.map(t=>`${t.rate} 分`)],['客服首次响应',...TIERS.map(t=>t.response)],['积分兑换优惠券','500 分起','500 分起','500 分起','500 分起'],['美国配送升级','400 分','400 分','400 分','400 分'],['美国免费退货权益','500 分','500 分','500 分','500 分']].map(r=>`<tr>${r.map((v,i)=>`<td class="${i&&state.joined&&TIERS[i-1].name===tier().name?'activecol':''}">${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="sectionhead"><h2>会员与满件，最终可省多少？</h2><span>顺序叠加后的最终折扣</span></div><div class="tablewrap"><table><thead><tr><th>购买件数</th>${TIERS.map(t=>`<th>${t.name}</th>`).join('')}</tr></thead><tbody>${[[1,0],[3,.05],[6,.1],[12,.2]].map(([q,b])=>`<tr><td>${q===1?'1–2':q===3?'3–5':q===6?'6–11':'12+'} 件</td>${TIERS.map(t=>`<td class="num">${round((1-(1-t.base)*(1-b))*100)}%</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="notice">服务均需积分兑换；客服优先级随等级自动生效，仅承诺首次响应时效。积分使用不降级，净消费退款与滚动窗口变化可能影响等级。</div>`;}
function join(){return `<div class="joinlayout"><section class="joinhero"><div class="eyebrow">FIOBOC MEMBERSHIP</div><h1>穿得舒适。<br>回馈更多。</h1><p>One membership.<br>Everyday advantages.</p><div class="stack" style="margin-top:35px"><div><strong>100 积分</strong><p class="small" style="margin-top:0">首次验证并加入后，即可获得</p></div><div><strong>官网 + 洛杉矶门店</strong><p class="small" style="margin-top:0">共用等级、积分与优惠券</p></div><div><strong>消费升级，兑换回馈</strong><p class="small" style="margin-top:0">免费加入 · 无会员费</p></div></div><span class="bigf">F</span></section><section class="joinform"><div class="joinstep">${state.joinStep?'02 / VERIFY YOUR EMAIL':'01 / JOIN FOR FREE'}</div><h2>${state.joined?'你已加入会员计划':state.joinStep?'验证邮箱，完成加入':'加入会员计划'}</h2>${state.joined?`<p class="muted small" style="margin:15px 0">本客户已领取首次加入积分，不会重复赠送。</p><button class="btn" data-action="page" data-id="overview">查看会员中心</button>`:state.joinStep?`<p class="small muted" style="margin:14px 0">验证码已发送至 ${esc(state.email)}。</p><form id="verify-form"><div class="form-field"><label for="verify-code">6 位邮箱验证码</label><input id="verify-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required placeholder="输入验证码"></div><div id="join-error" role="alert"></div><button class="btn" type="submit">验证并完成加入</button></form><button class="link small" style="margin-top:18px" data-action="join-back">返回修改邮箱</button>`:`<p class="small muted" style="margin:13px 0 23px">账户注册与加入会员分开确认。已有 Fioboc 账户也可以使用同一邮箱加入。</p><form id="join-form"><div class="form-field"><label for="join-email">邮箱地址</label><input id="join-email" name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div><div class="notice" style="margin:18px 0">加入前请阅读 <button type="button" class="link" data-action="notice">财务激励通知</button>、<button type="button" class="link" data-action="terms">会员计划条款</button> 与 <a class="link" href="https://www.fioboc.com/pages/privacy-policy" target="_blank" rel="noopener">隐私政策</a>。</div><label class="check"><input id="join-consent" name="consent" type="checkbox" required><span>我已阅读并明确同意加入 Fioboc 会员计划。</span></label><label class="check"><input id="join-marketing" name="marketing" type="checkbox"><span class="muted">我愿意接收 Fioboc 邮件资讯与优惠（可选，可随时取消）。</span></label><div id="join-error" role="alert"></div><button type="submit" class="btn">发送验证码</button></form><p class="small muted" style="margin-top:18px">100 积分将在验证完成并成功加入后到账，同一客户仅赠送一次。会员加入不等于营销订阅。</p>`}</section></div>`;}
function checkout(isPos=false){const cp=REWARDS.find(r=>r.id===state.coupon&&r.type==='coupon')||null,result=calculate({spend:state.spend,quantity:state.qty,promo:state.promo,first:state.first,coupon:cp}),t=result.t;const shipEligible=!isPos&&state.address==='us',shipWallet=activeWallet().find(w=>w.reward==='ship');const couponWallet=cp&&activeWallet().find(w=>w.reward===cp.id),canPay=state.joined&&!state.sync&&(!isPos||state.bound)&&(!state.ship||shipEligible&&(shipWallet||state.points>=400));return `${isPos?'':head('YOUR BAG','购物车','自动选择更优惠的折扣方案，付款前展示明细。')}<div class="checkout-grid"><div><div class="row between"><span class="pill ${state.joined?'green':''}">${state.joined?`${t.name} 已识别`:'尚未加入会员'}</span>${!state.joined?'<button class="link small" data-action="page" data-id="join">加入后享会员回馈</button>':'<span class="small muted">'+'消费前等级：'+t.name+'</span>'}</div><div class="product"><div class="product-art" aria-label="商品示意">SC</div><div style="flex:1"><h3>StayCool 2.0 Tee</h3><p>Black / M · 商品示意 · 演示价 $56.00</p><div class="quantity" aria-label="购买数量"><button data-action="qty-down" aria-label="减少数量">−</button><span class="num">${state.qty}</span><button data-action="qty-up" aria-label="增加数量">+</button></div></div><strong class="small num">${money(result.subtotal)}</strong></div><div class="form-field"><label for="coupon-select">积分优惠券</label><select id="coupon-select"><option value="">不使用积分券</option>${REWARDS.filter(r=>r.type==='coupon').map(r=>`<option value="${r.id}" ${state.coupon===r.id?'selected':''}>${r.name} · 满 $${r.min} · ${activeWallet().some(w=>w.reward===r.id)?'已兑换':'需 '+number(r.cost)+' 积分'}</option>`).join('')}</select></div>${cp?`<div class="notice ${result.chosen.id==='coupon'?'success':'warn'}">${result.chosen.id==='coupon'?couponWallet?'本单使用已兑换的单次券。':state.points>=cp.cost?'本单积分券更优惠。完成订单前确认兑换并应用。':'积分券更优惠，但余额不足，当前不可应用。':result.candidates.find(c=>c.id==='coupon').valid?'其他优惠更划算，本单不使用积分券；已兑换券保留，尚未兑换不扣分。':'未满足积分券最低商品金额，本单不使用积分券。'}</div>`:''}<details class="panel" style="padding:14px 17px"><summary class="small">其他优惠与比价明细</summary><div class="form-field"><label for="promo-input">普通优惠码 / 活动折扣（演示 %）</label><input id="promo-input" type="number" value="${state.promo}" min="0" max="80" step="1"></div><label class="check"><input id="first-input" type="checkbox" ${state.first?'checked':''}><span>首单订单</span></label>${result.candidates.map(c=>`<div class="candidate ${c.id===result.chosen.id?'chosen':''}"><div><strong>${c.name}</strong><p>${c.detail}</p></div><div style="text-align:right;white-space:nowrap"><strong class="num">${c.valid?money(c.total):'不适用'}</strong>${c.id===result.chosen.id?'<p class="positive">自动选中 ✓</p>':''}</div></div>`).join('')}</details>${!isPos?`<div class="form-field"><label for="delivery-select">收货 / 提货方式</label><select id="delivery-select"><option value="us" ${state.address==='us'?'selected':''}>美国本土 48 州配送 · 现货</option><option value="pickup" ${state.address==='pickup'?'selected':''}>洛杉矶门店自提 · 免费</option><option value="other" ${state.address==='other'?'selected':''}>其他地区 / 非现货</option></select></div><label class="check"><input id="shipping-input" type="checkbox" ${state.ship?'checked':''} ${!shipEligible?'disabled':''}><span>配送升级一级 · ${shipWallet?'使用已兑换权益':'400 积分'}<br><span class="muted small">${shipEligible?'与会员折扣同用；不承诺绝对到货日。':'仅美国本土 48 州、现货、非预售订单可用。'}</span></span></label>`:''}</div><aside class="summary"><div class="eyebrow muted">ORDER SUMMARY</div><div class="summary-line"><span>商品金额 · ${state.qty} 件</span><span class="num">${money(result.subtotal)}</span></div><div class="summary-line"><span>自动选中的优惠</span><span class="num negative">−${money(result.subtotal-result.chosen.total)}</span></div><div class="small muted">${result.chosen.name}</div><div class="summary-line"><span>配送</span><span>${isPos?'门店购买':state.address==='pickup'?'免费自提':state.first||state.qty>=3?'美国标准免邮':'结账后按地区计算'}</span></div><div class="summary-line"><span>税费</span><span>结账时计算</span></div><div class="summary-line total"><strong>商品应付</strong><strong class="num">${money(result.chosen.total)}</strong></div><div class="notice" style="padding:12px 0;background:none"><strong class="positive">本单预计 +${earnPoints(result.chosen.total,t.rate)} 积分</strong><p class="small muted">发货 / 提货后 30 天可用；不含税、运费、礼品卡。</p></div><button class="btn" data-action="place-order" ${!canPay||cp&&result.chosen.id==='coupon'&&!couponWallet&&state.points<cp.cost||(cp&&result.chosen.id==='coupon'&&!couponWallet&&state.ship&&!shipWallet&&state.points<cp.cost+400)?'disabled':''}>${!state.joined?'加入会员后继续演示':isPos&&!state.bound?'请先绑定客户':state.sync?'同步失败，暂停结账':cp&&result.chosen.id==='coupon'&&!couponWallet?'兑换积分券并完成订单':'完成订单'}</button><p class="small muted" style="margin-top:12px">商品实付 ${money(result.chosen.total)} 将计入近 12 个月净消费。${state.ship?'本单将使用配送升级。':''}</p></aside></div>`;}
function settings(){return gate(`${head('YOUR ACCOUNT','账户与会员计划','会员加入与营销订阅分别管理。')}<div class="account-settings stack"><section class="panel"><h3>会员资料</h3><p class="muted small" style="margin:14px 0">${esc(state.name)} · ${esc(state.email)}<br>会员号 ${state.memberId} · 官网与 LA 门店共用</p><button class="link small" data-action="member-card">查看会员凭证</button></section><section class="panel"><h3>会员计划状态</h3><div class="row between" style="margin:15px 0"><span class="small">已加入 · 同意版本 V1 草案</span><span class="pill green">${tier().name}</span></div><p class="small muted">你可以通过会员中心提交退出申请或联系客服。未用积分不折现，退出后权益如何处理将在最终条款中明确。</p><button class="link small" data-action="exit" style="margin-top:20px">申请退出会员计划</button></section></div>`);}
function revokeOpen(id){const w=state.wallet.find(w=>w.id===id),r=w&&REWARDS.find(r=>r.id===w.reward);if(!w||w.status!=='available'||r.type!=='coupon'||today()!==w.created)return toast('仅未使用且兑换后 24 小时内的优惠券可撤销。');modal('撤销优惠券兑换',`<p>关闭此单次券，并退回 ${r.cost} 积分。该操作不会改变会员等级。</p>`,[{text:'保留优惠券',action:'close',secondary:true},{text:'确认撤销',action:'revoke-confirm',id}]);}
function orderOpen(){const cp=REWARDS.find(r=>r.id===state.coupon&&r.type==='coupon'),res=calculate({spend:state.spend,quantity:state.qty,promo:state.promo,first:state.first,coupon:cp});const needsCoupon=cp&&res.chosen.id==='coupon'&&!activeWallet().some(w=>w.reward===cp.id),needsShip=role!=='pos'&&state.ship&&!activeWallet().some(w=>w.reward==='ship'),cost=(needsCoupon?cp.cost:0)+(needsShip?400:0);if(!state.joined||state.sync||role==='pos'&&!state.bound)return toast('请先完成会员识别与账户同步。');if(state.points<cost)return toast('可用积分不足，未扣分。');modal('确认本次订单',`<p>${role==='pos'?'LA 门店订单':'官网订单'} · 商品应付 ${money(res.chosen.total)}</p><div class="detail">${res.chosen.name}<br>本次兑换扣分 ${cost} 分<br>本单预计获得 ${earnPoints(res.chosen.total,res.t.rate)} 分<br>订单付款后按净消费重算等级，消费积分先显示待发货 / 提货。</div><p>本页面为一期交互原型，确认仅更新演示数据。</p>`,[{text:'返回',action:'close',secondary:true},{text:'确认完成',action:'order-confirm'}]);}
function placeOrder(){const cp=REWARDS.find(r=>r.id===state.coupon&&r.type==='coupon'),res=calculate({spend:state.spend,quantity:state.qty,promo:state.promo,first:state.first,coupon:cp});if(state.sync||!state.joined||role==='pos'&&!state.bound)return;let usedCoupon=null;if(cp&&res.chosen.id==='coupon'){usedCoupon=activeWallet().find(w=>w.reward===cp.id)||redeem(cp.id,role==='pos'?'LA POS':'官网');if(!usedCoupon)return;usedCoupon.status='used';}
 let shipWallet=null;if(role!=='pos'&&state.ship&&state.address==='us'){shipWallet=activeWallet().find(w=>w.reward==='ship')||redeem('ship');if(!shipWallet)return;}
 state.counter++;const id='#DEMO'+String(state.counter).padStart(4,'0'),previous=tier().name;state.spend=round(state.spend+res.chosen.total);state.pending.unshift({id,amount:earnPoints(res.chosen.total,res.t.rate),due:null,name:`${role==='pos'?'LA 门店':'线上'}订单 ${id} · ${role==='pos'?'待标记提货':'待发货'}`,net:res.chosen.total,rate:res.t.rate});if(shipWallet){shipWallet.status='reserved';shipWallet.order=id;state.shippingOrder=id;state.shipFulfilled=false;state.shipRefunded=false;}state.first=false;state.ship=false;state.coupon=null;state.lastOrder=id;log(`完成订单 ${id} · ${money(res.chosen.total)}`,0,role==='pos'?'LA POS':'官网');closeModal();render();modal('订单已完成',`<p>${id} · 净商品消费 ${money(res.chosen.total)}</p><div class="detail">${previous!==tier().name?`等级已由 ${previous} 更新为 ${tier().name}。<br>`:''}${earnPoints(res.chosen.total,res.t.rate)} 积分待发货 / 提货后开始 30 天等待期。</div><p>你可继续模拟发货或门店提货，查看积分的到账流程。</p>`,[{text:'稍后处理',action:'close',secondary:true},{text:role==='pos'?'标记已提货':'标记已发货 / 提货',action:'fulfill-order',id}]);}
function advance(){state.day+=30;for(const p of [...state.pending])if(p.due!==null&&p.due<=today()){grantPoints(p.amount,p.due+365);log(`${p.name} · 积分转可用`,p.amount);state.pending=state.pending.filter(x=>x.id!==p.id);}const expired=state.lots.filter(l=>l.expires<=today()).reduce((a,b)=>a+b.amount,0);if(expired){state.points-=expired;state.lots=state.lots.filter(l=>l.expires>today());log('积分满 12 个月到期',-expired);}syncExpiry();for(const w of state.wallet){const r=REWARDS.find(r=>r.id===w.reward);if(w.status==='available'&&today()-w.created>=30)w.status='expired';}render();toast(`演示日期已推进至 ${date(today())}，已处理待入账、到期积分和券。`);}
document.addEventListener('click',event=>{const el=event.target.closest('button');if(!el)return;if(el.dataset.role){role=el.dataset.role;if(role==='storefront')page='checkout';else if(role==='customer'&&page==='checkout')page='overview';render();return;}if(el.id==='desktop'||el.id==='mobile'){device=el.id;document.getElementById('desktop').classList.toggle('active',device==='desktop');document.getElementById('mobile').classList.toggle('active',device==='mobile');document.getElementById('desktop').setAttribute('aria-pressed',String(device==='desktop'));document.getElementById('mobile').setAttribute('aria-pressed',String(device==='mobile'));render();return;}if(el.id==='reset'){init(scenario);closeModal();render();toast('已重置演示数据。');return;}if(el.id==='advance'){advance();return;}const a=el.dataset.action,id=el.dataset.id;if(!a)return;
 if(role==='support'&&!state.permission&&['support-redeem','reserve-return','create-label','scan-label','cancel-return','free-return','ship-success','ship-fail'].includes(a))return toast('当前角色为只读，不能修改状态或积分。');if(state.sync&&['revoke','revoke-confirm','reserve-return','create-label','scan-label','cancel-return','free-return','ship-success','ship-fail','refund-confirm'].includes(a))return toast('同步失败，暂停操作，未扣减积分。');if(a==='close')closeModal();else if(a==='page'){page=id;filter='all';render();}else if(a==='redeem'||a==='pos-redeem'||a==='support-redeem')redeemOpen(a==='support-redeem'?'return':id);
 else if(a==='redeem-confirm'){const w=redeem(id,role==='pos'?'LA POS':'官网');closeModal();render();if(w){const r=REWARDS.find(x=>x.id===id);modal('兑换成功',`<p>${r.name}已保存至“我的权益”。</p><div class="detail">${esc(w.code)}<br>已扣 ${r.cost} 分 · 可用余额 ${number(state.points)} 分</div><p>${r.type==='return'?'请联系客服核对美国线上原订单，审核后人工签发退货标签。':r.type==='shipping'?'请在官网结账选择适用订单。兑换成功尚不代表已使用加急线路。':'官网和 LA POS 使用同一单次券。'}</p>`,[{text:'完成',action:'close',secondary:true},{text:'查看我的权益',action:'view-wallet'}]);}}
 else if(a==='view-wallet'){closeModal();role='customer';page='wallet';filter='all';render();}else if(a==='reward-filter'||a==='wallet-filter'||a==='points-filter'){filter=id;render();}else if(a==='revoke')revokeOpen(id);
 else if(a==='revoke-confirm'){const w=state.wallet.find(w=>w.id===id),r=w&&REWARDS.find(r=>r.id===w.reward);if(w&&w.status==='available'&&today()===w.created){w.status='canceled';grantPoints(r.cost);log(`撤销${r.name}兑换`,r.cost);}closeModal();render();toast('兑换已撤销，积分已退回。');}
 else if(a==='wallet-use'){const w=state.wallet.find(w=>w.id===id),r=w&&REWARDS.find(r=>r.id===w.reward);if(r.type==='return'){modal('申请使用免费退货权益',`<p>兑换后联系客服使用。</p>${rewardUseLimitDetails(r)}`,[{text:'返回',action:'close',secondary:true},{text:'查看客服处理流程',action:'support-view'}]);}else{role='customer';page='checkout';if(r.type==='coupon')state.coupon=r.id;else state.ship=true;render();}}
 else if(a==='support-view'){closeModal();role='support';render();}else if(a==='contact'){modal('联系客服',`<p>${tier().name} 首次响应时效：${tier().response}。提供会员邮箱和原订单号，客服将核对你的等级及服务权益。</p><div class="detail">此原型展示客服识别和权益履约流程。正式客服入口接入现有系统。</div>`,[{text:'返回',action:'close',secondary:true},{text:'查看处理流程',action:'support-view'}]);}
 else if(a==='member-card'){modal('你的 Fioboc 会员凭证',`<div class="detail"><strong>${esc(state.name)} · ${tier().name}</strong><br>${esc(state.email)}<br>会员号 ${state.memberId}</div><p>收银前出示此邮箱，员工查找并绑定唯一会员账户。会员号为展示凭证，正式扫码方案待 POS 插件能力确认。</p>`,[{text:'完成',action:'close'}]);}
 else if(a==='notice'){modal('财务激励通知 · 内容草案','<p>会员计划提供消费折扣、积分兑换及按等级自动获得的客服优先响应。为运行计划，使用邮箱、可选电话、购买和积分记录。会员加入与营销订阅分别征得同意。</p><div class="detail">通知上线前待补内容：数据价值的计算方法、权益与数据价值的合理关系、最终退出处理方式。此处是设计占位，需由财务与法务完成正式文本。</div><p>通知入口在加入按钮前可见，官网与门店使用同一版本。</p>',[{text:'返回',action:'close'}]);}
 else if(a==='terms'){modal('会员计划主要规则','<p>免费加入。等级按近 12 个月净商品消费计算，达到门槛升级，退款后重算。积分发货或提货后 30 天可用，获得后 12 个月到期。首次验证并加入赠 100 分，同一客户仅一次。</p><div class="detail">积分券兑换后 30 天有效，每单 1 张，仅叠加会员基础折扣。服务均用积分兑换，客服优先级自动获得。积分不兑换现金。</div><p>完整条款与退出影响需正式定稿，本页为需求展示。</p>',[{text:'返回',action:'close'}]);}
 else if(a==='join-back'){state.joinStep=0;render();}else if(a==='exit'){modal('申请退出会员计划','<p>可通过会员中心或客服申请退出。未用积分不折现；退出后未用券、服务权益和等级的具体处理方式尚待方案确认。</p><div class="detail">原型先保留申请与人工处理入口，避免在规则未定时自动清空权益。</div>',[{text:'暂不退出',action:'close',secondary:true},{text:'提交退出申请',action:'exit-confirm'}]);}else if(a==='exit-confirm'){closeModal();log('提交退出会员申请 · 待客服处理',0);render();toast('退出申请已记录，等待按最终规则处理。');}
 else if(a==='qty-up'||a==='qty-down'){state.qty=Math.max(1,Math.min(24,state.qty+(a==='qty-up'?1:-1)));render();}else if(a==='place-order')orderOpen();else if(a==='order-confirm')placeOrder();else if(a==='fulfill-order'){const p=state.pending.find(p=>p.id===id);if(p&&p.due===null){p.due=today()+30;p.name=p.name.replace('待发货','已发货').replace('待标记提货','已提货');log(`订单 ${id} 已发货 / 提货`,0);}closeModal();render();toast('30 天积分等待期已开始，可在积分明细查看。');}
 else if(a==='bind-customer'){if(state.found&&!state.sync){state.bound=true;render();toast('唯一会员账户已绑定至本单购物车。');}}else if(a==='retry-sync'){state.sync=false;render();toast('同步恢复，官网与 POS 已显示同一账户余额。');}
 else if(a==='refund-open')refundOpen();else if(a==='refund-confirm'){const value=Number(document.getElementById('refund-amount').value);if(!Number.isFinite(value)||value<=0||value>round(95-state.refundedNet))return toast('请输入不超过原订单剩余净金额的退款金额。');const prev=tier().name,newNet=round(state.refundedNet+value),target=newNet>=95?114:Math.floor(114*newNet/95),back=target-state.refundedPoints;state.refundedNet=newNet;state.refundedPoints=target;spendPoints(back);state.spend=Math.max(0,round(state.spend-value));log(`原订单 #F10420 退货 ${money(value)}`,-back,'LA POS');closeModal();render();toast(`退款 ${money(value)}，扣回 ${back} 分。${prev!==tier().name?prev+' → '+tier().name+'。':''}${state.points<0?'积分负余额已进入人工核对。':''}`);}
 else if(a==='reserve-return'){if(!state.permission||state.sync)return;const w=activeWallet().find(w=>w.reward==='return');if(w&&!['brand','store','nonus','late'].includes(state.returnReason)){state.returnCanceled=false;state.labelCreated=false;state.labelScanned=false;w.status='reserved';w.order='#F10420';log('退货权益预留至 #F10420',0);render();toast('权益已预留到原订单，不重复扣分。');}}
 else if(a==='create-label'){if(!state.permission||state.returnReason!=='customer')return;const w=state.wallet.find(w=>w.reward==='return'&&['reserved','label_issued'].includes(w.status));if(w&&!state.labelCreated){state.labelCreated=true;w.status='label_issued';state.labelCounter=(state.labelCounter||0)+1;w.labelId='LABEL-DEMO-10420-'+state.labelCounter;state.currentLabelId=w.labelId;log('人工签发 RMA / 退货标签 '+w.labelId,0,'客服',w.id);render();}}else if(a==='scan-label'){if(!state.permission||state.returnReason!=='customer'||!state.labelCreated||state.labelScanned)return;const w=state.wallet.find(w=>w.reward==='return'&&['reserved','label_issued'].includes(w.status));if(w){w.status='consumed';state.labelScanned=true;log('承运商首扫 · 退货权益已使用',0);render();}}
 else if(a==='cancel-return'){if(!state.permission||state.labelScanned)return;const w=state.wallet.find(w=>w.reward==='return'&&['reserved','label_issued'].includes(w.status));if(w){w.status='canceled';state.labelCreated=false;state.returnCanceled=true;grantPoints(500);log('首扫前取消，关闭权益并退还积分',500);render();toast('标签已作废，权益已关闭，500 积分已退回。');}}
 else if(a==='free-return'){state.returnExempt=true;log('品牌责任 / 到店退货免积分处理',0);render();}else if(a==='permission'){state.permission=!state.permission;render();}
 else if(a==='ship-success'){if(!state.permission||state.shipRefunded||state.shipFulfilled||!state.shippingOrder)return;state.shipFulfilled=true;const w=state.wallet.find(w=>w.order===state.shippingOrder&&w.reward==='ship');if(w)w.status='consumed';log('仓库回填升级线路 · 已履约',0);render();}else if(a==='ship-fail'){if(!state.permission||state.shipRefunded||state.shipFulfilled||!state.shippingOrder)return;state.shipRefunded=true;grantPoints(400);const w=state.wallet.find(w=>w.order===state.shippingOrder&&w.reward==='ship');if(w)w.status='canceled';log('配送升级未履约，自动退还积分',400);render();toast('已退 400 积分，重复补偿已拦截。');}
});
document.addEventListener('change',event=>{const e=event.target;if(e.id==='scenario'){scenario=e.value;init(scenario);page=scenario==='new'?'join':'overview';closeModal();render();toast('演示数据已切换。');}else if(e.id==='coupon-select'){state.coupon=e.value||null;render();}else if(e.id==='delivery-select'){state.address=e.value;if(state.address!=='us')state.ship=false;render();}else if(e.id==='shipping-input'){state.ship=e.checked;render();}else if(e.id==='first-input'){state.first=e.checked;render();}else if(e.id==='promo-input'){state.promo=Math.min(80,Math.max(0,Number(e.value)||0));render();}else if(e.id==='return-reason'){state.returnReason=e.value;state.returnExempt=false;render();}});
document.addEventListener('submit',event=>{event.preventDefault();const form=event.target;if(form.id==='join-form'){const email=document.getElementById('join-email').value.trim();if(!document.getElementById('join-consent').checked)return toast('请先明确同意加入会员计划。');state.email=email;state.marketing=document.getElementById('join-marketing').checked;state.joinStep=1;render();toast('演示验证码已生成，请在“设计说明”查看。');}else if(form.id==='verify-form'){if(document.getElementById('verify-code').value!=='246810'){document.getElementById('join-error').innerHTML='<div class="notice error">验证码错误，请重新输入。</div>';return;}state.joined=true;state.joinStep=0;const existing=state.email.toLowerCase()==='alex@example.com';if(existing){init('vip2');state.joined=true;state.bonus=true;}else if(!state.bonus){grantPoints(100);log('首次验证并加入会员',100);state.bonus=true;}page='overview';render();toast(existing?'已绑定既有会员账户，不重复赠送加入积分。':'加入成功，100 积分已到账。');}else if(form.id==='search-form'){const value=document.getElementById('customer-search').value.trim().toLowerCase();if(state.joined&&value===state.email.toLowerCase()){state.found=true;render();toast('已找到唯一客户，请确认并绑定至购物车。');}else if(value==='duplicate@example.com'){state.found=false;state.bound=false;render();modal('发现重复客户档案','<p>同一邮箱关联两个客户档案，禁止自动合并或转移积分。请主管核对历史订单、账户归属和同意记录后处理。</p><div class="detail">客户 #028164 · 5 笔历史订单<br>客户 #038201 · 1 笔历史订单<br>本单暂未绑定，不允许会员匿名结账。</div>',[{text:'返回查询',action:'close'}]);}else if(value==='new@example.com'){init('new');role='customer';page='join';render();toast('请由顾客验证邮箱并主动同意加入，营销订阅另取同意。');}else if(value==='alex@example.com'||value==='+12135550104'){if(state.email!=='alex@example.com')init('vip2');state.found=true;render();toast('已找到唯一客户，请确认并绑定至购物车。');}else{state.found=false;state.bound=false;render();toast('未找到会员，请核对邮箱 / 手机号，或引导顾客主动加入。');}}});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeModal();if(event.key==='Tab'&&document.querySelector('.modal')){const nodes=[...document.querySelectorAll('.modal button,.modal input,.modal select,.modal a[href]')].filter(x=>!x.disabled);const first=nodes[0],last=nodes[nodes.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
window.addEventListener('hashchange',()=>{const name=location.hash.slice(1);if(NAMES[name]){role='customer';page=name;filter='all';render();}});
const ACCOUNT_REFERENCE='https://account.fioboc.com/pages/019f1c51-f5f8-7dc4-8e57-62af21c9c1ad';
const PROFILE_ICON='<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.15" aria-hidden="true"><circle cx="16" cy="16" r="13.8" opacity=".35"/><circle cx="16" cy="16" r="11.5"/><circle cx="16" cy="12" r="3.7"/><path d="M8.3 24c.8-4.9 14.6-4.9 15.4 0"/></svg>';
function nativeLogo(className){return `<img class="${className}" src="${className==='store-logo'?'./assets/images/logo-storefront.png':'./assets/images/logo-account.svg'}" alt="Fioboc 标志">`;}
function accountHeader(){return `<header class="account-header"><div class="account-header-inner"><a href="https://www.fioboc.com/" target="_blank" rel="noopener">${nativeLogo('account-logo')}</a><button class="profile-link" aria-label="个人资料" data-action="page" data-id="settings">${PROFILE_ICON}</button></div></header>`;}
function accountFooter(){return `<footer class="account-footer"><button class="country" data-action="country-menu">美国<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true"><path d="m3 4.5 3 3 3-3"/></svg></button><div class="footer-links"><a class="link" href="https://www.fioboc.com/pages/new-returns-exchanges" target="_blank" rel="noopener">退款政策</a><a class="link" href="https://www.fioboc.com/pages/privacy-policy" target="_blank" rel="noopener">隐私政策</a><a class="link" href="https://www.fioboc.com/pages/terms-of-service" target="_blank" rel="noopener">服务条款</a></div></footer>`;}
function nativeAccountShell(content){const isMain=page==='overview';const sectionContent=isMain?content:`<section class="account-card"><div class="account-breadcrumb"><button class="link" data-action="page" data-id="overview">会员中心</button><span>›</span><span>${NAMES[page]||'会员权益'}</span></div>${content}</section>`;return `${accountHeader()}<div class="account-layout"><nav class="account-nav" aria-label="主导航"><button class="selected" data-action="page" data-id="overview">会员中心</button><a href="https://account.fioboc.com/orders" target="_blank" rel="noopener">订单</a><a href="https://www.fioboc.com/pages/past-order-survey" target="_blank" rel="noopener">评价您的购买</a><button data-action="page" data-id="settings" aria-label="个人资料">轮廓</button></nav><main class="account-main" id="main-content">${sectionContent}</main></div>${accountFooter()}`;}
function shell(content){return page==='checkout'?nativeStorefrontShell(content):nativeAccountShell(content);}
function accountRules(){return `<section class="account-card"><h2>会员与积分规则</h2><ol class="account-rules">${[
['加入会员','免费加入。完成邮箱验证并明确同意会员计划后，首次加入赠送 100 积分。同一客户仅赠一次；营销订阅另行同意。'],
['会员等级','官网与洛杉矶门店合并计算近 12 个月折后净商品消费。VIP1 / VIP2 / VIP3 门槛分别为 $150 / $500 / $1,500，达到门槛立即升级，退款后重算。'],
['赚取积分','Member / VIP1 / VIP2 / VIP3 每消费 $1 分别获得 1 / 1.1 / 1.2 / 1.3 积分。先将商品应付小计向下取整，再乘以会员等级积分基数，保留乘积的小数，不含运费、税费和礼品卡。发货或提货后 30 天可用。'],
['优惠规则','会员基础折扣与 3 / 6 / 12 件的 5% / 10% / 20% 满件折扣顺序叠加。首单、普通优惠码、达人码和临时促销不继续叠加，系统自动选择更优惠方案。'],
['积分兑换','500 / 1,000 / 2,000 / 3,000 积分可兑换 $5 / $10 / $20 / $30 优惠券，最低消费分别为 $100 / $200 / $400 / $600。券有效期 30 天，每单 1 张，仅叠加会员基础折扣；未使用 24 小时内可撤销。'],
['服务权益','美国配送升级需 400 积分，美国免费退货权益需 500 积分，所有等级使用同一门槛。品牌责任退货和线上订单到 LA 门店退，不消耗积分。客服首次响应优先按等级自动获得。'],
['有效期','积分获得后 12 个月到期，提前 30 天提醒。待入账积分不可兑换，积分使用不会导致会员降级，积分不可提现。'],
['退款与计划管理','退款或取消订单将扣回对应积分并重算净消费。同步失败、异常账户或负余额需人工核对。你可以通过账户页面或客服申请退出会员计划。']
].map(([title,text],i)=>`<li><span class="rule-index">${i+1}</span><div><strong>${title}</strong><p>${text}</p></div></li>`).join('')}</ol><div class="row wrap" style="margin-top:20px;gap:22px"><button class="link" data-action="notice">财务激励通知</button><button class="link" data-action="terms">会员计划条款</button><button class="link" data-action="page" data-id="settings">管理会员计划</button></div></section>`;}
function overview(){if(!state.joined)return `<section class="account-card">${join()}</section>`;const t=tier(),idx=tierIndex(state.spend),next=TIERS[idx+1],progress=next?Math.min(100,(state.spend-t.min)/(next.min-t.min)*100):100;const pending=state.pending.reduce((a,b)=>a+b.amount,0);return `${state.sync?'<div class="notice error" role="alert">会员积分同步失败，以下为最近一次同步数据。兑换与会员订单暂不可用。<button class="link" style="margin-left:10px" data-action="retry-sync">重新同步</button></div>':''}${state.points<0?'<div class="notice error" role="alert">退款后积分余额为负，当前不可兑换。客服将核对原订单与历史兑换记录。</div>':''}<section class="account-card"><div class="account-identity"><div class="account-avatar" aria-label="顾客">${esc(state.name.charAt(0))}</div><div class="identity-text"><div class="row"><h2>${esc(state.name)}</h2><span class="pill">${t.name}</span></div><p>自 2026 年起成为会员</p></div><div class="identity-actions"><button class="link" data-action="member-card">会员凭证</button><button class="link" data-action="page" data-id="tiers">等级权益</button></div></div><div class="account-tier-row"><div><span class="label">近 12 个月净商品消费</span><strong class="num">${money(state.spend)}</strong><p>官网与 LA 门店合并计算</p></div><div><span class="label">${next?`距离 ${next.name}`:'最高会员等级'}</span><strong>${next?`还差 ${money(next.min-state.spend)}`:'已达到 VIP3'}</strong><div class="account-progress" role="progressbar" aria-label="升级进度" aria-valuenow="${round(progress)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress}%"></span></div></div><div><span class="label">当前等级权益</span><strong>${t.base?`${round(t.base*100)}% 会员基础折扣`:'基础满件折扣'}</strong><p>客服首次响应 ${t.response}</p></div></div></section><section class="account-card"><h2>会员积分</h2><p>此账户可用的会员积分。官网与洛杉矶门店共用同一余额。</p><div class="point-columns"><div><span class="label">可用积分</span><strong class="num" id="balance">${number(state.points)}<span class="unit">分</span></strong><p>每消费 $1 获得 ${t.rate} 分</p></div><div><span class="label">待入账积分</span><strong class="num">${number(pending)}<span class="unit">分</span></strong><p>发货 / 提货后 30 天可用</p></div><div><span class="label">最近到期积分</span><strong class="num">${number(state.expiring)}<span class="unit">分</span></strong><p>${state.expiring?date(state.expiryDay)+' 到期':'暂无待到期积分'}</p></div></div><div class="account-point-actions"><button class="btn" data-action="page" data-id="rewards" ${state.sync||state.points<0?'disabled':''}>兑换积分</button><button class="btn secondary" data-action="page" data-id="wallet">我的权益</button><button class="link" data-action="page" data-id="points">查看积分明细</button></div></section><section class="account-card"><div class="sectionhead"><h2>积分历史</h2><button class="link" data-action="page" data-id="points">查看全部</button></div>${state.pending.slice(0,1).map(p=>`<div class="account-ledger"><div><strong>${p.name}</strong><p>${p.due===null?'发货 / 提货后开始 30 天等待期':date(p.due)+' 转为可用'} · ${p.name.includes('LA 门店')?'LA POS':'官网'}</p></div><div style="text-align:right"><span class="delta num">+${number(p.amount)}</span><span class="status">待入账</span></div></div>`).join('')}${state.ledger.slice(0,3).map(l=>`<div class="account-ledger"><div><strong>${l.label}</strong><p>${date(l.day)} · ${l.channel}</p></div><div style="text-align:right"><span class="delta num ${l.amount<0?'negative':''}">${l.amount>0?'+':''}${number(l.amount)}</span><span class="status">${l.amount<0?'扣减':'已入账'}</span></div></div>`).join('')}${!state.pending.length&&!state.ledger.length?'<p>目前尚无会员积分记录。</p>':''}</section>${accountRules()}`;}
function rewardCard(r){const available=state.joined&&!state.sync&&state.points>=r.cost;return `<article class="reward"><div class="rewardbody"><span class="reward-summary">${r.type==='coupon'?`$${r.value}`:r.type==='shipping'?'配送升级':'免费退货'}</span><h3>${r.name}</h3><p>${r.type==='coupon'?`满 $${r.min} 可用 · 官网 / LA 门店<br>兑换后 30 天有效 · 单次券`:r.type==='shipping'?'美国本土 48 州现货线上订单<br>标准配送升级一级，结账时使用':'美国线上合规订单<br>兑换后联系客服核单并签发标签'}</p><div class="row between"><span class="cost">${number(r.cost)} <small>积分</small></span><button class="btn small secondary" data-action="redeem" data-id="${r.id}" ${state.joined&&!available?'disabled':''}>${!state.joined?'加入后兑换':state.sync?'稍后重试':available?'兑换':`差 ${number(r.cost-state.points)} 分`}</button></div></div></article>`;}
function nativeStorefrontShell(content){const icons={search:'<circle cx="10.8" cy="10.8" r="7.5"/><path d="m16.5 16.5 5 5"/>',user:'<circle cx="12" cy="7.5" r="4"/><path d="M3.5 22v-3c0-6 17-6 17 0v3z"/>',heart:'<path d="M12 21 3.3 12.4C-3.5 5.6 7.4-2 12 6c4.6-8 15.5-.4 8.7 6.4z"/>',cart:'<path d="M1 2h3l3 13h13l2-10H5"/><circle cx="9" cy="20" r="1.3"/><circle cx="19" cy="20" r="1.3"/>'};return `<div class="store-announcement">FREE SHIPPING ON 3 ITEMS+ & EASY RETURNS.<span class="region">🇺🇸 &nbsp;|&nbsp; English ⌄</span></div><header class="store-header"><a href="https://www.fioboc.com/" target="_blank" rel="noopener">${nativeLogo('store-logo')}</a><nav class="store-nav" aria-label="Primary"><a href="https://www.fioboc.com/collections/new-in" target="_blank" rel="noopener">NEW ARRIVAL</a><a href="https://www.fioboc.com/collections/mens-collection" target="_blank" rel="noopener">MEN</a><a href="https://www.fioboc.com/collections/women" target="_blank" rel="noopener">WOMEN</a><a href="https://www.fioboc.com/collections/best-selling-products" target="_blank" rel="noopener">BEST SELLERS</a><a class="sale" href="https://www.fioboc.com/collections/sale" target="_blank" rel="noopener">SALE</a><a href="https://www.fioboc.com/pages/fit-guide" target="_blank" rel="noopener">FIT GUIDE</a></nav><div class="store-icons"><button class="store-search" data-action="store-search" aria-label="Search"><svg viewBox="0 0 24 24" aria-hidden="true">${icons.search}</svg></button><button data-action="account-home" aria-label="Account"><svg viewBox="0 0 24 24" aria-hidden="true">${icons.user}</svg></button><button class="store-wishlist" data-action="store-wishlist" aria-label="Wishlist"><svg viewBox="0 0 24 24" aria-hidden="true">${icons.heart}</svg></button><button data-action="store-cart" aria-label="Cart"><svg viewBox="0 0 24 24" aria-hidden="true">${icons.cart}</svg></button></div></header><main class="store-main" id="main-content">${content}</main><footer class="store-footer"><div class="store-footer-head"><div><h3>CUSTOMER CARE</h3><a href="https://www.fioboc.com/pages/contact-us" target="_blank" rel="noopener">Contact Us</a><a href="https://www.fioboc.com/pages/new-returns-exchanges" target="_blank" rel="noopener">Returns & Exchanges</a></div><div><h3>COMPANY</h3><a href="https://www.fioboc.com/pages/fioboc-our-story" target="_blank" rel="noopener">Our Story</a><button class="store-return-link" data-action="account-home">Membership</button></div><div><h3>HELP</h3><a href="https://www.fioboc.com/pages/shipping-delivery" target="_blank" rel="noopener">Shipping & Delivery</a><a href="https://www.fioboc.com/pages/privacy-policy" target="_blank" rel="noopener">Privacy Policies</a></div></div><small>© 2026 Fioboc. Powered by Shopify.</small></footer>`;}
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;const a=button.dataset.action;if(a==='account-home'){role='customer';page='overview';filter='all';render();}else if(a==='store-cart'){role='storefront';page='checkout';render();}else if(a==='country-menu'){modal('当前地区：美国','<p>此会员计划支持官网与洛杉矶门店同一账户。配送升级仅适用于美国本土 48 州现货线上订单，其他地区不能使用该服务。</p>',[{text:'返回',action:'close'}]);}else if(a==='refund-policy'){modal('会员积分与退款','<p>退款按原订单折后商品实付金额处理，扣回对应积分并重算会员净消费。品牌错发、漏发和质量问题由 Fioboc 承担，线上订单到 LA 门店退不消耗退货标签积分。</p>',[{text:'查看退货权益',action:'native-return-info',secondary:true},{text:'返回',action:'close'}]);}else if(a==='native-return-info'){closeModal();role='customer';page='rewards';filter='service';render();}else if(a==='store-search'){modal('Search','<p>通过官网查找 Fioboc 商品。</p><a class="btn" href="https://www.fioboc.com/search" target="_blank" rel="noopener" style="display:inline-block;margin-top:16px">Search our store</a>',[{text:'返回',action:'close'}]);}else if(a==='store-wishlist'){modal('Wishlist','<p>你的商品心愿单沿用官网账户。</p><a class="btn" href="https://www.fioboc.com/pages/wishlist" target="_blank" rel="noopener" style="display:inline-block;margin-top:16px">View Wishlist</a>',[{text:'返回',action:'close'}]);}});
if(location.search&&location.search.includes('presentation=1'))document.body.classList.add('presentation');

// Local prototype extension. All records and side effects stay in this page.
const BUSINESS_VERSION='PHASE1-2026.10.13';
const CODE128_PATTERNS=[[2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],[1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],[2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],[1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],[2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],[3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],[2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],[1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],[2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],[1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],[2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],[3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],[3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],[1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],[1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],[2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],[1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],[1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],[2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],[1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],[2,1,1,2,3,2],[2,3,3,1,1,1,2]];
let operationsTab='queue';
const originalInit=init, originalOverview=overview, originalRewards=rewards, originalCheckout=checkout, originalSettings=settings, originalAdvance=advance, originalRedeem=redeem;
init=function(which='vip2'){
 originalInit(['storecoupon','rolling'].includes(which)?'vip2':which);
 state.transactionCounter=3;state.posCouponMethod='direct';state.selectedCouponWalletId=null;state.posCouponMessage='';state.couponMethod=null;state.orders=[];state.issues=[];state.notifications=[];state.reconciliation=null;state.exitRequest=false;state.simulateCouponFailure=false;state.processedEvents=[];state.marketing=false;state.stock=true;state.shippingRoute=true;
 state.consent={member:state.joined,emailVerified:state.joined,memberVersion:'V1 草案',marketing:false,channel:'官网',day:-60};
 let historicalBalance=state.points;state.ledger=state.ledger.map((l,i)=>{const after=historicalBalance,before=after-l.amount;historicalBalance=before;return {...l,id:'TX-SEED-'+String(3-i).padStart(4,'0'),customer:state.memberId,before,after,reference:i===0?'#F10420':i===1?'#F10398':'RWD-SEED-SHIP',version:BUSINESS_VERSION,actor:'系统',category:i===2?'redeem':'earned'};});
 state.spendBatches=state.spend? [{order:'#F10420',net:Math.min(95,state.spend),paid:-90},{order:'#F10398',net:Math.max(0,round(state.spend-95)),paid:-60}]:[];
 if(which==='rolling'){state.spend=540;state.spendBatches=[{order:'#F10001',net:180,paid:-355},{order:'#F10420',net:95,paid:-90},{order:'#F10398',net:265,paid:-60}];}
 state.pending.forEach(p=>{p.customer=state.memberId;p.id=p.id==='p0'?'#F10482':p.id;});
 if(which==='storecoupon'){const w=redeem('c5','官网');w.created=-2;state.qty=2;state.posCouponMessage='已准备一张官网兑换的 $5 券，可演示三种门店核销方式。';}
 if(state.sync)addIssue('sync','官网 / POS 积分同步失败','对照同一 Customer ID 的最后同步余额、订单和积分流水，核查后重新同步。');
};
function categoryFor(label,amount){return /退货.*\$|退款|扣回/.test(label)?'refund':/到期/.test(label)?'expired':/退还|退回|退分|撤销.*兑换|生成失败/.test(label)&&amount>0?'returned':amount<0?'redeem':amount>0?'earned':'event';}
log=function(label,amount,channel='官网',reference=null){
 state.transactionCounter=(state.transactionCounter||0)+1;
 const id='TX-'+String(state.transactionCounter).padStart(6,'0'),ref=reference||(label.match(/#[A-Z0-9]+/)||[])[0]||null;
 const record={id,label,amount,channel,status:'available',day:today(),customer:state.memberId,before:state.points-amount,after:state.points,reference:ref,version:BUSINESS_VERSION,actor:role==='pos'?'门店员工 LA-04':role==='support'?'客服 CS-02':role==='operations'?'运营 OP-01':'会员本人',category:categoryFor(label,amount)};
 state.ledger.unshift(record);state.audit.unshift({...record});
 if(state.points<0)addIssue('negative','退款后积分负余额','核对原订单及历史兑换；余额恢复前暂停兑换，避免放大可用余额。');
 if(amount>0&&!/退还|退回|退分|撤销|失败/.test(label))state.notifications.unshift({id:'NT-'+id,title:/首次/.test(label)?'欢迎加入 Fioboc':'积分已到账',text:`${amount} 积分已转为可用。当前余额 ${number(state.points)} 分。`,type:'service',day:today()});
};
function addIssue(type,title,description,reference=null){
 if(state.issues.some(i=>i.type===type&&i.reference===reference&&i.status!=='closed'))return;
 state.issues.unshift({id:'CASE-'+String(state.issues.length+1).padStart(4,'0'),type,title,description,reference,status:'pending',created:today(),actor:null});
}
function spendInWindow(){return round(state.spendBatches.filter(b=>b.paid>today()-365&&b.paid<=today()).reduce((a,b)=>a+b.net,0));}
function tierChanged(previous){if(previous!==tier().name){log(`会员等级 ${previous} → ${tier().name} · 官网 / POS / 客服标签同步`,0,'系统');state.notifications.unshift({title:'会员等级已更新',text:`当前等级 ${tier().name}，基础折扣 ${round(tier().base*100)}%，客服首次响应 ${tier().response}。`,type:'service',day:today()});}}
redeem=function(id,channel='官网'){
 const r=REWARDS.find(x=>x.id===id);if(!r)return null;
 if(r.type==='coupon'&&state.simulateCouponFailure&&state.joined&&!state.sync&&state.points>=r.cost){state.simulateCouponFailure=false;spendPoints(r.cost);log(`兑换${r.name} · 等待生成唯一券码`,-r.cost,channel,'RWD-FAIL-DEMO');grantPoints(r.cost);log('优惠券生成失败 · 原兑换积分已退回',r.cost,channel,'RWD-FAIL-DEMO');addIssue('coupon-fail','优惠券生成失败，已完成补偿','积分扣减与返还已一一对应，未生成可用券。','RWD-FAIL-DEMO');state.issues[0].status='closed';toast('券码生成失败，积分已自动退回；没有生成可用券。');return null;}
 const w=originalRedeem(id,channel);if(w){w.customer=state.memberId;w.transaction=state.ledger[0].id;w.version=BUSINESS_VERSION;w.expires=r.type==='coupon'?w.created+30:null;state.ledger[0].reference=w.id;state.audit[0].reference=w.id;}return w;
};
function barcode128(value){
 const text=String(value),codes=[104,...[...text].map(c=>c.charCodeAt(0)-32)];if(codes.some(x=>x<0||x>104))return '';
 codes.push(codes.reduce((sum,c,i)=>sum+(i?c*i:c),0)%103,106);
 let x=12,rects='';for(const code of codes){const pattern=CODE128_PATTERNS[code];pattern.forEach((width,i)=>{if(i%2===0)rects+=`<rect x="${x}" y="4" width="${width}" height="64"/>`;x+=width;});}
 return `<svg class="coupon-barcode" viewBox="0 0 ${x+12} 72" role="img" aria-label="优惠券条形码 ${esc(text)}" preserveAspectRatio="none"><rect width="100%" height="100%" fill="white"/><g fill="black">${rects}</g></svg>`;
}
function couponValidity(w,amount=true){
 if(!w)return '未找到优惠券，请核对券码或重新扫描。';
 if(state.sync)return '账户同步失败，暂时不能核销。请先恢复同步。';
 if(!state.bound&&role==='pos')return '请先查找并绑定会员账户，再识别优惠券。';
 if(w.customer&&w.customer!==state.memberId)return '该券属于其他会员，不能用于当前绑定的账户。';
 if(w.status==='used'||w.status==='consumed')return `该券已在 ${w.order||'其他订单'} 使用，不能重复核销。`;
 if(w.status==='expired'||today()-w.created>=30)return '优惠券已过期，不能核销。';
 if(w.status==='canceled')return '优惠券已撤销，不能核销。';
 if(w.status!=='available')return '优惠券当前不可用。';
 const r=REWARDS.find(r=>r.id===w.reward);if(!r||r.type!=='coupon')return '这不是商品优惠券，请核对权益类型。';
 const res=calculate({spend:state.spend,quantity:state.qty,promo:state.promo,first:state.first,coupon:r});
 if(amount&&res.base<r.min)return `本单会员基础折扣后商品金额 ${money(res.base)}，未满 ${money(r.min)}。`;
 if(amount&&res.chosen.id!=='coupon')return `本单 ${res.chosen.name} 更优惠（${money(res.chosen.total)}）。保留这张券，本次不核销。`;
 return null;
}
function couponDetail(id){
 const w=state.wallet.find(w=>w.id===id),r=w&&REWARDS.find(r=>r.id===w.reward);if(!w||!r||r.type!=='coupon')return;
 const active=w.status==='available'&&today()-w.created<30,labels={available:'可用',used:'已使用',expired:'已过期',canceled:'已撤销'};
 modal(r.name+' · 优惠券详情',`<div class="coupon-detail"><div class="row between"><span>${esc(state.name)} · ${tier().name}</span><span class="pill">${labels[w.status]||w.status}</span></div>${active?`<div class="barcode-frame">${barcode128(w.code)}<strong class="wallet-code">${esc(w.code)}</strong><p class="coupon-hint">线下买单时出示此条形码给店员扫描，<br>或将券码提供给店员输入。</p></div>`:`<div class="detail"><strong>${esc(w.code)}</strong><p>此券已${w.status==='used'?'使用':w.status==='expired'?'过期':'撤销'}，不能再次核销。</p></div>`}${rewardUseLimitDetails(r)}<div class="coupon-details"><div><span>商品金额门槛</span><strong>满 ${money(r.min)} 可用</strong></div><div><span>到期日期</span><strong>${date(w.created+30)}</strong></div><div><span>使用范围</span><strong>${esc(COUPON_STORE.name)} 门店</strong></div><div><span>使用规则</span><strong>每单 1 张，仅使用 1 次</strong></div></div><p class="coupon-hint">仅叠加会员基础折扣。满件、首单、普通码、达人码与临时促销不继续叠加；系统比较后保留更优惠方案。</p>${w.order?`<div class="detail">核销订单：${esc(w.order)}<br>渠道：${esc(w.usedChannel||'官网')}<br>操作人：${esc(w.usedActor||'系统')}<br>核销方式：${esc(w.usedMethod||'线上结账')}</div>`:''}</div>`,[{text:'关闭',action:'close',secondary:true},...(active?[{text:'线上使用',action:'coupon-online',id}]:[])]);
}
wallet=function(){
 const cards=state.wallet.filter(w=>filter==='all'||(filter==='available'?w.status==='available':['used','expired','canceled','consumed'].includes(w.status)));
 const labels={available:'可用',reserved:'已绑定订单',label_issued:'标签已签发 / 待首扫',consumed:'已使用',used:'已使用',expired:'已过期',canceled:'已关闭 / 已退分'};
 return gate(`${head('MY REWARDS','我的权益','官网与洛杉矶门店共用同一张优惠券，任一渠道核销后同步失效。')}<div class="tabs" role="tablist" aria-label="权益状态">${[['all','全部'],['available','可用'],['used','已使用 / 已结束']].map(([id,name])=>`<button role="tab" aria-selected="${filter===id}" class="${filter===id?'active':''}" data-action="wallet-filter" data-id="${id}">${name}</button>`).join('')}</div>${cards.length?`<div class="wallet-grid">${cards.map(w=>{const r=REWARDS.find(r=>r.id===w.reward),usable=w.status==='available'&&today()-w.created<30;return `<article class="wallet"><div class="row between"><h3>${r.name}</h3><span class="pill">${labels[w.status]}</span></div><p class="small muted">${r.type==='coupon'?`满 $${r.min} · ${date(w.created+30)} 到期`:`${r.type==='shipping'?'线上结账时可用':'联系客服使用'} · ${date(w.created+30)} 到期`}</p><div class="wallet-code">${esc(w.code)}</div>${w.order?`<p class="small muted">${esc(w.order)} · ${esc(w.usedChannel||'服务订单')}</p>`:''}<div class="row wrap" style="gap:18px;margin-top:14px">${r.type==='coupon'?`<button class="link small" data-action="coupon-detail" data-id="${w.id}">${usable?'出示条形码 / 券码':'查看券详情'}</button>${usable?`<button class="link small" data-action="coupon-online" data-id="${w.id}">线上使用</button>`:''}`:usable?`<button class="link small" data-action="wallet-use" data-id="${w.id}">${r.type==='return'?'申请使用':'结账使用'}</button>`:''}</div>${usable&&r.type==='coupon'&&today()===w.created?`<button class="link small" style="margin-top:16px" data-action="revoke" data-id="${w.id}">24 小时内撤销兑换</button>`:''}</article>`;}).join('')}</div>`:`<div class="empty"><h3>暂无已兑换权益</h3><p>兑换后，可在这里出示条形码或查看服务状态。</p><button class="btn" data-action="page" data-id="rewards">去兑换权益</button></div>`}<div class="notice">店员可在绑定会员后直接选择券、扫描条形码或输入券码。识别和应用优惠不会重复扣积分；只有订单收款成功才核销。</div>`);
};
checkout=function(isPos=false){
 let html=originalCheckout(isPos);
 if(isPos){const start=html.indexOf('<div class="form-field"><label for="coupon-select">'),end=html.indexOf('<details class="panel"',start);if(start>=0&&end>=0)html=html.slice(0,start)+posCouponPanel()+html.slice(end);}
 else{html=html.replace('<label class="check"><input id="shipping-input"',`<label class="check"><input id="shipping-input"`);const insert=`<details style="margin:12px 0"><summary class="small muted">配送升级资格</summary><label class="check"><input id="stock-input" type="checkbox" ${state.stock?'checked':''}><span>商品为现货，非预售</span></label><label class="check"><input id="route-input" type="checkbox" ${state.shippingRoute?'checked':''}><span>存在可执行的升级线路</span></label></details>`;html=html.replace('<label class="check"><input id="shipping-input"',insert+'<label class="check"><input id="shipping-input"');if(!state.stock||!state.shippingRoute)html=html.replace('id="shipping-input" type="checkbox"','id="shipping-input" type="checkbox" disabled').replace('与会员折扣同用；不承诺绝对到货日。','当前现货或升级线路条件不满足，不能使用。');}
 return html;
};
function selectedCoupon(){return state.wallet.find(w=>w.id===state.selectedCouponWalletId)||null;}
function orderPlan(){
 const cp=REWARDS.find(r=>r.id===state.coupon&&r.type==='coupon'),res=role==='pos'?calculate({spend:state.spend,quantity:state.qty,promo:state.promo,first:state.first,coupon:cp}):cartResult();
 const selected=selectedCoupon(),couponWallet=selected||activeWallet().find(w=>w.reward===cp?.id),needsCoupon=cp&&res.chosen.id==='coupon'&&!couponWallet,needsShip=role!=='pos'&&state.ship&&!activeWallet().some(w=>w.reward==='ship');
 return {cp,res,couponWallet,needsCoupon,needsShip,cost:(needsCoupon?cp.cost:0)+(needsShip?400:0)};
}
function orderError(plan){
 if(!state.joined||state.sync||role==='pos'&&!state.bound)return '请先完成会员识别与账户同步。';
 if(role==='pos'&&plan.cp&&!selectedCoupon())return '请先通过选择、扫码或输入券码识别本单优惠券。';
 if(plan.cp&&plan.res.chosen.id==='coupon'&&plan.couponWallet){const error=couponValidity(plan.couponWallet);if(error)return error;}
 if(state.ship&&role!=='pos'&&(state.address!=='us'||!state.stock||!state.shippingRoute))return '配送升级资格不满足，未扣积分。';
 if(state.points<plan.cost)return '可用积分不足，未扣分。';return null;
}
orderOpen=function(){
 const p=orderPlan(),error=orderError(p);if(error)return toast(error);
 modal(role==='pos'?'确认收款与优惠券核销':'确认本次订单',`<p>${role==='pos'?'LA 门店订单':'官网订单'} · 商品应付 <strong>${money(p.res.chosen.total)}</strong></p><div class="detail">优惠方案：${p.res.chosen.name}<br>${p.cp&&p.res.chosen.id==='coupon'?`优惠券：${esc(p.couponWallet?.code||'本次兑换生成')}<br>核销方式：${esc(role==='pos'?state.couponMethod||'店员直接选择':'线上结账')}<br>`:''}本次兑换扣分 ${p.cost} 分<br>预计获得 ${earnPoints(p.res.chosen.total,p.res.t.rate)} 分</div><p class="small muted">收款成功后标记优惠券已使用；收款失败或取消不会核销。此处只更新本地演示数据。</p>`,[{text:'返回',action:'close',secondary:true},{text:'模拟收款失败',action:'payment-failed',secondary:true},{text:role==='pos'?'模拟收款成功并核销':'模拟付款成功',action:'order-confirm'}]);
};
placeOrder=function(){
 const p=orderPlan(),error=orderError(p);if(error){toast(error);return false;}
 let used=null;if(p.cp&&p.res.chosen.id==='coupon'){used=p.couponWallet||redeem(p.cp.id,role==='pos'?'LA POS':'官网');if(!used)return false;}
 let shipWallet=null;if(role!=='pos'&&state.ship){shipWallet=activeWallet().find(w=>w.reward==='ship')||redeem('ship');if(!shipWallet)return false;}
 state.counter++;const id='#DEMO'+String(state.counter).padStart(4,'0'),previous=tier().name,channel=role==='pos'?'LA POS':'官网',method=role==='pos'?state.couponMethod||'店员直接选择':'线上结账';
 if(used){used.status='used';used.order=id;used.usedChannel=channel;used.usedActor=role==='pos'?'门店员工 LA-04':'会员本人';used.usedMethod=method;used.usedDay=today();log(`优惠券 ${used.code} 已核销`,0,channel,id);}
 state.spendBatches.push({order:id,net:p.res.chosen.total,paid:today()});state.spend=spendInWindow();
 const earned=earnPoints(p.res.chosen.total,p.res.t.rate);state.pending.unshift({id,amount:earned,due:null,name:`${role==='pos'?'LA 门店':'线上'}订单 ${id} · ${role==='pos'?'待标记提货':'待发货'}`,net:p.res.chosen.total,rate:p.res.t.rate,customer:state.memberId});
 state.orders.unshift({id,customer:state.memberId,net:p.res.chosen.total,earned,rate:p.res.t.rate,status:'paid',channel,coupon:used?.id||null,paid:today(),fulfilled:false});
 if(shipWallet){shipWallet.status='reserved';shipWallet.order=id;state.shippingOrder=id;state.shipFulfilled=false;state.shipRefunded=false;shipWallet.tag='PRIORITY_SHIPPING';}
 state.first=false;state.ship=false;state.coupon=null;state.selectedCouponWalletId=null;state.lastOrder=id;state.posCouponMessage=used?`${used.code} 已于 ${id} 核销，官网与 POS 状态同步为已使用。`:'';log(`完成订单 ${id} · ${money(p.res.chosen.total)}`,0,channel,id);tierChanged(previous);
 state.notifications.unshift({title:'订单已完成',text:`${id} · 预计 ${earned} 积分，发货 / 提货后开始 30 天等待期。`,type:'service',day:today()});
 closeModal();render();modal('订单已完成',`<p>${id} · 净商品消费 ${money(p.res.chosen.total)}</p><div class="detail">${used?`优惠券 ${esc(used.code)} 已核销 · ${method}<br>`:''}${previous!==tier().name?`等级 ${previous} → ${tier().name}<br>`:''}${earned} 积分待发货 / 提货后开始 30 天等待期。</div><p>同一券再次选择、扫码或输入将被拦截，不再扣积分。</p>`,[{text:'稍后处理',action:'close',secondary:true},{text:role==='pos'?'标记已提货':'标记已发货 / 提货',action:'fulfill-order',id}]);return true;
};
advance=function(){const previous=tier().name;originalAdvance();state.spend=spendInWindow();tierChanged(previous);render();};
overview=function(){
 let html=originalOverview();if(!state.joined)return html;
 const next=TIERS[tierIndex(state.spend)+1],coupons=activeWallet().filter(w=>REWARDS.find(r=>r.id===w.reward).type==='coupon'&&w.created+30-today()<=7),alerts=[];
 if(state.expiring&&state.expiryDay-today()<=30)alerts.push(`<div class="notice"><strong>${number(state.expiring)} 积分将在 ${date(state.expiryDay)} 到期</strong><p>按积分批次到期，兑换时优先使用即将到期的积分。<button class="link" data-action="page" data-id="rewards">查看可兑换权益</button></p></div>`);
 if(coupons.length)alerts.push(`<div class="notice"><strong>${coupons.length} 张优惠券即将到期</strong><p>可在线上使用，或到店出示条形码 / 券码。<button class="link" data-action="page" data-id="wallet">查看优惠券</button></p></div>`);
 if(next&&next.min-state.spend<=50)alerts.push(`<div class="notice"><strong>距离 ${next.name} 还差 ${money(next.min-state.spend)}</strong><p>官网与门店净商品消费合并计算。<button class="link" data-action="page" data-id="tiers">查看升级权益</button></p></div>`);
 return (alerts.length?`<div class="business-alerts">${alerts.join('')}</div>`:'')+html;
};
rewards=function(){return originalRewards()+`<div class="future-entries"><button data-phase1="false" aria-disabled="true">已验证商品评价 <small>二期</small></button><button data-phase1="false" aria-disabled="true">推荐好友 <small>二期</small></button><button data-phase1="false" aria-disabled="true">门店双倍积分日 <small>二期</small></button><button data-phase1="false" aria-disabled="true">VIP 活动 <small>二期</small></button></div>`;};
points=function(){
 const names={all:'全部',pending:'待入账',earned:'获得',redeem:'兑换扣减',refund:'退款扣回',expired:'已过期',returned:'退回'},records=state.ledger.filter(l=>filter==='all'||l.category===filter),pending=(filter==='all'||filter==='pending')?state.pending:[];
 return gate(`${head('POINTS ACTIVITY','积分明细','查看积分获得、冻结、扣减、扣回、到期和退回记录。')}<div class="row between"><div><span class="small muted">可用积分</span><h2 class="num">${number(state.points)}</h2></div><div style="text-align:right"><span class="small muted">待入账积分</span><h2 class="num">${number(state.pending.reduce((a,b)=>a+b.amount,0))}</h2></div></div><div class="tabs" role="tablist" aria-label="积分状态">${Object.entries(names).map(([id,label])=>`<button role="tab" aria-selected="${filter===id}" class="${filter===id?'active':''}" data-action="points-filter" data-id="${id}">${label}</button>`).join('')}</div>${pending.map(p=>`<div class="ledger"><div><strong>${p.name}</strong><p class="small muted">${money(p.net)} × ${p.rate} · ${p.due===null?'待发货 / 提货，尚未开始等待期':date(p.due)+' 转为可用'}</p><button class="link small" data-action="pending-detail" data-id="${p.id}">查看记录</button></div><div><strong class="num">+${number(p.amount)}</strong><p class="small muted">冻结中</p></div></div>`).join('')}${filter!=='pending'?records.map(l=>`<div class="ledger"><div><strong>${l.label}</strong><p class="small muted">${l.channel} · ${date(l.day)} · ${names[l.category]||'状态变更'}</p><button class="link small" data-action="transaction-detail" data-id="${l.id}">查看流水详情</button></div><div class="change num ${l.amount<0?'negative':''}">${l.amount>0?'+':''}${number(l.amount)}</div></div>`).join(''):''}${!records.length&&!pending.length?'<div class="empty"><h3>暂无该类记录</h3></div>':''}<section class="point-batches"><h3>可用积分批次</h3>${state.lots.filter(l=>l.amount>0).sort((a,b)=>a.expires-b.expires).map(l=>`<div class="row between"><span>${date(l.expires)} 到期</span><strong class="num">${number(l.amount)} 分</strong></div>`).join('')||'<p class="small muted">暂无可用批次。</p>'}</section><div class="notice">兑换按先到期先扣除。退款依据原订单金额及原倍率，累计扣回不超过原始积分；负余额进入人工核对。各积分批次分别记录到期日，可在上方查看。</div>`);
};
settings=function(){return originalSettings()+`<section class="panel" style="margin-top:20px"><h3>同意与通知管理</h3><p class="small muted" style="margin:12px 0">会员计划：${state.joined?'已加入':'未加入'} · 邮箱验证：${state.consent.emailVerified?'已验证':'未验证'} · ${state.consent.memberVersion}<br>会员计划同意与营销订阅分别记录。</p><label class="check"><input id="marketing-consent-input" type="checkbox" ${state.marketing?'checked':''}><span>接收邮件资讯与优惠（可选）</span></label><p class="small muted">营销触达仅在此项同意后执行；本原型只预览通知。</p>${state.exitRequest?'<div class="notice">退出申请已提交，待客服核对未用积分和权益。最终退出规则确认前不会自动清空。</div>':''}</section>`;};
function transactionDetail(id){const l=state.ledger.find(l=>l.id===id);if(!l)return;modal('积分流水详情',`<div class="detail"><strong>${esc(l.label)}</strong><br>变更：${l.amount>0?'+':''}${l.amount} 分<br>余额：${l.before===null?'历史演示记录':number(l.before)+' → '+number(l.after)}<br>流水号：${l.id}<br>会员：${l.customer}<br>来源订单 / 权益：${l.reference||'会员账户事件'}<br>时间：${date(l.day)}<br>渠道：${l.channel}<br>操作人：${l.actor}<br>规则版本：${l.version}</div><p class="small muted">原订单与原始流水用于退款、核销防重复和跨渠道对账。</p>`,[{text:'关闭',action:'close'}]);}
function applyScopeGuards(){
 const stage=document.getElementById('stage');
 for(const a of stage.querySelectorAll('a[href]')){a.removeAttribute('href');a.removeAttribute('target');a.dataset.phase1='false';a.setAttribute('aria-disabled','true');}
 for(const e of stage.querySelectorAll('.account-header a,.store-header a,.account-nav a,.profile-link,.account-nav button[data-id="settings"],[data-action="country-menu"],[data-action="store-search"],[data-action="store-wishlist"]')){e.dataset.phase1='false';e.setAttribute('aria-disabled','true');}
}
const NEW_ACTIONS=['coupon-detail','coupon-online','pos-coupon-method','pos-coupon-apply','pos-coupon-clear','pos-scan-demo','payment-failed','transaction-detail','pending-detail','operations-view','ops-tab','issue-seed','issue-detail','issue-verify','issue-resolve-sync','coupon-failure-demo','cancel-order-open','cancel-order-confirm','run-reconciliation','touch-preview','exit-confirm','refund-confirm','retry-sync','restore-return'];
document.addEventListener('click',event=>{
 const el=event.target.closest('button,a');if(!el)return;
 if(el.dataset.phase1==='false'){event.preventDefault();event.stopImmediatePropagation();return;}
 const a=el.dataset.action,id=el.dataset.id;if(!NEW_ACTIONS.includes(a))return;event.preventDefault();event.stopImmediatePropagation();if(el.disabled)return;
 if(a==='coupon-detail')couponDetail(id);
 else if(a==='coupon-online'){const w=state.wallet.find(w=>w.id===id);if(!w)return;closeModal();state.selectedCouponWalletId=w.id;state.coupon=w.reward;role='storefront';page='checkout';render();}
 else if(a==='pos-coupon-method'){state.posCouponMethod=id;state.posCouponMessage='';render();if(id!=='direct')document.getElementById('pos-coupon-code')?.focus();}
 else if(a==='pos-coupon-apply')applyPOSCoupon(state.wallet.find(w=>w.id===id),'店员直接选择');
 else if(a==='pos-coupon-clear'){state.coupon=null;state.selectedCouponWalletId=null;state.posCouponMessage='已移除此券，未核销，仍可使用。';render();}
 else if(a==='pos-scan-demo'){const w=activeWallet().find(w=>REWARDS.find(r=>r.id===w.reward).type==='coupon');if(w)lookupPOSCoupon(w.code,'扫描条形码');}
 else if(a==='payment-failed'){closeModal();log('订单收款失败 · 未核销优惠券',0,role==='pos'?'LA POS':'官网');render();toast('收款失败，优惠券仍可用，未扣新积分。');}
 else if(a==='restore-return'){if(!state.permission||state.sync||state.labelScanned||state.returnReason!=='customer')return;const w=state.wallet.find(w=>w.reward==='return'&&['reserved','label_issued'].includes(w.status));if(w){const oldLabel=w.labelId;w.status='available';w.order=null;w.labelId=null;state.labelCreated=false;state.returnCanceled=false;state.currentLabelId=null;log('首扫前取消 · 标签作废并恢复权益',0,'客服',w.id);render();toast(`权益已恢复可用，${oldLabel?'原标签已作废，':''}没有退还积分。`);}}
 else if(a==='transaction-detail')transactionDetail(id);
 else if(a==='pending-detail'){const p=state.pending.find(p=>p.id===id);if(p)modal('待入账积分记录',`<div class="detail">来源订单：${p.id}<br>Customer ID：${state.memberId}<br>净商品金额：${money(p.net)}<br>原订单积分倍率：${p.rate}<br>冻结积分：${p.amount}<br>解冻时间：${p.due===null?'待发货 / 提货，尚未开始等待期':date(p.due)}<br>规则版本：${BUSINESS_VERSION}</div>`,[{text:'关闭',action:'close'}]);}
 else if(a==='operations-view'){closeModal();role='operations';render();}
 else if(a==='ops-tab'){operationsTab=id;render();}
 else if(a==='issue-seed'){const examples={duplicate:['重复客户档案待核验','核查主 Customer ID、同意记录及原订单，不自动合并或重复赠分。','#028164 / #038201'],guest:['游客订单事后绑定申请','原订单归属核验、追溯资格与积分规则需审核，禁止重复累计。','#GUEST10488'], 'coupon-refund':['已使用券的退款处理','保留已核销券状态，是否重发优惠券待规则审核，不返还兑券积分。','#F10420']};addIssue(id,...examples[id]);render();}
 else if(a==='issue-detail')issueDetail(id);
 else if(a==='issue-verify'){const i=state.issues.find(i=>i.id===id);if(!document.getElementById('issue-verified')?.checked)return toast('请先完成并确认人工归属核验。');if(i&&i.status!=='closed'){i.status='verified';i.actor='运营 OP-01';log(`${i.id} 人工核验完成 · 待主管审核`,0,'运营',i.reference);}closeModal();render();}
 else if(a==='issue-resolve-sync'||a==='retry-sync'){state.sync=false;for(const i of state.issues.filter(i=>i.type==='sync'))i.status='closed';log('官网 / POS 同步核对完成',0,'运营');closeModal();render();toast('演示同步已恢复，同一账户余额可用。');}
 else if(a==='coupon-failure-demo'){state.simulateCouponFailure=true;const w=redeem('c5');if(!w&&state.simulateCouponFailure){state.simulateCouponFailure=false;toast('积分不足或同步异常，未开始兑换。');}render();}
 else if(a==='cancel-order-open'){modal('取消未履约订单',`<p>${id} 将撤销待入账积分并扣除对应净消费。配送升级未履约时退还 400 积分；已核销商品券是否重发进入人工审核，不自动返还兑券积分。</p>`,[{text:'返回',action:'close',secondary:true},{text:'确认取消演示订单',action:'cancel-order-confirm',id}]);}
 else if(a==='cancel-order-confirm'){cancelDemoOrder(id);closeModal();render();}
 else if(a==='run-reconciliation')runReconciliation();
 else if(a==='touch-preview'){const r=TOUCH_RULES[Number(id)];if(!r||r[3]==='营销邮件'&&!state.marketing||Number(id)===8)return;modal('通知预览 · '+r[0],`<p>${esc(state.name)}，${r[2]}。</p><div class="detail">触发条件：${r[1]}<br>渠道：${r[3]}<br>营销同意：${state.marketing?'已同意':'未同意'}<br>此处仅供内容评审，不会发送邮件。</div>`,[{text:'关闭',action:'close'}]);}
 else if(a==='exit-confirm'){if(!state.exitRequest){state.exitRequest=true;addIssue('exit','会员退出申请','待核对积分、未用券、服务权益、等级及必要数据请求。');log('提交退出会员申请 · 待客服审核',0);}closeModal();render();toast('退出申请已记录，等待最终规则审核。');}
 else if(a==='refund-confirm'){if(state.sync)return toast('同步失败，暂停原订单退款演示。');const value=Number(document.getElementById('refund-amount').value);if(!Number.isFinite(value)||value<=0||value>round(95-state.refundedNet))return toast('请输入原订单剩余净金额以内的退款金额。');const prev=tier().name,targetNet=round(state.refundedNet+value),target=targetNet>=95?114:Math.floor(114*targetNet/95),back=target-state.refundedPoints;state.refundedNet=targetNet;state.refundedPoints=target;spendPoints(back);const b=state.spendBatches.find(b=>b.order==='#F10420');if(b)b.net=Math.max(0,round(b.net-value));state.spend=spendInWindow();log(`原订单 #F10420 退货 ${money(value)}`,-back,'LA POS','#F10420');tierChanged(prev);closeModal();render();toast(`退款 ${money(value)}，按原订单倍率扣回 ${back} 分。${state.points<0?'负余额已进入人工审核。':''}`);}
},true);
document.addEventListener('submit',event=>{
 const form=event.target;
 if(form.id==='pos-coupon-form'){event.preventDefault();event.stopImmediatePropagation();lookupPOSCoupon(document.getElementById('pos-coupon-code').value,state.posCouponMethod==='scan'?'扫描条形码':'输入优惠券码');}
 else if(form.id==='verify-form')event.joinMarketingChoice=!!state.marketing;
 else if(form.id==='search-form'&&document.getElementById('customer-search').value.trim().toLowerCase()==='duplicate@example.com'){event.preventDefault();event.stopImmediatePropagation();state.found=false;state.bound=false;addIssue('duplicate','重复客户档案待核验','禁止自动合并或重复发放注册奖励，运营 / 运维在 24 小时内核查。','#028164 / #038201');render();modal('发现重复客户档案','<p>同一邮箱对应两份档案。本单暂不绑定，也不自动合并或发放奖励。已进入人工审核队列。</p>',[{text:'返回',action:'close',secondary:true},{text:'查看异常队列',action:'operations-view'}]);}
},true);
document.addEventListener('change',event=>{
 const e=event.target;if(e.id==='marketing-consent-input'){state.marketing=e.checked;state.consent.marketing=e.checked;log(`邮件营销同意${e.checked?'开启':'撤回'}`,0);render();}
 else if(e.id==='stock-input'||e.id==='route-input'){state[e.id==='stock-input'?'stock':'shippingRoute']=e.checked;if(!state.stock||!state.shippingRoute)state.ship=false;render();}
 else if(e.id==='coupon-select')state.selectedCouponWalletId=null;
});
document.addEventListener('submit',event=>{if(event.target.id==='verify-form'&&state.joined){state.marketing=!!event.joinMarketingChoice;state.consent.emailVerified=true;state.consent.member=true;state.consent.marketing=state.marketing;state.consent.day=today();}});

function render(){
 if(!PUBLIC_ROLES.includes(role))role='customer';
 if(!NAMES[page])page='overview';
 if(role==='storefront'||page==='checkout'){role='storefront';page='checkout';}
 document.querySelectorAll('[data-role]').forEach(button=>{
  button.classList.toggle('active',button.dataset.role===role);
  button.setAttribute('aria-pressed',String(button.dataset.role===role));
 });
 const stage=document.getElementById('stage');
 stage.className='stage'+(device==='mobile'?' mobile':'');
 stage.innerHTML=role==='storefront'?nativeStorefrontShell(checkout()):nativeAccountShell(({overview,rewards,wallet,points,tiers,join,settings}[page]||overview)());
 applyScopeGuards();
}
window.addEventListener('hashchange',()=>{
 if(!NAMES[location.hash.slice(1)]){role='customer';page='overview';filter='all';render();}
});

// Cart view mirrors the reference storefront. Calculations use the existing phase-one rules.
let cartOpen=true,cartView='collection',cartNote='',cartNoteOpen=false;
const cartPreviousCheckout=checkout,cartPreviousShell=nativeStorefrontShell,cartPreviousRender=render;
// Redemption copy uses the store confirmed by the user on 2026-10-14.
const COUPON_STORE={name:'FIOBOC Glendale Galleria',address:'2170 Glendale Galleria, Glendale, CA 91204',source:'https://www.fioboc.com/pages/fioboc-stores'};
const HOODIE_PRODUCT={name:'莫代尔混纺长袖连帽衫',englishName:'Modal Blend Long Sleeve Hoodie',price:80,source:'https://www.fioboc.com/collections/long-sleeve-shirts/products/modal-blend-long-sleeve-hoodie',images:['./assets/images/hoodie-long-front.webp','./assets/images/hoodie-long-back.webp','./assets/images/hoodie-long-detail.webp','./assets/images/hoodie-long-closeup.webp'],sizes:['S','M','L','XL','2XL','3XL']};
function couponThresholdHTML(r){return `<div class="coupon-threshold"><strong>满 $${r.min} 减 $${r.value}</strong><p class="coupon-threshold-basis">按会员基础折扣后商品金额计算</p></div>`;}
function rewardDescription(r){return r.type==='shipping'?'标准配送升1级，线上结账时可用':r.type==='return'?'兑换后联系客服使用':'';}
function rewardUseConditions(r){
 if(r.type==='coupon')return [`订单消费需满$${r.min}。`,'兑换后30天内有效，过期积分不可退回。',`仅限线下 ${COUPON_STORE.name} 门店可用。门店地址：${COUPON_STORE.address}。`,'仅可与会员基础折扣同用，不与满件、首单、普通优惠码、达人码或临时促销叠加。','每笔订单限用1张优惠券。','未使用且兑换后 24 小时内可撤销兑换。'];
 if(r.type==='shipping')return ['仅限配送地址为美国（除阿拉斯加州和夏威夷州）的线上现货订单使用。','兑换后30天内有效，过期积分不可退回。','仅升级配送服务，具体到货日期由承运方时效决定。'];
 return ['兑换后30天内有效，过期积分不可退回。联系客服使用。','仅限退货地址为美国（除阿拉斯加州和夏威夷州）的线上合规订单使用。','承运方发货前可联系客服取消服务、退积分并恢复权益，承运方发货后不可取消。'];
}
function rewardUseConditionsHTML(r){return `<ol class="reward-use-conditions" aria-label="${esc(r.name)}使用限制">${rewardUseConditions(r).map(rule=>`<li>${esc(rule)}</li>`).join('')}</ol>`;}
function rewardUseLimitDetails(r){return `<details class="reward-use-limits"><summary>使用限制</summary>${rewardUseConditionsHTML(r)}</details>`;}
function rewardCardContent(r){return `<h3 class="reward-card-name">${esc(r.name)}</h3>${r.type==='coupon'?couponThresholdHTML(r):`<p class="reward-card-description">${rewardDescription(r)}</p>`}${rewardUseLimitDetails(r)}`;}
const previousRewardRedeemOpen=redeemOpen;
rewardCard=function(r){
 const available=state.joined&&!state.sync&&state.points>=r.cost;
 return `<article class="reward reward-redemption-card ${r.type==='coupon'?'coupon-redeem-card':''}"><div class="rewardbody">${rewardCardContent(r)}<div class="row between"><span class="cost">${number(r.cost)} <small>积分</small></span><button class="btn small secondary" data-action="redeem" data-id="${r.id}" ${state.joined&&!available?'disabled':''}>${!state.joined?'加入后兑换':state.sync?'稍后重试':available?'兑换':`差 ${number(r.cost-state.points)} 分`}</button></div></div></article>`;
};
redeemOpen=function(id){
 const r=REWARDS.find(x=>x.id===id);if(!r)return;
 if(!state.joined||state.sync||state.points<r.cost)return previousRewardRedeemOpen(id);
 modal(`兑换${r.name}`,`${r.type==='coupon'?couponThresholdHTML(r):`<p class="reward-card-description">${rewardDescription(r)}</p>`}${rewardUseLimitDetails(r)}<div class="detail"><div class="row between"><span>本次消耗</span><strong>${number(r.cost)} 积分</strong></div><div class="row between"><span>兑换后余额</span><strong>${number(state.points-r.cost)} 积分</strong></div></div><p>兑换积分不会改变会员等级。</p>`,[{text:'返回',action:'close',secondary:true},{text:'确认兑换',action:'redeem-confirm',id}]);
};
function cartLineItems(){return state.cartItems?state.cartItems.filter(line=>line.quantity>0):state.qty?[{id:'tee-black-s',product:'tee',name:'莫代尔混纺短袖T恤：修身款',englishName:'Modal Blend Short Sleeve Tee:Slim Fit',color:'黑色',size:'S',price:56,quantity:state.qty,image:'./assets/images/modal-black.webp'}]:[];}
function cartUnitPrice(){const lines=cartLineItems(),quantity=lines.reduce((sum,line)=>sum+line.quantity,0);return quantity?lines.reduce((sum,line)=>sum+line.price*line.quantity,0)/quantity:56;}
function cartResult(){return {...calculate({spend:state.spend,quantity:state.qty,price:cartUnitPrice(),promo:state.promo,first:state.first,coupon:REWARDS.find(r=>r.id===state.coupon&&r.type==='coupon')||null}),quantity:state.qty};}
function cartCouponModel(){
 const withoutCoupon=calculate({spend:state.spend,quantity:state.qty,price:cartUnitPrice(),promo:state.promo,first:state.first});
 const shippingCost=state.ship&&!activeWallet().some(w=>w.reward==='ship')?400:0;
 const pointsForCoupon=Math.max(0,state.points-shippingCost);
 const rows=REWARDS.filter(r=>r.type==='coupon').map(reward=>{
  const selectedWallet=state.coupon===reward.id&&state.selectedCouponWalletId?state.wallet.find(w=>w.id===state.selectedCouponWalletId&&w.reward===reward.id):null;
  const wallet=selectedWallet||activeWallet().find(w=>w.reward===reward.id&&!couponValidity(w,false));
  const result=calculate({spend:state.spend,quantity:state.qty,price:cartUnitPrice(),promo:state.promo,first:state.first,coupon:reward});
  const reasons=[];
  if(!state.joined)reasons.push('尚未加入会员');
  if(state.sync)reasons.push('账户同步失败');
  if(state.points<0)reasons.push('积分余额为负，账户待核对');
  if(state.qty<=0)reasons.push('购物车为空');
  if(selectedWallet){const invalid=couponValidity(selectedWallet,false);if(invalid&&!state.sync)reasons.push(invalid);}
  if(result.base<reward.min)reasons.push(`会员折后商品金额未满 ${money(reward.min)}`);
  if(!wallet&&pointsForCoupon<reward.cost)reasons.push(`积分不足，差 ${number(reward.cost-pointsForCoupon)} 分${shippingCost?'（已预留配送升级积分）':''}`);
  const candidate=result.candidates.find(c=>c.id==='coupon');
  if(candidate.valid&&candidate.total>=withoutCoupon.chosen.total){
   const difference=round(candidate.total-withoutCoupon.chosen.total);
   reasons.push(difference>0?`${withoutCoupon.chosen.name}更划算，多省 ${money(difference)}`:'当前优惠同价，无需使用积分券');
  }
  return {reward,wallet,result,reasons,eligible:reasons.length===0};
 });
 const context=JSON.stringify([state.memberId,state.spend,state.qty,cartUnitPrice(),state.points,state.joined,state.sync,state.promo,state.first,state.ship,state.day,state.wallet.map(w=>[w.id,w.reward,w.status,w.created,w.customer])]);
 return {rows,withoutCoupon,context};
}
function normalizeCartCouponSelection(){
 const model=cartCouponModel();
 if(state.cartCouponNotice&&state.cartCouponNotice.context!==model.context)state.cartCouponNotice=null;
 if(!state.coupon)return model;
 const row=model.rows.find(r=>r.reward.id===state.coupon);
 if(!row||!row.eligible){
  state.cartCouponNotice={context:model.context,text:`${row?.reward.name||'所选积分券'}已移除：${row?.reasons.join('；')||'优惠券不可用'}。当前未使用积分券，本次调整未扣兑换积分。`};
  state.coupon=null;state.selectedCouponWalletId=null;
  return cartCouponModel();
 }
 state.selectedCouponWalletId=row.wallet?.id||null;
 return model;
}
function cartCouponOptions(model){
 const ordered=[...model.rows.filter(r=>r.eligible),...model.rows.filter(r=>!r.eligible)];
 return '<option value="">不使用积分券</option>'+ordered.map(row=>{
  const r=row.reward,label=`${r.name} · 满 $${r.min} · ${row.wallet?'已兑换':'需 '+number(r.cost)+' 积分'}${row.eligible?'':' · 不可使用：'+row.reasons.join('；')}`;
  return `<option value="${r.id}"${state.coupon===r.id&&row.eligible?' selected':''}${row.eligible?'':' disabled'}>${esc(label)}</option>`;
 }).join('');
}
function cartCouponHint(result,model){
 if(state.cartCouponNotice)return `<div class="notice warn cart-coupon-hint" id="cart-coupon-hint" role="status">${esc(state.cartCouponNotice.text)}</div>`;
 const selected=model.rows.find(r=>r.reward.id===state.coupon&&r.eligible);
 if(selected){
  const r=selected.reward,discount=round(result.base-result.chosen.total);
  const detail=selected.wallet?'使用已兑换券，付款成功后核销，不重复扣积分。':`付款成功时兑换并核销，需 ${number(r.cost)} 积分；当前未扣分。`;
  return `<div class="notice success cart-coupon-hint" id="cart-coupon-hint" role="status">本单已选用${esc(r.name)}，抵扣 ${money(discount)}，商品应付 ${money(result.chosen.total)}。${detail}</div>`;
 }
 const discount=round(result.subtotal-result.chosen.total);
 return `<div class="notice cart-coupon-hint" id="cart-coupon-hint" role="status">当前未使用积分券${discount>0?`，已采用${esc(result.chosen.name)}`:''}。不可使用的积分券已置底，并注明原因。</div>`;
}
function cartShippingState(){
 const reward=REWARDS.find(r=>r.id==='ship');
 const wallet=activeWallet().find(w=>w.reward==='ship'&&(!w.customer||w.customer===state.memberId));
 const reasons=[];
 if(!state.joined)reasons.push('请先加入会员计划');
 if(state.sync)reasons.push('账户同步失败，暂不能兑换或使用');
 if(state.points<0)reasons.push('积分余额为负，账户待核对');
 if(state.qty<=0)reasons.push('购物车为空');
 if(state.address!=='us')reasons.push('仅美国本土 48 州配送订单可用');
 if(!state.stock)reasons.push('仅现货、非预售商品可用');
 if(!state.shippingRoute)reasons.push('当前无可执行的配送升级线路');
 if(typeof cartView!=='undefined'&&cartView==='checkout'&&!checkoutAddressReady())reasons.push('请先填写完整收货地址');
 const selected=REWARDS.find(r=>r.id===state.coupon&&r.type==='coupon');
 const couponWallet=selected&&activeWallet().find(w=>w.reward===selected.id&&!couponValidity(w,false));
 const couponCost=selected&&cartResult().chosen.id==='coupon'&&!couponWallet?selected.cost:0;
 const available=Math.max(0,state.points-couponCost),shortfall=Math.max(0,reward.cost+couponCost-state.points);
 return {reward,wallet,reasons,couponCost,available,shortfall,canUse:!!wallet&&reasons.length===0,canRedeem:!wallet&&reasons.length===0&&shortfall===0};
}
function cartShippingControls(info){
 const description=info.canUse?'已兑换 · 可用于本单':info.wallet?'已兑换 · 当前订单不可用':`配送升级 · ${number(info.reward.cost)} 积分`;
 const status=info.reasons.length?info.reasons.join('；'):info.canUse?'与会员折扣同用；不承诺绝对到货日。':info.shortfall?`尚无可用配送升级权益，兑换还差 ${number(info.shortfall)} 积分${info.couponCost?`（为所选积分券预留 ${number(info.couponCost)} 积分）`:''}。`:'尚无可用配送升级权益，兑换后可用于本单。';
 return `<section class="cart-shipping-service" aria-label="配送升级服务"><div class="cart-shipping-heading"><label class="check"><input id="shipping-input" type="checkbox" aria-describedby="cart-shipping-status" ${state.ship&&info.canUse?'checked':''} ${info.canUse?'':'disabled'}><span><strong class="shipping-checkbox-copy">使用配送升级服务</strong><br><span class="muted small">${description}</span></span></label>${info.wallet?'':'<button class="link cart-shipping-redeem" data-action="cart-shipping-redeem">快速兑换</button>'}</div><p class="cart-shipping-status" id="cart-shipping-status">${esc(status)}</p></section>`;
}
function cartShippingRedeemOpen(){
 const info=cartShippingState(),cost=info.wallet?0:info.reward.cost;
 const warning=info.reasons.length?info.reasons.join('；'):info.shortfall&&!info.wallet?`积分不足，还差 ${number(info.shortfall)} 积分。`:'';
 const hasShortfall=!info.wallet&&info.shortfall>0;
 const content=`<p>兑换后可在符合条件的线上订单中使用配送升级服务。</p>${rewardUseLimitDetails(info.reward)}<div class="detail"><div class="row between"><span>当前可用积分</span><strong>${number(state.points)} 分</strong></div><div class="row between"><span>本次兑换消耗</span><strong>${number(cost)} 分</strong></div>${info.couponCost?`<div class="row between"><span>所选积分券预留</span><strong>${number(info.couponCost)} 分</strong></div>`:''}<div class="row between"><span>${hasShortfall?'还差积分':'兑换后预计余额'}</span><strong>${hasShortfall?number(info.shortfall):number(state.points-cost)} 分</strong></div></div>${warning?`<div class="notice warn" role="alert">${esc(warning)}${info.couponCost?' 所选积分券的兑换积分已保留。':''}</div>`:'<p>确认兑换后，自动为本单选中配送升级服务。兑换积分不影响会员等级。</p>'}`;
 const canConfirm=info.canUse||info.canRedeem;
 modal(info.wallet?'使用已兑换的配送升级权益':'兑换配送升级服务',content,[{text:'取消',action:'close',secondary:true},...(!state.joined?[{text:'加入会员',action:'cart-shipping-join',secondary:true}]:[]),{text:canConfirm?(info.wallet?'确认使用':'确认兑换并使用'):info.shortfall&&!info.reasons.length?'积分不足':'暂不可兑换',action:'cart-shipping-redeem-confirm'}]);
 const button=document.querySelector('.modal [data-action="cart-shipping-redeem-confirm"]');if(button)button.disabled=!canConfirm;
}
function cartShippingRedeemConfirm(){
 const info=cartShippingState();
 if(info.canUse){state.ship=true;closeModal();render();toast('已为本单使用现有配送升级权益，未重复扣分。');return true;}
 if(!info.canRedeem){cartShippingRedeemOpen();return false;}
 const wallet=redeem('ship','官网');if(!wallet){cartShippingRedeemOpen();return false;}
 state.ship=true;closeModal();render();toast(`已兑换配送升级权益，扣除 ${number(info.reward.cost)} 积分，并为本单选中服务。`);return true;
}
function cartDiscountItems(result){
 if(result.discountItems)return result.discountItems;
 const rows=[],chosen=result.chosen;
 if(chosen.id==='member'||chosen.id==='coupon'){
  const member=round(result.subtotal-result.base);
  if(member>0)rows.push({name:`${result.t.name} 会员基础折扣 · ${round(result.t.base*100)}%`,amount:member});
  const second=round(result.base-chosen.total);
  const quantity=result.quantity??state.qty;
  if(second>0)rows.push({name:chosen.id==='coupon'?`积分优惠券 · ${REWARDS.find(r=>r.id===state.coupon)?.name||''}`:`满件优惠 · ${quantity>=12?'12':quantity>=6?'6':'3'} 件 ${round(result.bundle*100)}%`,amount:second});
 }else if(chosen.id==='first')rows.push({name:result.bundle>.1?`满件优惠 · ${round(result.bundle*100)}%`:'新客首单优惠 · 10%',amount:round(result.subtotal-chosen.total)});
 else if(chosen.id==='promo')rows.push({name:`优惠码 / 活动折扣 · ${state.promo}%`,amount:round(result.subtotal-chosen.total)});
 return rows;
}
function cartProductDiscountHTML(result){
 const rows=cartDiscountItems(result);if(!rows.length)return '';
 const icon='<svg class="cart-discount-tag-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="7" cy="7" r="1"/></svg>';
 return `<div class="cart-product-discount-labels" aria-label="商品折扣">${rows.map(row=>`<div class="cart-tag-discount-row"><span class="cart-tag-discount-name">${icon}<span>${esc(row.name)}</span></span><span class="cart-tag-discount-amount num">−${money(row.amount)}</span></div>`).join('')}</div>`;
}
function cartProductPriceHTML(result){
 const quantity=result.quantity??state.qty,originalUnit=quantity?round(result.subtotal/quantity):0,discountedUnit=quantity?round(result.chosen.total/quantity):0;
 return `<div class="cart-line-price"><strong class="num" aria-label="${result.chosen.total<result.subtotal?'折后单价':'商品单价'}">${money(discountedUnit)}</strong>${result.chosen.total<result.subtotal?`<del class="num" aria-label="原单价">${money(originalUnit)}</del>`:''}</div>`;
}
function cartSummaryHTML(result){
 return `<aside class="summary cart-clean-summary"><div class="summary-line total"><strong>商品应付小计</strong><strong class="num">${money(result.chosen.total)}</strong></div><div class="cart-points" aria-live="polite"><span>预计可得积分</span><strong class="num">${number(result.points)} 积分</strong><p>${number(Math.floor(result.chosen.total))} × ${result.t.rate} = ${number(result.points)} 积分 · 发货或提货后 30 天可用</p></div><p class="cart-tax-note">税费和运费将在结账时计算。</p><button class="link cart-note-button" data-action="cart-note-toggle" aria-expanded="${cartNoteOpen}">订单备注</button>${cartNoteOpen?`<label class="cart-note-label" for="cart-note">备注内容</label><textarea id="cart-note" rows="2" placeholder="添加订单备注">${esc(cartNote)}</textarea>`:''}<button class="btn cart-view-button" data-action="checkout-open" ${state.qty<=0?'disabled':''}>去结账</button></aside>`;
}
function cartAllocatedLines(result){
 const lines=cartLineItems().map(line=>({line,result:{...result,quantity:line.quantity,subtotal:round(line.price*line.quantity),chosen:{...result.chosen,total:round(line.price*line.quantity)},discountItems:[]}}));
 for(const discount of cartDiscountItems(result)){
  const cents=Math.round(discount.amount*100),rawCents=Math.round(result.subtotal*100);
  if(!rawCents)continue;
  const allocations=lines.map((item,index)=>{const exact=cents*Math.round(item.result.subtotal*100)/rawCents;return {index,amount:Math.floor(exact),remainder:exact-Math.floor(exact)};});
  let left=cents-allocations.reduce((sum,item)=>sum+item.amount,0);
  for(const item of [...allocations].sort((a,b)=>b.remainder-a.remainder||a.index-b.index)){if(left<=0)break;item.amount++;left--;}
  for(const item of allocations)if(item.amount>0){const row=lines[item.index].result;row.discountItems.push({name:discount.name,amount:item.amount/100});row.chosen.total=round(row.chosen.total-item.amount/100);}
 }
 return lines;
}
function cartLineProductHTML(item){
 const {line,result}=item;
 return `<div class="product cart-product-with-tags"><img class="cart-product-image" src="${esc(line.image)}" alt="${esc(line.name+'，'+line.color)}"><div class="cart-product-body"><h3>${esc(line.name)}</h3><p>${esc(line.color)} / ${esc(line.size)}</p><div class="quantity" aria-label="${esc(line.name)}购买数量"><button data-action="cart-line-down" data-id="${esc(line.id)}" aria-label="减少数量">−</button><span class="num">${line.quantity}</span><button data-action="cart-line-up" data-id="${esc(line.id)}" aria-label="增加数量" ${state.qty>=24?'disabled':''}>+</button></div></div>${cartProductPriceHTML(result)}${cartProductDiscountHTML(result)}<button class="link cart-remove" data-action="cart-line-remove" data-id="${esc(line.id)}">移除</button></div>`;
}
function cartChangeLine(id,change){
 const lines=cartLineItems().map(line=>({...line})),line=lines.find(item=>item.id===id);if(!line)return false;
 if(change>0&&state.qty>=24)return false;
 line.quantity=change==='remove'?0:Math.max(0,line.quantity+change);state.cartItems=lines.filter(item=>item.quantity>0);state.qty=state.cartItems.reduce((sum,item)=>sum+item.quantity,0);
 if(!state.qty){state.ship=false;state.coupon=null;state.selectedCouponWalletId=null;}return true;
}
function cartProductListHTML(result){return cartAllocatedLines(result).map(cartLineProductHTML).join('');}
checkout=function(isPos=false){
 if(!isPos&&state.ship&&!cartShippingState().canUse)state.ship=false;
 if(!isPos)normalizeCartCouponSelection();
 let html=cartPreviousCheckout(isPos);if(isPos)return html;
 const result=cartResult();
 html=html.replace('<div class="product-art" aria-label="商品示意">SC</div>','<img class="cart-product-image" src="./assets/images/modal-black.webp" alt="莫代尔混纺短袖T恤：修身款，黑色">').replace('StayCool 2.0 Tee','莫代尔混纺短袖T恤：修身款').replace('Black / M · 商品示意 · 演示价 $56.00','黑色 / S');
 const holder=document.createElement('div');holder.innerHTML=html;
 holder.querySelector('#shipping-input')?.closest('label')?.remove();
 const cartItems=holder.querySelector('.checkout-grid>div');
 cartItems.innerHTML=cartProductListHTML(result);
 holder.querySelector('.summary').outerHTML=cartSummaryHTML(result);
 return holder.innerHTML;
};
const CHECKOUT_US_STATES=[['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']];
function checkoutFields(){
 if(!state.checkoutForm){const names=state.joined?(state.name||'').split(' '):[];state.checkoutForm={email:state.email||'',country:'US',firstName:names[0]||'',lastName:names.slice(1).join(' '),street:'',apartment:'',city:'',region:'CA',postal:'',phone:'',emailOffers:false,textOffers:false,payment:'card',discountCode:''};}
 return state.checkoutForm;
}
function checkoutAddressReady(){const f=checkoutFields();return ['country','firstName','lastName','street','city','region','postal'].every(key=>String(f[key]||'').trim())&&(f.country!=='US'||/^\d{5}(?:-\d{4})?$/.test(f.postal.trim()));}
function checkoutSyncDelivery(){const f=checkoutFields();state.address=f.country==='US'&&CHECKOUT_US_STATES.some(([code])=>code===f.region)&&!['AK','HI'].includes(f.region)?'us':'other';if(state.ship&&!cartShippingState().canUse)state.ship=false;}
function checkoutFormProblem(){
 if(!state.qty)return '购物车为空，请先添加商品。';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkoutFields().email.trim()))return '请填写有效的联系邮箱。';
 if(!checkoutAddressReady())return '请填写完整的收货地址和有效邮政编码。';
 return orderError(orderPlan())||'';
}
function checkoutShippingPrice(){if(!checkoutAddressReady())return '填写地址后计算';if(state.address!=='us')return '按目的地计算';return state.qty>=3||state.first?'免费':'结账时计算';}
function checkoutInput(key,label,options={}){const f=checkoutFields();return `<label class="checkout-field ${options.wide?'checkout-field-wide':''}" for="checkout-${key}"><span>${label}</span><input id="checkout-${key}" data-checkout-field="${key}" type="${options.type||'text'}" value="${esc(f[key]||'')}" ${options.required?'required':''} ${options.autocomplete?`autocomplete="${options.autocomplete}"`:''} ${options.inputmode?`inputmode="${options.inputmode}"`:''}></label>`;}
function checkoutShippingSection(){
 const info=cartShippingState(),ready=checkoutAddressReady();
 return `<section class="checkout-shipping-panel" id="checkout-shipping-panel"><h2>Shipping method <span>配送方式</span></h2>${ready?`<div class="checkout-shipping-rate"><span><span class="checkout-selected-dot" aria-hidden="true"></span>标准配送${state.ship?' · 已使用配送升级':''}</span><strong>${checkoutShippingPrice()}</strong></div>`:'<div class="checkout-shipping-placeholder">Enter your shipping address to view available shipping methods.<br><span>填写收货地址后显示可用配送方式。</span></div>'}<div class="checkout-member-shipping"><div class="row between"><span class="pill">${state.joined?`${tier().name} 已识别`:'尚未加入会员'}</span><span class="small muted">可用积分 ${number(state.points)} 分</span></div>${cartShippingControls(info)}</div></section>`;
}
function checkoutProductDiscountHTML(result){
 const rows=cartDiscountItems(result);if(!rows.length)return '';
 const icon='<svg class="checkout-discount-tag-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h8l10 10-8 8L3 11V3Z"/><circle cx="7" cy="7" r="1"/></svg>';
 return `<div class="checkout-product-discount-labels" aria-label="商品折扣">${rows.map(row=>`<div class="checkout-tag-discount-row">${icon}<span>${esc(row.name)} <span class="checkout-tag-discount-amount num">（−${money(row.amount)}）</span></span></div>`).join('')}</div>`;
}
function checkoutSummaryProductHTML(item){
 const {line,result}=item,hasDiscount=result.chosen.total<result.subtotal;
 return `<div class="checkout-summary-product"><div class="checkout-summary-image"><img src="${esc(line.image)}" alt="${esc(line.name+'，'+line.color)}"><span>${line.quantity}</span></div><div class="checkout-product-description"><strong>${esc(line.englishName||line.name)}</strong><p>${esc(line.color)} / ${esc(line.size)}</p>${checkoutProductDiscountHTML(result)}</div><div class="checkout-product-price">${hasDiscount?`<del class="num" aria-label="商品原金额">${money(result.subtotal)}</del>`:''}<strong class="num" aria-label="${hasDiscount?'折后商品金额':'商品金额'}">${money(result.chosen.total)}</strong></div></div>`;
}
function checkoutOrderSummary(){
 const result=cartResult(),f=checkoutFields();
 return `<div class="checkout-order-summary" id="checkout-order-summary"><h2 class="sr-only">Order summary</h2>
 ${cartAllocatedLines(result).map(checkoutSummaryProductHTML).join('')}
 <div class="checkout-discount-code"><label class="checkout-field" for="checkout-discountCode"><span>Discount code or gift card</span><input id="checkout-discountCode" data-checkout-field="discountCode" value="${esc(f.discountCode)}"></label><button class="checkout-apply" data-action="checkout-apply-code" ${f.discountCode.trim()?'':'disabled'}>Apply</button></div>
 ${result.chosen.id==='coupon'?'<p class="checkout-coupon-preview">本期不做线上积分优惠券的核销，此处仅为效果展示</p>':''}
 <div class="checkout-cost-lines"><div class="checkout-summary-subtotal"><span>Subtotal · ${state.qty} 件</span><span class="num" aria-label="商品应付小计">${money(result.chosen.total)}</span></div><div><span>Shipping</span><span>${state.ship?'配送升级 · ':''}${checkoutShippingPrice()}</span></div><div><span>Taxes</span><span>付款前核算</span></div>
 <div class="checkout-total"><strong>Total</strong><span><small>USD</small> <strong class="num">${money(result.chosen.total)}</strong></span></div><div class="checkout-earned-points" aria-live="polite"><span>预计可得积分</span><strong class="num">${number(result.points)} 积分</strong></div><p class="checkout-earned-points-rule">${number(Math.floor(result.chosen.total))} × ${result.t.rate} = ${number(result.points)} 积分</p><p class="checkout-total-note">当前显示折后商品金额；税费及未确定运费将在付款前计算。</p></div></div>`;
}
function checkoutPage(){
 checkoutSyncDelivery();normalizeCartCouponSelection();
 const f=checkoutFields(),compact=device==='mobile'||window.innerWidth<=900,problem=checkoutFormProblem();
 const countryOptions=[['US','United States'],['CA','Canada'],['MX','Mexico'],['GB','United Kingdom'],['AU','Australia'],['OTHER','Other countries / regions']];
 const region=f.country==='US'?`<label class="checkout-field" for="checkout-region"><span>State</span><select id="checkout-region" data-checkout-field="region" required><option value="">Select a state</option>${CHECKOUT_US_STATES.map(([code,name])=>`<option value="${code}" ${f.region===code?'selected':''}>${name}</option>`).join('')}</select></label>`:checkoutInput('region','State / Province',{required:true,autocomplete:'address-level1'});
 return `<div class="checkout-page"><header class="checkout-header"><button class="checkout-brand" data-action="cart-back-collection" aria-label="返回官网">FIOBOC</button><button class="checkout-bag" data-action="checkout-back-cart" aria-label="返回购物车"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 7h12l1 14H5L6 7Z"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/></svg></button></header><div class="checkout-layout"><main class="checkout-main" id="checkout-main"><div class="checkout-express"><p>Express checkout</p><div class="checkout-express-buttons"><button class="checkout-shop" data-action="checkout-express" data-id="Shop Pay">shop</button><button class="checkout-paypal" data-action="checkout-express" data-id="PayPal">PayPal</button><button class="checkout-gpay" data-action="checkout-express" data-id="Google Pay"><span>G</span> Pay</button></div><div class="checkout-or"><span>OR</span></div></div><form id="fioboc-checkout-form" novalidate><section class="checkout-contact"><div class="checkout-section-heading"><h2>Contact</h2><button type="button" class="link" data-action="checkout-account">${state.joined?'Account':'Sign in'}</button></div>${checkoutInput('email','Email',{type:'email',required:true,autocomplete:'email'})}<label class="checkout-check"><input type="checkbox" data-checkout-field="emailOffers" ${f.emailOffers?'checked':''}><span>Email me with news and offers</span></label></section><section class="checkout-delivery"><div class="checkout-section-heading"><h2>Delivery</h2><button type="button" class="link checkout-example" data-action="checkout-example-address">使用示例地址</button></div><div class="checkout-fields"><label class="checkout-field checkout-field-wide" for="checkout-country"><span>Country/Region</span><select id="checkout-country" data-checkout-field="country">${countryOptions.map(([code,name])=>`<option value="${code}" ${f.country===code?'selected':''}>${name}</option>`).join('')}</select></label>${checkoutInput('firstName','First name',{required:true,autocomplete:'given-name'})}${checkoutInput('lastName','Last name',{required:true,autocomplete:'family-name'})}${checkoutInput('street','Address',{required:true,wide:true,autocomplete:'address-line1'})}${checkoutInput('apartment','Apartment, suite, etc. (optional)',{wide:true,autocomplete:'address-line2'})}<div class="checkout-address-row">${checkoutInput('city','City',{required:true,autocomplete:'address-level2'})}${region}${checkoutInput('postal','ZIP code',{required:true,autocomplete:'postal-code'})}</div>${checkoutInput('phone','Phone (optional)',{type:'tel',wide:true,autocomplete:'tel'})}</div><label class="checkout-check"><input type="checkbox" data-checkout-field="textOffers" ${f.textOffers?'checked':''}><span>Text me with news and offers</span></label></section>${checkoutShippingSection()}<section class="checkout-payment"><h2>Payment</h2><p class="checkout-payment-caption">选择付款方式</p><div class="checkout-payment-options"><label class="checkout-payment-choice"><input type="radio" name="checkout-payment-method" data-checkout-field="payment" value="card" ${f.payment==='card'?'checked':''}><strong>Credit card</strong><span class="checkout-card-brands">VISA &nbsp; Mastercard &nbsp; AMEX</span></label>${f.payment==='card'?'<div class="checkout-payment-fields"><label class="checkout-field checkout-field-wide"><span>Card number</span><input disabled placeholder="•••• •••• •••• ••••" aria-label="卡号展示"></label><label class="checkout-field"><span>Expiration date</span><input disabled placeholder="MM / YY" aria-label="有效期展示"></label><label class="checkout-field"><span>Security code</span><input disabled placeholder="•••" aria-label="安全码展示"></label><label class="checkout-field checkout-field-wide"><span>Name on card</span><input disabled placeholder="Name on card" aria-label="持卡人名称展示"></label></div>':''}<label class="checkout-payment-choice"><input type="radio" name="checkout-payment-method" data-checkout-field="payment" value="paypal" ${f.payment==='paypal'?'checked':''}><strong class="checkout-paypal-name">PayPal</strong></label></div><p class="checkout-billing-note">Billing address · Same as shipping address</p></section><div id="checkout-form-status" class="checkout-form-status" role="status">${esc(problem)}</div><button type="button" class="checkout-pay-button" id="checkout-pay-button" data-action="checkout-pay" ${problem?'disabled':''}>Pay now</button><p class="checkout-payment-demo">原型演示，不会产生真实订单或扣款。</p></form><footer class="checkout-footer"><button class="link" data-action="refund-policy">Refund policy</button><button class="link" data-action="checkout-policy" data-id="privacy">Privacy policy</button><button class="link" data-action="checkout-policy" data-id="terms">Terms of service</button></footer></main><aside class="checkout-sidebar" aria-label="Order summary"><button class="checkout-summary-toggle" data-action="checkout-summary-toggle" aria-expanded="${!!state.checkoutSummaryOpen}"><span>Order summary ${state.checkoutSummaryOpen?'⌃':'⌄'}</span><strong>${money(cartResult().chosen.total)}</strong></button><div id="checkout-summary-wrap" ${compact&&!state.checkoutSummaryOpen?'hidden':''}>${checkoutOrderSummary()}</div></aside></div></div>`;
}
function checkoutOpenPage(){role='storefront';page='checkout';cartView='checkout';cartOpen=false;render();document.getElementById('stage')?.scrollIntoView({block:'start'});}
function checkoutRefreshBlocks(){
 if(cartView!=='checkout')return;
 checkoutSyncDelivery();normalizeCartCouponSelection();
 const shipping=document.getElementById('checkout-shipping-panel');if(shipping)shipping.outerHTML=checkoutShippingSection();
 const summary=document.getElementById('checkout-order-summary');if(summary)summary.outerHTML=checkoutOrderSummary();
 const problem=checkoutFormProblem(),status=document.getElementById('checkout-form-status'),pay=document.getElementById('checkout-pay-button');if(status)status.textContent=problem;if(pay)pay.disabled=!!problem;
 const toggle=document.querySelector('.checkout-summary-toggle strong');if(toggle)toggle.textContent=money(cartResult().chosen.total);
}
function checkoutPay(){checkoutSyncDelivery();const problem=checkoutFormProblem();if(problem){checkoutRefreshBlocks();toast(problem);return false;}orderOpen();return true;}
function productDetailState(){
 if(!state.productDetail)state.productDetail={quantity:3,size:'S',variants:Array.from({length:12},()=>({size:'S'}))};
 return state.productDetail;
}
function productDetailResult(quantity=productDetailState().quantity){return {...calculate({spend:state.joined?state.spend:0,quantity,price:HOODIE_PRODUCT.price,promo:state.promo,first:state.first}),quantity};}
function productBundleHTML(quantity){
 const detail=productDetailState(),result=productDetailResult(quantity),selected=detail.quantity===quantity,discounts=cartDiscountItems(result);
 const label=result.chosen.id==='member'?(result.bundle?`会员基础折扣后，再享 ${round(result.bundle*100)}% 满件优惠`:'单件购买'):result.chosen.name;
 return `<section class="product-bundle ${selected?'selected':''}"><button class="product-bundle-heading" data-action="product-quantity" data-quantity="${quantity}" role="radio" aria-checked="${selected}" aria-controls="product-bundle-${quantity}"><span class="product-bundle-radio" aria-hidden="true"></span><span class="product-bundle-title">${quantity} 件<small>${label}${quantity>=3?' · 美国标准免邮':''}</small></span><span class="product-bundle-price">${result.chosen.total<result.subtotal?`<del>${money(result.subtotal)}</del>`:''}<strong class="num">${money(result.chosen.total)}</strong></span><span class="product-bundle-chevron" aria-hidden="true">${selected?'⌃':'⌄'}</span></button><div id="product-bundle-${quantity}" class="product-bundle-body" ${selected?'':'hidden'}><p>选择每件商品的尺码</p><div class="product-bundle-variants">${Array.from({length:quantity},(_,index)=>`<div class="product-bundle-variant"><span>#${index+1}</span><span class="product-variant-color">白色</span><label class="sr-only" for="product-size-${quantity}-${index}">第 ${index+1} 件尺码</label><select id="product-size-${quantity}-${index}" data-product-variant="${index}">${HOODIE_PRODUCT.sizes.map(size=>`<option ${detail.variants[index].size===size?'selected':''}>${size}</option>`).join('')}</select></div>`).join('')}</div>${discounts.length?`<div class="product-bundle-discounts">${checkoutProductDiscountHTML(result)}</div>`:''}</div></section>`;
}
function productDetailPage(){
 const detail=productDetailState(),result=productDetailResult(),unit=productDetailResult(1),canAdd=state.qty+detail.quantity<=24;
 return `<main class="product-detail-page" id="main-content"><nav class="product-breadcrumb" aria-label="商品导航"><button class="link" data-action="cart-back-collection">首页</button><span>›</span><span>长袖上衣</span><span>›</span><span>${HOODIE_PRODUCT.name}</span></nav><div class="product-detail-layout"><section class="product-gallery" aria-label="白色连帽衫商品图片">${HOODIE_PRODUCT.images.map((src,index)=>`<img src="${src}" alt="白色莫代尔混纺长袖连帽衫${['正面','背面','细节','近景'][index]}" ${index>1?'loading="lazy"':''}>`).join('')}</section><section class="product-purchase-panel"><p class="product-fabric-label">LENZING™ Modal</p><h1>${HOODIE_PRODUCT.name}</h1><p class="product-english-name">${HOODIE_PRODUCT.englishName}</p><div class="product-price-review"><div class="product-main-price"><strong class="num">${money(unit.chosen.total)}</strong>${unit.chosen.total<unit.subtotal?`<del>${money(unit.subtotal)}</del>`:''}</div><span class="product-review" aria-label="评分 5 分，25 条评论">★★★★★ <small>25 条评论</small></span></div><div class="product-member-status"><span>${state.joined?`${result.t.name} 会员基础折扣 · ${round(result.t.base*100)}%`:'加入会员，享等级折扣与消费积分'}</span>${state.joined?'<button class="link" data-action="product-member-rules">查看规则</button>':'<button class="link" data-action="product-join">加入会员</button>'}</div><div class="product-options"><div class="product-color-heading"><strong>主色调：</strong><span>白色</span></div><span class="product-white-swatch" aria-label="已选白色"></span><div class="product-size-heading"><strong>尺码：${detail.size}</strong><button class="link" data-action="product-size-guide">尺码指南</button></div><div class="product-sizes" aria-label="选择尺码">${HOODIE_PRODUCT.sizes.map(size=>`<button data-action="product-size" data-id="${size}" class="${detail.size===size?'selected':''}" aria-pressed="${detail.size===size}">${size}</button>`).join('')}</div></div><div class="product-bundle-section"><h2>买越多，省越多</h2><div class="product-bundles" role="radiogroup" aria-label="选择购买件数">${[1,3,6,12].map(productBundleHTML).join('')}</div></div><div class="product-payable" aria-live="polite"><span>所选商品应付小计 · ${detail.quantity} 件</span><strong class="num">${money(result.chosen.total)}</strong></div><button class="btn product-add-to-cart" data-action="product-add-cart" ${canAdd?'':'disabled'}>添加到购物车</button>${canAdd?'':'<p class="product-limit-message">当前购物车最多容纳 24 件，请先调整购物车数量。</p>'}<section class="product-points-banner" aria-live="polite"><div><span>${state.joined?'预计可得积分':'加入会员后预计可得积分'}</span><strong class="num">${number(result.points)} 积分</strong></div><p>${number(Math.floor(result.chosen.total))} × ${result.t.rate} = ${number(result.points)} 积分</p><small>按当前所选商品单独结算估算，最终金额与积分以结账页为准。<br>发货后 30 天可用；不含税费、运费与礼品卡金额。</small></section><div class="product-information"><details><summary>商品特点</summary><p>柔软轻盈的莫代尔混纺面料，四向弹力；长袖连帽剪裁，侧开叉下摆。</p></details><details><summary>面料与护理</summary><p>42% 莫代尔、49% 聚酯纤维、9% 氨纶。冷水轻柔机洗，与相近颜色衣物同洗；勿漂白。</p></details><details><summary>配送与退货</summary><p>美国本土现货订单购买 3 件及以上可享标准免邮；配送升级服务可在结账页兑换使用。具体配送与退货条件以官网政策为准。</p><button class="link" data-action="product-source">查看官网商品与政策</button></details></div></section></div></main>`;
}
function productDetailOpen(){role='storefront';page='checkout';cartView='product';cartOpen=false;render();document.getElementById('stage')?.scrollIntoView({block:'start'});}
function productAddToCart(){
 const detail=productDetailState();if(state.qty+detail.quantity>24){toast('请先调整购物车数量。');return false;}
 const lines=cartLineItems().map(line=>({...line}));
 for(const variant of detail.variants.slice(0,detail.quantity)){
  if(!HOODIE_PRODUCT.sizes.includes(variant.size))return false;
  const id='hoodie-white-'+variant.size.toLowerCase(),existing=lines.find(line=>line.id===id);
  if(existing)existing.quantity++;else lines.push({id,product:'hoodie',name:HOODIE_PRODUCT.name,englishName:HOODIE_PRODUCT.englishName,color:'白色',size:variant.size,price:HOODIE_PRODUCT.price,quantity:1,image:HOODIE_PRODUCT.images[0]});
 }
 state.cartItems=lines;state.qty=lines.reduce((sum,line)=>sum+line.quantity,0);normalizeCartCouponSelection();role='storefront';page='checkout';cartView='product';cartOpen=true;render();document.getElementById('stage')?.scrollIntoView({block:'start'});toast(`已添加 ${detail.quantity} 件${HOODIE_PRODUCT.name}。`);return true;
}
function cartCollection(){const products=[['modal-black','莫代尔混纺短袖T恤：修身款',56],['polo-white','Weekend Performance Essential Polo Tee',70],['crew-grey','Weekend Performance Crew Neck Tee',62],['hoodie-white','莫代尔混纺短袖连帽上衣',66]];return `<main class="cart-collection" id="main-content"><div class="collection-breadcrumb">家 &nbsp;›&nbsp; 基本款短袖上衣</div><h1>基本款短袖上衣</h1><div class="collection-toolbar"><div><button data-phase1="false" aria-disabled="true">筛选</button><button data-phase1="false" aria-disabled="true">精选 &nbsp;⌄</button></div><span>86 种产品</span></div><div class="collection-grid">${products.map((p,i)=>`<article><div class="collection-photo"><img src="./assets/images/${p[0]}.webp" alt="${esc(p[1])}">${i===1?'<span class="collection-new">新品上市</span>':''}<span class="collection-heart" aria-hidden="true">♡</span></div><div class="collection-product-title">${p[1]}</div><strong class="num">${money(p[2])}</strong></article>`).join('')}</div></main>`;}
function cartProgress(){const qty=state.qty,next=qty<3?3:qty<6?6:qty<12?12:null,percent=qty<3?5:qty<6?10:20;return `<section class="cart-progress"><strong>${next?`再加购 ${next-qty} 件商品可 <u>节省 ${percent}%</u>`:'已享 12 件满件优惠 · 节省 20%'}</strong><div class="cart-progress-track"><span style="width:${Math.min(100,qty/12*100)}%"></span>${[3,6,12].map(n=>`<i class="${qty>=n?'reached':''}" style="left:${n/12*100}%"></i>`).join('')}</div><div class="cart-progress-labels"><span>3 件 · 免运费</span><span>6 件</span><span>12 件</span></div></section>`;}
function cartDrawer(){
 const holder=document.createElement('div');holder.innerHTML=checkout();
 const firstColumn=holder.querySelector('.checkout-grid>div');
 const summary=holder.querySelector('.summary');
 const summaryButton=summary.querySelector('[data-action="checkout-open"]');
 summaryButton.outerHTML='<button class="btn cart-view-button" data-action="checkout-open">去结账</button><button class="link cart-fullpage-link" data-action="cart-view-page">查看购物车</button>';
 const productHTML=[...firstColumn.querySelectorAll('.product')].map(product=>product.outerHTML).join('');
 return `<div class="cart-overlay" data-action="cart-close" aria-hidden="true"></div><section class="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="cart-drawer-title"><header class="cart-drawer-heading"><h2 id="cart-drawer-title">您的购物车 <span>（${state.qty}）</span></h2><button class="cart-close" data-action="cart-close" aria-label="关闭购物车">×</button></header><div class="cart-drawer-scroll"><div class="cart-newcustomer"><span aria-hidden="true">♧</span>新客户享免费送货和保障。 <button class="link" data-phase1="false" aria-disabled="true">立即领取！</button></div>${state.qty?`${cartProgress()}<div class="cart-product-section">${productHTML}</div><section class="cart-recommendations"><div class="row between"><h3>您可能也喜欢</h3><span aria-hidden="true">‹ &nbsp; ›</span></div><div class="cart-recommendation-grid">${[['polo-white','Weekend Polo Tee',70],['hoodie-white','短袖连帽上衣',66]].map(p=>`<article><img src="./assets/images/${p[0]}.webp" alt="${p[1]}"><div><p>${p[1]}</p><strong class="num">${money(p[2])}</strong></div></article>`).join('')}</div></section>`:'<div class="cart-empty"><h3>您的购物车是空的</h3><p>继续寻找下一件舒适好衣。</p><button class="btn" data-action="cart-restore">继续购物</button></div>'}</div>${state.qty?`<footer class="cart-drawer-footer">${summary.outerHTML}</footer>`:''}</section>`;
}
nativeStorefrontShell=function(content){
 if(cartView==='checkout')return checkoutPage();
 let html=cartPreviousShell(cartView==='product'?productDetailPage():cartView==='page'&&state.qty?content:cartCollection());
 html=html.replace('FREE SHIPPING ON 3 ITEMS+ & EASY RETURNS.','购买 3 件以上商品即可享受免运费，并可轻松退货。');
 [['NEW ARRIVAL','新品上市'],['BEST SELLERS','畅销榜'],['FIT GUIDE','尺码指南'],['WOMEN','女性'],['MEN','男士'],['SALE','销售']].forEach(([a,b])=>html=html.replace(`>${a}</a>`,`>${b}</a>`));
 html=html.replace('<button data-action="store-cart" aria-label="Cart">',`<button class="cart-entry" data-action="store-cart" aria-label="购物车，${state.qty} 件商品" aria-expanded="${cartOpen}"><span class="cart-badge">${state.qty}</span>`);
 if(cartView==='collection'||cartView==='product')html=html.replace('<main class="store-main" id="main-content">',`<div class="${cartView==='product'?'store-product-wrap':'store-collection-wrap'}">`).replace('</main><footer class="store-footer">','</div><footer class="store-footer">');
 else html=html.replace('<main class="store-main" id="main-content">','<main class="store-main" id="main-content"><button class="link cart-back" data-action="cart-back-collection">← 继续购物</button>');
 return `<div class="cart-store-scene ${cartView==='product'?'product-store-scene':''}">${html}${cartOpen?cartDrawer():''}</div>`;
};
function updateCartHeight(){const scene=document.querySelector('.cart-store-scene');if(scene){const top=Math.max(0,document.getElementById('stage').getBoundingClientRect().top);scene.style.setProperty('--cart-height',`${Math.max(400,window.innerHeight-top)}px`);}}
render=function(){
 const oldScroll=document.querySelector('.cart-drawer-scroll')?.scrollTop||0,oldFooterScroll=document.querySelector('.cart-drawer-footer')?.scrollTop||0;
 const openSections=[...document.querySelectorAll('.cart-store-scene details[open]')].map(d=>d.querySelector('summary')?.textContent);
 const activeId=document.querySelector('.cart-store-scene')?.contains(document.activeElement)?document.activeElement.id:null;
 cartPreviousRender();updateCartHeight();
 document.getElementById('stage')?.classList.toggle('is-checkout',role==='storefront'&&cartView==='checkout');
 const cartTab=document.querySelector('.reviewnav [data-role="storefront"]'),checkoutTab=document.querySelector('.reviewnav [data-action="checkout-open"]'),productTab=document.querySelector('.reviewnav [data-action="product-open"]');if(cartTab){const active=role==='storefront'&&['collection','page'].includes(cartView);cartTab.classList.toggle('active',active);cartTab.setAttribute('aria-pressed',String(active));}if(checkoutTab){checkoutTab.classList.toggle('active',role==='storefront'&&cartView==='checkout');checkoutTab.setAttribute('aria-pressed',String(role==='storefront'&&cartView==='checkout'));}if(productTab){productTab.classList.toggle('active',role==='storefront'&&cartView==='product');productTab.setAttribute('aria-pressed',String(role==='storefront'&&cartView==='product'));}
 for(const d of document.querySelectorAll('.cart-store-scene details'))if(openSections.includes(d.querySelector('summary')?.textContent))d.open=true;
 const scroll=document.querySelector('.cart-drawer-scroll'),footerScroll=document.querySelector('.cart-drawer-footer');if(scroll)scroll.scrollTop=oldScroll;if(footerScroll)footerScroll.scrollTop=oldFooterScroll;
 if(activeId)document.getElementById(activeId)?.focus({preventScroll:true});
}
document.fonts.ready.then(updateCartHeight);
new ResizeObserver(updateCartHeight).observe(document.querySelector('.tools'));
document.addEventListener('click',event=>{
 const target=event.target.closest('[data-action],[data-role]');if(!target||target.dataset.phase1==='false'||target.disabled)return;
 const action=target.dataset.action;
 if(target.dataset.role==='storefront'){cartOpen=true;cartView='collection';return;}
 if(action==='store-cart'||action==='coupon-online'){cartOpen=true;if(cartView!=='product')cartView='collection';return;}
 if(!['cart-close','cart-view-page','cart-back-collection','cart-note-toggle','cart-remove','cart-restore','qty-down','cart-line-down','cart-line-up','cart-line-remove'].includes(action))return;
 if(action==='qty-down'&&state.qty>1)return;
 event.preventDefault();event.stopImmediatePropagation();
 if(action==='cart-close'){cartOpen=false;render();document.querySelector('.cart-entry')?.focus();}
 else if(action==='cart-view-page'){cartOpen=false;cartView='page';render();document.getElementById('main-content')?.scrollIntoView({block:'start'});}
 else if(action==='cart-back-collection'){cartView='collection';cartOpen=false;render();}
 else if(action==='cart-note-toggle'){cartNoteOpen=!cartNoteOpen;render();document.getElementById('cart-note')?.focus();}
 else if(action==='cart-remove'||action==='qty-down'){state.qty=0;state.cartItems=[];state.ship=false;state.coupon=null;render();}
 else if(action==='cart-restore'){state.qty=1;state.cartItems=null;cartView='collection';cartOpen=false;render();}
 else if(action.startsWith('cart-line-')){cartChangeLine(target.dataset.id,action==='cart-line-remove'?'remove':action==='cart-line-up'?1:-1);render();}
},true);
document.addEventListener('input',event=>{if(event.target.id==='cart-note')cartNote=event.target.value;else if(event.target.id==='promo-input'){state.promo=Math.min(80,Math.max(0,Number(event.target.value)||0));render();}});
document.addEventListener('click',event=>{
 const target=event.target.closest('[data-action]');if(!target||target.disabled)return;
 const action=target.dataset.action;
 if(!['cart-shipping-redeem','cart-shipping-redeem-confirm','cart-shipping-join'].includes(action))return;
 event.preventDefault();event.stopImmediatePropagation();
 if(action==='cart-shipping-redeem')cartShippingRedeemOpen();
 else if(action==='cart-shipping-redeem-confirm')cartShippingRedeemConfirm();
 else{closeModal();role='customer';page='join';render();}
},true);
document.addEventListener('change',event=>{
 if(event.target.id!=='coupon-select')return;
 event.preventDefault();event.stopImmediatePropagation();
 const id=event.target.value,model=cartCouponModel(),row=model.rows.find(r=>r.reward.id===id);
 state.cartCouponNotice=null;
 if(!id){state.coupon=null;state.selectedCouponWalletId=null;}
 else if(row?.eligible){state.coupon=id;state.selectedCouponWalletId=row.wallet?.id||null;}
 else{state.coupon=null;state.selectedCouponWalletId=null;state.cartCouponNotice={context:model.context,text:`该积分券不可使用：${row?.reasons.join('；')||'未找到有效优惠券'}。当前未使用积分券，未扣兑换积分。`};}
 render();
},true);
document.addEventListener('keydown',event=>{
 if(role!=='storefront'||!cartOpen||document.querySelector('.modal'))return;
 if(event.key==='Escape'){cartOpen=false;render();document.querySelector('.cart-entry')?.focus();}
 if(event.key==='Tab'){const items=[...document.querySelectorAll('.cart-drawer button:not([disabled]):not([aria-disabled="true"]),.cart-drawer input:not([disabled]),.cart-drawer select,.cart-drawer textarea')];const first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&(!document.querySelector('.cart-drawer')?.contains(document.activeElement)||document.activeElement===last)){event.preventDefault();first?.focus();}}
});
document.addEventListener('click',event=>{
 const target=event.target.closest('[data-action]');if(!target||target.disabled)return;
 const action=target.dataset.action;
 if(!['checkout-open','checkout-back-cart','checkout-example-address','checkout-account','checkout-pay','checkout-summary-toggle','checkout-express','checkout-apply-code','checkout-policy'].includes(action))return;
 event.preventDefault();event.stopImmediatePropagation();
 if(action==='checkout-open')checkoutOpenPage();
 else if(action==='checkout-back-cart'){role='storefront';page='checkout';cartView='page';cartOpen=false;render();}
 else if(action==='checkout-example-address'){Object.assign(checkoutFields(),{country:'US',firstName:checkoutFields().firstName||'Demo',lastName:checkoutFields().lastName||'Member',street:'123 Demo Street',city:'Los Angeles',region:'CA',postal:'90012',email:checkoutFields().email||'member@example.com'});checkoutSyncDelivery();render();toast('已填入虚构示例地址。');}
 else if(action==='checkout-account'){role='customer';page=state.joined?'overview':'join';render();}
 else if(action==='checkout-pay')checkoutPay();
 else if(action==='checkout-summary-toggle'){state.checkoutSummaryOpen=!state.checkoutSummaryOpen;const wrap=document.getElementById('checkout-summary-wrap');if(wrap)wrap.hidden=!state.checkoutSummaryOpen;target.setAttribute('aria-expanded',String(state.checkoutSummaryOpen));target.querySelector('span').textContent='Order summary '+(state.checkoutSummaryOpen?'⌃':'⌄');}
 else if(action==='checkout-express')modal(target.dataset.id,`<p>${esc(target.dataset.id)} 快捷支付入口效果展示。当前原型不会跳转支付平台或产生真实扣款。</p>`,[{text:'返回结账',action:'close'}]);
 else if(action==='checkout-apply-code')toast('该优惠码或礼品卡不可用，请检查后重试。');
 else if(action==='checkout-policy')modal(target.dataset.id==='privacy'?'Privacy policy':'Terms of service',`<p>可查看 Fioboc 官网的${target.dataset.id==='privacy'?'隐私政策':'服务条款'}。</p><a class="link" href="https://www.fioboc.com/policies/${target.dataset.id==='privacy'?'privacy-policy':'terms-of-service'}" target="_blank" rel="noopener">查看完整内容</a>`,[{text:'返回结账',action:'close'}]);
},true);
document.addEventListener('input',event=>{
 const key=event.target.dataset.checkoutField;if(!key)return;
 checkoutFields()[key]=event.target.type==='checkbox'?event.target.checked:event.target.value;
 if(key==='discountCode'){const button=document.querySelector('[data-action="checkout-apply-code"]');if(button)button.disabled=!event.target.value.trim();}
});
document.addEventListener('change',event=>{
 const key=event.target.dataset.checkoutField;if(!key)return;
 event.stopImmediatePropagation();checkoutFields()[key]=event.target.type==='checkbox'?event.target.checked:event.target.value;
 if(key==='country'){checkoutFields().region=event.target.value==='US'?'CA':'';checkoutSyncDelivery();render();}
 else if(key==='payment')render();
 else checkoutRefreshBlocks();
},true);
document.addEventListener('submit',event=>{if(event.target.id==='fioboc-checkout-form'){event.preventDefault();event.stopImmediatePropagation();checkoutPay();}},true);
document.addEventListener('click',event=>{
 const target=event.target.closest('[data-action]');if(!target||target.disabled)return;
 const action=target.dataset.action;
 if(!['product-open','product-quantity','product-size','product-add-cart','product-join','product-member-rules','product-size-guide','product-source'].includes(action))return;
 event.preventDefault();event.stopImmediatePropagation();
 if(action==='product-open')productDetailOpen();
 else if(action==='product-quantity'){const quantity=Number(target.dataset.quantity);if([1,3,6,12].includes(quantity)){productDetailState().quantity=quantity;render();}}
 else if(action==='product-size'){const size=target.dataset.id;if(HOODIE_PRODUCT.sizes.includes(size)){const detail=productDetailState();detail.size=size;detail.variants.forEach(variant=>variant.size=size);render();}}
 else if(action==='product-add-cart')productAddToCart();
 else if(action==='product-join'){role='customer';page='join';render();}
 else if(action==='product-member-rules')modal('会员折扣与积分规则',`<p>当前 ${tier().name}，会员基础折扣 ${round(tier().base*100)}%，每消费 $1 获 ${tier().rate} 积分。</p><div class="detail">先计算会员基础折扣，再按购买件数享满件优惠：3 件 5%、6 件 10%、12 件 20%。普通优惠码、首单优惠与会员方案比价，采用更优惠的方案。<br>预计可得积分 = 商品应付小计向下取整 × 消费前会员等级积分基数。</div>`,[{text:'返回商品',action:'close'}]);
 else if(action==='product-source')modal('官网商品与政策',`<p>查看该商品的完整介绍、配送与退货政策。</p><a class="link" href="${HOODIE_PRODUCT.source}" target="_blank" rel="noopener">打开官网商品页</a>`,[{text:'返回商品',action:'close'}]);
 else if(action==='product-size-guide')modal('长袖连帽衫尺码指南','<p>尺寸单位：厘米。面料具有弹性，实物尺寸可能存在约 2% 偏差。</p><div class="tablewrap"><table><thead><tr><th>尺码</th><th>衣长</th><th>胸围</th><th>袖长</th></tr></thead><tbody>'+[['S',66.5,101,61],['M',68,106,62],['L',69.5,111,63],['XL',71,116,64],['2XL',73,124,65.5],['3XL',75,132,67]].map(row=>'<tr>'+row.map(value=>'<td>'+value+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>',[{text:'返回商品',action:'close'}]);
},true);
document.addEventListener('change',event=>{
 const index=event.target.dataset.productVariant;if(index===undefined)return;
 event.stopImmediatePropagation();const detail=productDetailState(),variant=detail.variants[Number(index)];if(variant&&HOODIE_PRODUCT.sizes.includes(event.target.value))variant.size=event.target.value;
},true);
document.addEventListener('keydown',event=>{
 const target=event.target.closest('[data-action="product-quantity"]');if(!target||!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(event.key))return;
 event.preventDefault();const quantities=[1,3,6,12],current=quantities.indexOf(Number(target.dataset.quantity)),next=(current+(['ArrowDown','ArrowRight'].includes(event.key)?1:3))%4;
 productDetailState().quantity=quantities[next];render();document.querySelector(`[data-action="product-quantity"][data-quantity="${quantities[next]}"]`)?.focus();
},true);
window.addEventListener('resize',()=>{if(role==='storefront')render();});
if(location.hash==='#checkout'){role='storefront';page='checkout';}

const requestedScenario=(location.search||'').match(/(?:\?|&)scenario=([a-z0-9]+)/);if(requestedScenario&&['vip2','member','vip1','vip3','new','low','downgrade','expiry','sync','storecoupon','rolling'].includes(requestedScenario[1]))scenario=requestedScenario[1];init(scenario);document.getElementById('scenario').value=scenario;if(NAMES[location.hash.slice(1)])page=location.hash.slice(1);render();
