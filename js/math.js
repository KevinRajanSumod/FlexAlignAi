/**
 * FlexAlign AI - Mathematical Trigonometry Engine
 * Implements exact 3-point angle calculation via vector dot products:
 * angle = acos((BA . BC) / (|BA| * |BC|)) * (180 / PI)
 */

export function calculateJointAngle(a, b, c) {
  if (!a || !b || !c) return 0;
  const baX = a.x - b.x;
  const baY = a.y - b.y;
  const bcX = c.x - b.x;
  const bcY = c.y - b.y;

  const dotProduct = baX * bcX + baY * bcY;
  const magBA = Math.hypot(baX, baY);
  const magBC = Math.hypot(bcX, bcY);

  if (magBA === 0 || magBC === 0) return 0;

  // Clamping avoids float overflow causing NaN in Math.acos at collinear bounds
  const cosAngle = Math.max(-1.0, Math.min(1.0, dotProduct / (magBA * magBC)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

export function calculateTorsoLean(shoulder, hip) {
  if (!shoulder || !hip) return 0;
  const torsoVec = { x: shoulder.x - hip.x, y: shoulder.y - hip.y };
  const mag = Math.hypot(torsoVec.x, torsoVec.y);
  if (mag === 0) return 0;

  // Vertical vector pointing up is (0, -1) in screen coordinates
  // Dot product of torsoVec and (0, -1) is -torsoVec.y
  const cosVal = Math.max(-1.0, Math.min(1.0, (-torsoVec.y) / mag));
  return Math.acos(cosVal) * (180 / Math.PI);
}
