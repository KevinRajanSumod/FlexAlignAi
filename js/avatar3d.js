/**
 * FlexAlign AI — 3D Humanoid Avatar Renderer
 * Proper anatomical humanoid figure using Three.js
 * Features:
 *  - Proportioned body with tapered torso, head, hands, feet
 *  - Unit-normalized limb geometries for exact joint-to-joint alignment
 *  - Clean studio lighting (Apple product-render style)
 *  - Smooth dark gradient backdrop with soft ground shadow
 *  - Active joint ring-halo indicators with camera billboarding
 *  - OrbitControls for drag rotation
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

export class Avatar3DRenderer {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.canvas = null;
    this.animFrameId = null;
    this.isReady = false;

    this.segments = {};
    this.joints = {};
    this.halos = {};
    this.groundShadow = null;
  }

  init(canvasEl) {
    this.canvas = canvasEl;
    this.canvas.style.display = 'block';

    // ── Scene ──
    this.scene = new THREE.Scene();

    // Clean gradient background
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 512;
    bgCanvas.height = 512;
    const bgCtx = bgCanvas.getContext('2d');
    const grad = bgCtx.createRadialGradient(256, 180, 20, 256, 256, 400);
    grad.addColorStop(0, '#141a2e');
    grad.addColorStop(0.5, '#0e1222');
    grad.addColorStop(1, '#080b14');
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, 512, 512);
    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    this.scene.background = bgTexture;

    // ── Camera ──
    const parent = canvasEl.parentElement;
    const w = (parent ? parent.clientWidth : 0) || canvasEl.clientWidth || 1280;
    const h = (parent ? parent.clientHeight : 0) || canvasEl.clientHeight || 720;
    this.camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 100);
    this.camera.position.set(0, 0.1, 4.2);
    this.camera.lookAt(0, -0.1, 0);

    // ── Renderer ──
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
    this.renderer.toneMappingExposure = 1.0;

    // ── Lighting (Apple-style 3-point studio) ──
    this._setupLighting();

    // ── Ground plane ──
    this._buildGround();

    // ── Humanoid Avatar ──
    this._buildHumanoid();

    // ── OrbitControls ──
    this.controls = new OrbitControls(this.camera, canvasEl);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 2.0;
    this.controls.maxDistance = 8.5;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.target.set(0, -0.1, 0);
    this.controls.enablePan = false;

    this.isReady = true;
    this._renderLoop();
  }

  _setupLighting() {
    // Soft ambient fill
    const ambient = new THREE.AmbientLight(0xd0d8f0, 1.2);
    this.scene.add(ambient);

    // Key light (warm white from top-right)
    const keyLight = new THREE.DirectionalLight(0xfff5e8, 2.0);
    keyLight.position.set(3, 5, 4);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -3;
    keyLight.shadow.camera.right = 3;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -3;
    keyLight.shadow.radius = 4;
    this.scene.add(keyLight);

    // Fill light (soft blue from left)
    const fillLight = new THREE.DirectionalLight(0x8bb8ff, 1.0);
    fillLight.position.set(-4, 2, 2);
    this.scene.add(fillLight);

    // Rim light (cool accent from behind)
    const rimLight = new THREE.DirectionalLight(0x6fa8ff, 1.4);
    rimLight.position.set(0, 3, -5);
    this.scene.add(rimLight);

    // Subtle ground bounce
    const bounceLight = new THREE.HemisphereLight(0x1a2040, 0x080b14, 0.6);
    this.scene.add(bounceLight);
  }

  _buildGround() {
    // Soft circular ground disc
    const groundGeo = new THREE.CircleGeometry(3.5, 64);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0c0f1a,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.9
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.82;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Subtle ring accent
    const ringGeo = new THREE.RingGeometry(1.1, 1.15, 80);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x5b9cf6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -1.81;
    this.scene.add(ring);
    this.groundShadow = ring;
  }

  // ── Material Factories ──

  _skinMaterial() {
    return new THREE.MeshPhysicalMaterial({
      color: 0xc8a882,
      roughness: 0.6,
      metalness: 0.02,
      clearcoat: 0.15,
      clearcoatRoughness: 0.6,
      sheen: 0.2,
      sheenColor: new THREE.Color(0xeec8a0)
    });
  }

  _clothingMaterial(color = 0x1e2438) {
    return new THREE.MeshPhysicalMaterial({
      color,
      roughness: 0.75,
      metalness: 0.05,
      clearcoat: 0.1,
      clearcoatRoughness: 0.4
    });
  }

  _jointMaterial(name = '') {
    const isClothed = name.startsWith('hip');
    return new THREE.MeshPhysicalMaterial({
      color: isClothed ? 0x181e30 : 0xc8a882,
      roughness: 0.65,
      metalness: 0.05,
      clearcoat: 0.15,
      clearcoatRoughness: 0.5
    });
  }

  // ── Humanoid Builder ──

  _buildHumanoid() {
    this.avatarRoot = new THREE.Group();
    this.scene.add(this.avatarRoot);

    // HEAD — Anatomical sphere with nose and ear landmarks
    const headGroup = new THREE.Group();

    const headGeo = new THREE.SphereGeometry(0.18, 24, 20);
    const headMesh = new THREE.Mesh(headGeo, this._skinMaterial());
    headMesh.scale.set(0.95, 1.12, 1.0);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Nose ridge indicator
    const noseGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const noseMat = this._skinMaterial();
    noseMat.color = new THREE.Color(0xbfa07a);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.02, 0.17);
    nose.scale.set(0.7, 0.7, 1.2);
    headGroup.add(nose);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.032, 8, 8);
    const earL = new THREE.Mesh(earGeo, this._skinMaterial());
    earL.position.set(-0.17, 0, 0);
    earL.scale.set(0.5, 1, 0.8);
    headGroup.add(earL);
    const earR = earL.clone();
    earR.position.set(0.17, 0, 0);
    headGroup.add(earR);

    this.segments.head = headGroup;
    this.avatarRoot.add(headGroup);

    // Neck — Unit height 1.0
    const neckGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.0, 16);
    this.segments.neck = new THREE.Mesh(neckGeo, this._skinMaterial());
    this.segments.neck.castShadow = true;
    this.avatarRoot.add(this.segments.neck);

    // TORSO — Unit height 1.0 cylinders with anatomical taper
    // Chest
    const chestGeo = new THREE.CylinderGeometry(0.19, 0.16, 1.0, 16);
    this.segments.chest = new THREE.Mesh(chestGeo, this._clothingMaterial(0x1c2236));
    this.segments.chest.castShadow = true;
    this.avatarRoot.add(this.segments.chest);

    // Abdomen
    const abdomenGeo = new THREE.CylinderGeometry(0.16, 0.15, 1.0, 16);
    this.segments.abdomen = new THREE.Mesh(abdomenGeo, this._clothingMaterial(0x1a2030));
    this.segments.abdomen.castShadow = true;
    this.avatarRoot.add(this.segments.abdomen);

    // ARMS — Unit height 1.0 capsules (radius r, length 1 - 2r)
    const upperArmGeo = new THREE.CapsuleGeometry(0.055, 0.89, 8, 16);
    this.segments.upperArmL = new THREE.Mesh(upperArmGeo, this._skinMaterial());
    this.segments.upperArmR = new THREE.Mesh(upperArmGeo.clone(), this._skinMaterial());
    this.segments.upperArmL.castShadow = true;
    this.segments.upperArmR.castShadow = true;
    this.avatarRoot.add(this.segments.upperArmL);
    this.avatarRoot.add(this.segments.upperArmR);

    const foreArmGeo = new THREE.CapsuleGeometry(0.045, 0.91, 8, 16);
    this.segments.foreArmL = new THREE.Mesh(foreArmGeo, this._skinMaterial());
    this.segments.foreArmR = new THREE.Mesh(foreArmGeo.clone(), this._skinMaterial());
    this.segments.foreArmL.castShadow = true;
    this.segments.foreArmR.castShadow = true;
    this.avatarRoot.add(this.segments.foreArmL);
    this.avatarRoot.add(this.segments.foreArmR);

    // HANDS — Rounded boxes oriented along wrist vector
    const handGeo = new THREE.BoxGeometry(0.07, 0.09, 0.045);
    const handMat = this._skinMaterial();
    this.segments.handL = new THREE.Mesh(handGeo, handMat);
    this.segments.handR = new THREE.Mesh(handGeo.clone(), handMat.clone());
    this.segments.handL.castShadow = true;
    this.segments.handR.castShadow = true;
    this.avatarRoot.add(this.segments.handL);
    this.avatarRoot.add(this.segments.handR);

    // LEGS — Unit height 1.0 capsules (radius r, length 1 - 2r)
    const thighGeo = new THREE.CapsuleGeometry(0.075, 0.85, 8, 16);
    this.segments.thighL = new THREE.Mesh(thighGeo, this._clothingMaterial(0x181e30));
    this.segments.thighR = new THREE.Mesh(thighGeo.clone(), this._clothingMaterial(0x181e30));
    this.segments.thighL.castShadow = true;
    this.segments.thighR.castShadow = true;
    this.avatarRoot.add(this.segments.thighL);
    this.avatarRoot.add(this.segments.thighR);

    const shinGeo = new THREE.CapsuleGeometry(0.055, 0.89, 8, 16);
    this.segments.shinL = new THREE.Mesh(shinGeo, this._skinMaterial());
    this.segments.shinR = new THREE.Mesh(shinGeo.clone(), this._skinMaterial());
    this.segments.shinL.castShadow = true;
    this.segments.shinR.castShadow = true;
    this.avatarRoot.add(this.segments.shinL);
    this.avatarRoot.add(this.segments.shinR);

    // FEET — Anatomical athletic shoes
    const footGeo = new THREE.BoxGeometry(0.10, 0.065, 0.20);
    const footMat = this._clothingMaterial(0x222840);
    this.segments.footL = new THREE.Mesh(footGeo, footMat);
    this.segments.footR = new THREE.Mesh(footGeo.clone(), footMat.clone());
    this.segments.footL.castShadow = true;
    this.segments.footR.castShadow = true;
    this.avatarRoot.add(this.segments.footL);
    this.avatarRoot.add(this.segments.footR);

    // JOINT SPHERES
    const jointDefs = [
      ['shoulderL', true, 0.055],  ['shoulderR', true, 0.055],
      ['elbowL', true, 0.048],     ['elbowR', true, 0.048],
      ['wristL', false, 0.040],    ['wristR', false, 0.040],
      ['hipL', false, 0.065],      ['hipR', false, 0.065],
      ['kneeL', true, 0.055],      ['kneeR', true, 0.055],
      ['ankleL', false, 0.045],    ['ankleR', false, 0.045]
    ];

    jointDefs.forEach(([name, isActive, r]) => {
      const jointGeo = new THREE.SphereGeometry(r, 16, 16);
      const joint = new THREE.Mesh(jointGeo, this._jointMaterial(name));
      joint.castShadow = true;
      this.joints[name] = joint;
      this.avatarRoot.add(joint);

      // Active joint halo ring
      if (isActive) {
        const haloGeo = new THREE.RingGeometry(r + 0.02, r + 0.06, 32);
        const haloMat = new THREE.MeshBasicMaterial({
          color: 0x5b9cf6,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        this.halos[name] = halo;
        this.avatarRoot.add(halo);
      }
    });

    this._applyDefaultPose();
  }

  _applyDefaultPose() {
    this.segments.head.position.set(0, 1.95, 0);
    this.segments.neck.position.set(0, 1.78, 0);
    this.segments.chest.position.set(0, 1.42, 0);
    this.segments.abdomen.position.set(0, 1.05, 0);

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

    // Joint default positions
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
      (lm.z || 0) * scale * 1.0  // Full 1:1 true 3D spatial depth
    );
  }

  _placeLimb(mesh, p1, p2, scaleX = 1.0, scaleZ = 1.0) {
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mesh.position.copy(mid);

    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    if (len < 0.001) return;

    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
    mesh.quaternion.copy(quaternion);
    // Scale y spans length, scaleX and scaleZ provide anatomical contouring
    mesh.scale.set(scaleX, Math.max(0.01, len), scaleZ);
  }

  updatePose(landmarks, exercise, side, isFault = false) {
    if (!this.isReady) return;

    const lm = (i) => this._lmTo3D(landmarks[i]);

    const posNose       = lm(0);
    const posShoulderL  = lm(11);
    const posShoulderR  = lm(12);
    const posElbowL     = lm(13);
    const posElbowR     = lm(14);
    const posWristL     = lm(15);
    const posWristR     = lm(16);
    const posHipL       = lm(23);
    const posHipR       = lm(24);
    const posKneeL      = lm(25);
    const posKneeR      = lm(26);
    const posAnkleL     = lm(27);
    const posAnkleR     = lm(28);

    const midShoulder = new THREE.Vector3().addVectors(posShoulderL, posShoulderR).multiplyScalar(0.5);
    const midHip      = new THREE.Vector3().addVectors(posHipL, posHipR).multiplyScalar(0.5);

    // ── Torso ──
    // Anatomical elliptical cross-section (slimmer front-to-back in profile view)
    const torsoVec = new THREE.Vector3().subVectors(midHip, midShoulder);
    const splitPoint = midShoulder.clone().addScaledVector(torsoVec, 0.52);

    this._placeLimb(this.segments.chest, midShoulder, splitPoint, 1.12, 0.68);
    this._placeLimb(this.segments.abdomen, splitPoint, midHip, 1.04, 0.70);

    // ── Neck & Head ──
    const neckBase = midShoulder.clone();
    const neckTop = midShoulder.clone().add(new THREE.Vector3(0, 0.14, (posNose.z - midShoulder.z) * 0.3));
    this._placeLimb(this.segments.neck, neckBase, neckTop, 0.9, 0.9);

    const headPos = midShoulder.clone().add(new THREE.Vector3(0, 0.28, (posNose.z - midShoulder.z) * 0.5));
    this.segments.head.position.copy(headPos);

    // ── Arms ──
    this._placeLimb(this.segments.upperArmL, posShoulderL, posElbowL);
    this._placeLimb(this.segments.upperArmR, posShoulderR, posElbowR);
    this._placeLimb(this.segments.foreArmL, posElbowL, posWristL);
    this._placeLimb(this.segments.foreArmR, posElbowR, posWristR);

    // Hands oriented along forearm vector
    const dirForearmL = new THREE.Vector3().subVectors(posWristL, posElbowL).normalize();
    const dirForearmR = new THREE.Vector3().subVectors(posWristR, posElbowR).normalize();

    this.segments.handL.position.copy(posWristL).addScaledVector(dirForearmL, 0.05);
    this.segments.handR.position.copy(posWristR).addScaledVector(dirForearmR, 0.05);

    const upVec = new THREE.Vector3(0, 1, 0);
    this.segments.handL.quaternion.setFromUnitVectors(upVec, dirForearmL);
    this.segments.handR.quaternion.setFromUnitVectors(upVec, dirForearmR);

    // ── Legs ──
    this._placeLimb(this.segments.thighL, posHipL, posKneeL, 1.05, 1.05);
    this._placeLimb(this.segments.thighR, posHipR, posKneeR, 1.05, 1.05);
    this._placeLimb(this.segments.shinL, posKneeL, posAnkleL, 0.98, 0.98);
    this._placeLimb(this.segments.shinR, posKneeR, posAnkleR, 0.98, 0.98);

    // Feet planted flat on ground base
    this.segments.footL.position.set(posAnkleL.x, posAnkleL.y - 0.05, posAnkleL.z + 0.06);
    this.segments.footR.position.set(posAnkleR.x, posAnkleR.y - 0.05, posAnkleR.z + 0.06);
    this.segments.footL.rotation.set(0, 0.14, 0);
    this.segments.footR.rotation.set(0, -0.14, 0);

    // ── Joint Spheres ──
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

    // Active joint highlight (supports real-time fault state)
    this._updateActiveHighlight(exercise, side, isFault);
  }

  _updateActiveHighlight(exercise, side, isFault = false) {
    const isLeft = side === 'left';
    const t = Date.now() * 0.003;

    // Reset all joints and halos to natural anatomical color
    Object.keys(this.joints).forEach(name => {
      const j = this.joints[name];
      const isClothed = name.startsWith('hip');
      if (j && j.material) {
        j.material.color.setHex(isClothed ? 0x181e30 : 0xc8a882);
        j.material.emissive.setHex(0x000000);
        j.material.emissiveIntensity = 0.0;
      }
      if (this.halos[name]) {
        this.halos[name].material.opacity = 0;
      }
    });

    // Reset clothing limb emissives
    const allLimbKeys = ['chest', 'abdomen', 'pelvis', 'bicepL', 'bicepR', 'forearmL', 'forearmR', 'thighL', 'thighR', 'shinL', 'shinR'];
    allLimbKeys.forEach(k => {
      if (this.segments[k] && this.segments[k].material) {
        this.segments[k].material.emissive.setHex(0x000000);
        this.segments[k].material.emissiveIntensity = 0.0;
      }
    });

    // Determine active joints and faulting limbs for all exercises
    const isBoth = side === 'both' || side === 'auto';
    let activeJoints = [];
    let faultLimbs = [];

    if (exercise === 'gym_squat' || exercise === 'squat') {
      activeJoints = isBoth ? ['kneeL', 'kneeR'] : [isLeft ? 'kneeL' : 'kneeR'];
      faultLimbs = ['thighL', 'thighR', 'shinL', 'shinR', 'chest'];
    } else if (exercise === 'gym_curl' || exercise === 'curl') {
      activeJoints = isBoth ? ['elbowL', 'elbowR'] : [isLeft ? 'elbowL' : 'elbowR'];
      faultLimbs = ['bicepL', 'bicepR', 'forearmL', 'forearmR', 'chest'];
    } else if (exercise === 'gym_extension') {
      activeJoints = isBoth ? ['elbowL', 'elbowR'] : [isLeft ? 'elbowL' : 'elbowR'];
      faultLimbs = ['bicepL', 'bicepR', 'forearmL', 'forearmR'];
    } else if (exercise === 'gym_press') {
      activeJoints = isBoth ? ['elbowL', 'elbowR', 'shoulderL', 'shoulderR'] : (isLeft ? ['elbowL', 'shoulderL'] : ['elbowR', 'shoulderR']);
      faultLimbs = ['bicepL', 'bicepR', 'forearmL', 'forearmR', 'chest', 'abdomen'];
    } else if (exercise === 'pt_raise' || exercise === 'raise') {
      activeJoints = isBoth ? ['shoulderL', 'shoulderR'] : [isLeft ? 'shoulderL' : 'shoulderR'];
      faultLimbs = ['bicepL', 'bicepR', 'chest'];
    } else if (exercise === 'pt_knee_ext') {
      activeJoints = isBoth ? ['kneeL', 'kneeR'] : [isLeft ? 'kneeL' : 'kneeR'];
      faultLimbs = ['thighL', 'thighR', 'shinL', 'shinR'];
    } else if (exercise === 'pt_elbow_ext' || exercise === 'pt_elbow_flex') {
      activeJoints = isBoth ? ['elbowL', 'elbowR'] : [isLeft ? 'elbowL' : 'elbowR'];
      faultLimbs = ['bicepL', 'bicepR', 'forearmL', 'forearmR'];
    }

    // On Fault: illuminate relevant 3D anatomical segments in warning crimson red
    if (isFault) {
      const faultLimbEmissive = 0xee2244;
      const faultIntensity = 0.75 + 0.25 * Math.sin(t * 6);
      faultLimbs.forEach(k => {
        if (this.segments[k] && this.segments[k].material) {
          this.segments[k].material.emissive.setHex(faultLimbEmissive);
          this.segments[k].material.emissiveIntensity = faultIntensity;
        }
      });
    }

    // Colors: Vivid crimson red on fault, crisp electric cyan/green on optimal
    const activeColorHex = isFault ? 0xff1744 : 0x38bdf8;
    const pulseSpeed = isFault ? 5 : 2;
    const pulseIntensity = isFault ? (1.9 + Math.sin(t * pulseSpeed) * 0.7) : (1.2 + Math.sin(t * pulseSpeed) * 0.4);
    const haloOpacity = isFault ? (0.65 + Math.sin(t * pulseSpeed) * 0.3) : (0.25 + Math.sin(t * pulseSpeed) * 0.15);

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
        halo.quaternion.copy(this.camera.quaternion); // Always face the camera cleanly
      }
    });

    // Ground ring pulse
    if (this.groundShadow) {
      this.groundShadow.material.color.setHex(isFault ? 0xff1744 : 0x5b9cf6);
      this.groundShadow.material.opacity = isFault ? (0.22 + 0.1 * Math.sin(t * 5)) : (0.08 + 0.04 * Math.sin(t));
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
