const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const atlas = new Image();
atlas.src = "felt-sprites.png";
const cottage = new Image();
cottage.src = "cottage.png";
const effects = new Image();
effects.src = "effects.png";
const forest = new Image();
forest.src = "forest.png";
const enemies = new Image();
enemies.src = "forest-enemies.png";
let scene = "shop", routeChoice = 0, useElixir = false;
const saveKey = "ghost-town-felt-v1";
const state = {
  age: 0, plots: [0, 8, 16], coins: 8, herbs: 3, potions: 1, bread: 0,
  crystals: 0, brew: true, bake: false, open: true, ward: 0, battle: null, saved: Date.now()
};
try { Object.assign(state, JSON.parse(localStorage.getItem(saveKey)) || {}); } catch {}
state.level ??= 0;
state.orders ??= 0;
state.trail ??= 0;
state.recipe ??= 0;
state.provision ??= false;
const recipes = [
  {name: "Moonleaf Tonic", herbs: 2, value: 5},
  {name: "Nightbloom Elixir", herbs: 3, value: 9}
];
state.elixirs ??= 0;
const contracts = [
  {name: "The Lantern Keeper", item: "bread", count: 3, pay: 16},
  {name: "The Hollow Choir", item: "potions", count: 4, pay: 29},
  {name: "The Midnight Table", item: "bread", count: 6, pay: 32},
  {name: "The Bellmaker", item: "elixirs", count: 3, pay: 42}
];
const trails = [
  {name: "Moss Gate", hp: 12, hit: 2, reward: 9},
  {name: "Bellwood", hp: 19, hit: 3, reward: 19},
  {name: "The Hollow Bell", hp: 26, hit: 4, reward: 33}
];
function contract() { return contracts[state.orders % contracts.length]; }
function save() {
  state.saved = Date.now();
  try { localStorage.setItem(saveKey, JSON.stringify(state)); } catch {}
}
let message = "", messageEnd = 0, keeper = 660, destination = keeper;
function say(line) { message = line; messageEnd = performance.now() + 4200; }
function tick() {
  state.age++;
  state.plots = state.plots.map(age => {
    if (age < 23) return age + 1;
    state.herbs++;
    return 0;
  });
  const recipe = recipes[state.recipe];
  const stock = state.recipe ? "elixirs" : "potions";
  if (state.brew && state.age % 6 === 0 && state.herbs >= recipe.herbs && state[stock] < 8) {
    state.herbs -= recipe.herbs;
    state[stock]++;
    destination = 548;
  }
  if (state.bake && state.age % 7 === 0 && state.herbs && state.bread < 8) {
    state.herbs--;
    state.bread++;
    destination = 711;
  }
  if (state.open && state.age % 8 === 0) {
    if (state.elixirs) {
      state.elixirs--;
      state.coins += recipes[1].value;
    } else if (state.potions && (!state.bread || state.age % 16 === 0)) {
      state.potions--;
      state.coins += 5;
    } else if (state.bread) {
      state.bread--;
      state.coins += 3;
    }
    destination = 880;
  }
  const fight = state.battle;
  if (fight && state.age % 3 === 0) {
    fight.round = (fight.round || 0) + 1;
    const wardedBell = fight.route === 2 && fight.round % 3 === 1 && !fight.elixir;
    fight.enemy -= wardedBell ? 1 : 3 + state.ward + (fight.elixir ? 2 : 0);
    if (fight.enemy <= 0) {
      state.battle = null;
      state.coins += trails[fight.route ?? 0].reward;
      state.crystals++;
      state.trail = Math.max(state.trail, (fight.route ?? 0) + 1);
      say("Familiar returned · +1 forest crystal");
    } else {
      const charge = fight.route === 1 && fight.round % 2 === 0 ? 2 : 0;
      fight.hp -= trails[fight.route ?? 0].hit + charge;
      if (fight.hp <= 0) { state.battle = null; say("The familiar retreated"); }
    }
  }
}
let clock = state.saved;
function advance() {
  const now = Date.now();
  const seconds = Math.max(0, Math.floor((now - clock) / 1000));
  for (let i = 0; i < Math.min(seconds, 28800); i++) tick();
  if (seconds) clock = now - (now - clock) % 1000;
  return seconds;
}
const coinsBefore = state.coins;
if (advance() > 10) say("While you were away · +" + (state.coins - coinsBefore) + " coins");
save();
setInterval(() => { advance(); save(); }, 5000);
addEventListener("pagehide", () => { advance(); save(); });

const spots = [
  ...[46, 174, 301].map((x, i) => [x, 431, 111, 119, "Moonleaf", () => {
    if (state.plots[i] < 16) return say("Moonleaf is growing");
    state.plots[i] = 0;
    state.herbs++;
    say("Moonleaf harvested");
  }]),
  [492, 421, 111, 122, "Toggle brewing", () => say((state.brew = !state.brew) ? "Brewing on" : "Brewing paused")],
  [653, 391, 113, 152, "Toggle baking", () => say((state.bake = !state.bake) ? "Baking on" : "Baking paused")],
  [802, 416, 155, 127, "Toggle shop", () => say((state.open = !state.open) ? "Shop open" : "Shop closed")],
  [731, 215, 156, 112, "Séance ward", () => {
    if (state.ward) return say("Your familiar is warded");
    if (!state.crystals) return say("A ward needs one forest crystal");
    state.crystals--;
    state.ward = 1;
    say("Séance complete · Familiar attack increased");
  }],
  [1050, 361, 194, 195, "Forest expedition", () => {
    routeChoice = state.battle?.route ?? Math.min(state.trail, trails.length - 1);
    useElixir = !state.potions && state.elixirs > 0;
    scene = "forest";
    hovered = null;
  }],
  [575, 237, 97, 95, "Town orders", () => {
    const order = contract();
    if (state[order.item] < order.count) return say(order.name + " requests " + order.count + " " + order.item);
    state[order.item] -= order.count;
    state.coins += order.pay;
    state.orders++;
    say("Order delivered · +" + order.pay + " coins");
  }],
  [645, 331, 92, 54, "Upgrade workshop", () => {
    if (state.level) {
      state.recipe = 1 - state.recipe;
      return say("Recipe · " + recipes[state.recipe].name);
    }
    if (state.coins < 35) return say("Nightbloom recipe · 35 coins");
    state.coins -= 35;
    state.level = 1;
    state.recipe = 1;
    say("Nightbloom Elixir unlocked");
  }],
  [1050, 562, 194, 64, "Pack provisions", () => {
    state.provision = !state.provision;
    say(state.provision ? "Provisions on · 2 loaves for extra health" : "Provisions off");
  }]
];
function dispatch() {
  if (state.battle) return;
  const stock = useElixir ? "elixirs" : "potions";
  if (!state[stock]) return say("The chosen potion is out of stock");
  if (state.provision && state.bread < 2) return say("Pack two loaves, or turn provisions off");
  state[stock]--;
  if (state.provision) state.bread -= 2;
  state.battle = { hp: state.provision ? 22 : 9, enemy: trails[routeChoice].hp, route: routeChoice, elixir: useElixir };
  say("Familiar dispatched · " + trails[routeChoice].name);
}
const forestSpots = [
  [55, 45, 150, 54, "Return", () => { scene = "shop"; hovered = null; }],
  ...trails.map((trail, i) => [95, 154 + i * 37, 228, 34, trail.name, () => {
    if (!state.battle && i <= state.trail) routeChoice = i;
  }]),
  [375, 585, 175, 55, "Potion", () => { if (!state.battle) useElixir = !useElixir; }],
  [570, 585, 180, 55, "Provisions", () => { if (!state.battle) state.provision = !state.provision; }],
  [810, 585, 205, 55, "Dispatch", dispatch]
];
addEventListener("keydown", event => {
  if (event.key === "Escape") { scene = "shop"; hovered = null; }
});
function hit(event) {
  const bounds = canvas.getBoundingClientRect();
  const x = (event.clientX - bounds.left) * 1280 / bounds.width;
  const y = (event.clientY - bounds.top) * 720 / bounds.height;
  const controls = scene === "forest" ? forestSpots : spots;
  return controls.find(([sx, sy, w, h]) => x >= sx && x <= sx+w && y >= sy && y <= sy+h);
}
let hovered;
canvas.onpointermove = event => { hovered = hit(event); canvas.style.cursor = hovered ? "pointer" : ""; };
canvas.onpointerleave = () => { hovered = null; };
canvas.onpointerdown = event => { const spot = hit(event); if (spot) { advance(); spot[5](); save(); } };

function words(text, x, y, size = 19, color = "#f3d9ac") {
  ctx.save();
  ctx.shadowColor = "#15111c"; ctx.shadowBlur = 5; ctx.shadowOffsetY = 2;
  ctx.fillStyle = color; ctx.font = size + "px Georgia"; ctx.fillText(text, x, y);
  ctx.restore();
}
// The source rows have different heights; cut each strip at its transparent seam.
function sprite(id, x, y, w, h, alpha = 1, mirror = false) {
  if (!atlas.naturalWidth) return;
  const rows = [0, .238, .47, .747, 1];
  const row = Math.floor(id / 4), cell = atlas.naturalWidth / 4;
  const top = rows[row] * atlas.naturalHeight;
  const left = id === 14 ? atlas.naturalWidth * .474 : (id % 4) * cell;
  const right = id === 13 ? atlas.naturalWidth * .466 : (id % 4 + 1) * cell;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (mirror) { ctx.translate(x + w, 0); ctx.scale(-1, 1); x = 0; }
  if (id === 13 && !state.bake) ctx.filter = "brightness(.7) saturate(.55)";
  ctx.drawImage(atlas, left, top, right-left, rows[row+1] * atlas.naturalHeight-top, x, y, w, h);
  ctx.restore();
}
function effect(id, x, y, w, h, alpha) {
  if (!effects.naturalWidth) return;
  const cw = effects.naturalWidth / 2, ch = effects.naturalHeight / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(effects, id % 2 * cw, Math.floor(id / 2) * ch, cw, ch, x, y, w, h);
  ctx.restore();
}
function forestFrame(ms) {
  const t = ms / 1000;
  if (!forest.naturalWidth) return;
  ctx.drawImage(forest, 0, 0, 1280, 720);
  effect(3, 220 + Math.sin(t*.31)*35, 395, 355, 116, .36);
  effect(3, 820 + Math.sin(t*.26)*45, 386, 365, 126, .42);
  const fight = state.battle;
  const route = fight?.route ?? routeChoice;
  const pulse = fight ? Math.max(0, Math.sin(t*7)) : 0;
  sprite(10, 315 + pulse*78, 414 + Math.sin(t*3)*6, 177, 153);
  if (!route) sprite(11, 832-pulse*49, 337, 183, 228, 1, true);
  else if (enemies.naturalWidth) {
    const split = enemies.naturalWidth * .478;
    const left = route === 1 ? 0 : split;
    const width = route === 1 ? split : enemies.naturalWidth - split;
    const size = route === 1 ? 232 : 267;
    ctx.drawImage(enemies, left, 0, width, enemies.naturalHeight, 795-pulse*49, 566-size, size, size);
  }
  if (fight) {
    effect(2, 681, 463, 72, 72, pulse);
    words(fight.hp + " HP", 365, 411, 23);
    words(fight.enemy + " HP", 867, 327, 23);
  }
  words("‹ Back to shop", 57, 80, 21);
  words("The Forest", 94, 138, 37);
  trails.forEach((trail, i) => words(
    (i === route ? "◆ " : "   ") + trail.name + (i > state.trail ? " · Locked" : ""),
    95, 178 + i*37, 21, i > state.trail ? "#b9a9ae" : "#f3d9ac"
  ));
  const hints = ["A steady attack.", "The boar charges every other round.", "Elixir breaks the bell’s ward."];
  words(hints[route], 96, 304, 18);
  if (!fight) {
    sprite(4, 371, 584, 31, 32);
    words((useElixir ? "Elixir " + state.elixirs : "Tonic " + state.potions), 411, 609, 21);
    sprite(5, 568, 584, 33, 32);
    words(state.provision ? "Pack 2 loaves" : "No provisions", 607, 609, 21);
    words("Send familiar ›", 822, 609, 23);
  }
  if (ms < messageEnd) words(message, 95, 669, 23);
}
function frame(ms) {
  advance();
  if (scene === "forest") {
    forestFrame(ms);
    requestAnimationFrame(frame);
    return;
  }
  if (!cottage.naturalWidth) {
    requestAnimationFrame(frame);
    return;
  }
  const t = ms / 1000;
  keeper += Math.max(-2, Math.min(2, destination - keeper));
  ctx.drawImage(cottage, 0, 0, 1280, 720);
  effect(3, 64+Math.sin(t*.22)*36, 297, 355, 152, .28);
  effect(3, 1035+Math.sin(t*.31)*18, 443, 238, 119, .43);
  state.plots.forEach((age, i) => {
    const x = 58 + i * 125;
    sprite(Math.floor(age/8), x + Math.sin(t*2+i)*2, 430, 99, 92);
    if (age >= 16) effect(2, x+74, 449+Math.sin(t*3+i)*4, 21, 21, .65);
  });
  sprite(15, 728, 205, 158, 116);
  if (state.ward) effect(2, 783, 218, 51, 51, .61 + Math.sin(t*2)*.14);
  sprite(12, 487, 424, 123, 115);
  sprite(13, 648, 394, 126, 145);
  if (state.brew && state.herbs >= 2) {
    for (let i=0;i<2;i++) {
      const phase = (t*.41+i/2)%1;
      effect(0, 517+Math.sin(phase*6+i)*9, 417-phase*67, 62, 69, Math.sin(phase*Math.PI)*.64);
    }
  }
  if (state.bake && state.herbs) effect(2, 690, 464, 44, 38, .47+Math.sin(t*6)*.23);
  sprite(14, 799, 425, 163, 117);
  for (let i=0;i<state.potions;i++) sprite(4, 815+i%4*19, 459-Math.floor(i/4)*16, 19, 22);
  for (let i=0;i<state.elixirs;i++) sprite(4, 816+i%4*18, 435-Math.floor(i/4)*17, 18, 21, .8);
  for (let i=0;i<state.bread;i++) sprite(5, 891+i%4*15, 465-Math.floor(i/4)*13, 18, 15);
  sprite(8, keeper-48, 438 + Math.sin(t*9)*Math.min(3, Math.abs(destination-keeper)), 96, 117, 1, destination < keeper);
  if (state.open) {
    const visit = ((state.age + (Date.now()-clock)/1000) % 8) / 8;
    sprite(9, 1085 - Math.sin(visit*Math.PI)*148, 474 + Math.sin(t*4)*6, 90, 81, Math.min(.9, Math.sin(visit*Math.PI)*2), visit < .5);
  }
  const clash = state.battle ? Math.sin(t*10)*12 : 0;
  sprite(10, 1079+clash, 498+Math.sin(t*3)*5, 83, 70);
  if (state.battle) {
    sprite(11, 1160-clash, 455, 78, 103, 1, true);
    effect(2, 1135, 481, 42, 42, Math.max(0, Math.sin(t*10)));
    words(state.battle.hp + " HP", 1092, 494, 16, "#b7e6cc");
    words(state.battle.enemy + " HP", 1170, 454, 16, "#f7bfd1");
  }
  for (let i=0;i<9;i++) effect(1, (i*151+t*(6+i%4))%1280, 480+i*31%124+Math.sin(t+i)*16, 15+i%3*4, 15+i%3*4, .45+Math.sin(t+i)*.27);
  words("Ghost Town", 119, 102, 44);
  sprite(6, 599, 270, 38, 38);
  sprite(state.level ? 4 : 7, 675, 335, 34, 37);
  sprite(5, 1100, 566, 36, 33, state.provision ? 1 : .55);
  words(trails[Math.min(state.trail, trails.length-1)].name, 1080, 613, 17);
  [state.coins,state.herbs,state.potions,state.bread,state.crystals].forEach((value,i) => {
    sprite([6,3,4,5,7][i], 116+i*67, 119, 30, 30); words(value, 149+i*67, 141, 18);
  });
  if (hovered) {
    const [x,y,w,h,caption] = hovered;
    effect(2, x+w/2-12,y+h-7,24,24,.9);
    const labels = {
      "Town orders": contract().name + " · " + state[contract().item] + "/" + contract().count + " " + contract().item,
      "Upgrade workshop": state.level ? recipes[state.recipe].name : "Unlock Nightbloom · 35 coins"
    };
    words(labels[caption] || caption, Math.min(x, 1040), y+h+25, 17);
  }
  if (ms < messageEnd) words(message, 65, 659, 23, "#f7e3bd");
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
