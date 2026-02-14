import { Injectable } from '@angular/core';
import { WebGLRenderer, Scene, Camera, Vector2, ShaderMaterial, UniformsUtils } from 'three';
// Depending on user's three.js version, passes might be imported differently.
// Assuming user installs 'three/examples/jsm/postprocessing/...' or uses 'three-stdlib'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';


import { DEFAULT_MOTION_CONFIG, MotionPreventionConfig } from '../config/motion-sickness.config';

// Inline shader code for robustness in Angular environments without custom webpack config
const VIGNETTE_VERT = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;

const VIGNETTE_FRAG = `
uniform sampler2D tDiffuse;
uniform float intensity; 
uniform float radius;    
uniform float feather;   
varying vec2 vUv;

void main() {
    vec4 texel = texture2D(tDiffuse, vUv);
    float dist = distance(vUv, vec2(0.5));
    // Smoothstep creates the mask. It handles reverse ranges correctly (radius -> radius-feather).
    // Center (dist=0) -> 1.0, Edge (dist>radius) -> 0.0
    float vignette = smoothstep(radius, radius - feather, dist);
    
    // Mix based on global intensity:
    // If intensity is 0, factor is 1.0 (no effect).
    // If intensity is 1, factor is 'vignette'.
    float factor = mix(1.0, vignette, intensity);
    
    gl_FragColor = vec4(texel.rgb * factor, texel.a);
}`;

@Injectable({
    providedIn: 'root'
})
export class VignetteEffectService {
    private composer: EffectComposer | null = null;
    private vignettePass: ShaderPass | null = null;
    private config: MotionPreventionConfig = DEFAULT_MOTION_CONFIG;

    constructor() { }

    initialize(renderer: WebGLRenderer, scene: Scene, camera: Camera): void {
        this.composer = new EffectComposer(renderer);

        // 1. Render the scene normally
        const renderPass = new RenderPass(scene, camera);
        this.composer.addPass(renderPass);

        // 2. Add Vignette Shader Pass
        const vignetteShader = {
            uniforms: {
                'tDiffuse': { value: null },
                'intensity': { value: 0.0 }, // Dynamic: 0 to 1
                'radius': { value: 0.8 },    // Static config
                'feather': { value: 0.4 }    // Static config
            },
            vertexShader: VIGNETTE_VERT,
            fragmentShader: VIGNETTE_FRAG
        };

        this.vignettePass = new ShaderPass(new ShaderMaterial(vignetteShader));
        this.composer.addPass(this.vignettePass);


    }

    update(motionIntensity: number): void {
        if (!this.vignettePass) return;

        // Map motion intensity to shader uniforms
        // If motion is 0, shader intensity is 0
        // If motion is 1, shader intensity is config.vignetteMaxIntensity
        const targetShaderIntensity = motionIntensity * this.config.vignetteMaxIntensity;

        // Smoothly update uniform? No, motionIntensity is already smoothed by Analyzer.
        this.vignettePass.uniforms['intensity'].value = targetShaderIntensity;

        // Optional: Dynamic radius based on motion
        // More motion -> smaller operational radius (more tunnel vision)
        // Radius goes from 0.8 (static) to 0.4 (fast)?
        // Let's implement dynamic radius:
        // radius = baseRadius - (motion * factor)
        const baseRadius = 0.8;
        const dynamicRadius = baseRadius - (motionIntensity * 0.3); // reduce radius by up to 0.3
        this.vignettePass.uniforms['radius'].value = dynamicRadius;
    }

    render(): void {
        if (this.composer) {
            this.composer.render();
        }
    }

    setSize(width: number, height: number): void {
        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }

    setConfig(newConfig: Partial<MotionPreventionConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }
}
