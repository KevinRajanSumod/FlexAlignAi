/**
 * FlexAlign AI — Interactive 3D Humanoid Avatar Renderer
 * High-fidelity anatomical athletic humanoid figure with fluid kinematics, organic articulation,
 * sculpted musculature, articulated hands, cross-training footwear, dynamic exercise equipment,
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
    this.equipment = {};
    this.groundShadow = null;
    this.gridHelper = null;

    // Kinematic Motion Smoothing (Organic Lerp)
    this._smoothedPositions = new Map();
    this._lerpFactor = 0.38; // Highly responsive yet silky organic motion

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
    this.onCameraManualChange = null;

    this._currentExercise = '';
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
    const grad = bgCtx.createRadialGradient(256, 180, 20, 256, 256, 440);
    grad.addColorStop(0, '#141d33');
    grad.addColorStop(0.45, '#0b1022');
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
    this.camera.position.set(0, 0.06, 4.5);
    this.camera.lookAt(0, -0.06, 0);

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
    this.renderer.toneMappingExposure = 1.08;

    // ── Lighting (Studio 3-Point + Subtle Rim & Floor Bounce) ──
    this._setupLighting();

    // ── Ground Platform & Floor Grid ──
    this._buildGround();

    // ── Humanoid Biomechanical Avatar & Equipment ──
    this._buildHumanoid();
    this._buildEquipment();

    // ── Interactive OrbitControls (Full Pan, Zoom, Rotate, Shift) ──
    this.controls = new OrbitControls(this.camera, canvasEl);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 1.4;
    this.controls.maxDistance = 12.0;
    this.controls.maxPolarAngle = Math.PI * 0.92;
    this.controls.target.set(0, -0.06, 0);

    // FULL INTERACTION CAPABILITIES:
    this.controls.enableRotate = true;
    this.controls.rotateSpeed = 0.85;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.1;
    this.controls.enablePan = true;
    this.controls.panSpeed = 1.0;
    this.controls.screenSpacePanning = true;

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

    // Detect user manual camera orbit/pan to cancel preset transitions & sync UI
    this.controls.addEventListener('start', () => {
      this._targetCamPos = null;
      this._targetCamTarget = null;
      if (typeof this.onCameraManualChange === 'function') {
        this.onCameraManualChange();
      }
    });

    // Raycaster interactions
    this._initInteractivity(canvasEl);

    this.isReady = true;
    this._renderLoop();
  }

  _setupLighting() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0xdde5f5, 1.35);
    this.scene.add(ambient);

    // Key Light (Warm Key)
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.3);
    keyLight.position.set(3.6, 5.8, 4.5);
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
    const fillLight = new THREE.DirectionalLight(0x70b0ff, 1.2);
    fillLight.position.set(-4.5, 2.8, 2.2);
    this.scene.add(fillLight);

    // Dynamic Rim Light (Electric Blue Contour)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    rimLight.position.set(0, 3.4, -5.2);
    this.scene.add(rimLight);

    // Floor Bounce
    const bounceLight = new THREE.HemisphereLight(0x1a2648, 0x050812, 0.75);
    this.scene.add(bounceLight);
  }

  _buildGround() {
    // Holographic Circular Platform
    const groundGeo = new THREE.CircleGeometry(3.6, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x090e1c,
      roughness: 0.88,
      metalness: 0.12,
      transparent: true,
      opacity: 0.94
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.22;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Outer Neon Ring Accent
    const ringGeo = new THREE.RingGeometry(1.2, 1.25, 80);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -1.215;
    this.scene.add(ring);
    this.groundShadow = ring;

    // Subtle Precision Floor Grid
    this.gridHelper = new THREE.GridHelper(7.2, 24, 0x38bdf8, 0x182645);
    this.gridHelper.position.y = -1.218;
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
      color: 0xd4b08c, // Natural athletic skin tone
      roughness: 0.48,
      metalness: 0.02,
      clearcoat: 0.22,
      clearcoatRoughness: 0.4,
      sheen: 0.3,
      sheenColor: new THREE.Color(0xffdec2)
    });
  }

  _clothingMaterial(color = 0x171f30) {
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
      roughness: 0.68,
      metalness: 0.12,
      clearcoat: 0.16,
      clearcoatRoughness: 0.35
    });
  }

  _accentMaterial(color = 0x0ea5e9) {
    return new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.5
    });
  }

  _shoeSoleMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.45,
      metalness: 0.05
    });
  }

  _steelMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0x22262d,
      roughness: 0.35,
      metalness: 0.85
    });
  }

  _chromeMaterial() {
    return new THREE.MeshStandardMaterial({
      color: 0xd8e0ea,
      roughness: 0.12,
      metalness: 0.95
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
      color: isClothed ? 0x151d2d : 0xd4b08c,
      roughness: 0.52,
      metalness: 0.04,
      clearcoat: 0.18,
      clearcoatRoughness: 0.45
    });
  }

  _updateMaterials() {
    if (this.segments.head) {
      this.segments.head.traverse(c => {
        if (c.isMesh && c.userData && c.userData.isSkin) {
          c.material = this._skinMaterial();
        }
      });
    }
    if (this.segments.neck) this.segments.neck.material = this._skinMaterial();
    if (this.segments.chest) this.segments.chest.material = this._clothingMaterial(0x192236);
    if (this.segments.abdomen) this.segments.abdomen.material = this._clothingMaterial(0x161e30);
    if (this.segments.pelvis) this.segments.pelvis.material = this._clothingMaterial(0x131928);
    if (this.segments.collar) this.segments.collar.material = this._clothingMaterial(0x1b253c);

    ['upperArmL', 'upperArmR', 'foreArmL', 'foreArmR', 'shinL', 'shinR'].forEach(k => {
      if (this.segments[k]) this.segments[k].material = this._skinMaterial();
    });

    ['handL', 'handR'].forEach(k => {
      if (this.segments[k]) {
        this.segments[k].traverse(c => {
          if (c.isMesh) c.material = this._skinMaterial();
        });
      }
    });

    ['thighL', 'thighR'].forEach(k => {
      if (this.segments[k]) this.segments[k].material = this._clothingMaterial(0x141a2a);
    });

    Object.keys(this.joints).forEach(name => {
      if (this.joints[name]) this.joints[name].material = this._jointMaterial(name);
    });
  }

  // ── High-Fidelity Humanoid Builder ──

  _buildHumanoid() {
    this.avatarRoot = new THREE.Group();
    this.scene.add(this.avatarRoot);

    // 1. STREAMLINED AERODYNAMIC ATHLETIC HEAD & VISOR
    const headGroup = new THREE.Group();

    // Organic Contoured Cranium
    const craniumGeo = new THREE.SphereGeometry(0.165, 32, 28);
    const cranium = new THREE.Mesh(craniumGeo, this._skinMaterial());
    cranium.scale.set(0.92, 1.15, 1.04);
    cranium.castShadow = true;
    cranium.userData = { isSkin: true };
    headGroup.add(cranium);

    // Anatomical Athletic Jawline & Chin (Smooth tapered capsule)
    const jawGeo = new THREE.CapsuleGeometry(0.075, 0.08, 10, 20);
    const jaw = new THREE.Mesh(jawGeo, this._skinMaterial());
    jaw.position.set(0, -0.075, 0.035);
    jaw.scale.set(1.05, 0.95, 1.15);
    jaw.castShadow = true;
    jaw.userData = { isSkin: true };
    headGroup.add(jaw);

    // High-Tech Cybernetic Panoramic Visor
    const visorGeo = new THREE.CylinderGeometry(0.168, 0.166, 0.046, 32, 1, true, -Math.PI * 0.48, Math.PI * 0.96);
    const visorMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.12,
      metalness: 0.85,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      transparent: true,
      opacity: 0.88
    });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 0.028, 0.012);
    headGroup.add(visor);

    // Athletic Crown Contour / Carbon Headband
    const hairGeo = new THREE.SphereGeometry(0.168, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const hairMat = this._clothingMaterial(0x0a0f1d);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.02, -0.01);
    headGroup.add(hair);

    this.segments.head = headGroup;
    this.avatarRoot.add(headGroup);

    // 2. CERVICAL NECK (Smooth anatomical blend)
    const neckGeo = new THREE.CapsuleGeometry(0.082, 0.84, 10, 24);
    this.segments.neck = new THREE.Mesh(neckGeo, this._skinMaterial());
    this.segments.neck.castShadow = true;
    this.avatarRoot.add(this.segments.neck);

    // 3. SHOULDER GIRDLE / CLAVICLE
    const collarGeo = new THREE.CapsuleGeometry(0.072, 0.86, 10, 24);
    this.segments.collar = new THREE.Mesh(collarGeo, this._clothingMaterial(0x1b253c));
    this.segments.collar.castShadow = true;
    this.avatarRoot.add(this.segments.collar);

    // 4. ATHLETIC CONTINUOUS CONTOURED TORSO
    // Upper Thoracic Chest (Rounded anatomical capsule with V-taper)
    const chestGroup = new THREE.Group();
    const chestCoreGeo = new THREE.CapsuleGeometry(0.205, 0.59, 14, 28);
    const chestCore = new THREE.Mesh(chestCoreGeo, this._clothingMaterial(0x192236));
    chestCore.scale.set(1.28, 1.0, 0.86);
    chestCore.castShadow = true;
    chestGroup.add(chestCore);

    // Left & Right Contoured Pectoral Musculature (Rounded organic capsules)
    const pecGeo = new THREE.CapsuleGeometry(0.072, 0.26, 10, 20);
    const pecMat = this._clothingMaterial(0x212b44);
    const pecL = new THREE.Mesh(pecGeo, pecMat);
    pecL.position.set(-0.11, 0.05, 0.115);
    pecL.rotation.set(0.14, 0.16, -0.22);
    pecL.scale.set(1.15, 1.0, 0.75);
    chestGroup.add(pecL);

    const pecR = new THREE.Mesh(pecGeo, pecMat);
    pecR.position.set(0.11, 0.05, 0.115);
    pecR.rotation.set(0.14, -0.16, 0.22);
    pecR.scale.set(1.15, 1.0, 0.75);
    chestGroup.add(pecR);

    // Kinetic Glowing Sternum Seam Accent
    const seamGeo = new THREE.CapsuleGeometry(0.008, 0.65, 8, 12);
    const seam = new THREE.Mesh(seamGeo, this._accentMaterial(0x38bdf8));
    seam.position.set(0, 0.02, 0.15);
    chestGroup.add(seam);

    this.segments.chest = chestGroup;
    this.avatarRoot.add(chestGroup);

    // Athletic Abdomen (Organic waist taper, interlocking capsule)
    const abdomenGroup = new THREE.Group();
    const abCoreGeo = new THREE.CapsuleGeometry(0.180, 0.64, 14, 28);
    const abCore = new THREE.Mesh(abCoreGeo, this._clothingMaterial(0x161e30));
    abCore.scale.set(1.16, 1.0, 0.80);
    abCore.castShadow = true;
    abdomenGroup.add(abCore);
    this.segments.abdomen = abdomenGroup;
    this.avatarRoot.add(abdomenGroup);

    // Pelvic Base (Smooth rounded glute & hip girdle)
    const pelvisGroup = new THREE.Group();
    const pelvisCoreGeo = new THREE.CapsuleGeometry(0.192, 0.62, 14, 28);
    const pelvisCore = new THREE.Mesh(pelvisCoreGeo, this._clothingMaterial(0x131928));
    pelvisCore.scale.set(1.22, 1.0, 0.84);
    pelvisCore.castShadow = true;
    pelvisGroup.add(pelvisCore);
    this.segments.pelvis = pelvisGroup;
    this.avatarRoot.add(pelvisGroup);

    // 5. UPPER LIMBS (Smooth Capsule Biceps, Forearms, Hands)
    const upperArmGeo = new THREE.CapsuleGeometry(0.072, 0.86, 12, 24);
    this.segments.upperArmL = new THREE.Mesh(upperArmGeo, this._skinMaterial());
    this.segments.upperArmR = new THREE.Mesh(upperArmGeo.clone(), this._skinMaterial());
    this.segments.upperArmL.castShadow = true;
    this.segments.upperArmR.castShadow = true;
    this.avatarRoot.add(this.segments.upperArmL);
    this.avatarRoot.add(this.segments.upperArmR);

    // Forearms (Smooth capsule tapering to wrist)
    const foreArmGeo = new THREE.CapsuleGeometry(0.058, 0.88, 12, 24);
    this.segments.foreArmL = new THREE.Mesh(foreArmGeo, this._skinMaterial());
    this.segments.foreArmR = new THREE.Mesh(foreArmGeo.clone(), this._skinMaterial());
    this.segments.foreArmL.castShadow = true;
    this.segments.foreArmR.castShadow = true;
    this.avatarRoot.add(this.segments.foreArmL);
    this.avatarRoot.add(this.segments.foreArmR);

    // Articulated Athletic Hands
    this.segments.handL = this._createAthleticHand(true);
    this.segments.handR = this._createAthleticHand(false);
    this.avatarRoot.add(this.segments.handL);
    this.avatarRoot.add(this.segments.handR);

    // 6. LOWER LIMBS (Athletic Quads, Calves, High-Performance Sneakers)
    const thighGeo = new THREE.CapsuleGeometry(0.116, 0.77, 14, 28);
    this.segments.thighL = new THREE.Mesh(thighGeo, this._clothingMaterial(0x141a2a));
    this.segments.thighR = new THREE.Mesh(thighGeo.clone(), this._clothingMaterial(0x141a2a));
    this.segments.thighL.scale.set(1.22, 1.0, 1.18);
    this.segments.thighR.scale.set(1.22, 1.0, 1.18);
    this.segments.thighL.castShadow = true;
    this.segments.thighR.castShadow = true;
    this.avatarRoot.add(this.segments.thighL);
    this.avatarRoot.add(this.segments.thighR);

    // Calves (Sculpted gastrocnemius capsule)
    const shinGeo = new THREE.CapsuleGeometry(0.082, 0.84, 12, 24);
    this.segments.shinL = new THREE.Mesh(shinGeo, this._skinMaterial());
    this.segments.shinR = new THREE.Mesh(shinGeo.clone(), this._skinMaterial());
    this.segments.shinL.scale.set(1.16, 1.0, 1.18);
    this.segments.shinR.scale.set(1.16, 1.0, 1.18);
    this.segments.shinL.castShadow = true;
    this.segments.shinR.castShadow = true;
    this.avatarRoot.add(this.segments.shinL);
    this.avatarRoot.add(this.segments.shinR);

    // Cross-Trainer Athletic Footwear
    this.segments.footL = this._createAthleticSneaker();
    this.segments.footR = this._createAthleticSneaker();
    this.avatarRoot.add(this.segments.footL);
    this.avatarRoot.add(this.segments.footR);

    // 7. ANATOMICAL JOINT SPHERES & HALOS
    const jointDefs = [
      ['shoulderL', 'Left Shoulder', true, 0.082],
      ['shoulderR', 'Right Shoulder', true, 0.082],
      ['elbowL', 'Left Elbow', true, 0.068],
      ['elbowR', 'Right Elbow', true, 0.068],
      ['wristL', 'Left Wrist', false, 0.052],
      ['wristR', 'Right Wrist', false, 0.052],
      ['hipL', 'Left Hip', true, 0.104],
      ['hipR', 'Right Hip', true, 0.104],
      ['kneeL', 'Left Knee', true, 0.085],
      ['kneeR', 'Right Knee', true, 0.085],
      ['ankleL', 'Left Ankle', false, 0.062],
      ['ankleR', 'Right Ankle', false, 0.062]
    ];

    jointDefs.forEach(([name, label, isActive, r]) => {
      const jointGeo = new THREE.SphereGeometry(r, 22, 22);
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

  _createAthleticHand(isLeft = true) {
    const handGroup = new THREE.Group();
    const sideSign = isLeft ? -1 : 1;

    // Palm base
    const palmGeo = new THREE.BoxGeometry(0.068, 0.072, 0.038);
    const palm = new THREE.Mesh(palmGeo, this._skinMaterial());
    palm.castShadow = true;
    handGroup.add(palm);

    // Knuckle arch
    const knuckleGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.036, 12);
    const knuckle = new THREE.Mesh(knuckleGeo, this._skinMaterial());
    knuckle.position.set(0, 0.036, 0);
    knuckle.rotation.z = Math.PI / 2;
    handGroup.add(knuckle);

    // Natural curled 4 fingers (athletic grip posture)
    const fingersGroup = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const fX = (i - 1.5) * 0.015;
      const fingerGeo = new THREE.CapsuleGeometry(0.0075, 0.042, 6, 8);
      const finger = new THREE.Mesh(fingerGeo, this._skinMaterial());
      finger.position.set(fX, 0.045, 0.012);
      finger.rotation.x = -Math.PI * 0.35; // Curled naturally inward
      fingersGroup.add(finger);
    }
    handGroup.add(fingersGroup);

    // Opposable Thumb
    const thumbGeo = new THREE.CapsuleGeometry(0.009, 0.038, 6, 8);
    const thumb = new THREE.Mesh(thumbGeo, this._skinMaterial());
    thumb.position.set(sideSign * 0.038, 0.005, 0.016);
    thumb.rotation.set(-0.35, sideSign * 0.45, sideSign * 0.4);
    handGroup.add(thumb);

    return handGroup;
  }

  _createAthleticSneaker() {
    const shoeGroup = new THREE.Group();

    // 1. Thick Cushioned Midsole (White Athletic Foam)
    const soleGeo = new THREE.BoxGeometry(0.115, 0.042, 0.245);
    const sole = new THREE.Mesh(soleGeo, this._shoeSoleMaterial());
    sole.position.set(0, -0.035, 0.02);
    sole.castShadow = true;
    shoeGroup.add(sole);

    // Cyan performance midsole accent stripe
    const stripeGeo = new THREE.BoxGeometry(0.118, 0.012, 0.248);
    const stripe = new THREE.Mesh(stripeGeo, this._accentMaterial(0x0ea5e9));
    stripe.position.set(0, -0.032, 0.02);
    shoeGroup.add(stripe);

    // 2. Ergonomic Upper Shoe Body
    const upperGeo = new THREE.BoxGeometry(0.108, 0.062, 0.23);
    const upper = new THREE.Mesh(upperGeo, this._clothingMaterial(0x1e273c));
    upper.position.set(0, 0.012, 0.015);
    upper.castShadow = true;
    shoeGroup.add(upper);

    // 3. Curved Toe Rocker Box
    const toeGeo = new THREE.CylinderGeometry(0.052, 0.055, 0.105, 14);
    const toe = new THREE.Mesh(toeGeo, this._clothingMaterial(0x161e30));
    toe.position.set(0, -0.005, 0.105);
    toe.rotation.z = Math.PI / 2;
    shoeGroup.add(toe);

    // 4. Padded Ankle Collar & Tongue
    const collarGeo = new THREE.CylinderGeometry(0.044, 0.044, 0.085, 14);
    const collar = new THREE.Mesh(collarGeo, this._clothingMaterial(0x273450));
    collar.position.set(0, 0.042, -0.02);
    shoeGroup.add(collar);

    return shoeGroup;
  }

  // ── Dynamic 3D Equipment (Dumbbells, Kettlebell, Barbell) ──

  _buildEquipment() {
    this.equipment = {
      dumbbellL: this._createHexDumbbell(),
      dumbbellR: this._createHexDumbbell(),
      gobletKettlebell: this._createKettlebell(),
      barbell: this._createBarbell(),
      pullUpBar: this._createPullUpBar(),
      dipBars: this._createDipBars()
    };

    // Add all to root, initially hidden until exercise demands
    Object.values(this.equipment).forEach(mesh => {
      mesh.visible = false;
      this.avatarRoot.add(mesh);
    });
  }

  _createHexDumbbell() {
    const dbGroup = new THREE.Group();

    // Chrome knurled handle (grip zone)
    const handleGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.17, 16);
    const handle = new THREE.Mesh(handleGeo, this._chromeMaterial());
    handle.rotation.z = Math.PI / 2;
    handle.castShadow = true;
    dbGroup.add(handle);

    // Knurled center grip band
    const gripGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.08, 16);
    const grip = new THREE.Mesh(gripGeo, this._clothingMaterial(0x273450));
    grip.rotation.z = Math.PI / 2;
    dbGroup.add(grip);

    // Inner bevel collars
    const collarGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.016, 14);
    [-0.068, 0.068].forEach(x => {
      const collar = new THREE.Mesh(collarGeo, this._steelMaterial());
      collar.position.x = x;
      collar.rotation.z = Math.PI / 2;
      dbGroup.add(collar);
    });

    // Left and Right Hexagonal Rubber Bumper Heads
    const hexGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.052, 6);
    [-0.096, 0.096].forEach(x => {
      const plate = new THREE.Mesh(hexGeo, this._steelMaterial());
      plate.position.x = x;
      plate.rotation.z = Math.PI / 2;
      plate.castShadow = true;
      dbGroup.add(plate);

      // Outer beveled cap
      const capGeo = new THREE.CylinderGeometry(0.052, 0.064, 0.016, 6);
      const cap = new THREE.Mesh(capGeo, this._steelMaterial());
      cap.position.x = x > 0 ? x + 0.028 : x - 0.028;
      cap.rotation.z = Math.PI / 2;
      dbGroup.add(cap);

      // Cyan accent ring
      const ringGeo = new THREE.TorusGeometry(0.066, 0.005, 8, 20);
      const ring = new THREE.Mesh(ringGeo, this._accentMaterial(0x38bdf8));
      ring.position.x = x;
      ring.rotation.y = Math.PI / 2;
      dbGroup.add(ring);
    });

    return dbGroup;
  }

  _createKettlebell() {
    const kbGroup = new THREE.Group();

    // Cast iron round bell with flattened base
    const bellGeo = new THREE.SphereGeometry(0.115, 24, 20);
    const bell = new THREE.Mesh(bellGeo, this._steelMaterial());
    bell.scale.set(1.0, 0.95, 1.0);
    bell.castShadow = true;
    kbGroup.add(bell);

    // Flat bottom platform
    const bottomGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.02, 16);
    const bottom = new THREE.Mesh(bottomGeo, this._steelMaterial());
    bottom.position.y = -0.105;
    kbGroup.add(bottom);

    // Ergonomic wide chrome handle
    const handleGeo = new THREE.TorusGeometry(0.075, 0.016, 12, 24, Math.PI);
    const handle = new THREE.Mesh(handleGeo, this._chromeMaterial());
    handle.position.y = 0.095;
    handle.rotation.z = Math.PI;
    handle.castShadow = true;
    kbGroup.add(handle);

    // Vertical riser horns
    const hornGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.05, 12);
    const hornL = new THREE.Mesh(hornGeo, this._steelMaterial());
    hornL.position.set(-0.075, 0.08, 0);
    kbGroup.add(hornL);
    const hornR = hornL.clone();
    hornR.position.set(0.075, 0.08, 0);
    kbGroup.add(hornR);

    // Laser-etched weight spec badge
    const badgeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.01, 16);
    const badge = new THREE.Mesh(badgeGeo, this._accentMaterial(0x0ea5e9));
    badge.position.set(0, 0, 0.11);
    badge.rotation.x = Math.PI / 2;
    kbGroup.add(badge);

    return kbGroup;
  }

  _createBarbell() {
    const bbGroup = new THREE.Group();

    // 1. Olympic Chrome Bar (1.62m span)
    const barGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.62, 16);
    const bar = new THREE.Mesh(barGeo, this._chromeMaterial());
    bar.rotation.z = Math.PI / 2;
    bar.castShadow = true;
    bbGroup.add(bar);

    // Grip knurling markings on the bar
    [-0.22, 0.22, -0.42, 0.42].forEach(x => {
      const markGeo = new THREE.CylinderGeometry(0.0155, 0.0155, 0.012, 16);
      const mark = new THREE.Mesh(markGeo, this._accentMaterial(0x0ea5e9));
      mark.position.x = x;
      mark.rotation.z = Math.PI / 2;
      bbGroup.add(mark);
    });

    // 2. Inner Sleeve Stops & Revolving Bushings
    [-0.50, 0.50].forEach(x => {
      const stopGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.025, 16);
      const stop = new THREE.Mesh(stopGeo, this._chromeMaterial());
      stop.position.x = x;
      stop.rotation.z = Math.PI / 2;
      bbGroup.add(stop);
    });

    // 3. Olympic Bumper Plates (Full 450mm Competition Plates + 10kg Plates)
    [-0.56, 0.56].forEach(x => {
      const sign = x > 0 ? 1 : -1;

      // 20kg Large Bumper Plate
      const bumperGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.055, 32);
      const plateBig = new THREE.Mesh(bumperGeo, this._steelMaterial());
      plateBig.position.x = x;
      plateBig.rotation.z = Math.PI / 2;
      plateBig.castShadow = true;
      bbGroup.add(plateBig);

      // Cyan accent perimeter ring
      const ringGeo = new THREE.TorusGeometry(0.212, 0.006, 8, 32);
      const ring = new THREE.Mesh(ringGeo, this._accentMaterial(0x38bdf8));
      ring.position.x = x;
      ring.rotation.y = Math.PI / 2;
      bbGroup.add(ring);

      // 10kg Secondary Plate
      const smallPlateGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.042, 28);
      const plateSmall = new THREE.Mesh(smallPlateGeo, this._steelMaterial());
      plateSmall.position.x = x + sign * 0.055;
      plateSmall.rotation.z = Math.PI / 2;
      plateSmall.castShadow = true;
      bbGroup.add(plateSmall);

      // Quick-Release Collar Lock
      const collarGeo = new THREE.CylinderGeometry(0.026, 0.026, 0.03, 16);
      const collar = new THREE.Mesh(collarGeo, this._accentMaterial(0x0ea5e9));
      collar.position.x = x + sign * 0.095;
      collar.rotation.z = Math.PI / 2;
      bbGroup.add(collar);
    });

    return bbGroup;
  }

  _createPullUpBar() {
    const rigGroup = new THREE.Group();

    // Top horizontal chin-up / pull-up bar (1.35m span)
    const barGeo = new THREE.CylinderGeometry(0.016, 0.016, 1.35, 16);
    const bar = new THREE.Mesh(barGeo, this._chromeMaterial());
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.45, 0);
    bar.castShadow = true;
    rigGroup.add(bar);

    // Left and Right knurled foam grip pads
    const padGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.22, 16);
    const padL = new THREE.Mesh(padGeo, this._clothingMaterial(0x1e273c));
    padL.position.set(-0.35, 1.45, 0);
    padL.rotation.z = Math.PI / 2;
    rigGroup.add(padL);

    const padR = padL.clone();
    padR.position.set(0.35, 1.45, 0);
    rigGroup.add(padR);

    // Cyan accent rings
    const ringGeo = new THREE.TorusGeometry(0.023, 0.004, 8, 16);
    const ringL = new THREE.Mesh(ringGeo, this._accentMaterial(0x38bdf8));
    ringL.position.set(-0.46, 1.45, 0);
    ringL.rotation.y = Math.PI / 2;
    rigGroup.add(ringL);

    const ringR = ringL.clone();
    ringR.position.set(0.46, 1.45, 0);
    rigGroup.add(ringR);

    // Dual vertical support columns
    const postGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.7, 16);
    const postL = new THREE.Mesh(postGeo, this._steelMaterial());
    postL.position.set(-0.67, 0.1, 0);
    postL.castShadow = true;
    rigGroup.add(postL);

    const postR = postL.clone();
    postR.position.set(0.67, 0.1, 0);
    rigGroup.add(postR);

    return rigGroup;
  }

  _createDipBars() {
    const dipGroup = new THREE.Group();

    // Dual parallel bars at hip height
    const railGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.95, 16);
    const railL = new THREE.Mesh(railGeo, this._chromeMaterial());
    railL.position.set(-0.36, 0.22, 0);
    railL.rotation.x = Math.PI / 2;
    railL.castShadow = true;
    dipGroup.add(railL);

    const railR = railL.clone();
    railR.position.set(0.36, 0.22, 0);
    dipGroup.add(railR);

    // Left and Right support legs down to floor
    [-0.36, 0.36].forEach(x => {
      [-0.32, 0.32].forEach(z => {
        const legGeo = new THREE.CylinderGeometry(0.022, 0.022, 1.44, 14);
        const leg = new THREE.Mesh(legGeo, this._steelMaterial());
        leg.position.set(x, -0.50, z);
        leg.castShadow = true;
        dipGroup.add(leg);

        // Rubber floor foot
        const footGeo = new THREE.CylinderGeometry(0.038, 0.042, 0.03, 14);
        const foot = new THREE.Mesh(footGeo, this._accentMaterial(0x0ea5e9));
        foot.position.set(x, -1.21, z);
        dipGroup.add(foot);
      });
    });

    return dipGroup;
  }

  _applyDefaultPose() {
    this.segments.head.position.set(0, 0.85, 0);
    this.segments.neck.position.set(0, 0.72, 0);
    this.segments.collar.position.set(0, 0.61, 0);
    this.segments.chest.position.set(0, 0.45, 0);
    this.segments.abdomen.position.set(0, 0.18, 0);
    this.segments.pelvis.position.set(0, -0.05, 0);

    this.segments.upperArmL.position.set(-0.30, 0.40, 0);
    this.segments.upperArmR.position.set(0.30, 0.40, 0);
    this.segments.foreArmL.position.set(-0.35, 0.05, 0);
    this.segments.foreArmR.position.set(0.35, 0.05, 0);
    this.segments.handL.position.set(-0.36, -0.22, 0);
    this.segments.handR.position.set(0.36, -0.22, 0);

    this.segments.thighL.position.set(-0.16, -0.32, 0);
    this.segments.thighR.position.set(0.16, -0.32, 0);
    this.segments.shinL.position.set(-0.16, -0.84, 0);
    this.segments.shinR.position.set(0.16, -0.84, 0);
    this.segments.footL.position.set(-0.16, -1.14, 0.05);
    this.segments.footR.position.set(0.16, -1.14, 0.05);

    this.joints.shoulderL.position.set(-0.25, 0.61, 0);
    this.joints.shoulderR.position.set(0.25, 0.61, 0);
    this.joints.elbowL.position.set(-0.32, 0.22, 0);
    this.joints.elbowR.position.set(0.32, 0.22, 0);
    this.joints.wristL.position.set(-0.36, -0.16, 0);
    this.joints.wristR.position.set(0.36, -0.16, 0);
    this.joints.hipL.position.set(-0.16, -0.05, 0);
    this.joints.hipR.position.set(0.16, -0.05, 0);
    this.joints.kneeL.position.set(-0.16, -0.58, 0);
    this.joints.kneeR.position.set(0.16, -0.58, 0);
    this.joints.ankleL.position.set(-0.16, -1.10, 0);
    this.joints.ankleR.position.set(0.16, -1.10, 0);
  }

  _lmTo3D(lm, scale = 2.85) {
    if (!lm) return new THREE.Vector3(0, 0, 0);
    // Correct horizontal-to-vertical aspect ratio to eliminate elongated slender appearance
    const scaleX = scale * 1.26; // Natural broad athletic shoulders and hips
    const scaleY = scale * 0.95; // Anatomical vertical length
    const scaleZ = scale * 1.05;
    return new THREE.Vector3(
      (lm.x - 0.5) * scaleX,
      -(lm.y - 0.50) * scaleY,
      (lm.z || 0) * scaleZ
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

  _computeLimbAngle(pA, pB, pC) {
    if (!pA || !pB || !pC) return 180;
    const v1 = new THREE.Vector3().subVectors(pA, pB).normalize();
    const v2 = new THREE.Vector3().subVectors(pC, pB).normalize();
    const dot = Math.max(-1, Math.min(1, v1.dot(v2)));
    return (Math.acos(dot) * 180) / Math.PI;
  }

  /**
   * Fluid Kinematic Motion Update:
   * Smooths incoming landmark coordinates using exponential moving average
   * to guarantee flexible, silky-smooth organic articulation.
   */
  updatePose(landmarks, exercise, side, isFault = false) {
    if (!this.isReady || !landmarks) return;
    this._currentExercise = exercise || '';

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

    this._placeLimb(this.segments.chest, midShoulder, pThoracic, 1.20, 0.78);
    this._placeLimb(this.segments.abdomen, pThoracic, pLumbar, 1.08, 0.74);
    this._placeLimb(this.segments.pelvis, pLumbar, midHip, 1.12, 0.80);

    // ── 3. Cervical Neck & Head ──
    const spineDir = new THREE.Vector3().subVectors(midShoulder, midHip).normalize();
    if (spineDir.lengthSq() < 0.001) spineDir.set(0, 1, 0);

    const neckBase = midShoulder.clone();
    const neckTop = midShoulder.clone().addScaledVector(spineDir, 0.10);
    this._placeLimb(this.segments.neck, neckBase, neckTop, 1.0, 1.0);

    const headPos = midShoulder.clone().addScaledVector(spineDir, 0.22);
    this.segments.head.position.copy(headPos);

    // Head orientation aligns dynamically with spinal vector & gaze
    const gazeUp = new THREE.Vector3(0, 1, 0);
    this.segments.head.quaternion.setFromUnitVectors(gazeUp, spineDir);

    // ── 4. Upper Limbs (Dynamic Muscular Flexion on Bicep Contraction) ──
    const armAngleL = this._computeLimbAngle(posShoulderL, posElbowL, posWristL);
    const armAngleR = this._computeLimbAngle(posShoulderR, posElbowR, posWristR);
    const flexArmL = Math.max(0, Math.min(1, (160 - armAngleL) / 85));
    const flexArmR = Math.max(0, Math.min(1, (160 - armAngleR) / 85));

    this._placeLimb(this.segments.upperArmL, posShoulderL, posElbowL, 1.22 * (1 + flexArmL * 0.14), 1.18 * (1 + flexArmL * 0.12));
    this._placeLimb(this.segments.upperArmR, posShoulderR, posElbowR, 1.22 * (1 + flexArmR * 0.14), 1.18 * (1 + flexArmR * 0.12));
    this._placeLimb(this.segments.foreArmL, posElbowL, posWristL, 1.15, 1.12);
    this._placeLimb(this.segments.foreArmR, posElbowR, posWristR, 1.15, 1.12);

    const dirForearmL = new THREE.Vector3().subVectors(posWristL, posElbowL).normalize();
    const dirForearmR = new THREE.Vector3().subVectors(posWristR, posElbowR).normalize();

    this.segments.handL.position.copy(posWristL).addScaledVector(dirForearmL, 0.045);
    this.segments.handR.position.copy(posWristR).addScaledVector(dirForearmR, 0.045);

    const upVec = new THREE.Vector3(0, 1, 0);
    this.segments.handL.quaternion.setFromUnitVectors(upVec, dirForearmL);
    this.segments.handR.quaternion.setFromUnitVectors(upVec, dirForearmR);

    // ── 5. Lower Limbs (Dynamic Quadricep Contraction on Knee Flexion) ──
    const legAngleL = this._computeLimbAngle(posHipL, posKneeL, posAnkleL);
    const legAngleR = this._computeLimbAngle(posHipR, posKneeR, posAnkleR);
    const flexLegL = Math.max(0, Math.min(1, (165 - legAngleL) / 90));
    const flexLegR = Math.max(0, Math.min(1, (165 - legAngleR) / 90));

    this._placeLimb(this.segments.thighL, posHipL, posKneeL, 1.22 * (1 + flexLegL * 0.15), 1.18 * (1 + flexLegL * 0.14));
    this._placeLimb(this.segments.thighR, posHipR, posKneeR, 1.22 * (1 + flexLegR * 0.15), 1.18 * (1 + flexLegR * 0.14));
    this._placeLimb(this.segments.shinL, posKneeL, posAnkleL, 1.16, 1.18);
    this._placeLimb(this.segments.shinR, posKneeR, posAnkleR, 1.16, 1.18);

    // Adaptive foot grounding: natural tilt on toes during stepping/lunging/horizontal postures
    const shinDirL = new THREE.Vector3().subVectors(posAnkleL, posKneeL).normalize();
    const shinDirR = new THREE.Vector3().subVectors(posAnkleR, posKneeR).normalize();
    const isHorizontalL = Math.abs(shinDirL.y) < 0.65;
    const isHorizontalR = Math.abs(shinDirR.y) < 0.65;

    this.segments.footL.position.set(posAnkleL.x, posAnkleL.y - 0.035, posAnkleL.z + (isHorizontalL ? -0.04 : 0.05));
    this.segments.footR.position.set(posAnkleR.x, posAnkleR.y - 0.035, posAnkleR.z + (isHorizontalR ? -0.04 : 0.05));

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

    // ── 7. Dynamic Exercise Equipment Attachment ──
    this._updateEquipment(posWristL, posWristR, dirForearmL, dirForearmR, exercise);

    // Active Joint Halos & Crimson Fault Indicators
    this._updateActiveHighlight(exercise, side, isFault);
  }

  _updateEquipment(posWristL, posWristR, dirForearmL, dirForearmR, exercise = '') {
    const ex = (exercise || this._currentExercise || '').toLowerCase();

    // 1. Resolve full exercise metadata & keywords
    const customDef = getExerciseDefinition(ex);
    const defName = ((customDef && customDef.name) || '').toLowerCase();
    const defTip = ((customDef && customDef.tip) || '').toLowerCase();
    const defMovement = ((customDef && customDef.motionProfile && customDef.motionProfile.movementType) || '').toLowerCase();

    const fullStr = `${ex} ${defName} ${defTip} ${defMovement}`;

    // 2. Strict Calisthenics / Bodyweight Identification (zero equipment)
    const isBodyweight = fullStr.includes('pushup') ||
                         fullStr.includes('push-up') ||
                         fullStr.includes('plank') ||
                         fullStr.includes('crunch') ||
                         fullStr.includes('pendulum') ||
                         fullStr.includes('wall_angel') ||
                         fullStr.includes('cat_cow') ||
                         fullStr.includes('bird_dog') ||
                         fullStr.includes('knee_ext') ||
                         fullStr.includes('slr') ||
                         fullStr.includes('mini_squat') ||
                         fullStr.includes('bird') ||
                         (fullStr.includes('squat') && !fullStr.includes('goblet') && !fullStr.includes('sumo') && !fullStr.includes('split'));

    // 3. Barbell Identification
    const isBarbell = !isBodyweight && (
      fullStr.includes('barbell') ||
      fullStr.includes('deadlift') ||
      fullStr.includes('rdl') ||
      fullStr.includes('romanian') ||
      fullStr.includes('bent_row') ||
      fullStr.includes('bench_press') ||
      fullStr.includes('good_morning') ||
      fullStr.includes('glute_bridge') ||
      fullStr.includes('hip_thrust')
    );

    // 4. Kettlebell Identification
    const isKettlebell = !isBodyweight && !isBarbell && (
      fullStr.includes('goblet') ||
      fullStr.includes('kettlebell') ||
      fullStr.includes('swing') ||
      fullStr.includes('sumo')
    );

    // 5. Overhead Pull-Up Rig Identification
    const isPullUp = !isBodyweight && (
      fullStr.includes('pullup') ||
      fullStr.includes('pull-up') ||
      fullStr.includes('chinup') ||
      fullStr.includes('chin-up')
    );

    // 6. Parallel Dip Bars Identification
    const isDip = !isBodyweight && (
      fullStr.includes('dip') && !fullStr.includes('deadlift')
    );

    // 7. Dumbbell Identification
    const isDumbbell = !isBodyweight && !isBarbell && !isKettlebell && !isPullUp && !isDip && (
      fullStr.includes('dumbbell') ||
      fullStr.includes('curl') ||
      fullStr.includes('hammer') ||
      fullStr.includes('raise') ||
      fullStr.includes('lateral') ||
      fullStr.includes('scaption') ||
      fullStr.includes('press') ||
      fullStr.includes('arnold') ||
      fullStr.includes('lunge') ||
      fullStr.includes('split') ||
      fullStr.includes('extension') ||
      fullStr.includes('calf_raise') ||
      fullStr.includes('row')
    );

    const handPosL = this.segments.handL ? this.segments.handL.position : posWristL.clone().addScaledVector(dirForearmL, 0.045);
    const handPosR = this.segments.handR ? this.segments.handR.position : posWristR.clone().addScaledVector(dirForearmR, 0.045);

    // ── ATTACHMENT 1: Goblet / Sumo Competition Kettlebell ──
    if (this.equipment.gobletKettlebell) {
      if (isKettlebell) {
        this.equipment.gobletKettlebell.visible = true;
        const midHands = new THREE.Vector3().addVectors(handPosL, handPosR).multiplyScalar(0.5);
        if (fullStr.includes('sumo')) {
          // Sumo squat: kettlebell held between thighs hanging straight down
          this.equipment.gobletKettlebell.position.set(midHands.x, midHands.y - 0.10, midHands.z + 0.02);
        } else {
          // Goblet squat: kettlebell cupped at sternum/chest
          this.equipment.gobletKettlebell.position.set(midHands.x, midHands.y - 0.095, midHands.z + 0.04);
        }
        this.equipment.gobletKettlebell.rotation.set(0, 0, 0);
      } else {
        this.equipment.gobletKettlebell.visible = false;
      }
    }

    // ── ATTACHMENT 2: Tournament Olympic Barbell ──
    if (this.equipment.barbell) {
      if (isBarbell) {
        this.equipment.barbell.visible = true;
        const defaultDir = new THREE.Vector3(1, 0, 0);

        if (fullStr.includes('good_morning')) {
          // Good Morning: Barbell rests securely on upper traps / shoulders
          const posShoulderL = this.joints.shoulderL ? this.joints.shoulderL.position : new THREE.Vector3(-0.35, 1.4, 0);
          const posShoulderR = this.joints.shoulderR ? this.joints.shoulderR.position : new THREE.Vector3(0.35, 1.4, 0);
          const midShoulder = new THREE.Vector3().addVectors(posShoulderL, posShoulderR).multiplyScalar(0.5);
          const barDir = new THREE.Vector3().subVectors(posShoulderR, posShoulderL).normalize();
          if (barDir.lengthSq() > 0.01) {
            this.equipment.barbell.quaternion.setFromUnitVectors(defaultDir, barDir);
          }
          this.equipment.barbell.position.set(midShoulder.x, midShoulder.y + 0.04, midShoulder.z - 0.07);
        } else if (fullStr.includes('glute_bridge') || fullStr.includes('hip_thrust')) {
          // Glute Bridge / Hip Thrust: Barbell rests across hips / pelvis
          const posHipL = this.joints.hipL ? this.joints.hipL.position : new THREE.Vector3(-0.16, 0.8, 0);
          const posHipR = this.joints.hipR ? this.joints.hipR.position : new THREE.Vector3(0.16, 0.8, 0);
          const midHip = new THREE.Vector3().addVectors(posHipL, posHipR).multiplyScalar(0.5);
          const barDir = new THREE.Vector3().subVectors(posHipR, posHipL).normalize();
          if (barDir.lengthSq() > 0.01) {
            this.equipment.barbell.quaternion.setFromUnitVectors(defaultDir, barDir);
          }
          this.equipment.barbell.position.set(midHip.x, midHip.y + 0.04, midHip.z + 0.07);
        } else {
          // Deadlift, RDL, Bent Row, Bench Press: Barbell bridges both hands
          const midHands = new THREE.Vector3().addVectors(handPosL, handPosR).multiplyScalar(0.5);
          const barDir = new THREE.Vector3().subVectors(handPosR, handPosL).normalize();
          if (barDir.lengthSq() > 0.01) {
            this.equipment.barbell.quaternion.setFromUnitVectors(defaultDir, barDir);
          }
          this.equipment.barbell.position.copy(midHands);
        }
      } else {
        this.equipment.barbell.visible = false;
      }
    }

    // ── ATTACHMENT 3: High-Fidelity Hex Dumbbells ──
    if (this.equipment.dumbbellL && this.equipment.dumbbellR) {
      if (isDumbbell) {
        const isSingleArm = fullStr.includes('single') || fullStr.includes('one_arm') || fullStr.includes('dumbbell_row');
        this.equipment.dumbbellL.visible = !isSingleArm;
        this.equipment.dumbbellR.visible = true;

        this.equipment.dumbbellL.position.copy(handPosL);
        this.equipment.dumbbellR.position.copy(handPosR);

        // Compute natural grip orientation
        const gripDirL = new THREE.Vector3(1, 0, 0);
        const gripDirR = new THREE.Vector3(1, 0, 0);

        if (fullStr.includes('hammer') || fullStr.includes('lateral') || fullStr.includes('raise') || fullStr.includes('scaption') || fullStr.includes('lunge') || fullStr.includes('split') || fullStr.includes('calf_raise')) {
          // Sagittal grip (handles pointing forward-backward)
          gripDirL.set(0, 0, 1);
          gripDirR.set(0, 0, 1);
        }

        // Construct orthonormal basis ensuring handle is orthogonal to forearm
        const upDirL = new THREE.Vector3().crossVectors(dirForearmL, gripDirL).normalize();
        if (upDirL.lengthSq() < 0.01) upDirL.set(0, 1, 0);
        const orthGripL = new THREE.Vector3().crossVectors(upDirL, dirForearmL).normalize();
        const basisMatL = new THREE.Matrix4().makeBasis(orthGripL, dirForearmL, upDirL);
        this.equipment.dumbbellL.quaternion.setFromRotationMatrix(basisMatL);

        const upDirR = new THREE.Vector3().crossVectors(dirForearmR, gripDirR).normalize();
        if (upDirR.lengthSq() < 0.01) upDirR.set(0, 1, 0);
        const orthGripR = new THREE.Vector3().crossVectors(upDirR, dirForearmR).normalize();
        const basisMatR = new THREE.Matrix4().makeBasis(orthGripR, dirForearmR, upDirR);
        this.equipment.dumbbellR.quaternion.setFromRotationMatrix(basisMatR);
      } else {
        this.equipment.dumbbellL.visible = false;
        this.equipment.dumbbellR.visible = false;
      }
    }

    // ── ATTACHMENT 4: Overhead Pull-Up Rig ──
    if (this.equipment.pullUpBar) {
      if (isPullUp) {
        this.equipment.pullUpBar.visible = true;
        const topHandY = Math.max(handPosL.y, handPosR.y);
        this.equipment.pullUpBar.position.set(0, topHandY - 1.45, 0);
      } else {
        this.equipment.pullUpBar.visible = false;
      }
    }

    // ── ATTACHMENT 5: Parallel Dip Bars ──
    if (this.equipment.dipBars) {
      if (isDip) {
        this.equipment.dipBars.visible = true;
        const handY = (handPosL.y + handPosR.y) * 0.5;
        this.equipment.dipBars.position.set(0, handY - 0.22, 0);
      } else {
        this.equipment.dipBars.visible = false;
      }
    }
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
          j.material.color.setHex(isClothed ? 0x131928 : 0xd4b08c);
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
    const allLimbKeys = ['collar', 'upperArmL', 'upperArmR', 'foreArmL', 'foreArmR', 'thighL', 'thighR', 'shinL', 'shinR'];
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
    } else if (exercise.includes('deadlift') || exercise.includes('bridge') || exercise.includes('bird_dog') || exercise.includes('cat') || exercise.includes('rdl')) {
      jType = 'HIP';
    }

    if (jType.includes('ELBOW')) {
      activeJoints = isBoth ? ['elbowL', 'elbowR'] : [isLeft ? 'elbowL' : 'elbowR'];
      faultLimbs = ['foreArmL', 'foreArmR'];
    } else if (jType.includes('SHOULDER')) {
      activeJoints = isBoth ? ['shoulderL', 'shoulderR'] : [isLeft ? 'shoulderL' : 'shoulderR'];
      faultLimbs = ['upperArmL', 'upperArmR'];
    } else if (jType.includes('HIP')) {
      activeJoints = isBoth ? ['hipL', 'hipR'] : [isLeft ? 'hipL' : 'hipR'];
      faultLimbs = ['thighL', 'thighR'];
    } else {
      activeJoints = isBoth ? ['kneeL', 'kneeR'] : [isLeft ? 'kneeL' : 'kneeR'];
      faultLimbs = ['thighL', 'thighR', 'shinL', 'shinR'];
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
        halo.quaternion.copy(this.camera.quaternion); // Always billboard facing camera
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

  pan(deltaX, deltaY) {
    if (!this.controls || !this.camera) return;

    const eye = this.camera.position.clone().sub(this.controls.target);
    const cameraUp = this.camera.up.clone();
    const cameraRight = new THREE.Vector3().crossVectors(cameraUp, eye).normalize();

    const panOffset = cameraRight.multiplyScalar(deltaX).add(cameraUp.multiplyScalar(deltaY));
    this.camera.position.add(panOffset);
    this.controls.target.add(panOffset);
    this.controls.update();

    if (typeof this.onCameraManualChange === 'function') {
      this.onCameraManualChange();
    }
  }

  zoom(factor) {
    if (!this.controls || !this.camera) return;
    const eye = this.camera.position.clone().sub(this.controls.target);
    eye.multiplyScalar(factor);
    this.camera.position.copy(this.controls.target).add(eye);
    this.controls.update();

    if (typeof this.onCameraManualChange === 'function') {
      this.onCameraManualChange();
    }
  }

  setViewPreset(name) {
    this.activeViewPreset = name;
    const presets = {
      front:     { pos: new THREE.Vector3(0, 0.06, 4.5), target: new THREE.Vector3(0, -0.06, 0) },
      side:      { pos: new THREE.Vector3(4.5, 0.06, 0), target: new THREE.Vector3(0, -0.06, 0) }, // Sagittal profile
      side_left: { pos: new THREE.Vector3(-4.5, 0.06, 0), target: new THREE.Vector3(0, -0.06, 0) },
      iso:       { pos: new THREE.Vector3(3.3, 1.1, 3.3), target: new THREE.Vector3(0, -0.06, 0) }, // 3/4 isometric
      top:       { pos: new THREE.Vector3(0, 3.8, 2.6), target: new THREE.Vector3(0, -0.12, 0) }   // Elevated overhead 45°
    };
    const p = presets[name];
    if (p) {
      this._targetCamPos = p.pos.clone();
      this._targetCamTarget = p.target.clone();
    }
  }

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

    // Dynamic breathing cycle (smooth chest and clavicle micro-expansion)
    if (this.avatarRoot && this.segments.chest) {
      const breathTime = performance.now() * 0.0022;
      const breathExpand = 1.0 + Math.sin(breathTime) * 0.022;
      this.segments.chest.scale.x = 1.20 * breathExpand;
      this.segments.chest.scale.z = 0.78 * breathExpand;
      if (this.segments.collar) {
        this.segments.collar.position.y += Math.sin(breathTime) * 0.0003;
      }
    }

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
