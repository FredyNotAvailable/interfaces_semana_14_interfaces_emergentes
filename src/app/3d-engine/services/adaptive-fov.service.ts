import { Injectable } from '@angular/core';
import { PerspectiveCamera, MathUtils } from 'three';
import { DEFAULT_MOTION_CONFIG, MotionPreventionConfig } from '../config/motion-sickness.config';

@Injectable({
    providedIn: 'root'
})
export class AdaptiveFovService {
    private config: MotionPreventionConfig = DEFAULT_MOTION_CONFIG;

    constructor() { }

    /**
     * Update the camera field of view based on motion intensity.
     * Call this once per frame.
     * @param camera The active perspective camera
     * @param motionIntensity Current smoothed motion intensity (0 to 1)
     * @param deltaTime Time in seconds since last frame
     */
    update(camera: PerspectiveCamera, motionIntensity: number, deltaTime: number): void {
        if (!camera.isPerspectiveCamera) {
            console.warn('AdaptiveFovService: Camera is not a PerspectiveCamera');
            return;
        }

        // Determine target FOV based on intensity
        // 0 intensity -> maxFov (wide, static)
        // 1 intensity -> minFov (narrow, fast)
        const targetFov = MathUtils.lerp(this.config.maxFov, this.config.minFov, motionIntensity);

        // Apply smoothing to the FOV change itself to prevent jarring steps
        // Lerp factor depends on delta time
        const smoothingFactor = 1 - Math.exp(-this.config.transitionSpeed * deltaTime);

        // Interpolate current FOV towards target
        const newFov = MathUtils.lerp(camera.fov, targetFov, smoothingFactor);

        // Apply only if significant change to solve for micro-jitters
        if (Math.abs(newFov - camera.fov) > 0.01) {
            camera.fov = newFov;
            camera.updateProjectionMatrix();
        }
    }

    setConfig(newConfig: Partial<MotionPreventionConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }
}
