const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;
const load = src => Object.assign(new Image(), {src});
const shop = load("art/pixel-shop.png"), forest = load("art/pixel-forest.png"), actors = load("art/pixel-actors.png");
const props = load("art/pixel-props.png");
const village = load("art/pixel-village.png");
const marsh = load("art/pixel-marsh.png");
const customers = load("art/pixel-customers.png");
const frontCustomers = load("art/pixel-customers-front.png");
const cropArt = load("art/pixel-crops.png");
const goodsArt = load("art/pixel-goods.png");
const uiIcons = load("art/pixel-ui-icons.png");
const woodSign = load("art/pixel-wood-sign.png");
const parchment = load("art/pixel-parchment.png");
const brass = load("art/pixel-brass.png");
const journalBg = load("art/pixel-journal-bg.png");
const navIcons = load("art/pixel-nav-icons.png");
const legacyKey="ghost-town-pixel-v1",migrationKey="ghost-town-legacy-migration-v1",activeKey="ghost-town-active-slot";
const slotKey=id=>"ghost-town-pixel-slot-"+id;
let activeSlot=0;
function defaultState(){
  const now=Date.now();
  return {
    time:0,gold:12,herbs:4,grain:3,tonic:1,bread:0,crystal:0,brew:1,bake:1,sale:true,
    order:0,routes:0,ward:0,bed:[0,8,16],seeds:[0,1,0],elixir:0,kitchen:false,
    garden:false,saved:now,startedAt:now,lastPlayed:now,playSeconds:0,battle:null
  };
}
const state=defaultState();
const legacy=localStorage.getItem(legacyKey);
if(legacy&&!localStorage.getItem(migrationKey)){
  if(!localStorage.getItem(slotKey(1)))try{
    const migrated=JSON.parse(legacy);migrated.migrated=true;migrated.startedAt=null;
    const serialized=JSON.stringify(migrated);
    localStorage.setItem(slotKey(1),serialized);
    if(localStorage.getItem(slotKey(1))===serialized){
      localStorage.setItem(migrationKey,"copied");
      localStorage.removeItem(legacyKey);
    }
  }catch{}
  else try{localStorage.setItem(migrationKey,"slot-1-occupied");}catch{}
}
function save() {
  if(!activeSlot||scene==="menu")return;
  state.saved = Date.now();
  state.lastPlayed=state.saved;
  try{localStorage.setItem(slotKey(activeSlot),JSON.stringify(state));}catch{}
}
const orders = [
  ["Lamplighter", "bread", 2, 16], ["Ferryman", "tonic", 3, 24],
  ["Widow Hazel", "herbs", 5, 28], ["The Silent Choir", "elixir", 2, 37],
  ["Clockmaker", "crystal", 1, 40], ["Harvest Supper", "bread", 6, 55]
];
const routes = [
  ["Moss Gate", 12, 2, 10], ["Bellwood", 19, 3, 20], ["Hollow Bell", 26, 4, 40]
];
const crops = ["Moonflower", "Rye", "Ghost Mint", "Emberroot", "Starcap", "Silverberry"];
const cropStock = ["herbs", "grain", "mint", "root", "cap", "berry"];
const kitchenBook = [
  ["Rye Loaf","grain","bread",4], ["Ember Stew","root","stew",8],
  ["Silverberry Tart","berry","tart",10], ["Starcap Pie","cap","pie",12]
];
const potionBook = [
  ["Moonflower Tonic","herbs","tonic",6], ["Nightbloom Elixir","herbs","elixir",11],
  ["Mint Draught","mint","draught",8], ["Ember Remedy","root","remedy",9],
  ["Starcap Philter","cap","philter",13]
];
const ingredients = {
  bread:{grain:2},stew:{root:2,grain:1},tart:{berry:2,grain:1},pie:{cap:2,grain:1},
  tonic:{herbs:2},elixir:{herbs:2,berry:1},draught:{mint:2,herbs:1},
  remedy:{root:2,mint:1},philter:{cap:2,berry:1}
};
const ingredientNames={herbs:"moonflower",grain:"rye",mint:"ghost mint",root:"emberroot",cap:"starcap",berry:"silverberry"};
const bondPerks=[
  "Lantern Rush","Swift Ferry","Widow's Seeds","Choir's Echo","Clockwork Hands","Feast Prices",
  "Herbal Wisdom","Grave Ward","River's Gift","Archive Bounty","Miller's Share","Captain's Guard"
];
function canCraft(item){return Object.entries(ingredients[item]).every(([stock,count])=>state[stock]>=count);}
function consumeRecipe(item){for(const [stock,count] of Object.entries(ingredients[item]))state[stock]-=count;}
function formula(item){return Object.entries(ingredients[item]).map(([stock,count])=>count+" "+ingredientNames[stock]).join(" + ");}
function perk(id){return (state.bonds[id]||0)>=2;}
for (const item of [...cropStock,...kitchenBook.map(r=>r[2]),...potionBook.map(r=>r[2])]) state[item] ??= 0;
state.kitchenRecipe ??= 0;
state.potionRecipe ??= 0;
state.renown ??= 0;
state.day ??= 1;
state.capacity ??= 12;
state.till ??= 0;
state.greenhouse ??= 0;
state.foraged ??= 0;
state.harvests ??= 0;
state.marshNodes ??= [0,0,0,0];
state.bonds ??= Array(12).fill(0);
state.commissionDay ??= -1;
orders.push(
  ["Herbalist","draught",2,34],["Grave Digger","stew",3,42],
  ["River Child","tart",3,48],["Moth Archivist","philter",2,56],
  ["Miller","pie",3,51],["Watch Captain","remedy",3,49]
);
function normalizeState(){
  for(const item of [...cropStock,...kitchenBook.map(r=>r[2]),...potionBook.map(r=>r[2])])state[item]??=0;
  state.kitchenRecipe??=0;state.potionRecipe??=0;state.renown??=0;state.day??=1;
  state.capacity??=12;state.till??=0;state.greenhouse??=0;state.foraged??=0;
  state.harvests??=0;state.marshNodes??=[0,0,0,0];state.bonds??=Array(12).fill(0);
  state.commissionDay??=-1;state.playSeconds??=0;state.lastPlayed??=state.saved||Date.now();
}
normalizeState();
function applySave(data){
  for(const field of Object.keys(state))delete state[field];
  Object.assign(state,defaultState(),data||{});normalizeState();
  clock=state.saved||Date.now();work.clear();activeJob=null;task=null;
}
function openSlot(id){
  const raw=localStorage.getItem(slotKey(id));
  deleteArmed=0;deleteArmUntil=0;
  activeSlot=id;localStorage.setItem(activeKey,String(id));
  if(raw){try{applySave(JSON.parse(raw));}catch{applySave(null);}}
  else applySave(null);
  scene="shop";advance(false);save();tell(raw?"Welcome back":"A new story begins");
}
function slotData(id){
  try{return JSON.parse(localStorage.getItem(slotKey(id)));}catch{return null;}
}
function eraseSlot(id){
  localStorage.removeItem(slotKey(id));
  if(activeSlot===id)activeSlot=0;
  if(Number(localStorage.getItem(activeKey))===id)localStorage.removeItem(activeKey);
}
function dateLabel(value){return value?new Date(value).toLocaleString("en-CA",{year:"numeric",month:"short",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}):"Unavailable";}
function playLabel(seconds){return Math.floor(seconds/3600)+"h "+Math.floor(seconds%3600/60)+"m";}
function currentRequest() {
  if(state.order < orders.length) return [...orders[state.order],state.order,false];
  const id=(state.day+state.renown)%orders.length;
  const catalog=[...kitchenBook,...potionBook];
  const recipe=catalog[(state.day*3+state.renown)%catalog.length];
  return [orders[id][0],recipe[2],2+state.day%3,18+recipe[3]*3,id,true];
}
function deliverRequest() {
  const [name,item,count,gold,id,daily]=currentRequest();
  if(daily && state.commissionDay===state.day) {tell("Today's town commission is complete");return false;}
  if(state[item]<count) {tell(name+" needs "+count+" "+item+" · you have "+state[item]);return false;}
  state[item]-=count;state.gold+=gold+(perk(9)?8:0);state.renown++;
  const oldBond=state.bonds[id]||0;state.bonds[id]=oldBond+1;
  if(daily) state.commissionDay=state.day; else state.order++;
  tell(state.bonds[id]===2?name+" shared "+bondPerks[id]:name+" · request complete · bond "+state.bonds[id]);
  return true;
}
let scene="menu",selected=0,pack=false,strong=false,note="",until=0,deleteArmed=0,deleteArmUntil=0,dialogue=null;
let pointer = null, task = null;
let noticeHistory = [];
const work = new Map();
let activeJob = null;
const wizard = {x: 738, aim: 738, gait: 0, facing: 1};
const guest = {x: 1022, aim: 1022, gait: 0, facing: -1};
const cat = {x: 270, aim: 270, gait: 0, facing: 1};
const marshWizard = {x: 155, aim: 155, gait: 0, facing: 1};
const tell = message => { note = message; until = performance.now() + 4500; noticeHistory.unshift(message); noticeHistory.length = Math.min(noticeHistory.length, 4); };
function queueWork(name, x, run, immediate) {
  if (immediate || scene !== "shop") run();
  else if (activeJob?.name !== name && !work.has(name)) work.set(name, {name, x, run});
}
function tick(immediate=false,trackPlay=true) {
  const n = ++state.time;
  if(trackPlay&&scene!=="menu")state.playSeconds++;
  state.day = 1 + Math.floor(n / 180);
  state.marshNodes = state.marshNodes.map(cooldown => Math.max(0, cooldown - 1));
  state.bed.forEach((age, i) => {
    const duration = Math.max(8,24-(state.garden?6:0)-state.greenhouse*3-(perk(2)?3:0));
    if (age + 1 < duration) { state.bed[i]++; return; }
    state.bed[i] = 0;
    state.harvests++;
    state[cropStock[state.seeds[i]]]++;
  });
  const craftPeriod=perk(4)?5:7;
  if (state.brew && n % craftPeriod === 0) {
    queueWork("brew", 535, () => {
      const [,,item] = potionBook[state.potionRecipe];
      if (!state.brew || !canCraft(item) || state[item] >= state.capacity) return;
      consumeRecipe(item);
      state[item]++;
    }, immediate);
  }
  if (state.bake && n % (state.kitchen ? 5 : 8) === 0) {
    queueWork("bake", 725, () => {
      const [,,item] = kitchenBook[state.kitchenRecipe];
      if (state.bake && canCraft(item) && state[item] < state.capacity) { consumeRecipe(item); state[item]++; }
    }, immediate);
  }
  if (state.sale && n % (perk(0)?10:13) === 0) {
    queueWork("sale", 912, () => {
      if (!state.sale) return;
      const catalog = [...kitchenBook,...potionBook];
      const offset = Math.floor(n/13) % catalog.length;
      const goods = [...catalog.slice(offset), ...catalog.slice(0,offset)];
      const sale = goods.find(good => state[good[2]]);
      if (sale) {
        state[sale[2]]--;
        const group=kitchenBook.includes(sale)?5:6;
        state.gold+=sale[3]+state.till+(perk(group)?3:0);
      }
    }, immediate);
  }
  const b = state.battle;
  if (!b || n % 3 !== 0) return;
  b.round++;
  const blocked = b.route === 2 && b.round % 3 === 1 && !b.strong;
  b.enemy -= blocked ? 1 : 3 + state.ward + (b.strong ? 2 : 0) + (perk(7)?1:0);
  if (b.enemy <= 0) {
    state.gold += routes[b.route][3]; state.crystal+=perk(3)?2:1;
    state.routes = Math.max(state.routes, b.route + 1); state.battle = null;
    tell("Familiar returned with a forest crystal");
    return;
  }
  b.hp -= routes[b.route][2] + (b.route === 1 && b.round % 2 === 0 ? 2 : 0);
  if (b.hp <= 0) { state.battle = null; tell("Familiar retreated"); }
}
const before = state.gold;
let clock = state.saved;
function advance(trackPlay=!document.hidden) {
  if(scene==="menu")return;
  const seconds = Math.floor((Date.now() - clock) / 1000);
  if (seconds <= 0) return;
  clock += seconds * 1000;
  for(let i=0;i<Math.min(seconds,28800);i++)tick(seconds>1||document.hidden,trackPlay&&!document.hidden);
}
advance();
if (state.gold > before) tell("While you were away · +" + (state.gold - before) + " coins");
save();
setInterval(() => { if(scene!=="menu"){advance();save();} }, 5000);
addEventListener("pagehide", () => { if(scene!=="menu"){advance();save();} });
addEventListener("visibilitychange",()=>{
  if(scene==="menu")return;
  if(document.hidden){advance(true);save();}
  else {advance(false);save();}
});

function travel(x, run) {
  if (activeJob) { work.set(activeJob.name, activeJob); activeJob = null; }
  wizard.aim = x;
  task = run;
}
const shopControls = [
  ...[30, 158, 277].map((x,i) => [x, 510, 110, 105, () => crops[state.seeds[i]] + " · change crop", () => {
    state.seeds[i] = (state.seeds[i]+1)%crops.length; state.bed[i] = 0;
    tell(crops[state.seeds[i]] + " sown");
  }]),
  [493,350,119,186,()=>state.brew?potionBook[state.potionRecipe][0]+" · "+formula(potionBook[state.potionRecipe][2]):"Brewing paused",()=>travel(535,()=>{
    if (!state.brew) { state.brew=1; state.potionRecipe=0; }
    else if (state.potionRecipe+1 < (state.kitchen ? potionBook.length : 1)) state.potionRecipe++;
    else state.brew=0;
    tell(state.brew ? potionBook[state.potionRecipe][0] : "Brewing paused");
  })],
  [648,350,143,186,()=>state.bake?kitchenBook[state.kitchenRecipe][0]+" · "+formula(kitchenBook[state.kitchenRecipe][2]):"Kitchen paused",()=>travel(725,()=>{
    if (!state.bake) { state.bake=1; state.kitchenRecipe=0; }
    else if (state.kitchen && state.kitchenRecipe+1 < kitchenBook.length) state.kitchenRecipe++;
    else state.bake=0;
    tell(state.bake ? kitchenBook[state.kitchenRecipe][0] : "Kitchen paused");
  })],
  [828, 350, 165, 186, () => state.sale ? "Close shop to reserve stock" : "Open shop", () => travel(912, () => { state.sale = !state.sale; tell(state.sale ? "Shop open" : "Stock reserved"); })],
  [552, 240, 130, 68, () => "Town orders", () => {
    deliverRequest();
  }],
  [705, 240, 132, 68, () => "Workshop", () => {
    if (state.kitchen) return tell("Workshop fitted · click tonic shelf to change recipes");
    if (state.gold < 35) return tell("Workshop · 35 coins");
    state.gold -= 35; state.kitchen = true; tell("Faster oven and Nightbloom Elixir unlocked");
  }],
  [854, 240, 140, 68, () => "Séance ward", () => {
    if (state.ward) return tell("Familiar warded");
    if (!state.crystal) return tell("Séance needs one forest crystal");
    state.crystal--; state.ward = 1; tell("Familiar attack increased");
  }],
  [110, 455, 230, 48, () => "Garden upgrade", () => {
    if (state.garden) return tell("Enriched beds · faster harvests");
    if (state.gold < 28) return tell("Enrich beds · 28 coins");
    state.gold -= 28; state.garden = true; tell("Garden soil enriched");
  }],
  [1080, 350, 190, 264, () => "Forest trail", () => travel(1030, () => {
    scene = "forest"; selected = state.battle?.route ?? Math.min(state.routes, 2); cat.x = 240; cat.aim = 240; pointer = null;
  })]
];
const forestControls = [
  ...routes.map(([name],i) => [54, 204+i*63, 270, 54, () => name, () => { if (!state.battle && i <= state.routes) selected = i; }]),
  [270, 574, 220, 78, () => "Choose potion", () => { if(!state.battle) strong = !strong; }],
  [500, 574, 250, 78, () => "Choose provisions", () => { if(!state.battle) pack = !pack; }],
  [790, 581, 220, 64, () => "Send familiar", () => {
    if (state.battle) return;
    const item = strong ? "elixir" : "tonic";
    if (!state[item]) return tell("The selected potion is out of stock");
    if (pack && state.bread < 2) return tell("Two loaves are needed");
    state[item]--; if (pack) state.bread -= 2;
    state.battle={route:selected,strong,round:0,hp:(pack?22:9)+(perk(11)?5:0),enemy:routes[selected][1]};
    tell("Familiar dispatched");
  }]
];
const villageControls = [
  [60,470,225,130,()=>currentRequest()[0],()=>{dialogue=currentRequest();}],
  [1070, 177, 180, 56, () => "Clockmaker upgrades", () => {
    const price = 35 + state.till*30;
    if(state.gold < price) return tell("Polished till · "+price+" coins");
    state.gold-=price; state.till++; tell("Every sale is now worth +"+state.till);
  }],
  [787, 177, 180, 56, () => "Miller upgrades", () => {
    const price = 30 + (state.capacity-12)*5;
    if(state.gold < price) return tell("Expanded shelves · "+price+" coins");
    state.gold-=price; state.capacity+=4; tell("Storage increased to "+state.capacity);
  }],
  [535, 177, 180, 56, ()=>"Herbalist greenhouse",()=>{
    const price=42+state.greenhouse*38;
    if(state.greenhouse>=3)return tell("Greenhouse fully restored");
    if(state.gold<price)return tell("Greenhouse tier "+(state.greenhouse+1)+" · "+price+" coins");
    state.gold-=price;state.greenhouse++;tell("All crops now grow faster");
  }]
];
const forageNodes = [
  [165,510,170,105,"mint","Ghost Mint"],[430,485,170,120,"root","Emberroot"],
  [770,500,170,105,"cap","Starcap"],[1050,465,180,145,"berry","Silverberry"]
];
const marshControls = forageNodes.map(([x,y,w,h,item,name],i)=>[
  x,y,w,h,()=>state.marshNodes[i] ? name+" · regrowing" : "Gather "+name,()=>{
    if(state.marshNodes[i]) return tell(name+" is regrowing");
    marshWizard.aim=x+w/2;
    task=()=>{const yieldCount=perk(8)?2:1;state[item]+=yieldCount;state.foraged+=yieldCount;state.marshNodes[i]=perk(1)?14:24;task=null;tell(name+" gathered · +"+yieldCount);save();};
  }
]);
function go(next) {
  if(next==="marsh"&&state.order<3)return tell("Earn 3 town bonds to open the marsh ferry");
  if(next==="forest"&&state.order<6)return tell("Earn 6 town bonds to open the forest trail");
  task=null;
  scene=next;
  pointer=null;
  if(next==="marsh"){marshWizard.x=155;marshWizard.aim=155;}
}
const navControls = [
  [820,12,74,72,()=>"Shop",()=>go("shop")],
  [900,12,74,72,()=>"Town",()=>go("village")],
  [980,12,74,72,()=>"Marsh",()=>go("marsh")],
  [1060,12,74,72,()=>"Forest",()=>go("forest")],
  [1140,12,74,72,()=>"Journal",()=>go("journal")]
];
const menuControls=[
  ...[1,2,3].map((id,i)=>[300+i*415,288,80,34,()=>"Erase slot "+id,()=>{
    if(!slotData(id))return tell("Slot "+id+" is empty");
    if(deleteArmed!==id||performance.now()>deleteArmUntil){deleteArmed=id;deleteArmUntil=performance.now()+4500;return tell("Click CONFIRM to erase slot "+id);}
    eraseSlot(id);deleteArmed=0;deleteArmUntil=0;tell("Slot "+id+" erased");
  }]),
  ...[1,2,3].map((id,i)=>[112+i*415,465,226,62,()=>slotData(id)?"Continue slot "+id:"New game in slot "+id,()=>openSlot(id)])
];
const menuButton=[[36,628,176,63,()=>"Save slots",()=>{save();scene="menu";pointer=null;}]];
const dialogueControls=[
  [650,478,210,62,()=>"Deliver the order",()=>{if(deliverRequest())dialogue=null;}],
  [875,478,130,62,()=>"Close dialogue",()=>{dialogue=null;}]
];
function controlsForScene() {
  if(dialogue)return dialogueControls;
  if(scene==="menu")return menuControls;
  if(scene==="shop") return [...shopControls,...navControls];
  if(scene==="forest") return [...forestControls,...navControls];
  if(scene==="village") return [...villageControls,...navControls];
  if(scene==="marsh") return [...marshControls,...navControls];
  if(scene==="journal")return [...navControls,...menuButton];
  return navControls;
}
function pick(event) {
  const b = canvas.getBoundingClientRect();
  const x = (event.clientX-b.left)*1280/b.width, y = (event.clientY-b.top)*720/b.height;
  return controlsForScene().find(([sx,sy,w,h]) => x>=sx && y>=sy && x<=sx+w && y<=sy+h);
}
canvas.onpointermove = event => { pointer = pick(event); canvas.style.cursor = pointer ? "pointer" : ""; };
canvas.onpointerleave = () => { pointer = null; };
canvas.onpointerdown = event => { const control = pick(event); if (control) { advance(); control[5](); save(); } };
addEventListener("keydown",event=>{if(event.key==="Escape"){if(dialogue){dialogue=null;pointer=null;return;}save();scene="menu";pointer=null;}});

function label(text, x,y,size=20, color="#fff0cc") {
  ctx.font = size + "px Georgia"; ctx.fillStyle = color;
  ctx.shadowColor = "#21142b"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
  ctx.fillText(text, x, y); ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
}
function cross(cx,cy,r,color) {
  ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=2.4; ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(cx-r,cy-r); ctx.lineTo(cx+r,cy+r);
  ctx.moveTo(cx+r,cy-r); ctx.lineTo(cx-r,cy+r);
  ctx.stroke(); ctx.restore();
}
function sprite(row, frame, x, floor, w, h, face=1) {
  if (!actors.naturalWidth) return;
  const rows = [0,.30,.51,.75,1], sw = actors.naturalWidth/4;
  const top = rows[row]*actors.naturalHeight, sh = (rows[row+1]-rows[row])*actors.naturalHeight;
  ctx.save(); ctx.translate(Math.round(x),Math.round(floor-h));
  ctx.scale(face,1);
  ctx.drawImage(actors, frame*sw,top,sw,sh,-w/2,0,w,h); ctx.restore();
}
function prop(id,x,floor,w,h,alpha=1) {
  if(!props.naturalWidth) return;
  const sw=props.naturalWidth/4, sh=props.naturalHeight/3;
  ctx.save();ctx.globalAlpha=alpha;
  ctx.drawImage(props,id%4*sw,Math.floor(id/4)*sh,sw,sh,x-w/2,floor-h,w,h);
  ctx.restore();
}
function customer(id,x,floor,w,h,face=1) {
  if(!customers.naturalWidth) return;
  const sw=customers.naturalWidth/4, sh=customers.naturalHeight/3;
  ctx.save();ctx.translate(Math.round(x),Math.round(floor-h));ctx.scale(face,1);
  ctx.drawImage(customers,id%4*sw,Math.floor(id/4)*sh,sw,sh,-w/2,0,w,h);ctx.restore();
}
function frontCustomer(id,x,floor,w,h) {
  if(!frontCustomers.naturalWidth)return;
  const sw=frontCustomers.naturalWidth/4,sh=frontCustomers.naturalHeight/3;
  ctx.drawImage(frontCustomers,id%4*sw,Math.floor(id/4)*sh,sw,sh,x-w/2,floor-h,w,h);
}
// The sheet is not a uniform grid: the art in each cell sits in its own box and the
// three grow stages are different heights. Slicing it as a 6x3 grid cut the tops off
// every mature plant. These boxes were measured from the transparent seams.
const cropBoxes = [
  [[0.0440, 0.1229, 0.1353, 0.2661], [0.2080, 0.1364, 0.2982, 0.2661], [0.3782, 0.1297, 0.4707, 0.2661], [0.5485, 0.1274, 0.6246, 0.2649], [0.7204, 0.1454, 0.7740, 0.2661], [0.8703, 0.1285, 0.9605, 0.2661]],
  [[0.0299, 0.3484, 0.1359, 0.5524], [0.1883, 0.3371, 0.3055, 0.5536], [0.3619, 0.3461, 0.4724, 0.5536], [0.5169, 0.3495, 0.6432, 0.5524], [0.6962, 0.3698, 0.7948, 0.5513], [0.8523, 0.3484, 0.9718, 0.5536]],
  [[0.0158, 0.6189, 0.1494, 0.9200], [0.1742, 0.6054, 0.3264, 0.9222], [0.3405, 0.6077, 0.4775, 0.9233], [0.4977, 0.6110, 0.6528, 0.9346], [0.6731, 0.6212, 0.8207, 0.9267], [0.8360, 0.6133, 0.9915, 0.9222]]
];
function cropSprite(crop,stage,x,floor,height) {
  if(!cropArt.naturalWidth) return;
  const [x0,y0,x1,y1]=cropBoxes[Math.min(2,stage)][crop];
  const W=cropArt.naturalWidth, H=cropArt.naturalHeight;
  const sw=(x1-x0)*W, sh=(y1-y0)*H, w=height*sw/sh;
  ctx.drawImage(cropArt,x0*W,y0*H,sw,sh,x-w/2,floor-height,w,height);
}
function goodsSprite(id,x,floor,w,h) {
  if(!goodsArt.naturalWidth) return;
  const sw=goodsArt.naturalWidth/5,sh=goodsArt.naturalHeight/2;
  ctx.drawImage(goodsArt,id%5*sw,Math.floor(id/5)*sh,sw,sh,x-w/2,floor-h,w,h);
}
function uiIcon(id,x,y,w,h,alpha=1) {
  if(!uiIcons.naturalWidth) return;
  const sw=uiIcons.naturalWidth/5,sh=uiIcons.naturalHeight/2;
  ctx.save();ctx.globalAlpha=alpha;
  ctx.drawImage(uiIcons,id%5*sw,Math.floor(id/5)*sh,sw,sh,x,y,w,h);ctx.restore();
}
function navIcon(id,x,y,size,locked=false) {
  if(!navIcons.naturalWidth)return;
  const sw=navIcons.naturalWidth/5;
  const sy=Math.max(0,(navIcons.naturalHeight-sw)/2);
  ctx.save();
  if(locked)ctx.filter="grayscale(1) brightness(.62)";
  ctx.drawImage(navIcons,id*sw,sy,sw,sw,x,y,size,size);
  ctx.restore();
}
function panel(image,x,y,w,h) {
  if(image.naturalWidth) ctx.drawImage(image,x,y,w,h);
}
function walk(actor, dt, speed) {
  const gap = actor.aim - actor.x;
  const step = Math.min(Math.abs(gap), speed*dt);
  actor.x += Math.sign(gap)*step;
  if (step) { actor.facing = Math.sign(gap); actor.gait += step; }
  return step ? Math.floor(actor.gait / 10)%4 : 1;
}
let last = 0;
function frame(ms) {
  advance();
  const dt = Math.min(.05,(ms-last)/1000); last=ms;
  const background = scene === "journal" ? journalBg : scene === "shop" || scene==="menu" ? shop :
    scene === "forest" ? forest : scene === "village" ? village : marsh;
  if (!background.naturalWidth) return requestAnimationFrame(frame);
  ctx.drawImage(background,0,0,1280,720);
  if(scene==="menu"){
    panel(woodSign,327,36,626,190);
    label("Ghost Town",485,157,49);
    for(let i=0;i<3;i++){
      const id=i+1,x=50+i*415,data=slotData(id);
      panel(parchment,x,238,350,315);
      const armed=deleteArmed===id&&ms<deleteArmUntil;
      if(data){ if(armed)label("CONFIRM",x+214,314,12,"#5b2a17"); else cross(x+278,302,6,"#5b2a17"); }
      if(data){
        label(data.migrated?"Migrated Save":"Save "+id,x+68,327,24,"#4a2819");
        label(data.migrated?"Started · unavailable":"Started · "+dateLabel(data.startedAt),x+68,367,17,"#4a2819");
        label("Last save · "+dateLabel(data.lastPlayed||data.saved),x+68,398,17,"#4a2819");
        label("Day "+(data.day||1)+" · "+playLabel(data.playSeconds||0),x+68,429,17,"#4a2819");
        panel(brass,x+62,465,226,62);label("Continue",x+132,503,18,"#4a2819");
      }else{
        label("Empty Slot "+id,x+91,365,25,"#4a2819");
        panel(brass,x+62,465,226,62);label("New Game",x+125,503,18,"#4a2819");
      }
    }
  } else if (scene === "shop") {
    if (!task && !activeJob && work.size) {
      activeJob = work.values().next().value;
      work.delete(activeJob.name);
      wizard.aim = activeJob.x;
    }
    const pose = walk(wizard,dt,108);
    if (task && wizard.x === wizard.aim) { const run=task; task=null; run(); save(); }
    const duration = Math.max(8,24-(state.garden?6:0)-state.greenhouse*3-(perk(2)?3:0));
    state.bed.forEach((age,i) => {
      const stage = Math.min(2, Math.floor(age/(duration/3)));
      cropSprite(state.seeds[i],stage,86+i*125,592,[40,78,112][stage]);
    });
    // One slot per recipe, standing on the two lower boards of the centre shelf unit
    // (top surfaces at y 373 and 417), with a count badge so a change in stock reads.
    const slots=[
      ...potionBook.map((r,i)=>[r[2],i,662+(i%5)*34,373]),
      ...kitchenBook.map((r,i)=>[r[2],5+i,662+(i%4)*34,417])
    ];
    slots.forEach(([item,id,x,y])=>{
      const n=state[item]||0;
      if(!n) return;
      goodsSprite(id,x,y,36,36);
      if(n>1) label("×"+n,x-9,y+14,12,"#f3d9ac");
    });
    prop(4,535,537,125,134,state.brew ? 1 : .65);
    prop(5,725,537,135,151,state.bake ? 1 : .65);
    prop(6,910,537,148,142,state.sale ? 1 : .78);
    const phase = state.time % 13;
    guest.aim = state.sale && (phase < 9 || work.has("sale") || activeJob?.name === "sale") ? 965 : 1090;
    const guestPose = walk(guest,dt,87);
    if (activeJob && wizard.x === activeJob.x && (activeJob.name !== "sale" || !state.sale || guest.x === 965)) {
      activeJob.run();
      activeJob = null;
      save();
    }
    if (guest.x < 1080) sprite(2,guestPose,guest.x,537,69,85,guest.facing);
    sprite(0,pose,wizard.x,537,85,109,wizard.facing);
    panel(woodSign,52,24,404,132);
    label("Ghost Town",151,112,36);
    panel(parchment,70,142,415,88);
    uiIcon(5,91,159,42,42);label(state.gold,137,189,20,"#4a2819");
    uiIcon(8,187,159,42,42);label(state.herbs,233,189,20,"#4a2819");
    uiIcon(7,282,159,42,42);label("Day "+state.day,328,189,20,"#4a2819");
    prop(11,603,266,46,42);
    prop(7,911,266,58,58);
  } else if(scene === "forest") {
    const b = state.battle;
    cat.aim = b ? (state.time % 3 === 2 ? 590 : 360) : 270;
    const pose = walk(cat,dt,195);
    sprite(1,pose,cat.x,575,118,80,cat.facing);
    panel(woodSign,28,18,430,138);
    label(state.routes===3?"Forest Expeditions":"The Forest",85,105,31);
    panel(parchment,38,164,304,250);
    label("Choose a trail",91,199,19,"#4a2819");
    routes.forEach(([name],i)=>{
      if(i===selected&&!state.battle)panel(brass,54,204+i*63,270,54);
      label((i>state.routes?"◇ ":i===selected?"◆ ":"· ")+name,83,239+i*63,18,i>state.routes?"#8a6a55":"#4a2819");
    });
    const route = b?.route ?? selected;
    panel(woodSign,718,145,420,135);
    label(["Twig Wraith","Mushroom Boar","Hollow Bell"][route],790,227,25);
    panel(parchment,785,267,286,66);
    label(b ? "Round "+b.round+"  ·  Reward "+routes[route][3] : "Threat "+routes[route][1]+"  ·  Reward "+routes[route][3],815,307,16,"#4a2819");
    prop(8+route,922,565,179,177);
    if(b) {
      label("Familiar · "+b.hp+" HP",Math.round(cat.x-52),462,18,"#eafff2");
      label("Enemy · "+b.enemy+" HP",838,374,18,"#ffe3ef");
    } else {
      panel(parchment,248,556,790,105);
      goodsSprite(strong?1:0,304,633,45,45);
      label(strong?"Elixir · "+state.elixir:"Tonic · "+state.tonic,335,611,17,"#4a2819");
      goodsSprite(5,535,633,45,45);
      label(pack?"2 loaves packed":"Travel light",566,611,17,"#4a2819");
      panel(brass,790,581,220,64);
      label("Send familiar",831,620,17,"#4a2819");
    }
  } else if(scene === "village") {
    const start=currentRequest()[4];
    const ids=[start,(start+1)%12,(start+2)%12,(start+3)%12,(start+4)%12,(start+5)%12];
    const positions=[175,370,565,760,955,1145];
    ids.forEach((id,i)=>customer(id,positions[i],576,118,151,i>3?-1:1));
    panel(woodSign,37,18,440,142);
    label("Moonbridge Market",91,105,31);
    uiIcon(6,75,112,35,35);label(state.renown,113,139,18);
    const [name,item,count,gold,id,daily]=currentRequest();
    panel(parchment,45,160,440,113);
    uiIcon(9,67,181,45,45);
    label(name+" · bond "+(state.bonds[id]||0),119,204,21,"#4a2819");
    label((daily?"Daily · ":"Wants ")+count+" "+item+" · "+gold+" coins",85,239,17,"#4a2819");
    panel(brass,535,177,180,56);label("Greenhouse "+state.greenhouse+"/3",553,211,14,"#4a2819");
    panel(brass,787,177,180,56);label("Shelves "+state.capacity,826,211,14,"#4a2819");
    panel(brass,1037,177,180,56);label("Till +"+state.till,1088,211,14,"#4a2819");
  } else if(scene === "marsh") {
    const pose=walk(marshWizard,dt,105);
    if(task && marshWizard.x===marshWizard.aim){const run=task;task=null;run();}
    sprite(0,pose,marshWizard.x,548,82,105,marshWizard.facing);
    panel(woodSign,35,18,430,140);
    label("Whispering Marsh",87,104,31);
    panel(parchment,55,150,390,72);
    label("Foraged "+state.foraged+" · regrows while away",91,193,17,"#4a2819");
    forageNodes.forEach(([x,y,w,h,item,name],i)=>{
      const id=[0,0,1,2][i];
      if(!state.marshNodes[i]) prop(id,x+w/2,y+h/2+40,54,54);
    });
  } else {
    const ink="#5b3022";
    label("The Wizard's Journal",258,107,31,ink);
    label("Crops",258,151,22,ink);
    crops.forEach((name,i)=>label("◆ "+name+"  "+state[cropStock[i]],270+(i%2)*230,190+Math.floor(i/2)*31,17,ink));
    label("Townsfolk "+Math.min(state.order,orders.length)+"/"+orders.length+" · Forest "+Math.min(state.routes,3)+"/3",270,315,19,ink);
    label("Renown "+state.renown+" · Harvests "+state.harvests+" · Foraged "+state.foraged,270,347,16,ink);
    label("Bond gifts",270,397,20,ink);
    const gifts=bondPerks.filter((_,i)=>perk(i));
    (gifts.length?gifts:["Complete repeat requests to earn gifts"]).slice(0,6).forEach((gift,i)=>label("◆ "+gift,282,430+i*29,16,ink));
    label("Kitchen",682,151,22,ink);
    kitchenBook.forEach((r,i)=>label("◆ "+r[0]+"  "+state[r[2]],694,190+i*31,17,ink));
    label("Alchemy",682,342,22,ink);
    potionBook.forEach((r,i)=>label("◆ "+r[0]+"  "+state[r[2]],694,381+i*30,17,ink));
    panel(brass,36,628,176,63);label("Save slots",76,666,16,"#4a2819");
  }
  if(dialogue){
    const [name,item,count,gold,id,daily]=dialogue;
    panel(parchment,248,116,784,454);
    frontCustomer(id,418,503,230,310);
    panel(woodSign,490,151,480,132);
    label(name,570,232,29);
    label(daily?"A town commission":"A personal request",558,329,18,"#4a2819");
    label("Bring "+count+" "+item,558,371,27,"#4a2819");
    label("Reward · "+gold+" coins",558,410,18,"#4a2819");
    label("In stock · "+(state[item]||0),558,445,16,"#4a2819");
    panel(brass,650,478,210,62);label("Deliver",716,516,17,"#4a2819");
    panel(brass,875,478,130,62);label("Later",916,516,17,"#4a2819");
  }
  if(scene!=="journal"&&scene!=="menu") navControls.forEach((control,i)=>{
    const locked=(i===2&&state.order<3)||(i===3&&state.order<6);
    navIcon(i,control[0]+8,control[1]+7,58,locked);
  });
  else if(scene==="journal")for(let i=0;i<5;i++)navIcon(i,828+i*80,19,58,(i===2&&state.order<3)||(i===3&&state.order<6));
  if(pointer && !navControls.includes(pointer) && ms>=until) {
    panel(parchment,430,630,420,72);
    const caption=pointer[4]();
    ctx.font="17px Georgia";
    label(caption,640-ctx.measureText(caption).width/2,674,17,"#4a2819");
  }
  if(ms<until) {
    const low=scene==="forest";
    panel(parchment,382,low?666:624,516,low?50:82);
    ctx.font=(low?17:18)+"px Georgia";
    label(note,640-ctx.measureText(note).width/2,low?699:674,low?17:18,"#4a2819");
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
