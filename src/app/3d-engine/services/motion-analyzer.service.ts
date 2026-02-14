import { Injectable } from '@angular/core';
import { Vector3, Quaternion, MathUtils } from 'three';
import { DEFAULT_MOTION_CONFIG, MotionPreventionConfig } from '../config/motion-sickness.config';

@Injectable({
    providedIn: 'root'
})
export class MotionAnalyzerService {
    private config: MotionPreventionConfig = DEFAULT_MOTION_CONFIG;

    private prevPosition = new Vector3();
    private prevRotation = new Quaternion();

    // Reusable temporaries to avoid GC
    private _deltaPos = new Vector3();

    private _motionIntensity = 0;
    private _isInitialized = false;

    constructor() { }

    /**
     * Initialize the analyzer with the starting transform to prevent a large jump on the first frame.
     */
    initialize(position: Vector3, rotation: Quaternion): void {
        this.prevPosition.copy(position);
        this.prevRotation.copy(rotation);
        this._isInitialized = true;
        this._motionIntensity = 0;
    }

    /**
     * Update the motion intensity calculation based on current camera transform.
     * Call this once per frame.
     * @param position Current world position of the camera/player
     * @param rotation Current world rotation of the camera/player
     * @param deltaTime Time in seconds since last frame
     */
    update(position: Vector3, rotation: Quaternion, deltaTime: number): void {
        if (!this._isInitialized) {
            this.initialize(position, rotation);
            return;
        }

        if (deltaTime <= 0.0001) return; // Prevent division by zero

        // Linear Speed Calculation
        this._deltaPos.subVectors(position, this.prevPosition);
        const linearDist = this._deltaPos.length();
        const linearSpeed = linearDist / deltaTime;

        // Angular Speed Calculation
        // Use angleTo which handles double cover stability (q vs -q)
        const angleDiff = this.prevRotation.angleTo(rotation);
        const angularSpeed = angleDiff / deltaTime;

        // Normalize speeds (0 to 1)
        const normalizedLinear = MathUtils.clamp(linearSpeed / this.config.linearThreshold, 0, 1);
        const normalizedAngular = MathUtils.clamp(angularSpeed / this.config.angularThreshold, 0, 1);

        // Calculate raw target intensity
        const targetIntensity = MathUtils.clamp(
            (normalizedLinear * this.config.weightLinear) +
            (normalizedAngular * this.config.weightAngular),
            0,
            1
        );

        // Smooth transition using exponential interpolation
        // Using a frame-rate independent lerp factor: 1 - exp(-decay * dt)
        const smoothingFactor = 1 - Math.exp(-this.config.transitionSpeed * deltaTime);

        this._motionIntensity = MathUtils.lerp(this._motionIntensity, targetIntensity, smoothingFactor);

        // Update previous states for next frame
        this.prevPosition.copy(position);
        this.prevRotation.copy(rotation);
    }

    get motionIntensity(): number {
        return this._motionIntensity;
    }

    setConfig(newConfig: Partial<MotionPreventionConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }
}
