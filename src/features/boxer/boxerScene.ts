import * as THREE from 'three';
import type { Skeleton } from './rig';
import type { V3 } from './vec';

export const BOXER_COLORS = {
  bg: '#0A0A0B',
  body: '#8C9099',
  glove: '#E10600',
  shorts: '#141416',
  gold: '#D4A017',
  shoe: '#1C1C20',
  floor: '#111113',
};
export type BoxerColors = typeof BOXER_COLORS;

const TRAIL = 16;
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const tv = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);

export interface BoxerScene {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  /** Pose figure `index` (default 0) from a skeleton. */
  update: (s: Skeleton, index?: number) => void;
  /** Place the orbit camera: azimuth 0 = front, elevation in radians. */
  aim: (azimuth: number, elevation: number, distance?: number) => void;
  render: () => void;
  resize: (w: number, h: number) => void;
  dispose: () => void;
}

/** Fight-night ring, lights and a procedural boxer driven by rig skeletons. */
export interface BoxerSceneOptions {
  colors?: Partial<BoxerColors>;
  trails?: boolean;
  preserveDrawingBuffer?: boolean;
  /** 'human' adds skin-toned facial features and hair (used for pose-tracking test footage). */
  face?: 'mannequin' | 'human';
  /** Torso colour, e.g. a tank top (default: same as the body). */
  shirt?: string;
  /** Bare fists and fuller limbs instead of gloves (shadowboxing look). */
  bareHands?: boolean;
  /** Several boxers in one ring (e.g. sparring); each may override colours. Default: one. */
  figures?: { colors?: Partial<BoxerColors> }[];
  /** Point the orbit camera looks at. */
  target?: [number, number, number];
}

export function createBoxerScene(opts: BoxerSceneOptions = {}): BoxerScene {
  const COLORS = { ...BOXER_COLORS, ...opts.colors };
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: !!opts.preserveDrawingBuffer });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(COLORS.bg);
  renderer.domElement.style.display = 'block';

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(COLORS.bg, 5, 11);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
  const target = new THREE.Vector3(0, 1.0, 0.15);

  // Lights: warm key with shadows, red rim, gold kicker.
  scene.add(new THREE.HemisphereLight(0xffffff, 0x220404, 0.55));
  const key = new THREE.DirectionalLight(0xfff1e0, 2.2);
  key.position.set(2.2, 4.5, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -2, right: 2, top: 2.5, bottom: -1, near: 1, far: 10 });
  scene.add(key);
  const rim = new THREE.PointLight(0xe10600, 30, 8);
  rim.position.set(-2, 2.6, -2.2);
  scene.add(rim);
  const kicker = new THREE.PointLight(0xd4a017, 10, 6);
  kicker.position.set(2.5, 0.6, -1.5);
  scene.add(kicker);

  // Ring floor.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3.4, 64), new THREE.MeshStandardMaterial({ color: COLORS.floor, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const ringLine = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.09, 96), new THREE.MeshBasicMaterial({ color: COLORS.glove }));
  ringLine.rotation.x = -Math.PI / 2;
  ringLine.position.y = 0.002;
  scene.add(ringLine);
  const centre = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.47, 64), new THREE.MeshBasicMaterial({ color: COLORS.gold, transparent: true, opacity: 0.5 }));
  centre.rotation.x = -Math.PI / 2;
  centre.position.y = 0.002;
  scene.add(centre);

  /** One boxer: meshes plus an update that poses them from a rig skeleton. */
  const buildFigure = (COLORS: BoxerColors) => {
    // Materials & shared geometry.
    const mat = {
      body: new THREE.MeshStandardMaterial({ color: COLORS.body, roughness: 0.55, metalness: 0.15 }),
      glove: new THREE.MeshStandardMaterial({ color: COLORS.glove, roughness: 0.32, metalness: 0.05 }),
      shorts: new THREE.MeshStandardMaterial({ color: COLORS.shorts, roughness: 0.7 }),
      gold: new THREE.MeshStandardMaterial({ color: COLORS.gold, roughness: 0.35, metalness: 0.6 }),
      shoe: new THREE.MeshStandardMaterial({ color: COLORS.shoe, roughness: 0.6 }),
      eye: new THREE.MeshBasicMaterial({ color: '#050505' }),
    };
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 18);
    const sph = new THREE.SphereGeometry(1, 24, 16);
    const make = (geo: THREE.BufferGeometry, m: THREE.Material) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.castShadow = true;
      scene.add(mesh);
      return mesh;
    };

    const limb = (r: number, m = mat.body) => ({ mesh: make(cyl, m), r });
    const joint = (r: number, m = mat.body) => {
      const mesh = make(sph, m);
      mesh.scale.setScalar(r);
      return mesh;
    };
    const parts = {
      upperL: limb(opts.bareHands ? 0.058 : 0.048), upperR: limb(opts.bareHands ? 0.058 : 0.048),
      foreL: limb(opts.bareHands ? 0.046 : 0.04), foreR: limb(opts.bareHands ? 0.046 : 0.04),
      thighL: limb(0.078, mat.shorts), thighR: limb(0.078, mat.shorts), shinL: limb(0.056), shinR: limb(0.056), neck: limb(0.05),
      shL: joint(0.065), shR: joint(0.065), elL: joint(0.045), elR: joint(0.045), knL: joint(0.06), knR: joint(0.06),
    };
    const torso = make(new THREE.CapsuleGeometry(0.15, 0.26, 8, 20), opts.shirt ? new THREE.MeshStandardMaterial({ color: opts.shirt, roughness: 0.8 }) : mat.body);
    const shorts = make(new THREE.CylinderGeometry(0.17, 0.18, 0.24, 24), mat.shorts);
    const belt = make(new THREE.CylinderGeometry(0.175, 0.175, 0.04, 24), mat.gold);
    const head = make(sph, mat.body);
    head.scale.set(0.105, 0.12, 0.11);
    const eyes = [make(sph, mat.eye), make(sph, mat.eye)];
    eyes.forEach((e) => e.scale.setScalar(0.014));
    // Optional human features: a face reads as "front" to pose models, hair as "back".
    const human = opts.face === 'human';
    const feature = (m: THREE.Material) => {
      const mesh = make(sph, m);
      mesh.visible = human;
      return mesh;
    };
    const white = new THREE.MeshStandardMaterial({ color: '#F2F2F2', roughness: 0.4 });
    const dark = new THREE.MeshStandardMaterial({ color: '#2A1A12', roughness: 0.8 });
    const lips = new THREE.MeshStandardMaterial({ color: '#8E4A44', roughness: 0.6 });
    const face = {
      sclera: [feature(white), feature(white)],
      brows: [feature(dark), feature(dark)],
      nose: feature(mat.body),
      mouth: feature(lips),
      ears: [feature(mat.body), feature(mat.body)],
      hair: feature(dark),
    };
    const gloves = [make(sph, opts.bareHands ? mat.body : mat.glove), make(sph, opts.bareHands ? mat.body : mat.glove)];
    const cuffs = [make(cyl, mat.gold), make(cyl, mat.gold)];
    const shoes = [make(new THREE.BoxGeometry(0.1, 0.07, 0.25), mat.shoe), make(new THREE.BoxGeometry(0.1, 0.07, 0.25), mat.shoe)];

    // Glove trails.
    const trails = [0, 1].map((i) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3));
      const colors = new Float32Array(TRAIL * 3);
      const c = new THREE.Color(i === 0 ? COLORS.glove : COLORS.gold);
      const bg = new THREE.Color(COLORS.bg);
      for (let k = 0; k < TRAIL; k++) {
        const mix = bg.clone().lerp(c, 1 - k / TRAIL);
        colors.set([mix.r, mix.g, mix.b], k * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true }));
      line.visible = opts.trails !== false;
      scene.add(line);
      return { geo, pts: [] as THREE.Vector3[] };
    });

    const placeLimb = (part: { mesh: THREE.Mesh; r: number }, a: V3, b: V3) => {
      const A = tv(a), B = tv(b);
      const dir = B.clone().sub(A);
      const length = dir.length();
      part.mesh.position.copy(A).add(B).multiplyScalar(0.5);
      part.mesh.quaternion.setFromUnitVectors(Y, dir.normalize());
      part.mesh.scale.set(part.r, length, part.r);
    };
    const basis = new THREE.Matrix4();
    const orient = (mesh: THREE.Object3D, up: V3, forward: V3) => {
      const u = tv(up).normalize();
      const f = tv(forward).sub(u.clone().multiplyScalar(tv(forward).dot(u))).normalize();
      const x = new THREE.Vector3().crossVectors(u, f).normalize();
      basis.makeBasis(x, u, f);
      mesh.quaternion.setFromRotationMatrix(basis);
    };

    const update = (s: Skeleton) => {
      placeLimb(parts.upperL, s.lShoulder, s.lElbow);
      placeLimb(parts.upperR, s.rShoulder, s.rElbow);
      placeLimb(parts.foreL, s.lElbow, s.lWrist);
      placeLimb(parts.foreR, s.rElbow, s.rWrist);
      placeLimb(parts.thighL, s.lHip, s.lKnee);
      placeLimb(parts.thighR, s.rHip, s.rKnee);
      placeLimb(parts.shinL, s.lKnee, s.lAnkle);
      placeLimb(parts.shinR, s.rKnee, s.rAnkle);
      placeLimb(parts.neck, s.chest, s.head);
      parts.shL.position.copy(tv(s.lShoulder));
      parts.shR.position.copy(tv(s.rShoulder));
      parts.elL.position.copy(tv(s.lElbow));
      parts.elR.position.copy(tv(s.rElbow));
      parts.knL.position.copy(tv(s.lKnee));
      parts.knR.position.copy(tv(s.rKnee));

      const up = tv(s.chestUp);
      torso.position.copy(tv(s.pelvis).lerp(tv(s.chest), 0.55));
      orient(torso, s.chestUp, s.chestForward);
      torso.scale.set(1.25, 1, 0.72);
      shorts.position.copy(tv(s.pelvis).add(new THREE.Vector3(0, -0.02, 0)));
      orient(shorts, [0, 1, 0], s.pelvisForward);
      shorts.scale.set(1, 1, 0.78);
      belt.position.copy(shorts.position).add(new THREE.Vector3(0, 0.12, 0));
      belt.quaternion.copy(shorts.quaternion);
      belt.scale.set(1, 1, 0.78);

      head.position.copy(tv(s.head));
      orient(head, s.chestUp, s.chestForward);
      const fwd = tv(s.chestForward);
      const side = new THREE.Vector3().crossVectors(up, fwd).normalize();
      eyes[0].position.copy(head.position).addScaledVector(fwd, 0.095).addScaledVector(side, 0.035).addScaledVector(up, 0.02);
      eyes[1].position.copy(head.position).addScaledVector(fwd, 0.095).addScaledVector(side, -0.035).addScaledVector(up, 0.02);
      if (human) {
        const at = (m: THREE.Mesh, f: number, sd: number, u: number, sx: number, sy: number, sz: number) => {
          m.position.copy(head.position).addScaledVector(fwd, f).addScaledVector(side, sd).addScaledVector(up, u);
          m.quaternion.copy(head.quaternion);
          m.scale.set(sx, sy, sz);
        };
        eyes.forEach((e, i) => at(e, 0.104, i ? -0.036 : 0.036, 0.02, 0.009, 0.009, 0.006));
        face.sclera.forEach((e, i) => at(e, 0.096, i ? -0.036 : 0.036, 0.02, 0.019, 0.013, 0.01));
        face.brows.forEach((e, i) => at(e, 0.1, i ? -0.038 : 0.038, 0.045, 0.024, 0.006, 0.008));
        at(face.nose, 0.11, 0, -0.005, 0.016, 0.026, 0.02);
        at(face.mouth, 0.1, 0, -0.05, 0.03, 0.008, 0.01);
        face.ears.forEach((e, i) => at(e, 0, i ? -0.105 : 0.105, 0.0, 0.016, 0.03, 0.022));
        at(face.hair, -0.025, 0, 0.03, 0.112, 0.12, 0.105);
      }

      ([[s.lWrist, s.lGlove], [s.rWrist, s.rGlove]] as [V3, V3][]).forEach(([w, g], i) => {
        const dir = tv(g).sub(tv(w)).normalize();
        gloves[i].position.copy(tv(g));
        gloves[i].quaternion.setFromUnitVectors(Z, dir);
        if (opts.bareHands) gloves[i].scale.set(0.045, 0.05, 0.06);
        else gloves[i].scale.set(0.066, 0.062, 0.088);
        cuffs[i].position.copy(tv(w));
        cuffs[i].quaternion.setFromUnitVectors(Y, dir);
        cuffs[i].scale.set(0.045, 0.05, 0.045);
        const tr = trails[i];
        tr.pts.unshift(tv(g));
        if (tr.pts.length > TRAIL) tr.pts.pop();
        const arr = tr.geo.attributes.position.array as Float32Array;
        for (let k = 0; k < TRAIL; k++) {
          const p = tr.pts[Math.min(k, tr.pts.length - 1)];
          arr.set([p.x, p.y, p.z], k * 3);
        }
        tr.geo.attributes.position.needsUpdate = true;
      });

      ([[s.lHeel, s.lToe], [s.rHeel, s.rToe]] as [V3, V3][]).forEach(([h, t], i) => {
        const H = tv(h), T = tv(t);
        shoes[i].position.copy(H).add(T).multiplyScalar(0.5);
        shoes[i].position.y = 0.04;
        shoes[i].rotation.set(0, Math.atan2(T.x - H.x, T.z - H.z), 0);
      });
    };
    return update;
  };
  const figures = (opts.figures ?? [{}]).map((f) => buildFigure({ ...COLORS, ...f.colors }));
  const update = (s: Skeleton, index = 0) => figures[index]?.(s);
  if (opts.target) target.set(...opts.target);

  return {
    renderer,
    camera,
    update,
    aim(azimuth, elevation, dist = 3.6) {
      camera.position.set(
        target.x + Math.sin(azimuth) * Math.cos(elevation) * dist,
        target.y + Math.sin(elevation) * dist + 0.25,
        target.z + Math.cos(azimuth) * Math.cos(elevation) * dist,
      );
      camera.lookAt(target);
    },
    render: () => renderer.render(scene, camera),
    resize(w, h) {
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = `${w}px`;
      renderer.domElement.style.height = `${h}px`;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    dispose() {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mm = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mm) ? mm : mm ? [mm] : []).forEach((x) => x.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
