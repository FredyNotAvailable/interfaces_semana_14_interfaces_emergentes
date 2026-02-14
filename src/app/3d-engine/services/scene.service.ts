import { Injectable, NgZone, OnDestroy } from '@angular/core';
import {
    Scene, PerspectiveCamera, WebGLRenderer, Clock,
    Vector3, Color, GridHelper, Mesh, BoxGeometry,
    MeshBasicMaterial, HemisphereLight
} from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

import { MotionAnalyzerService } from './motion-analyzer.service';
import { AdaptiveFovService } from './adaptive-fov.service';
import { VignetteEffectService } from './vignette-effect.service';
import { MotionPreventionConfig, DEFAULT_MOTION_CONFIG } from '../config/motion-sickness.config';

@Injectable({
    providedIn: 'root'
})
export class SceneService implements OnDestroy {
    private renderer!: WebGLRenderer;
    private scene!: Scene;
    private camera!: PerspectiveCamera;
    private controls!: PointerLockControls;
    private clock: Clock;

    private animationId: number = 0;
    private isRunning: boolean = false;

    // Movement state
    private moveForward = false;
    private moveBackward = false;
    private moveLeft = false;
    private moveRight = false;
    private velocity = new Vector3();
    private direction = new Vector3();
    private readonly MOVEMENT_SPEED = 30.0; // Units per second

    constructor(
        private ngZone: NgZone,
        private motionAnalyzer: MotionAnalyzerService,
        private adaptiveFov: AdaptiveFovService,
        private vignetteEffect: VignetteEffectService
    ) {
        this.clock = new Clock();
    }

    // Initialize the engine and attach to DOM
    initialize(container: HTMLElement): void {
        // 1. Setup Scene
        this.scene = new Scene();
        this.scene.background = new Color(0xeeeeee);
        this.scene.add(new GridHelper(1000, 100)); // Visual reference

        // Add some cubes for motion reference
        this.addTestObjects();

        // 2. Setup Lighting
        const light = new HemisphereLight(0xffffff, 0x444444, 1);
        this.scene.add(light);

        // 3. Setup Camera
        const aspect = container.clientWidth / container.clientHeight;
        this.camera = new PerspectiveCamera(DEFAULT_MOTION_CONFIG.maxFov, aspect, 0.1, 1000);
        this.camera.position.y = 1.6; // Eye height

        // 4. Setup Renderer
        this.renderer = new WebGLRenderer({ antialias: true }); // Antialias important for VR/Motion
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);

        // 5. Setup Controls
        this.controls = new PointerLockControls(this.camera, document.body);

        // 6. Setup Post Processing
        this.vignetteEffect.initialize(this.renderer, this.scene, this.camera);

        // 7. Input Listeners for Movement
        this.setupInputs();

        // 8. Start Loop
        this.start();
    }

    private addTestObjects(): void {
        const geometry = new BoxGeometry(2, 2, 2);
        const material = new MeshBasicMaterial({ color: 0x00ff00, wireframe: true });

        for (let i = 0; i < 50; i++) {
            const mesh = new Mesh(geometry, material);
            mesh.position.x = (Math.random() - 0.5) * 100;
            mesh.position.y = (Math.random() - 0.5) * 10 + 2;
            mesh.position.z = (Math.random() - 0.5) * 100;
            this.scene.add(mesh);
        }
    }

    private setupInputs(): void {
        // Basic WASD movement
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));

        // Click to lock pointer
        this.renderer.domElement.addEventListener('click', () => {
            this.controls.lock();
        });
    }

    private onKeyDown(event: KeyboardEvent): void {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': this.moveForward = true; break;
            case 'ArrowLeft':
            case 'KeyA': this.moveLeft = true; break;
            case 'ArrowDown':
            case 'KeyS': this.moveBackward = true; break;
            case 'ArrowRight':
            case 'KeyD': this.moveRight = true; break;
        }
    }

    private onKeyUp(event: KeyboardEvent): void {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW': this.moveForward = false; break;
            case 'ArrowLeft':
            case 'KeyA': this.moveLeft = false; break;
            case 'ArrowDown':
            case 'KeyS': this.moveBackward = false; break;
            case 'ArrowRight':
            case 'KeyD': this.moveRight = false; break;
        }
    }

    start(): void {
        if (this.isRunning) return;
        this.isRunning = true;

        // Run outside Angular zone to prevent change detection on every frame (Performance!)
        this.ngZone.runOutsideAngular(() => {
            this.animate();
        });
    }

    stop(): void {
        this.isRunning = false;
        cancelAnimationFrame(this.animationId);
    }

    private animate(): void {
        if (!this.isRunning) return;

        this.animationId = requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        // 1. Process Input & Move Player
        this.processMovement(delta);

        // 2. Analyze Motion (The Core Logic)
        // Pass current camera transform to analyzer
        this.motionAnalyzer.update(this.camera.position, this.camera.quaternion, delta);
        const intensity = this.motionAnalyzer.motionIntensity;

        // 3. Apply Effects
        // a. Update FOV
        this.adaptiveFov.update(this.camera, intensity, delta);

        // b. Update Vignette Uniforms
        this.vignetteEffect.update(intensity);

        // 4. Render
        // Use the composer instead of raw renderer
        this.vignetteEffect.render();
    }

    private processMovement(delta: number): void {
        if (this.controls.isLocked) {
            // Very basic FPS movement logic
            this.velocity.x -= this.velocity.x * 10.0 * delta; // Friction
            this.velocity.z -= this.velocity.z * 10.0 * delta;

            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize(); // Consistent speed in diagonals

            if (this.moveForward || this.moveBackward) {
                this.velocity.z -= this.direction.z * this.MOVEMENT_SPEED * delta;
            }
            if (this.moveLeft || this.moveRight) {
                this.velocity.x -= this.direction.x * this.MOVEMENT_SPEED * delta;
            }

            this.controls.moveRight(-this.velocity.x * delta);
            this.controls.moveForward(-this.velocity.z * delta);
        }
    }

    // Public API to update configuration at runtime
    updateConfig(config: Partial<MotionPreventionConfig>): void {
        this.motionAnalyzer.setConfig(config);
        this.adaptiveFov.setConfig(config);
        this.vignetteEffect.setConfig(config);
    }

    // Handle resize events
    resize(width: number, height: number): void {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        this.vignetteEffect.setSize(width, height);
    }

    // Public cleanup method
    dispose(): void {
        this.stop();
        if (this.renderer) {
            this.renderer.dispose();
            if (this.renderer.domElement) {
                this.renderer.domElement.remove();
            }
        }
    }

    ngOnDestroy(): void {
        this.dispose();
    }
}
