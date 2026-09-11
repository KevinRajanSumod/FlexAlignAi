/**
 * FlexAlign AI - Virtual Biomechanical Motion Simulator (Bridge)
 * Re-exports modular simulation engine from ./simulation/simulator.js
 * for backward compatibility and clean decoupling.
 */

export { SIMULATION_EXERCISES, MotionSimulator } from './simulation/simulator.js';
export { GYM_SIM_IDS, isGymExercise } from './simulation/gym-kinematics.js';
export { PT_SIM_IDS, isPTExercise } from './simulation/pt-kinematics.js';
export { inferMotionProfile, synthesizeProceduralMotion } from './simulation/procedural-kinematics.js';
