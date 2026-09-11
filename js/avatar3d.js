/**
 * FlexAlign AI — Interactive 3D Humanoid Avatar Renderer
 * High-fidelity anatomical humanoid figure with fluid kinematics, organic articulation,
 * and full 3D camera navigation (pan, zoom, orbit, view presets, X-Ray mode, joint raycasting).
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { getExerciseDefinition } from './exercises.js';

export class Avatar3DRenderer {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.canvas = null;
    this.animFrameId = null;
    this.isReady = false;

    // Humanoid Body Rig Components
    this.avatarRoot = null;
    this.segments = {};
    this.joints = {};
    this.halos = {};
    this.groundShadow = null;
    this.gridHelper = null;

    // Kinematic Motion Smoothing (Organic Lerp)
    this._smoothedPositions = new Map();
    this._lerpFactor = 0.36; // Ideal balance of responsiveness and fluidity

    // Camera Navigation & Transition State
    this._targetCamPos = null;
    this._targetCamTarget = null;
    this.isAutoOrbit = false;
    this.isXRayMode = false;
    this.activeViewPreset = 'front';

    // Interactive Raycasting for Joint Selection
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredJoint = null;
    this.onJointHover = null;
    this.onJointSelect = null;
  }

  init(canvasEl) {
    this.canvas = canvasEl;
    this.canvas.style.display = 'block';

    // ── Scene ──
    this.scene = new THREE.Scene();

    // Clean Cyber-Studio Gradient Backdrop
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 512;
    bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext('2d');
    const grad = bgCtx.createRadialGradient(256, 200, 30, 256, 256, 420);
    grad.addColorStop(0, '#131b30');
    grad.addColorStop(0.45, '#0b1021');
    grad.addColorStop(1, '#05070e');
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, 512, 512);
    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    this.scene.background = bgTexture;

    // ── Camera ──
    const parent = canvasEl.parentElement;
    const w = (parent ? parent.clientWidth : 0) || canvasEl.clientWidth || 1280;
    const h = (parent ? parent.clientHeight : 0) || canvasEl.clientHeight || 720;
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 0.1, 4.2);
    this.camera.lookAt(0, -0.1, 0);

    // ── Renderer ──
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvasEl,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // ── Lighting (Studio 3-Point + Subtle Rim & Floor Bounce) ──
    this._setupLighting();

    // ── Ground Platform & Floor Grid ──
    this._buildGround();

    // ── Humanoid Biomechanical Avatar ──
    this._buildHumanoid();

    // ── Interactive OrbitControls (Full Pan, Zoom, Rotate, Shift) ──
    this.controls = new OrbitControls(this.camera, canvasEl);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 10.0;
    this.controls.maxPolarAngle = Math.PI * 0.92;
    this.controls.target.set(0, -0.1, 0);

    // FULL INTERACTION CAPABILITIES:
    this.controls.enableRotate = true;
    this.controls.rotateSpeed = 0.85;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.1;
    this.controls.enablePan = true;
    this.controls.panSpeed = 1.0;
    this.controls.screenSpacePanning = true; // Natural left-right / up-down screen pan

    // Mouse bindings: Left = Rotate, Middle/Wheel = Zoom, Right = Pan
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    // Touch bindings: 1-finger rotate, 2-finger pinch/pan
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };

    // Raycaster interactions
    this._initInteractivity(canvasEl);

    this.isReady = true;
    this._renderLoop();
  }

  _setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xdbe4f8, 1.25);
    this.scene.add(ambient);

    // Key Light (Warm Key)
    const keyLight = new THREE.DirectionalLight(0xfff6ea, 2.2);
    keyLight.position.set(3.5, 5.5, 4.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -3.5;
    keyLight.shadow.camera.right = 3.5;
    keyLight.shadow.camera.top = 4.5;
    keyLight.shadow.camera.bottom = -3.5;
    keyLight.shadow.radius = 4;
    this.scene.add(keyLight);

    // Fill Light (Cool Cyan/Indigo)
    const fillLight = new THREE.DirectionalLight(0x70b0ff, 1.1);
    fillLight.position.set(-4.5, 2.5, 2.0);
    this.scene.add(fillLight);

    // Dynamic Rim Light (Electric Blue Contour)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    rimLight.position.set(0, 3.2, -5.0);
    this.scene.add(rimLight);

    // Floor Bounce
    const bounceLight = new THREE.HemisphereLight(0x182444, 0x050811, 0.7);
    this.scene.add(bounceLight);
  }

  _buildGround() {
    // Holographic Circular Platform
    const groundGeo = new THREE.CircleGeometry(3.6, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x080d1a,
      roughness: 0.9,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.82;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Outer Neon Ring Accent
    const ringGeo = new THREE.RingGeometry(1.2, 1.25, 80);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -1.815;
    this.scene.add(ring);
    this.groundShadow = ring;

    // Subtle Precision Floor Grid
    this.gridHelper = new THREE.GridHelper(7.2, 24, 0x38bdf8, 0x182645);
    this.gridHelper.position.y = -1.818;
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.opacity = 0.22;
    this.scene.add(this.gridHelper);
  }

  // ── Material Shaders ──

  _skinMaterial() {
    if (this.isXRayMode) {
      return new THREE.MeshPhysicalMaterial({
        color: 0x0ea5e9,
        roughness: 0.15,
        metalness: 0.85,
        transparent: true,
        opacity: 0.45,
        wireframe: false,
        clearcoat: 0.8
      });
    }
    return new THREE.MeshPhysicalMaterial({
      color: 0xc9a983,
      roughness: 0.55,
      metalness: 0.04,
      clearcoat: 0.18,
      clearcoatRoughness: 0.5,
      sheen: 0.25,
      sheenColor: new THREE.Color(0xf3cca3)
    });
  }

  _clothingMaterial(color = 0x1c2438) {
    if (this.isXRayMode) {
      return new THREE.MeshPhysicalMaterial({
        color: 0x3b82f6,
        roughness: 0.2,
        metalness: 0.7,
        transparent: true,
        opacity: 0.35,
        wireframe: false,
        clearcoat: 0.6
      });
    }
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.72,
      metalness: 0.08,
      clearcoat: 0.12,
      clearcoatRoughness: 0.4
    });
  }

  _jointMaterial(name = '') {
    const isClothed = name.startsWith('hip');
    if (this.isXRayMode) {
      return new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.6,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.85
      });
    }
    return new THREE.MeshPhysicalMaterial({
      color: isClothed ? 0x161d30 : 0xc9a983,
      roughness: 0.6,
      metalness: 0.05,
      clearcoat: 0.15,
      clearcoatRoughness: 0.5
    });
  }

  _updateMaterials() {
    // Re-apply materials to all segments and joints when toggling X-Ray
    if (this.segments.head) {
      this.segments.head.children.forEach(c => {
        if (c.material) c.material = this._skinMaterial();
      });
    }
    if (this.segments.neck) this.segments.neck.material = this._skinMaterial();
    if (this.segments.chest) this.segments.chest.material = this._clothingMaterial(0x1a2236);
    if (this.segments.abdomen) this.segments.abdomen.material = this._clothingMaterial(0x181e30);
    if (this.segments.pelvis) this.segments.pelvis.material = this._clothingMaterial(0x141a2a);
    if (this.segments.collar) this.segments.collar.material = this._clothingMaterial(0x1e2840);

    ['upperArmL', 'upperArmR', 'foreArmL', 'foreArmR', 'handL', 'handR', 'shinL', 'shinR'].forEach(k => {
      if (this.segments[k]) this.segments[k].material = this._skinMaterial();
    });
    ['thighL', 'thighR'].forEach(k => {
      if (this.segments[k]) this.segments[k].material = this._clothingMaterial(0x151c2e);
    });
    ['footL', 'footR'].forEach(k => {
      if (this.segments[k]) this.segments[k].material = this._clothingMaterial(0x20263c);
    });

    Object.keys(this.joints).forEach(name => {
      if (this.joints[name]) this.joints[name].material = this._jointMaterial(name);
    });
  }

  // ── Humanoid Builder ──

  _buildHumanoid() {
    this.avatarRoot = new THREE.Group();
    this.scene.add(this.avatarRoot);

    // 1. HEAD & CRANIAL VAULT
    const headGroup = new THREE.Group();
    const headGeo = new THREE.SphereGeometry(0.18, 28, 24);
    const headMesh = new THREE.Mesh(headGeo, this._skinMaterial());
    headMesh.scale.set(0.95, 1.12, 1.0);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Nose bridge
    const noseGeo = new THREE.SphereGeometry(0.035, 10, 10);
    const nose = new THREE.Mesh(noseGeo, this._skinMaterial());
    nose.position.set(0, -0.02, 0.17);
    nose.scale.set(0.7, 0.7, 1.2);
    headGroup.add(nose);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.032, 10, 10);
    const earL = new THREE.Mesh(earGeo, this._skinMaterial());
    earL.position.set(-0.17, 0, 0);
    earL.scale.set(0.5, 1, 0.8);
    headGroup.add(earL);
    const earR = earL.clone();
    earR.position.set(0.17, 0, 0);
    headGroup.add(earR);

    this.segments.head = headGroup;
    this.avatarRoot.add(headGroup);

    // 2. NECK (Cervical Spine)
    const neckGeo = new THREE.CylinderGeometry(0.062, 0.072, 1.0, 18);
    this.segments.neck = new THREE.Mesh(neckGeo, this._skinMaterial());
    this.segments.neck.castShadow = true;
    this.avatarRoot.add(this.segments.neck);

    // 3. SHOULDER GIRDLE / CLAVICLE (Spans Left to Right Shoulder)
    const collarGeo = new THREE.CylinderGeometry(0.055, 0.055, 1.0, 16);
    this.segments.collar = new THREE.Mesh(collarGeo, this._clothingMaterial(0x1e2840));
    this.segments.collar.castShadow = true;
    this.avatarRoot.add(this.segments.collar);

    // 4. MULTI-SEGMENT FLEXIBLE TORSO & SPINE
    // Upper Thoracic Chest
    const chestGeo = new THREE.CylinderGeometry(0.19, 0.165, 1.0, 18);
    this.segments.chest = new THREE.Mesh(chestGeo, this._clothingMaterial(0x1a2236));
    this.segments.chest.castShadow = true;
    this.avatarRoot.add(this.segments.chest);

    // Mid-Lumbar Abdomen
    const abdomenGeo = new THREE.CylinderGeometry(0.165, 0.15, 1.0, 18);
    this.segments.abdomen = new THREE.Mesh(abdomenGeo, this._clothingMaterial(0x181e30));
    this.segments.abdomen.castShadow = true;
    this.avatarRoot.add(this.segments.abdomen);

    // Pelvic Base (Bridges Hips)
    const pelvisGeo = new THREE.CylinderGeometry(0.155, 0.14, 1.0, 18);
    this.segments.pelvis = new THREE.Mesh(pelvisGeo, this._clothingMaterial(0x141a2a));
    this.segments.pelvis.castShadow = true;
    this.avatarRoot.add(this.segments.pelvis);

    // 5. UPPER LIMBS (Biceps & Forearms with organic muscle curves)
    const upperArmGeo = new THREE.CapsuleGeometry(0.058, 0.88, 10, 18);
    this.segments.upperArmL = new THREE.Mesh(upperArmGeo, this._skinMaterial());
    this.segments.upperArmR = new THREE.Mesh(upperArmGeo.clone(), this._skinMaterial());
    this.segments.upperArmL.castShadow = true;
    this.segments.upperArmR.castShadow = true;
    this.avatarRoot.add(this.segments.upperArmL);
    this.avatarRoot.add(this.segments.upperArmR);

    const foreArmGeo = new THREE.CapsuleGeometry(0.046, 0.90, 10, 18);
    this.segments.foreArmL = new THREE.Mesh(foreArmGeo, this._skinMaterial());
    this.segments.foreArmR = new THREE.Mesh(foreArmGeo.clone(), this._skinMaterial());
    this.segments.foreArmL.castShadow = true;
    this.segments.foreArmR.castShadow = true;
    this.avatarRoot.add(this.segments.foreArmL);
    this.avatarRoot.add(this.segments.foreArmR);

    // Hands
    const handGeo = new THREE.BoxGeometry(0.075, 0.095, 0.045);
    this.segments.handL = new THREE.Mesh(handGeo, this._skinMaterial());
    this.segments.handR = new THREE.Mesh(handGeo.clone(), this._skinMaterial());
    this.segments.handL.castShadow = true;
    this.segments.handR.castShadow = true;
    this.avatarRoot.add(this.segments.handL);
    this.avatarRoot.add(this.segments.handR);

    // 6. LOWER LIMBS (Thighs, Calves, Athletic Footwear)
    const thighGeo = new THREE.CapsuleGeometry(0.078, 0.84, 10, 18);
    this.segments.thighL = new THREE.Mesh(thighGeo, this._clothingMaterial(0x151c2e));
    this.segments.thighR = new THREE.Mesh(thighGeo.clone(), this._clothingMaterial(0x151c2e));
    this.segments.thighL.castShadow = true;
    this.segments.thighR.castShadow = true;
    this.avatarRoot.add(this.segments.thighL);
    this.avatarRoot.add(this.segments.thighR);

    const shinGeo = new THREE.CapsuleGeometry(0.056, 0.88, 10, 18);
    this.segments.shinL = new THREE.Mesh(shinGeo, this._skinMaterial());
    this.segments.shinR = new THREE.Mesh(shinGeo.clone(), this._skinMaterial());
    this.segments.shinL.castShadow = true;
    this.segments.shinR.castShadow = true;
    this.avatarRoot.add(this.segments.shinL);
    this.avatarRoot.add(this.segments.shinR);

    const footGeo = new THREE.BoxGeometry(0.105, 0.068, 0.21);
    this.segments.footL = new THREE.Mesh(footGeo, this._clothingMaterial(0x20263c));
    this.segments.footR = new THREE.Mesh(footGeo.clone(), this._clothingMaterial(0x20263c));
    this.segments.footL.castShadow = true;
    this.segments.footR.castShadow = true;
    this.avatarRoot.add(this.segments.footL);
    this.avatarRoot.add(this.segments.footR);

    // 7. ANATOMICAL JOINT SPHERES & HALOS
    const jointDefs = [
      ['shoulderL', 'Left Shoulder', true, 0.058],
      ['shoulderR', 'Right Shoulder', true, 0.058],
      ['elbowL', 'Left Elbow', true, 0.050],
      ['elbowR', 'Right Elbow', true, 0.050],
      ['wristL', 'Left Wrist', false, 0.042],
      ['wristR', 'Right Wrist', false, 0.042],
      ['hipL', 'Left Hip', true, 0.068],
      ['hipR', 'Right Hip', true, 0.068],
      ['kneeL', 'Left Knee', true, 0.058],
      ['kneeR', 'Right Knee', true, 0.058],
      ['ankleL', 'Left Ankle', false, 0.046],
      ['ankleR', 'Right Ankle', false, 0.046]
    ];

    jointDefs.forEach(([name, label, isActive, r]) => {
      const jointGeo = new THREE.SphereGeometry(r, 20, 20);
      const joint = new THREE.Mesh(jointGeo, this._jointMaterial(name));
      joint.castShadow = true;
      joint.userData = { jointKey: name, label: label, radius: r };
      this.joints[name] = joint;
      this.avatarRoot.add(joint);

      // Active joint neon halo ring
      const haloGeo = new THREE.RingGeometry(r + 0.02, r + 0.065, 36);
      const haloMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      this.halos[name] = halo;
      this.avatarRoot.add(halo);
    });

    this._applyDefaultPose();
  }

  _applyDefaultPose() {
    this.segments.head.position.set(0, 1.95, 0);
    this.segments.neck.position.set(0, 1.78, 0);
    this.segments.collar.position.set(0, 1.62, 0);
    this.segments.chest.position.set(0, 1.42, 0);
    this.segments.abdomen.position.set(0, 1.05, 0);
    this.segments.pelvis.position.set(0, 0.80, 0);

    this.segments.upperArmL.position.set(-0.35, 1.38, 0);
    this.segments.upperArmR.position.set(0.35, 1.38, 0);
    this.segments.foreArmL.position.set(-0.40, 0.95, 0);
    this.segments.foreArmR.position.set(0.40, 0.95, 0);
    this.segments.handL.position.set(-0.40, 0.65, 0);
    this.segments.handR.position.set(0.40, 0.65, 0);

    this.segments.thighL.position.set(-0.16, 0.45, 0);
    this.segments.thighR.position.set(0.16, 0.45, 0);
    this.segments.shinL.position.set(-0.16, -0.25, 0);
    this.segments.shinR.position.set(0.16, -0.25, 0);
    this.segments.footL.position.set(-0.16, -0.70, 0.06);
    this.segments.footR.position.set(0.16, -0.70, 0.06);

    this.joints.shoulderL.position.set(-0.25, 1.58, 0);
    this.joints.shoulderR.position.set(0.25, 1.58, 0);
    this.joints.elbowL.position.set(-0.35, 1.15, 0);
    this.joints.elbowR.position.set(0.35, 1.15, 0);
    this.joints.wristL.position.set(-0.40, 0.72, 0);
    this.joints.wristR.position.set(0.40, 0.72, 0);
    this.joints.hipL.position.set(-0.15, 0.82, 0);
    this.joints.hipR.position.set(0.15, 0.82, 0);
    this.joints.kneeL.position.set(-0.16, 0.10, 0);
    this.joints.kneeR.position.set(0.16, 0.10, 0);
    this.joints.ankleL.position.set(-0.16, -0.62, 0);
    this.joints.ankleR.position.set(0.16, -0.62, 0);
  }

  _lmTo3D(lm, scale = 4.2) {
    if (!lm) return new THREE.Vector3(0, 0, 0);
    return new THREE.Vector3(
      (lm.x - 0.5) * scale,
      -(lm.y - 0.50) * scale,
      (lm.z || 0) * scale * 1.0
    );
  }

  _placeLimb(mesh, p1, p2, scaleX = 1.0, scaleZ = 1.0) {
    if (!mesh || !p1 || !p2) return;
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mesh.position.copy(mid);

    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    if (len < 0.001) return;

    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
    mesh.quaternion.copy(quaternion);
    mesh.scale.set(scaleX, Math.max(0.01, len), scaleZ);
  }

  /**
   * Fluid Kinematic Motion Update:
   * Smooths incoming landmark coordinates using exponential moving average
   * to guarantee flexible, silky-smooth organic articulation.
   */
  updatePose(landmarks, exercise, side, isFault = false) {
    if (!this.isReady || !landmarks) return;

    // Apply exponential vector smoothing across all landmarks
    const smoothed = [];
    for (let i = 0; i < landmarks.length; i++) {
      const rawTarget = this._lmTo3D(landmarks[i]);
      if (!this._smoothedPositions.has(i)) {
        this._smoothedPositions.set(i, rawTarget.clone());
        smoothed[i] = rawTarget;
      } else {
        const cur = this._smoothedPositions.get(i);
        cur.lerp(rawTarget, this._lerpFactor);
        smoothed[i] = cur;
      }
    }

    const posNose       = smoothed[0];
    const posShoulderL  = smoothed[11];
    const posShoulderR  = smoothed[12];
    const posElbowL     = smoothed[13];
    const posElbowR     = smoothed[14];
    const posWristL     = smoothed[15];
    const posWristR     = smoothed[16];
    const posHipL       = smoothed[23];
    const posHipR       = smoothed[24];
    const posKneeL      = smoothed[25];
    const posKneeR      = smoothed[26];
    const posAnkleL     = smoothed[27];
    const posAnkleR     = smoothed[28];

    const midShoulder = new THREE.Vector3().addVectors(posShoulderL, posShoulderR).multiplyScalar(0.5);
    const midHip      = new THREE.Vector3().addVectors(posHipL, posHipR).multiplyScalar(0.5);

    // ── 1. Shoulder Girdle / Clavicle ──
    this._placeLimb(this.segments.collar, posShoulderL, posShoulderR, 1.0, 1.0);

    // ── 2. Flexible 3-Segment Torso & Spine Curve ──
    const torsoVec = new THREE.Vector3().subVectors(midHip, midShoulder);
    const pThoracic = midShoulder.clone().addScaledVector(torsoVec, 0.45);
    const pLumbar = midShoulder.clone().addScaledVector(torsoVec, 0.80);

    this._placeLimb(this.segments.chest, midShoulder, pThoracic, 1.14, 0.70);
    this._placeLimb(this.segments.abdomen, pThoracic, pLumbar, 1.04, 0.72);
    this._placeLimb(this.segments.pelvis, pLumbar, midHip, 1.06, 0.76);

    // ── 3. Cervical Neck & Contoured Head ──
    const spineDir = new THREE.Vector3().subVectors(midShoulder, midHip).normalize();
    if (spineDir.lengthSq() < 0.001) spineDir.set(0, 1, 0);

    const neckBase = midShoulder.clone();
    const neckTop = midShoulder.clone().addScaledVector(spineDir, 0.14);
    this._placeLimb(this.segments.neck, neckBase, neckTop, 0.95, 0.95);

    const headPos = midShoulder.clone().addScaledVector(spineDir, 0.28);
    this.segments.head.position.copy(headPos);

    // Head orientation aligns dynamically with spinal vector & gaze
    const gazeUp = new THREE.Vector3(0, 1, 0);
    this.segments.head.quaternion.setFromUnitVectors(gazeUp, spineDir);

    // ── 4. Upper Limbs (Biceps, Forearms, Hands) ──
    this._placeLimb(this.segments.upperArmL, posShoulderL, posElbowL, 1.08, 1.08);
    this._placeLimb(this.segments.upperArmR, posShoulderR, posElbowR, 1.08, 1.08);
    this._placeLimb(this.segments.foreArmL, posElbowL, posWristL, 0.98, 0.98);
    this._placeLimb(this.segments.foreArmR, posElbowR, posWristR, 0.98, 0.98);

    const dirForearmL = new THREE.Vector3().subVectors(posWristL, posElbowL).normalize();
    const dirForearmR = new THREE.Vector3().subVectors(posWristR, posElbowR).normalize();

    this.segments.handL.position.copy(posWristL).addScaledVector(dirForearmL, 0.05);
    this.segments.handR.position.copy(posWristR).addScaledVector(dirForearmR, 0.05);

    const upVec = new THREE.Vector3(0, 1, 0);
    this.segments.handL.quaternion.setFromUnitVectors(upVec, dirForearmL);
    this.segments.handR.quaternion.setFromUnitVectors(upVec, dirForearmR);

    // ── 5. Lower Limbs (Thighs, Calves, Feet) ──
    this._placeLimb(this.segments.thighL, posHipL, posKneeL, 1.06, 1.06);
    this._placeLimb(this.segments.thighR, posHipR, posKneeR, 1.06, 1.06);
    this._placeLimb(this.segments.shinL, posKneeL, posAnkleL, 0.98, 0.98);
    this._placeLimb(this.segments.shinR, posKneeR, posAnkleR, 0.98, 0.98);

    // Adaptive foot grounding: natural tilt on toes during horizontal postures (plank, pushups)
    const shinDirL = new THREE.Vector3().subVectors(posAnkleL, posKneeL).normalize();
    const shinDirR = new THREE.Vector3().subVectors(posAnkleR, posKneeR).normalize();
    const isHorizontalL = Math.abs(shinDirL.y) < 0.65;
    const isHorizontalR = Math.abs(shinDirR.y) < 0.65;

    this.segments.footL.position.set(posAnkleL.x, posAnkleL.y - 0.04, posAnkleL.z + (isHorizontalL ? -0.04 : 0.06));
    this.segments.footR.position.set(posAnkleR.x, posAnkleR.y - 0.04, posAnkleR.z + (isHorizontalR ? -0.04 : 0.06));

    if (isHorizontalL) {
      this.segments.footL.rotation.set(-Math.PI / 4, 0.14, 0);
    } else {
      this.segments.footL.rotation.set(0, 0.14, 0);
    }
    if (isHorizontalR) {
      this.segments.footR.rotation.set(-Math.PI / 4, -0.14, 0);
    } else {
      this.segments.footR.rotation.set(0, -0.14, 0);
    }

    // ── 6. Joint Spheres ──
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

    // Active Joint Halos & Crimson Fault Indicators
    this._updateActiveHighlight(exercise, side, isFault);
  }

  _updateActiveHighlight(exercise, side, isFault = false) {
    const isLeft = side === 'left';
    const t = Date.now() * 0.003;

    // Reset joints
    Object.keys(this.joints).forEach(name => {
      const j = this.joints[name];
      if (j && j.material) {
        if (!this.isXRayMode) {
          const isClothed = name.startsWith('hip');
          j.material.color.setHex(isClothed ? 0x161d30 : 0xc9a983);
          j.material.emissive.setHex(0x000000);
          j.material.emissiveIntensity = 0.0;
        } else {
          j.material.color.setHex(0x38bdf8);
          j.material.emissive.setHex(0x0284c7);
          j.material.emissiveIntensity = 0.5;
        }
      }
      if (this.halos[name]) {
        this.halos[name].material.opacity = 0;
      }
    });

    // Reset clothing limb emissives
    const allLimbKeys = ['chest', 'abdomen', 'pelvis', 'collar', 'upperArmL', 'upperArmR', 'foreArmL', 'foreArmR', 'thighL', 'thighR', 'shinL', 'shinR'];
    allLimbKeys.forEach(k => {
      if (this.segments[k] && this.segments[k].material && !this.isXRayMode) {
        this.segments[k].material.emissive.setHex(0x000000);
        this.segments[k].material.emissiveIntensity = 0.0;
      }
    });

    // Determine active monitored joints
    const isBoth = side === 'both' || side === 'auto';
    let activeJoints = [];
    let faultLimbs = [];

    const customDef = getExerciseDefinition(exercise);
    let jType = 'KNEE';
    if (customDef && customDef.jointLabel) {
      jType = customDef.jointLabel.toUpperCase();
    } else if (exercise.includes('curl') || exercise.includes('extension') || exercise.includes('press') || exercise.includes('pushup') || exercise.includes('dip') || exercise.includes('row')) {
      jType = 'ELBOW';
    } else if (exercise.includes('raise') || exercise.includes('angel') || exercise.includes('pendulum')) {
      jType = 'SHOULDER';
    } else if (exercise.includes('deadlift') || exercise.includes('bridge') || exercise.includes('bird_dog') || exercise.includes('cat')) {
      jType = 'HIP';
    }

    if (jType.includes('ELBOW')) {
      activeJoints = isBoth ? ['elbowL', 'elbowR'] : [isLeft ? 'elbowL' : 'elbowR'];
      faultLimbs = ['foreArmL', 'foreArmR', 'chest'];
    } else if (jType.includes('SHOULDER')) {
      activeJoints = isBoth ? ['shoulderL', 'shoulderR'] : [isLeft ? 'shoulderL' : 'shoulderR'];
      faultLimbs = ['chest', 'upperArmL', 'upperArmR'];
    } else if (jType.includes('HIP')) {
      activeJoints = isBoth ? ['hipL', 'hipR'] : [isLeft ? 'hipL' : 'hipR'];
      faultLimbs = ['chest', 'abdomen', 'pelvis', 'thighL', 'thighR'];
    } else {
      activeJoints = isBoth ? ['kneeL', 'kneeR'] : [isLeft ? 'kneeL' : 'kneeR'];
      faultLimbs = ['thighL', 'thighR', 'shinL', 'shinR', 'chest'];
    }

    // On Fault: illuminate relevant 3D anatomical segments in warning crimson red
    if (isFault) {
      const faultLimbEmissive = 0xee2244;
      const faultIntensity = 0.8 + 0.2 * Math.sin(t * 6);
      faultLimbs.forEach(k => {
        if (this.segments[k] && this.segments[k].material) {
          this.segments[k].material.emissive.setHex(faultLimbEmissive);
          this.segments[k].material.emissiveIntensity = faultIntensity;
        }
      });
    }

    // Active Joint Pulse and Billboard Ring
    const activeColorHex = isFault ? 0xff1744 : 0x38bdf8;
    const pulseSpeed = isFault ? 5.5 : 2.5;
    const pulseIntensity = isFault ? (2.0 + Math.sin(t * pulseSpeed) * 0.7) : (1.3 + Math.sin(t * pulseSpeed) * 0.4);
    const haloOpacity = isFault ? (0.7 + Math.sin(t * pulseSpeed) * 0.3) : (0.28 + Math.sin(t * pulseSpeed) * 0.15);

    activeJoints.forEach(name => {
      const j = this.joints[name];
      if (j && j.material) {
        j.material.emissiveIntensity = pulseIntensity;
        j.material.emissive.setHex(activeColorHex);
        j.material.color.setHex(activeColorHex);
      }
      if (this.halos[name] && j) {
        const halo = this.halos[name];
        halo.material.color.setHex(activeColorHex);
        halo.material.opacity = haloOpacity;
        halo.position.copy(j.position);
        halo.quaternion.copy(this.camera.quaternion); // Always billboard facing the camera
      }
    });

    // Ground platform reactive glow
    if (this.groundShadow) {
      this.groundShadow.material.color.setHex(isFault ? 0xff1744 : 0x38bdf8);
      this.groundShadow.material.opacity = isFault ? (0.28 + 0.1 * Math.sin(t * 5)) : (0.12 + 0.05 * Math.sin(t));
    }
  }

  // ── Interactive Raycasting (Click & Hover over Avatar) ──

  _initInteractivity(canvasEl) {
    canvasEl.addEventListener('pointermove', (e) => {
      const rect = canvasEl.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const jointMeshes = Object.values(this.joints);
      const intersects = this.raycaster.intersectObjects(jointMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        canvasEl.style.cursor = 'pointer';
        if (this.hoveredJoint !== hit) {
          this.hoveredJoint = hit;
          if (typeof this.onJointHover === 'function') {
            this.onJointHover(hit.userData, e);
          }
        }
      } else {
        canvasEl.style.cursor = 'grab';
        if (this.hoveredJoint) {
          this.hoveredJoint = null;
          if (typeof this.onJointHover === 'function') {
            this.onJointHover(null, e);
          }
        }
      }
    });

    canvasEl.addEventListener('click', (e) => {
      const rect = canvasEl.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const jointMeshes = Object.values(this.joints);
      const intersects = this.raycaster.intersectObjects(jointMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        this.focusOnJoint(hit.userData.jointKey);
        if (typeof this.onJointSelect === 'function') {
          this.onJointSelect(hit.userData, e);
        }
      }
    });
  }

  // ── Camera Manipulation API (Pan, Zoom, View Presets, Orbit, X-Ray) ──

  /**
   * Pan / Shift the camera and focus target left/right/up/down
   */
  pan(deltaX, deltaY) {
    if (!this.controls || !this.camera) return;

    const eye = this.camera.position.clone().sub(this.controls.target);
    const cameraUp = this.camera.up.clone();
    const cameraRight = new THREE.Vector3().crossVectors(cameraUp, eye).normalize();

    const panOffset = cameraRight.multiplyScalar(deltaX).add(cameraUp.multiplyScalar(deltaY));
    this.camera.position.add(panOffset);
    this.controls.target.add(panOffset);
    this.controls.update();
  }

  /**
   * Smoothly zoom camera closer or farther
   */
  zoom(factor) {
    if (!this.controls || !this.camera) return;
    const eye = this.camera.position.clone().sub(this.controls.target);
    eye.multiplyScalar(factor);
    this.camera.position.copy(this.controls.target).add(eye);
    this.controls.update();
  }

  /**
   * Smoothly switch camera to an authentic anatomical viewpoint
   */
  setViewPreset(name) {
    this.activeViewPreset = name;
    const presets = {
      front:     { pos: new THREE.Vector3(0, 0.1, 4.2), target: new THREE.Vector3(0, -0.1, 0) },
      side:      { pos: new THREE.Vector3(4.2, 0.1, 0), target: new THREE.Vector3(0, -0.1, 0) }, // Sagittal profile
      side_left: { pos: new THREE.Vector3(-4.2, 0.1, 0), target: new THREE.Vector3(0, -0.1, 0) },
      iso:       { pos: new THREE.Vector3(3.0, 1.4, 3.2), target: new THREE.Vector3(0, -0.1, 0) }, // 3/4 isometric
      top:       { pos: new THREE.Vector3(0, 4.8, 0.15), target: new THREE.Vector3(0, -0.1, 0) }  // Overhead transverse
    };
    const p = presets[name];
    if (p) {
      this._targetCamPos = p.pos.clone();
      this._targetCamTarget = p.target.clone();
    }
  }

  /**
   * Focus camera directly onto a specific joint
   */
  focusOnJoint(jointName) {
    const j = this.joints[jointName];
    if (!j) return;
    const targetPos = j.position.clone();
    const currentEye = this.camera.position.clone().sub(this.controls.target).normalize().multiplyScalar(2.0);
    this._targetCamTarget = targetPos;
    this._targetCamPos = targetPos.clone().add(currentEye);
  }

  resetView() {
    this.setViewPreset('front');
  }

  toggleAutoOrbit() {
    this.isAutoOrbit = !this.isAutoOrbit;
    if (this.controls) {
      this.controls.autoRotate = this.isAutoOrbit;
      this.controls.autoRotateSpeed = 2.4;
    }
    return this.isAutoOrbit;
  }

  toggleXRayMode() {
    this.isXRayMode = !this.isXRayMode;
    this._updateMaterials();
    return this.isXRayMode;
  }

  // ── Render & Animation Loop ──

  _renderLoop() {
    this.animFrameId = requestAnimationFrame(() => this._renderLoop());

    // Smooth camera glide transitions to target presets
    if (this._targetCamPos && this.camera) {
      this.camera.position.lerp(this._targetCamPos, 0.08);
      if (this.camera.position.distanceTo(this._targetCamPos) < 0.02) {
        this.camera.position.copy(this._targetCamPos);
        this._targetCamPos = null;
      }
    }
    if (this._targetCamTarget && this.controls) {
      this.controls.target.lerp(this._targetCamTarget, 0.08);
      if (this.controls.target.distanceTo(this._targetCamTarget) < 0.02) {
        this.controls.target.copy(this._targetCamTarget);
        this._targetCamTarget = null;
      }
    }

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
    const el = document.getElementById('avatarCanvas3D');
    if (el) el.style.display = 'block';
  }

  hide() {
    if (this.canvas) this.canvas.style.display = 'none';
    const el = document.getElementById('avatarCanvas3D');
    if (el) el.style.display = 'none';
  }

  dispose() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.renderer) this.renderer.dispose();
    this.isReady = false;
  }
}
