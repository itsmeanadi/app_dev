/**
 * src/detection/index.ts
 * Re-export everything from jerkDetector for clean imports.
 */
export {
  computeMagnitudeG,
  movingAverage,
  isAccelTriggered,
  isSpeedDropTriggered,
  shouldTriggerAlert,
} from './jerkDetector';

export type { SpeedRecord } from './jerkDetector';
