(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const arena = { x: 290, y: 272, w: 380, h: 218 };
  const held = { left: false, right: false, up: false, down: false };
  const soul = { x: 480, y: 380, r: 8, invuln: 0 };
  const player = { hp: 20, maxHp: 20, items: 2 };
  const haru = { hp: 72, maxHp: 72, mercy: 0, mood: 0, anim: 0 };
  let phase = 'intro', submenu = '', menuIndex = 0, subIndex = 0;
  let message = 'A pink blur skids to a stop. “Hehe! Ready to race?”';
  let messageTimer = 0, attackTimer = 0, attackPattern = 0, bullets = [], particles = [];
  let fightCursor = 0, fightDir = 1, fightResult = '', shake = 0, frame = 0, lastTime = 0;
  let choiceCooldown = 0, victoryType = '', endTimer = 0;
  const commands = ['FIGHT', 'ACT', 'ITEM', 'MERCY'];
  const actions = ['Check', 'Cheer', 'Offer a snack'];
  const items = ['Star Cookie', 'Peach Candy'];
  const mercies = ['Spare', 'Keep racing'];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a, b) => a + Math.random() * (b - a);

  function setMessage(text, advance = true) { message = text; messageTimer = advance ? 0 : 1.5; }
  function startPlayerMenu(text) {
    phase = 'menu'; submenu = ''; menuIndex = 0; choiceCooldown = .15;
    if (text) setMessage(text);
  }
  function startEnemyTurn() {
    phase = 'enemy'; submenu = ''; bullets = []; attackTimer = 0; attackPattern = (attackPattern + 1) % 3;
    soul.x = arena.x + arena.w / 2; soul.y = arena.y + arena.h / 2; soul.invuln = 0;
    setMessage('Haru is giving it her all!', false);
  }
  function win(type) {
    victoryType = type; phase = 'ending'; endTimer = 0; bullets = [];
    setMessage(type === 'spare' ? '“That was fun! Let’s race again!”' : 'Haru tumbles onto the grass, still smiling.');
  }
  function damageHaru(amount) {
    haru.hp = Math.max(0, haru.hp - amount); shake = 7;
    for (let i = 0; i < 12; i++) particles.push({x: 320, y: 170, vx: rand(-3, 3), vy: rand(-4, 1), life: rand(.35, .8), color: i % 2 ? '#ffdf76' : '#ff79a7'});
    if (haru.hp <= 0) win('fight');
  }
  function chooseMenu() {
    if (submenu) return chooseSubmenu();
    const choice = commands[menuIndex];
    if (choice === 'FIGHT') { phase = 'fight'; fightCursor = 0; fightDir = 1; fightResult = ''; }
    else if (choice === 'ACT') { submenu = 'act'; subIndex = 0; }
    else if (choice === 'ITEM') { submenu = 'item'; subIndex = 0; }
    else { submenu = 'mercy'; subIndex = 0; }
  }
  function chooseSubmenu() {
    const selected = submenu === 'act' ? actions[subIndex] : submenu === 'item' ? items[subIndex] : mercies[subIndex];
    if (submenu === 'act') {
      if (selected === 'Check') { setMessage('HARU URARA — cheerful racer. ATK 4 DEF 2. She is just happy you showed up.'); haru.mood += 1; }
      if (selected === 'Cheer') { haru.mood += 1; haru.mercy += 1; setMessage('You cheer for Haru! Her ears perk up. “I can do this!”'); }
      if (selected === 'Offer a snack') {
        if (player.items > 0) { player.items--; haru.mercy += 2; haru.mood += 2; setMessage('Haru shares your Star Cookie. Her smile shines brighter!'); }
        else { setMessage('Your pockets are empty. Haru pats your shoulder.'); }
      }
      if (haru.mercy >= 3) { setMessage('Haru is beaming. She looks ready to be your friend.'); }
    } else if (submenu === 'item') {
      if (player.items > 0) { player.items--; const before = player.hp; player.hp = Math.min(player.maxHp, player.hp + 8); setMessage(`${selected}! You recovered ${player.hp - before} HP.`); }
      else { setMessage('You rummage around, but there are no snacks left.'); }
    } else {
      if (selected === 'Spare' && haru.mercy >= 3) { win('spare'); return; }
      if (selected === 'Spare') setMessage('Haru is not ready to stop yet. Cheer her on a little more!');
      else { haru.mood++; setMessage('You ask Haru to keep racing. “Absolutely!”'); }
    }
    submenu = ''; startEnemyTurn();
  }
  function back() {
    if (phase === 'ending' || phase === 'gameover') { restart(); return; }
    if (phase === 'menu' && submenu) { submenu = ''; subIndex = 0; }
    else if (phase === 'fight') { phase = 'menu'; fightResult = ''; }
    else if (phase === 'intro') { startPlayerMenu(); }
  }
  function confirm() {
    if (phase === 'intro') { startPlayerMenu(); return; }
    if (phase === 'menu') { chooseMenu(); return; }
    if (phase === 'fight') {
      const power = Math.max(0, 1 - Math.abs(fightCursor - .5) * 2);
      const dmg = Math.round(7 + power * 17);
      damageHaru(dmg); fightResult = dmg >= 20 ? 'GREAT!' : dmg >= 15 ? 'NICE HIT!' : 'GOOD TRY!';
      if (haru.hp > 0) { phase = 'fightResult'; choiceCooldown = .8; }
      return;
    }
    if (phase === 'fightResult') { startEnemyTurn(); return; }
    if (phase === 'ending' || phase === 'gameover') { restart(); return; }
    if (phase === 'enemy') { /* movement phase: confirm is intentionally harmless */ }
  }
  function actKey(key) {
    if (key === 'z' || key === 'enter' || key === ' ') { confirm(); return; }
    if (key === 'x' || key === 'escape' || key === 'backspace') { back(); return; }
    if (key === 'c') {
      if (phase === 'intro' || phase === 'ending' || phase === 'gameover') confirm();
      else if (phase === 'menu' && !submenu) { submenu = 'act'; subIndex = 0; }
      else if (phase === 'fightResult') startEnemyTurn();
      else if (phase === 'menu' && submenu === 'act') { subIndex = 0; chooseSubmenu(); }
    }
  }
  function restart() {
    player.hp = player.maxHp; player.items = 2; haru.hp = haru.maxHp; haru.mercy = 0; haru.mood = 0;
    phase = 'intro'; submenu = ''; menuIndex = 0; bullets = []; particles = []; attackPattern = 0;
    message = 'A pink blur skids to a stop. “Hehe! Ready to race?”'; victoryType = '';
  }

  function keyDown(e) {
    const k = e.key.toLowerCase();
    if (['arrowleft','arrowright','arrowup','arrowdown',' '].includes(k)) e.preventDefault();
    if (k.startsWith('arrow')) { held[k.slice(5)] = true; return; }
    if (['z','x','c','enter','escape','backspace',' '].includes(k) && !e.repeat) actKey(k);
  }
  function keyUp(e) { const k = e.key.toLowerCase(); if (k.startsWith('arrow')) held[k.slice(5)] = false; }
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', () => Object.keys(held).forEach(k => held[k] = false));

  function drawText(text, x, y, size = 18, color = '#fff', align = 'left') {
    ctx.font = `bold ${size}px "Courier New", monospace`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'top'; ctx.fillText(text, x, y);
  }
  function wrap(text, x, y, width, line = 23, size = 17, color = '#fff') {
    ctx.font = `bold ${size}px "Courier New", monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = color;
    let yy = y;
    for (const paragraph of text.split('\n')) {
      let row = '';
      for (const word of paragraph.split(' ')) {
        const test = row ? row + ' ' + word : word;
        if (ctx.measureText(test).width > width && row) { ctx.fillText(row, x, yy); yy += line; row = word; } else row = test;
      }
      ctx.fillText(row, x, yy); yy += line;
    }
    return yy;
  }
  function box(x, y, w, h, fill = '#09090f', stroke = '#fff', lw = 3) {
    ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.strokeRect(x, y, w, h);
  }
  function heart(x, y, s, color) {
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(x, y + s * .9); ctx.bezierCurveTo(x - s * .4, y + s * .55, x - s * .7, y + s * .15, x - s * .38, y - s * .02);
    ctx.bezierCurveTo(x - s * .18, y - s * .14, x, y + s * .03, x, y + s * .12);
    ctx.bezierCurveTo(x + s * .2, y - s * .14, x + s * .62, y - s * .02, x + s * .55, y + s * .32);
    ctx.bezierCurveTo(x + s * .49, y + s * .57, x + s * .2, y + s * .78, x, y + s * .9); ctx.fill();
  }

  function drawHaru() {
    const bob = Math.sin(frame * .075) * 3, x = 340, y = 110 + bob;
    ctx.save(); ctx.translate(x, y);
    // flowing pink hair and horse ears
    ctx.fillStyle = '#7b304f'; ctx.beginPath(); ctx.moveTo(-38, 22); ctx.lineTo(-60, -35); ctx.lineTo(-24, -23); ctx.lineTo(-15, -47); ctx.lineTo(3, -19); ctx.lineTo(38, -26); ctx.lineTo(47, 21); ctx.fill();
    ctx.fillStyle = '#f18ba9'; ctx.beginPath(); ctx.moveTo(-32, 18); ctx.lineTo(-48, -32); ctx.lineTo(-23, -18); ctx.lineTo(-13, -41); ctx.lineTo(5, -12); ctx.lineTo(32, -21); ctx.lineTo(40, 23); ctx.fill();
    ctx.fillStyle = '#efaebc'; ctx.fillRect(-28, -12, 57, 57);
    ctx.fillStyle = '#f8d3c8'; ctx.fillRect(-21, -6, 43, 45);
    ctx.fillStyle = '#44243a'; ctx.fillRect(-12, 10, 5, 7); ctx.fillRect(9, 10, 5, 7);
    ctx.fillStyle = '#e98296'; ctx.fillRect(-3, 25, 7, 3); ctx.fillRect(-7, 31, 16, 3);
    ctx.fillStyle = '#f8d3c8'; ctx.fillRect(-23, 38, 46, 34);
    ctx.fillStyle = '#d84f78'; ctx.fillRect(-32, 42, 64, 13); ctx.fillRect(-26, 55, 52, 16);
    ctx.fillStyle = '#ffe27b'; ctx.fillRect(-15, 44, 30, 8);
    ctx.fillStyle = '#f4c2b9'; ctx.fillRect(-24, 68, 16, 15); ctx.fillRect(8, 68, 16, 15);
    ctx.fillStyle = '#49334b'; ctx.fillRect(-29, 80, 23, 7); ctx.fillRect(7, 80, 23, 7);
    ctx.fillStyle = '#f4c2b9'; ctx.fillRect(-41, 47, 11, 21); ctx.fillRect(30, 47, 11, 21);
    // tail and ribbon
    ctx.fillStyle = '#f18ba9'; ctx.fillRect(31, 55, 10, 23); ctx.fillRect(37, 71, 12, 7);
    ctx.fillStyle = '#fff0a1'; ctx.fillRect(18, -12, 18, 8); ctx.fillRect(31, -17, 7, 16);
    ctx.restore();
  }
  function drawScene() {
    ctx.fillStyle = '#10101b'; ctx.fillRect(0, 0, W, H);
    // subtle starfield and floor glow
    for (let i = 0; i < 32; i++) {
      const x = (i * 197 + 35) % W, y = (i * 89 + 22) % 235;
      ctx.fillStyle = i % 3 ? '#28283a' : '#3a3447'; ctx.fillRect(x, y, 2, 2);
    }
    ctx.fillStyle = '#171724'; ctx.fillRect(0, 228, W, 412);
    ctx.fillStyle = '#20202d'; ctx.fillRect(0, 228, W, 3);
    drawHaru();
    // enemy name / HP
    drawText('♥', 98, 229, 22, '#ff637a'); drawText('HARU URARA', 127, 231, 21, '#fff');
    drawText('HP', 718, 231, 17, '#fff');
    ctx.fillStyle = '#471e2b'; ctx.fillRect(755, 232, 120, 14);
    ctx.fillStyle = '#ff6687'; ctx.fillRect(755, 232, 120 * haru.hp / haru.maxHp, 14);
    drawText(`${haru.hp}/${haru.maxHp}`, 883, 229, 15, '#f4bdc9');
    if (phase === 'enemy') {
      ctx.fillStyle = '#14141d'; ctx.fillRect(arena.x, arena.y, arena.w, arena.h);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.strokeRect(arena.x, arena.y, arena.w, arena.h);
      bullets.forEach(b => {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot || 0);
        if (b.type === 'carrot') {
          ctx.fillStyle = '#ff9e4b'; ctx.beginPath(); ctx.moveTo(-7,-8); ctx.lineTo(7,-8); ctx.lineTo(0,11); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#7bd47b'; ctx.fillRect(-2,-13,4,7);
        } else heart(0, 0, b.r * 1.6, '#fff');
        ctx.restore();
      });
      if (soul.invuln <= 0 || Math.floor(frame / 4) % 2 === 0) heart(soul.x, soul.y, 13, '#ff4259');
    } else if (phase === 'fight') {
      drawFightBar();
    }
    drawBottom();
    particles.forEach(p => { ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 5, 5); }); ctx.globalAlpha = 1;
    if (phase === 'ending' || phase === 'gameover') drawOverlay();
    if (shake > 0) { /* state is applied in the render transform */ }
  }
  function drawFightBar() {
    box(300, 333, 360, 92, '#171725', '#fff', 3);
    drawText('TIME YOUR STRIKE!', 480, 345, 17, '#ffdf76', 'center');
    ctx.fillStyle = '#592b42'; ctx.fillRect(345, 385, 270, 13);
    ctx.fillStyle = '#f2cb68'; ctx.fillRect(455, 381, 50, 21);
    ctx.fillStyle = '#fff'; ctx.fillRect(345 + fightCursor * 270 - 2, 378, 4, 27);
    if (fightResult) drawText(fightResult, 480, 450, 21, '#fff0a1', 'center');
  }
  function drawBottom() {
    if (phase === 'ending' || phase === 'gameover') return;
    box(70, 510, 820, 101, '#08080d', '#fff', 3);
    if (phase === 'menu' && !submenu) {
      wrap(message, 98, 529, 740, 23, 17);
      commands.forEach((c, i) => {
        const x = 93 + i * 195, color = ['#ff9b67','#79e0b0','#8fc7ff','#f08fc7'][i];
        drawText((menuIndex === i ? '♥ ' : '  ') + c, x, 577, 20, color);
      });
    } else if (phase === 'menu' && submenu) {
      drawText(submenu === 'act' ? '* Choose an action.' : submenu === 'item' ? '* Use an item.' : '* What do you choose?', 98, 523, 17, '#fff');
      const list = submenu === 'act' ? actions : submenu === 'item' ? items : mercies;
      list.forEach((item, i) => drawText(`${subIndex === i ? '♥' : ' '} ${item}`, 110 + (i % 2) * 370, 553 + Math.floor(i / 2) * 26, 17, '#fff'));
      drawText('X: back', 823, 583, 13, '#9d9dae');
    } else if (phase === 'intro' || phase === 'fightResult') {
      wrap(message, 98, 537, 750, 24, 18);
      drawText('Z / ENTER: continue', 700, 579, 14, '#a7a7b6');
    } else if (phase === 'enemy') {
      drawText('DODGE!  Move with the arrow keys.', 480, 546, 18, '#fff', 'center');
      drawText('Survive the pattern to take your turn.', 480, 576, 15, '#a7a7b6', 'center');
    }
    // player stats
    drawText('HERO', 82, 617, 15, '#fff');
    drawText('LV 1', 179, 617, 15, '#fff');
    drawText('HP', 250, 617, 15, '#fff');
    ctx.fillStyle = '#5c2632'; ctx.fillRect(280, 620, 104, 13);
    ctx.fillStyle = player.hp > 6 ? '#ff596b' : '#ff263f'; ctx.fillRect(280, 620, 104 * player.hp / player.maxHp, 13);
    drawText(`${player.hp} / ${player.maxHp}`, 393, 616, 15, '#fff');
    drawText(`SNACKS ${player.items}`, 545, 617, 14, '#ffdb91');
  }
  function drawOverlay() {
    ctx.fillStyle = 'rgba(7,7,13,.82)'; ctx.fillRect(0, 0, W, H);
    box(190, 195, 580, 245, '#13131e', victoryType === 'spare' ? '#ffd96f' : '#fff', 4);
    if (phase === 'gameover') {
      drawText('YOUR HEART NEEDS A REST', 480, 235, 27, '#ff637a', 'center');
      wrap('Haru brings you a water bottle. Try the race again?', 260, 302, 440, 26, 18);
      drawText('Z to try again', 480, 377, 17, '#ffdf76', 'center');
    } else {
      drawText(victoryType === 'spare' ? 'FRIENDS FOREVER!' : 'YOU WIN!', 480, 235, 31, '#ffe27b', 'center');
      wrap(victoryType === 'spare' ? 'You and Haru cheer each other on. The finish line can wait.' : 'Haru bows, then challenges you to another race someday.', 255, 300, 450, 27, 18);
      drawText('Z to play again', 480, 377, 17, '#ffdf76', 'center');
    }
  }

  function spawnBullet(x, y, tx, ty, speed = 2.4, type = 'heart') {
    const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
    bullets.push({ x, y, vx: dx / d * speed, vy: dy / d * speed, r: 7, type, rot: Math.atan2(dy, dx) + Math.PI / 2 });
  }
  function updateEnemy(dt) {
    attackTimer += dt;
    if (attackPattern === 1) {
      if (Math.floor(attackTimer * 2.8) !== Math.floor((attackTimer - dt) * 2.8)) {
        const x = rand(arena.x + 15, arena.x + arena.w - 15);
        spawnBullet(x, arena.y - 8, x + rand(-30, 30), arena.y + arena.h, 2.5, 'carrot');
      }
      if (attackTimer > 2.4 && Math.floor(attackTimer * 2) % 2 === 0 && Math.floor((attackTimer - dt) * 2) % 2 !== 0)
        spawnBullet(arena.x - 6, rand(arena.y + 15, arena.y + arena.h - 15), arena.x + arena.w, soul.y, 2.7);
    } else if (attackPattern === 2) {
      if (Math.floor(attackTimer * 1.7) !== Math.floor((attackTimer - dt) * 1.7)) {
        for (let i = 0; i < 5; i++) spawnBullet(arena.x + 6, arena.y + 25 + i * 40, arena.x + arena.w - 10, arena.y + 25 + i * 40, 2.8, i % 2 ? 'carrot' : 'heart');
      }
      if (attackTimer > 2.3 && Math.floor(attackTimer * 3) !== Math.floor((attackTimer - dt) * 3))
        spawnBullet(rand(arena.x, arena.x + arena.w), arena.y + arena.h + 8, soul.x, arena.y, 2.3);
    } else {
      if (Math.floor(attackTimer * 2.1) !== Math.floor((attackTimer - dt) * 2.1)) {
        const side = Math.random() < .5 ? arena.x - 8 : arena.x + arena.w + 8;
        spawnBullet(side, rand(arena.y + 15, arena.y + arena.h - 15), soul.x + rand(-25, 25), soul.y + rand(-20, 20), 2.3, Math.random() < .3 ? 'carrot' : 'heart');
      }
      if (attackTimer > 2 && Math.floor(attackTimer * 2) !== Math.floor((attackTimer - dt) * 2)) {
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4 + attackTimer;
          spawnBullet(480, 380, 480 + Math.cos(a) * 100, 380 + Math.sin(a) * 100, 1.8);
        }
      }
    }
    const speed = 200, dx = (held.right ? 1 : 0) - (held.left ? 1 : 0), dy = (held.down ? 1 : 0) - (held.up ? 1 : 0);
    const len = Math.hypot(dx, dy) || 1;
    soul.x = clamp(soul.x + dx / len * speed * dt, arena.x + 13, arena.x + arena.w - 13);
    soul.y = clamp(soul.y + dy / len * speed * dt, arena.y + 13, arena.y + arena.h - 13);
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i]; b.x += b.vx * 60 * dt; b.y += b.vy * 60 * dt;
      if (b.x < arena.x - 25 || b.x > arena.x + arena.w + 25 || b.y < arena.y - 25 || b.y > arena.y + arena.h + 25) { bullets.splice(i, 1); continue; }
      if (soul.invuln <= 0 && Math.hypot(soul.x - b.x, soul.y - b.y) < soul.r + b.r - 2) {
        player.hp = Math.max(0, player.hp - (b.type === 'carrot' ? 2 : 3)); soul.invuln = .72; shake = 5;
        for (let n = 0; n < 6; n++) particles.push({x: soul.x, y: soul.y, vx: rand(-2,2), vy: rand(-2,2), life: .45, color: '#ff596b'});
        if (player.hp <= 0) { phase = 'gameover'; bullets = []; return; }
      }
    }
    soul.invuln = Math.max(0, soul.invuln - dt);
    if (attackTimer >= 7.2) { bullets = []; startPlayerMenu('You made it through the sprint! Choose your next move.'); }
  }
  function update(dt) {
    frame++; haru.anim += dt; choiceCooldown = Math.max(0, choiceCooldown - dt); shake = Math.max(0, shake - dt * 18);
    if (phase === 'menu' && !submenu && choiceCooldown <= 0) {
      if (held.left) { menuIndex = Math.max(0, menuIndex - 1); held.left = false; choiceCooldown = .13; }
      if (held.right) { menuIndex = Math.min(3, menuIndex + 1); held.right = false; choiceCooldown = .13; }
    } else if (phase === 'menu' && submenu && choiceCooldown <= 0) {
      if (held.left) { subIndex = Math.max(0, subIndex - 1); held.left = false; choiceCooldown = .13; }
      if (held.right) { subIndex = Math.min((submenu === 'act' ? 2 : 1), subIndex + 1); held.right = false; choiceCooldown = .13; }
      if (held.up) { subIndex = Math.max(0, subIndex - 2); held.up = false; choiceCooldown = .13; }
      if (held.down) { subIndex = Math.min((submenu === 'act' ? 2 : 1), subIndex + 2); held.down = false; choiceCooldown = .13; }
    }
    if (phase === 'fight') {
      fightCursor += fightDir * dt * .95;
      if (fightCursor > 1) { fightCursor = 1; fightDir = -1; }
      if (fightCursor < 0) { fightCursor = 0; fightDir = 1; }
    }
    if (phase === 'fightResult') { choiceCooldown -= dt; if (choiceCooldown <= 0) startEnemyTurn(); }
    if (phase === 'enemy') updateEnemy(dt);
    particles = particles.filter(p => (p.life -= dt) > 0);
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .1; });
    if (phase === 'ending') endTimer += dt;
  }
  function render() {
    ctx.save();
    if (shake > 0) ctx.translate(rand(-shake, shake), rand(-shake, shake));
    drawScene(); ctx.restore();
  }
  function loop(now) {
    const dt = Math.min(.035, (now - (lastTime || now)) / 1000); lastTime = now;
    update(dt); render(); requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // On-screen touch buttons share exactly the keyboard behavior.
  document.querySelectorAll('.touch-button').forEach(button => {
    const key = button.dataset.key;
    button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); actKey(key); });
  });
  const stick = document.getElementById('stick'), thumb = document.getElementById('thumb');
  let stickPointer = null;
  function moveStick(e) {
    const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy, max = r.width * .32, d = Math.hypot(dx, dy);
    if (d > max) { dx *= max / d; dy *= max / d; }
    thumb.style.transform = `translate(${dx}px, ${dy}px)`;
    held.left = dx < -9; held.right = dx > 9; held.up = dy < -9; held.down = dy > 9;
  }
  stick.addEventListener('pointerdown', e => { e.preventDefault(); stickPointer = e.pointerId; stick.setPointerCapture(e.pointerId); moveStick(e); });
  stick.addEventListener('pointermove', e => { if (e.pointerId === stickPointer) moveStick(e); });
  function releaseStick(e) { if (e.pointerId === stickPointer) { stickPointer = null; Object.keys(held).forEach(k => held[k] = false); thumb.style.transform = ''; } }
  stick.addEventListener('pointerup', releaseStick); stick.addEventListener('pointercancel', releaseStick);

  canvas.addEventListener('pointerdown', e => {
    if (phase === 'menu' && !submenu) {
      const r = canvas.getBoundingClientRect(), sx = W / r.width, sy = H / r.height;
      const x = (e.clientX - r.left) * sx, y = (e.clientY - r.top) * sy;
      if (y > 568 && y < 610) { menuIndex = clamp(Math.floor((x - 75) / 195), 0, 3); chooseMenu(); }
      else confirm();
    } else if (phase === 'intro' || phase === 'fightResult' || phase === 'ending' || phase === 'gameover') confirm();
  });
})();
