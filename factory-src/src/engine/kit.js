import * as THREE from 'three';

/** 장면 파일에서 쓰는 도구 모음. 장면은 build(k)에서 이 kit만 사용한다. */
export const C = {
  floor: 0x15171b, belt: 0x262a32, base: 0x3a3f4a, base2: 0x2c313b, hazard: 0xe8b931,
  amber: 0xf2a93b, blue: 0x4c8dff, red: 0xff5a4e, green: 0x3dd68c, violet: 0xa77bff,
  teal: 0x2ec4b6, white: 0xe9ecf2, wood: 0xb7834f,
};

export function createKit(world) {
  const root = world.root;
  const geoCache = new Map();
  const matCache = new Map();
  const ITEM_Y = 0.98;

  const geo = (key, make) => {
    if (!geoCache.has(key)) { const g = make(); geoCache.set(key, g); world.sharedGeo.add(g); }
    return geoCache.get(key);
  };
  const boxGeo = (w, h, d) => geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));

  /** 공유 재질(색·옵션이 같으면 하나만 만든다). 나중에 색을 바꿀 재질은 own 재질을 쓴다. */
  function mat(c, o = {}) {
    const key = c + JSON.stringify(o);
    if (!matCache.has(key)) {
      const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.15, ...o });
      matCache.set(key, m); world.sharedMat.add(m);
    }
    return matCache.get(key);
  }
  const ownMat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, metalness: 0.15, ...o });

  function box(w, h, d, c, x, y, z, par = root, o) {
    const { own, ...rest } = o || {};
    const m = new THREE.Mesh(boxGeo(w, h, d), own ? ownMat(c, rest) : mat(c, rest));
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    par.add(m);
    return m;
  }
  function cyl(r, h, c, x, y, z, par = root) {
    const m = new THREE.Mesh(geo(`c${r}|${h}`, () => new THREE.CylinderGeometry(r, r, h, 24)), mat(c));
    m.position.set(x, y, z); m.castShadow = true; par.add(m);
    return m;
  }
  function sphere(r, c, par = root, o = {}) {
    const m = new THREE.Mesh(geo(`s${r}`, () => new THREE.SphereGeometry(r, 16, 12)), o.own ? ownMat(c, o) : mat(c, o));
    m.castShadow = true; par.add(m);
    return m;
  }

  /* ---------- 라벨 ---------- */
  function drawLabel(text, o) {
    const fs = o.fs || 44, pad = 16;
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    const font = `${o.bold === false ? 500 : 700} ${fs}px "IBM Plex Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif`;
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + pad * 2, h = Math.round(fs + pad * 1.3);
    cv.width = w; cv.height = h; ctx.font = font;
    if (o.bg !== null) {
      ctx.fillStyle = o.bg || 'rgba(17,19,24,.88)';
      ctx.beginPath(); ctx.roundRect(0, 0, w, h, 12); ctx.fill();
    }
    ctx.fillStyle = o.color || '#E9ECF2';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, h / 2 + 2);
    return { cv, w, h };
  }
  function label(text, x, y, z, o = {}, par = root) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, transparent: true }));
    sp.renderOrder = 20; sp.position.set(x, y, z);
    sp.userData.o = o;
    par.add(sp);
    setLabel(sp, text);
    return sp;
  }
  function setLabel(sp, text) {
    if (!sp || sp.userData.text === text) return;
    sp.userData.text = text;
    const o = sp.userData.o;
    const { cv, w, h } = drawLabel(text, o);
    const tx = new THREE.CanvasTexture(cv);
    tx.colorSpace = THREE.SRGBColorSpace;
    tx.anisotropy = 4;
    if (sp.material.map) sp.material.map.dispose();
    sp.material.map = tx; sp.material.needsUpdate = true;
    const H = (o.h || 0.85) * world.labelScale;
    sp.scale.set((H * w) / h, H, 1);
  }

  /* ---------- 바닥 장식 ---------- */
  let beltCanvas;
  function beltTexture() {
    if (!beltCanvas) {
      beltCanvas = document.createElement('canvas'); beltCanvas.width = beltCanvas.height = 64;
      const c = beltCanvas.getContext('2d');
      c.fillStyle = '#24282f'; c.fillRect(0, 0, 64, 64);
      c.strokeStyle = '#3b414c'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(14, 6); c.lineTo(34, 32); c.lineTo(14, 58); c.stroke();
    }
    const t = new THREE.CanvasTexture(beltCanvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  /** a → b 방향으로 흐르는 컨베이어 벨트 */
  function belt(ax, az, bx, bz, w = 1.1) {
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    const g = new THREE.Group();
    g.position.set((ax + bx) / 2, 0, (az + bz) / 2);
    g.rotation.y = -Math.atan2(dz, dx);
    root.add(g);
    const tex = beltTexture(); tex.repeat.set(L / 1.1, 1);
    const side = mat(C.base2);
    const top = new THREE.Mesh(new THREE.BoxGeometry(L, 0.12, w), [side, side, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }), side, side, side]);
    top.position.y = 0.58; top.receiveShadow = true; g.add(top);
    box(L, 0.1, 0.12, 0x4a505c, 0, 0.66, w / 2 + 0.02, g);
    box(L, 0.1, 0.12, 0x4a505c, 0, 0.66, -w / 2 - 0.02, g);
    for (let s = -L / 2 + 0.6; s < L / 2; s += 2.2) {
      box(0.14, 0.52, 0.14, 0x30343c, s, 0.26, w / 2 - 0.12, g);
      box(0.14, 0.52, 0.14, 0x30343c, s, 0.26, -w / 2 + 0.12, g);
    }
    world.belts.push({ tex, L });
    return g;
  }
  function hazardLine(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    const m = box(L, 0.02, 0.16, C.hazard, (ax + bx) / 2, 0.02, (az + bz) / 2, root, { emissive: 0x3a2c00 });
    m.rotation.y = -Math.atan2(dz, dx); m.castShadow = false;
  }

  /* ---------- 시설 ---------- */
  function station(name, x, z, o = {}) {
    const w = o.w || 2.6, d = o.d || 2.4, h = o.h || 1.6;
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    box(w, h, d, o.base || C.base, 0, h / 2, 0, g);
    box(w + 0.08, 0.14, d + 0.08, o.accent || C.hazard, 0, h + 0.07, 0, g, { emissive: o.accent || C.hazard, emissiveIntensity: 0.25 });
    for (let i = -1; i <= 1; i += 2) box(0.08, 0.5, d * 0.7, 0x2a2e36, i * (w / 2 + 0.02), h * 0.55, 0, g);
    const lamp = sphere(0.2, 0x444a55, g, { own: true, emissive: 0x000000, emissiveIntensity: 1.6 });
    lamp.position.set(w / 2 - 0.35, h + 0.35, -d / 2 + 0.35);
    const lb = label(name, 0, h + (o.lh || 1.5), 0, { fs: 42 }, g);
    const st = {
      g, lamp, lb, h, x, z, badge: null,
      setLamp(c) { lamp.material.color.setHex(c == null ? 0x444a55 : c); lamp.material.emissive.setHex(c == null ? 0 : c); },
      pulse() {
        let k = 0;
        world.ticks.push((dt) => {
          k += dt * 5;
          const s = Math.sin(Math.min(k, Math.PI));
          g.scale.set(1 + s * 0.08, 1 + s * 0.05, 1 + s * 0.08);
          return k < Math.PI;
        });
      },
    };
    if (o.badge !== undefined) st.badge = label(o.badge || ' ', 0, h + (o.lh || 1.5) - 0.95, 0, { fs: 32, bold: false, color: '#E8B931', h: 0.62 }, g);
    return st;
  }
  function person(x, z, c) {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    cyl(0.32, 1.1, c, 0, 0.55, 0, g);
    const hd = sphere(0.3, 0xe9c9a8, g); hd.position.y = 1.45;
    return g;
  }
  function rack(x, z, par = root) {
    const g = new THREE.Group(); g.position.set(x, 0, z); par.add(g);
    box(1.2, 2.6, 1.2, 0x22262d, 0, 1.3, 0, g);
    const leds = [];
    for (let i = 0; i < 5; i++) leds.push(box(0.9, 0.08, 0.04, 0x222233, 0, 0.5 + i * 0.45, 0.62, g, { own: true, emissive: 0x000000 }));
    return { g, leds };
  }
  function desk(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z); root.add(g);
    box(2.6, 0.12, 1.6, C.wood, 0, 1.05, 0, g);
    for (const [a, b] of [[-1.1, -0.6], [1.1, -0.6], [-1.1, 0.6], [1.1, 0.6]]) box(0.1, 1, 0.1, 0x333333, a, 0.5, b, g);
    box(1.3, 0.8, 0.08, 0x111418, -0.1, 1.6, -0.45, g);
    const screen = box(1.18, 0.66, 0.02, 0x1a2a22, -0.1, 1.6, -0.4, g, { own: true, emissive: 0x1b6b45, emissiveIntensity: 0.6 });
    box(0.8, 0.04, 0.3, 0x2a2e36, 0, 1.13, 0.15, g);
    return { g, screen };
  }

  /* ---------- 움직이는 물건 ---------- */
  function pkg(c, text, size = 0.72) {
    const g = new THREE.Group();
    const m = box(size, size, size, c, 0, 0, 0, g, { own: true, emissive: c, emissiveIntensity: 0.15, roughness: 0.5 });
    g.userData.m = m;
    root.add(g);
    if (text) g.userData.lb = label(text, 0, size / 2 + 0.5, 0, { fs: 34, h: 0.55 }, g);
    return g;
  }
  function recolor(p, c) { p.userData.m.material.color.setHex(c); p.userData.m.material.emissive.setHex(c); }
  function remove(obj) { world.disposeObject(obj); }
  function fadeOut(obj, after = 0) {
    let k = -after;
    world.ticks.push((dt) => {
      k += dt;
      if (k < 0) return true;
      const s = Math.max(0, 1 - k * 2.2);
      obj.scale.setScalar(s); obj.position.y += dt * 1.2;
      if (s <= 0) { remove(obj); return false; }
      return true;
    });
  }
  const V = (x, z, y = ITEM_Y) => new THREE.Vector3(x, y, z);

  /* ---------- 작업 ---------- */
  const run = (gen) => world.jobs.push({ g: gen, c: null });
  const move = (obj, pts, speed = 4) => ({ move: obj, pts, speed });
  const wait = (s) => ({ wait: s });
  const until = (f) => ({ until: f });
  function every(sec, fn, first = 0) {
    const sv = () => (typeof sec === 'function' ? sec() : sec);
    let acc = sv() - first;
    world.ticks.push((dt) => { acc += dt; if (acc >= sv()) { acc = 0; fn(); } return true; });
  }
  /** 시간이 sim 속도를 따라가는 지연 실행 (setTimeout 대신 사용) */
  function later(sec, fn) {
    let k = 0;
    world.ticks.push((dt) => { k += dt; if (k >= sec) { fn(); return false; } return true; });
  }
  /** 공중으로 날아가는 신호(헬스 체크, 알림 등) */
  function ping(from, to, c, speed = 9, h = 2.6) {
    const s = sphere(0.2, c, root, { emissive: c, emissiveIntensity: 1 });
    run((function* () {
      yield move(s, [V(from[0], from[1], h), V((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, h + 1.2), V(to[0], to[1], h)], speed);
      remove(s);
    })());
  }

  /* ---------- UI로 보내는 신호 ---------- */
  const cap = (text) => world.emit('caption', text);
  const hl = (i) => world.emit('flow', i);
  const addRow = (r) => world.addRow(r);
  const touch = () => world.touch();
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rnd = (a, b) => a + Math.random() * (b - a);

  return {
    THREE, C, world, root, V, mat, box, cyl, sphere, label, setLabel, belt, hazardLine,
    station, person, rack, desk, pkg, recolor, remove, fadeOut,
    run, move, wait, until, every, later, ping, cap, hl, addRow, touch, pick, rnd,
  };
}
