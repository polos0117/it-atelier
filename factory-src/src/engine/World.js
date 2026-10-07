import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createKit } from './kit.js';

/**
 * 3D 무대 + 시뮬레이션 루프.
 * - 작업(job)은 제너레이터로 작성: yield move(...) / wait(s) / until(fn)
 * - tick은 매 프레임 호출되는 함수 (false를 반환하면 제거)
 * - 장면이 만든 메시는 모두 root 아래에 두고, 장면 전환/제거 시 GPU 자원을 정리한다.
 */
export class World {
  constructor(host) {
    this.host = host;
    this.speed = 1;
    this.paused = false;
    this.t = 0;
    this.jobs = [];
    this.ticks = [];
    this.belts = [];
    this.rows = [];
    this.rowsDirty = true;
    this.labelScale = 1;
    this.listeners = {};
    this.sharedGeo = new Set();
    this.sharedMat = new Set();
    this.scene = null;
    this.state = null;

    const mobile = matchMedia('(pointer: coarse)').matches;
    this.renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(mobile ? 1.5 : 2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.prepend(this.renderer.domElement);

    // WebGL 컨텍스트를 잃으면(메모리 부족, 백그라운드 전환 등) 알리고, 복구되면 장면을 다시 만든다
    const cv = this.renderer.domElement;
    cv.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.emit('context', false); });
    cv.addEventListener('webglcontextrestored', () => { this.emit('context', true); if (this.scene) this.load(this.scene); });

    this.three = new THREE.Scene();
    this.three.background = new THREE.Color(0x111318);
    this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -200, 200);
    this.camera.position.set(20, 22, 20);
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, cv);
    Object.assign(this.controls, { enableDamping: true, enablePan: false, minPolarAngle: 0.45, maxPolarAngle: 1.25, minZoom: 0.6, maxZoom: 2.4 });

    this.three.add(new THREE.HemisphereLight(0xc8d6ff, 0x0c0c0e, 2.2));
    const sun = new THREE.DirectionalLight(0xfff4e0, 2.6);
    sun.position.set(12, 26, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 80 });
    sun.shadow.bias = -0.0005;
    this.three.add(sun);
    const warm = new THREE.PointLight(0xffc773, 60, 40, 1.4);
    warm.position.set(-6, 8, -6);
    this.three.add(warm);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.three.add(floor);
    const grid = new THREE.GridHelper(120, 60, 0x23262d, 0x1c1f25);
    grid.position.y = 0.01;
    this.three.add(grid);

    this.root = new THREE.Group();
    this.three.add(this.root);
    this.kit = createKit(this);

    this.resize = this.resize.bind(this);
    this.ro = new ResizeObserver(this.resize);
    this.ro.observe(host);
    this.resize();

    this.last = performance.now();
    this.statClock = 0;
    this.onVis = () => { this.last = performance.now(); };
    document.addEventListener('visibilitychange', this.onVis);
    this.renderer.setAnimationLoop(this.frame);
  }

  /* ---------- 이벤트 ---------- */
  on(ev, fn) {
    (this.listeners[ev] ??= []).push(fn);
    return () => { this.listeners[ev] = this.listeners[ev].filter((f) => f !== fn); };
  }
  emit(ev, data) { (this.listeners[ev] || []).forEach((f) => f(data)); }

  /* ---------- 화면 크기 ---------- */
  resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    const a = w / h;
    let hw, hh;
    if (a < 1) { hw = 8.8; hh = hw / a; } else { hh = Math.max(8.5, 13.5 / a); hw = hh * a; }
    const ls = a < 1 ? 1.55 : 1;
    if (ls !== this.labelScale) {
      const r = ls / this.labelScale;
      this.labelScale = ls;
      this.root.traverse((o) => { if (o.isSprite) o.scale.multiplyScalar(r); });
    }
    Object.assign(this.camera, { left: -hw, right: hw, top: hh * 1.18, bottom: -hh * 0.82 });
    this.camera.updateProjectionMatrix();
  }

  /* ---------- 장면 ---------- */
  load(sceneDef) {
    this.clear();
    this.scene = sceneDef;
    this.state = sceneDef.build(this.kit) || {};
    this.emit('loaded', sceneDef);
    this.emitRows(true);
  }

  clear() {
    for (const c of [...this.root.children]) this.disposeObject(c);
    this.jobs = [];
    this.ticks = [];
    this.belts = [];
    this.rows = [];
    this.t = 0;
    this.rowsDirty = true;
    this.emit('caption', '');
  }

  /** 객체를 장면에서 떼어내고, 공유 자원이 아닌 지오메트리·재질·텍스처를 해제한다. */
  disposeObject(obj) {
    obj.removeFromParent();
    obj.traverse((o) => {
      if (o.geometry && !this.sharedGeo.has(o.geometry)) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        if (this.sharedMat.has(m)) continue;
        if (m.map) m.map.dispose();
        m.dispose();
      }
    });
  }

  /* ---------- 루프 ---------- */
  frame = (now) => {
    const raw = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    const dt = this.paused ? 0 : raw * this.speed;
    this.t += dt;
    this.stepJobs(dt);
    for (let i = this.ticks.length - 1; i >= 0; i--) {
      let keep;
      try { keep = this.ticks[i](dt); } catch (err) { console.error('[tick]', err); keep = false; }
      if (keep === false) this.ticks.splice(i, 1);
    }
    for (const b of this.belts) b.tex.offset.x -= (dt * 4) / 1.1;
    this.controls.update();
    this.renderer.render(this.three, this.camera);

    this.statClock += raw;
    if (this.statClock > 0.25) {
      this.statClock = 0;
      this.emitRows();
      if (this.scene?.stats) {
        try { this.emit('stats', this.scene.stats(this.state)); } catch (err) { console.error('[stats]', err); }
      }
      this.emit('debug', { geometries: this.renderer.info.memory.geometries, textures: this.renderer.info.memory.textures, jobs: this.jobs.length });
    }
  };

  stepJobs(dt) {
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      const j = this.jobs[i];
      let left = dt, guard = 0;
      try {
        while (guard++ < 30) {
          if (!j.c) {
            const r = j.g.next();
            if (r.done) { this.jobs.splice(i, 1); break; }
            j.c = r.value || {};
            if (j.c.move) {
              const p = j.c.pts;
              j.c.seg = [];
              let L = 0;
              for (let k = 1; k < p.length; k++) { const l = p[k].distanceTo(p[k - 1]); j.c.seg.push(l); L += l; }
              j.c.len = L; j.c.d = 0;
              j.c.move.position.copy(p[0]);
            }
          }
          const c = j.c;
          if (c.wait != null) { c.wait -= left; left = 0; if (c.wait > 0) break; j.c = null; continue; }
          if (c.until) { if (!c.until()) break; j.c = null; continue; }
          if (c.move) {
            c.d += c.speed * left; left = 0;
            let d = Math.min(c.d, c.len), k = 0;
            while (k < c.seg.length - 1 && d > c.seg[k]) { d -= c.seg[k]; k++; }
            const a = c.pts[k], b = c.pts[k + 1] || a, f = c.seg[k] ? d / c.seg[k] : 1;
            c.move.position.lerpVectors(a, b, Math.min(1, f));
            if (c.d < c.len) break;
            j.c = null; continue;
          }
          j.c = null;
        }
      } catch (err) {
        // 작업 하나가 실패해도 루프 전체가 멈추지 않도록 그 작업만 제거
        console.error('[job]', err);
        const idx = this.jobs.indexOf(j);
        if (idx >= 0) this.jobs.splice(idx, 1);
      }
    }
  }

  /* ---------- 기록 표 ---------- */
  addRow(r) {
    r._id = (this._rowId = (this._rowId || 0) + 1);
    this.rows.unshift(r);
    if (this.rows.length > 8) this.rows.length = 8;
    this.rowsDirty = true;
    return r;
  }
  touch() { this.rowsDirty = true; }
  emitRows(force) {
    if (!this.rowsDirty && !force) return;
    this.rowsDirty = false;
    this.emit('rows', this.rows.map((r) => ({ ...r })));
  }

  destroy() {
    this.renderer.setAnimationLoop(null);
    this.clear();
    this.ro.disconnect();
    document.removeEventListener('visibilitychange', this.onVis);
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
