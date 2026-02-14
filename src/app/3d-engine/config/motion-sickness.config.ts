export interface MotionPreventionConfig {
    /** Speed threshold (units per second) before effects start kicking in */
    linearThreshold: number;
    /** Rotation threshold (radians per second) before effects start kicking in */
    angularThreshold: number;
    /** Influence of linear speed on the total motion intensity (0-1) */
    weightLinear: number;
    /** Influence of angular speed on the total motion intensity (0-1) */
    weightAngular: number;
    /** Minimum Field of View in degrees (when motion is max) */
    minFov: number;
    /** Maximum Field of View in degrees (when static) */
    maxFov: number;
    /** Maximum obscuration of the vignette (0-1) */
    vignetteMaxIntensity: number;
    /** Speed of transition for FOV and vignette changes (lerp factor) */
    transitionSpeed: number;
}

export const DEFAULT_MOTION_CONFIG: MotionPreventionConfig = {
    linearThreshold: 10.0,    // Adjust based on your world scale
    angularThreshold: 2.0,    // Radians per second ~ 114 degrees/sec
    weightLinear: 0.4,
    weightAngular: 0.6,       // Rotation usually causes more sickness
    minFov: 60,
    maxFov: 75,
    vignetteMaxIntensity: 0.7, // 70% darkness at edges
    transitionSpeed: 5.0      // Fast but smooth reaction
};
