/* Adapted from Barty-Bart/motion-graphics, skills/motion-broll/engine/motion.js.
   MIT license; see docs/THIRD-PARTY-MOTION.md. The deterministic spring is used
   only for a brief hero entrance, never for essential offer information. */
export function springStep(t, frequency = 12.5, damping = 0.9) {
  if (t <= 0) return 0;
  if (!Number.isFinite(frequency)) return 1;
  if (damping < 1) {
    const dampedFrequency = frequency * Math.sqrt(1 - damping * damping);
    return 1 - Math.exp(-damping * frequency * t) * (
      Math.cos(dampedFrequency * t) +
      damping * frequency / dampedFrequency * Math.sin(dampedFrequency * t)
    );
  }
  return 1 - Math.exp(-frequency * t) * (1 + frequency * t);
}
