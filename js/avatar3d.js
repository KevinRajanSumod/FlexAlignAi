/**
 * FlexAlign AI - 3D WebGL Avatar Renderer
 * Uses Three.js (via ES module importmap) to render a fully 3D articulated body figure
 * that animates from MediaPipe landmark positions.
 * Features: OrbitControls drag-to-rotate, metallic emissive materials, cyber backdrop.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Avatar3DRenderer {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.canvas = null;
    this.animFrameId = null;
    this.isReady = false;

    // Body segment meshes keyed by name
    this.segments = {};
    this.joints = {};
    this.platformRing = null;
  }

  /**
   * Initialize Three.js scene on the given canvas element.
   */
  init(canvasEl) {
    this.canvas = canvasEl;

    // --- Scene ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060b17);
    this.scene.fog = new THREE.FogExp2(0x060b17, 0.035);

    // --- Camera ---
    const w = canvasEl.clientWidth || 1280;
    const h = canvasEl.clientHeight || 720;
    const aspect = w / h;
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 100);
    this.camera.position.set(0, 0.5, 5.5);
    this.camera.lookAt(0, 0.2, 0);

    // --- Renderer ---
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0x0a1030, 3.0);
    this.scene.add(ambientLight);

    const rimLight = new THREE.DirectionalLight(0x00f0ff, 2.5);
    rimLight.position.set(-4, 3, -2);
    this.scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x8b5cf6, 1.8);
    fillLight.position.set(4, 2, 3);
    this.scene.add(fillLight);

    const topLight = new THREE.SpotLight(0xffffff, 3.0, 20, Math.PI / 6);
    topLight.position.set(0, 8, 2);
    topLight.castShadow = true;
    topLight.shadow.mapSize.width = 1024;
    topLight.shadow.mapSize.height = 1024;
    this.scene.add(topLight);

    // --- Grid Floor ---
    this._buildFloor();

    // --- Cyber Grid Lines ---
    this._buildGridLines();

    // --- Body Segments ---
    this._buildAvatar();

    // --- OrbitControls ---
    this.controls = new OrbitControls(this.camera, canvasEl);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 12;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.target.set(0, 0.2, 0);

    this.isReady = true;
    this._renderLoop();
  }

  _buildFloor() {
    const geo = new THREE.PlaneGeometry(10, 10);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x050a15,
      roughness: 0.85,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.1;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Glowing platform ring
    const ringGeo = new THREE.RingGeometry(0.9, 1.05, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -2.09;
    this.scene.add(ring);
    this.platformRing = ring;
  }

  _buildGridLines() {
    const material = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.06
    });
    const group = new THREE.Group();
    const size = 10;
    const divisions = 20;
    const step = size / divisions;
    for (let i = 0; i <= divisions; i++) {
      const pos = -size / 2 + i * step;
      const g1 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(pos, -2.1, -size / 2),
        new THREE.Vector3(pos, -2.1, size / 2)
      ]);
      group.add(new THREE.Line(g1, material));
      const g2 = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-size / 2, -2.1, pos),
        new THREE.Vector3(size / 2, -2.1, pos)
      ]);
      group.add(new THREE.Line(g2, material));
    }
    this.scene.add(group);
  }

  _makeLimb(length, radius, color, emissiveColor, emissiveIntensity = 0.4) {
    const geo = new THREE.CapsuleGeometry(radius, length, 8, 16);
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      emissive: emissiveColor,
      emissiveIntensity,
      metalness: 0.65,
      roughness: 0.28,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }

  _makeJoint(radius, color) {
    const geo = new THREE.SphereGeometry(radius, 16, 16);
    const mat = new THREE.MeshPhysicalMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.8,
      metalness: 0.8,
      roughness: 0.15,
      clearcoat: 1.0
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  }

  _buildAvatar() {
    const CYAN = 0x00f0ff;
    const PURPLE = 0x8b5cf6;
    const WHITE = 0xe0f0ff;

    this.avatarRoot = new THREE.Group();
    this.scene.add(this.avatarRoot);

    // Head
    const headGeo = new THREE.SphereGeometry(0.22, 20, 20);
    const headMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a2a4a,
      emissive: CYAN,
      emissiveIntensity: 0.2,
      metalness: 0.5,
      roughness: 0.4,
      clearcoat: 0.8
    });
    this.segments.head = new THREE.Mesh(headGeo, headMat);
    this.segments.head.castShadow = true;
    this.avatarRoot.add(this.segments.head);

    // Torso
    this.segments.torso = this._makeLimb(0.75, 0.18, 0x0d1f3a, PURPLE, 0.3);
    this.avatarRoot.add(this.segments.torso);

    // Upper Arms
    this.segments.upperArmL = this._makeLimb(0.38, 0.075, 0x0d2035, CYAN, 0.35);
    this.segments.upperArmR = this._makeLimb(0.38, 0.075, 0x0d2035, CYAN, 0.35);
    this.avatarRoot.add(this.segments.upperArmL);
    this.avatarRoot.add(this.segments.upperArmR);

    // Forearms
    this.segments.foreArmL = this._makeLimb(0.35, 0.065, 0x0d2035, CYAN, 0.4);
    this.segments.foreArmR = this._makeLimb(0.35, 0.065, 0x0d2035, CYAN, 0.4);
    this.avatarRoot.add(this.segments.foreArmL);
    this.avatarRoot.add(this.segments.foreArmR);

    // Thighs
    this.segments.thighL = this._makeLimb(0.48, 0.10, 0x0d2035, PURPLE, 0.3);
    this.segments.thighR = this._makeLimb(0.48, 0.10, 0x0d2035, PURPLE, 0.3);
    this.avatarRoot.add(this.segments.thighL);
    this.avatarRoot.add(this.segments.thighR);

    // Shins
    this.segments.shinL = this._makeLimb(0.44, 0.08, 0x0d2035, CYAN, 0.3);
    this.segments.shinR = this._makeLimb(0.44, 0.08, 0x0d2035, CYAN, 0.3);
    this.avatarRoot.add(this.segments.shinL);
    this.avatarRoot.add(this.segments.shinR);

    // Joint spheres
    const jointDefs = [
      ['shoulderL', true], ['shoulderR', true],
      ['elbowL', true],    ['elbowR', true],
      ['wristL', false],   ['wristR', false],
      ['hipL', false],     ['hipR', false],
      ['kneeL', true],     ['kneeR', true],
      ['ankleL', false],   ['ankleR', false]
    ];
    jointDefs.forEach(([name, isActive]) => {
      const r = isActive ? 0.085 : 0.065;
      const col = isActive ? CYAN : WHITE;
      this.joints[name] = this._makeJoint(r, col);
      this.avatarRoot.add(this.joints[name]);
    });

    // Set default T-pose
    this._applyDefaultPose();
  }

  _applyDefaultPose() {
    this.segments.head.position.set(0, 1.95, 0);
    this.segments.torso.position.set(0, 1.0, 0);

    this.segments.upperArmL.position.set(-0.45, 1.35, 0);
    this.segments.upperArmR.position.set(0.45, 1.35, 0);
    this.segments.foreArmL.position.set(-0.58, 0.85, 0);
    this.segments.foreArmR.position.set(0.58, 0.85, 0);

    this.segments.thighL.position.set(-0.18, 0.25, 0);
    this.segments.thighR.position.set(0.18, 0.25, 0);
    this.segments.shinL.position.set(-0.18, -0.55, 0);
    this.segments.shinR.position.set(0.18, -0.55, 0);

    this.segments.upperArmL.rotation.z = Math.PI / 2.5;
    this.segments.upperArmR.rotation.z = -Math.PI / 2.5;

    this.joints.shoulderL.position.set(-0.3, 1.55, 0);
    this.joints.shoulderR.position.set(0.3, 1.55, 0);
    this.joints.elbowL.position.set(-0.58, 1.15, 0);
    this.joints.elbowR.position.set(0.58, 1.15, 0);
    this.joints.wristL.position.set(-0.58, 0.68, 0);
    this.joints.wristR.position.set(0.58, 0.68, 0);
    this.joints.hipL.position.set(-0.18, 0.55, 0);
    this.joints.hipR.position.set(0.18, 0.55, 0);
    this.joints.kneeL.position.set(-0.18, -0.05, 0);
    this.joints.kneeR.position.set(0.18, -0.05, 0);
    this.joints.ankleL.position.set(-0.18, -0.75, 0);
    this.joints.ankleR.position.set(0.18, -0.75, 0);
  }

  /**
   * Map normalized MediaPipe [0,1] landmark to 3D scene space.
   * MediaPipe: x=right, y=down; Three.js: x=right, y=up
   */
  _lmTo3D(lm, scale = 4.5) {
    if (!lm) return new THREE.Vector3(0, 0, 0);
    return new THREE.Vector3(
      (lm.x - 0.5) * scale,
      -(lm.y - 0.35) * scale,
      (lm.z || 0) * scale * 0.5
    );
  }

  /**
   * Position a limb mesh between two 3D points.
   * CapsuleGeometry is oriented along Y, length=1 default.
   */
  _placeLimb(mesh, p1, p2) {
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mesh.position.copy(mid);

    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();

    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir.normalize());
    mesh.quaternion.copy(quaternion);
    mesh.scale.set(1, len, 1);
  }

  /**
   * Update the 3D avatar from current MediaPipe landmark positions.
   */
  updatePose(landmarks, exercise, side) {
    if (!this.isReady) return;

    const lm = (i) => this._lmTo3D(landmarks[i]);

    const posHeadTop  = lm(0);
    const posShoulderL = lm(11);
    const posShoulderR = lm(12);
    const posElbowL    = lm(13);
    const posElbowR    = lm(14);
    const posWristL    = lm(15);
    const posWristR    = lm(16);
    const posHipL      = lm(23);
    const posHipR      = lm(24);
    const posKneeL     = lm(25);
    const posKneeR     = lm(26);
    const posAnkleL    = lm(27);
    const posAnkleR    = lm(28);

    const midShoulder = new THREE.Vector3().addVectors(posShoulderL, posShoulderR).multiplyScalar(0.5);
    const midHip      = new THREE.Vector3().addVectors(posHipL, posHipR).multiplyScalar(0.5);

    // Head sits above shoulder midpoint
    const headPos = midShoulder.clone().add(new THREE.Vector3(0, 0.35, 0));
    this.segments.head.position.copy(headPos);

    // Torso
    this._placeLimb(this.segments.torso, midShoulder, midHip);

    // Arms
    this._placeLimb(this.segments.upperArmL, posShoulderL, posElbowL);
    this._placeLimb(this.segments.upperArmR, posShoulderR, posElbowR);
    this._placeLimb(this.segments.foreArmL,  posElbowL, posWristL);
    this._placeLimb(this.segments.foreArmR,  posElbowR, posWristR);

    // Legs
    this._placeLimb(this.segments.thighL, posHipL, posKneeL);
    this._placeLimb(this.segments.thighR, posHipR, posKneeR);
    this._placeLimb(this.segments.shinL,  posKneeL, posAnkleL);
    this._placeLimb(this.segments.shinR,  posKneeR, posAnkleR);

    // Joint spheres
    this.joints.shoulderL.position.copy(posShoulderL);
    this.joints.shoulderR.position.copy(posShoulderR);
    this.joints.elbowL.position.copy(posElbowL);
    this.joints.elbowR.position.copy(posElbowR);
    this.joints.wristL.position.copy(posWristL);
    this.joints.wristR.position.copy(posWristR);
    this.joints.hipL.position.copy(posHipL);
    this.joints.hipR.position.copy(posHipR);
    this.joints.kneeL.position.copy(posKneeL);
    this.joints.kneeR.position.copy(posKneeR);
    this.joints.ankleL.position.copy(posAnkleL);
    this.joints.ankleR.position.copy(posAnkleR);

    // Highlight active joint with animated pulsing emissive
    this._updateActiveHighlight(exercise, side);

    // Animate platform ring opacity
    if (this.platformRing) {
      this.platformRing.material.opacity = 0.2 + 0.15 * Math.sin(Date.now() * 0.003);
    }
  }

  _updateActiveHighlight(exercise, side) {
    const isLeft = side === 'left';
    // Reset all
    Object.values(this.joints).forEach(j => {
      j.material.emissiveIntensity = 0.8;
    });

    // Pulse the active joint
    const pulse = 2.5 + Math.sin(Date.now() * 0.006) * 0.5;
    if (exercise === 'curl') {
      const j = isLeft ? this.joints.elbowL : this.joints.elbowR;
      if (j) j.material.emissiveIntensity = pulse;
    } else if (exercise === 'squat') {
      [this.joints.kneeL, this.joints.kneeR].forEach(j => {
        if (j) j.material.emissiveIntensity = pulse;
      });
    } else if (exercise === 'raise') {
      const j = isLeft ? this.joints.shoulderL : this.joints.shoulderR;
      if (j) j.material.emissiveIntensity = pulse;
    }
  }

  _renderLoop() {
    this.animFrameId = requestAnimationFrame(() => this._renderLoop());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  resize(width, height) {
    if (!this.isReady) return;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  show() {
    if (this.canvas) this.canvas.style.display = 'block';
  }

  hide() {
    if (this.canvas) this.canvas.style.display = 'none';
  }

  dispose() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.renderer) this.renderer.dispose();
    this.isReady = false;
  }
}
