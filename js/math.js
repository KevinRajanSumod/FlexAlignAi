/**
 * FlexAlign AI - Mathematical Trigonometry Engine
 * Implements 3D vector joint angle calculation via vector dot products:
 * angle = acos((BA . BC) / (|BA| * |BC|)) * (180 / PI)
 * Supports full 3D spatial geometry (X, Y, Z) with backward compatibility for 2D.
 */

export function calculateJointAngle(a, b, c) {
  if (!a || !b || !c) return 0;
  const baX = a.x - b.x;
  const baY = a.y - b.y;
  const baZ = (a.z !== undefined && b.z !== undefined) ? (a.z - b.z) : 0;

  const bcX = c.x - b.x;
  const bcY = c.y - b.y;
  const bcZ = (c.z !== undefined && b.z !== undefined) ? (c.z - b.z) : 0;

  const dotProduct = baX * bcX + baY * bcY + baZ * bcZ;
  const magBA = Math.hypot(baX, baY, baZ);
  const magBC = Math.hypot(bcX, bcY, bcZ);

  if (magBA === 0 || magBC === 0) return 0;

  // Clamping avoids float overflow causing NaN in Math.acos at collinear bounds
  const cosAngle = Math.max(-1.0, Math.min(1.0, dotProduct / (magBA * magBC)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

export function calculateTorsoLean(shoulder, hip) {
  if (!shoulder || !hip) return 0;
  const torsoVec = { 
    x: shoulder.x - hip.x, 
    y: shoulder.y - hip.y,
    z: (shoulder.z !== undefined && hip.z !== undefined) ? (shoulder.z - hip.z) : 0
  };
  const mag = Math.hypot(torsoVec.x, torsoVec.y, torsoVec.z);
  if (mag === 0) return 0;

  // In normalized space, vertical vector pointing up is (0, -1, 0)
  // Dot product with (0, -1, 0) is -torsoVec.y
  const cosVal = Math.max(-1.0, Math.min(1.0, (-torsoVec.y) / mag));
  return Math.acos(cosVal) * (180 / Math.PI);
}
