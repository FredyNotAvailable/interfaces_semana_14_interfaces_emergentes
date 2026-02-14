import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SceneService } from './services/scene.service';
import { DEFAULT_MOTION_CONFIG } from './config/motion-sickness.config';

@Component({
    selector: 'app-engine-viewer',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="engine-container">
      <!-- 3D Canvas Container -->
      <div #renderContainer class="render-target"></div>

      <!-- Configuration Panel -->
      <div class="config-panel">
        <h3>Motion Sickness Settings</h3>
        
        <div class="control-group">
          <label>Linear Threshold: {{config.linearThreshold}}</label>
          <input type="range" min="1" max="50" step="1" 
                 [(ngModel)]="config.linearThreshold" (ngModelChange)="updateConfig()">
        </div>

        <div class="control-group">
          <label>Angular Threshold: {{config.angularThreshold}}</label>
          <input type="range" min="0.1" max="10" step="0.1" 
                 [(ngModel)]="config.angularThreshold" (ngModelChange)="updateConfig()">
        </div>
        
        <div class="control-group">
          <label>Vignette Max Intensity: {{config.vignetteMaxIntensity}}</label>
          <input type="range" min="0" max="1" step="0.05" 
                 [(ngModel)]="config.vignetteMaxIntensity" (ngModelChange)="updateConfig()">
        </div>

        <div class="control-group">
          <label>Transition Speed: {{config.transitionSpeed}}</label>
          <input type="range" min="0.1" max="20" step="0.5" 
                 [(ngModel)]="config.transitionSpeed" (ngModelChange)="updateConfig()">
        </div>

        <div class="control-group">
          <label>Min FOV: {{config.minFov}}</label>
          <input type="range" min="30" max="90" step="1" 
                 [(ngModel)]="config.minFov" (ngModelChange)="updateConfig()">
        </div>
        
        <p class="instruction">Click on scene to look around (WASD to move)</p>
      </div>
    </div>
  `,
    styles: [`
    .engine-container {
      position: relative;
      width: 100%;
      height: 100vh;
      overflow: hidden;
    }
    .render-target {
      width: 100%;
      height: 100%;
      background: #000;
    }
    .config-panel {
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 8px;
      width: 300px;
      font-family: sans-serif;
    }
    .control-group {
      margin-bottom: 15px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-size: 14px;
    }
    input[type=range] {
      width: 100%;
    }
    .instruction {
      font-size: 12px;
      color: #aaa;
      margin-top: 20px;
      font-style: italic;
    }
  `]
})
export class EngineViewerComponent implements AfterViewInit, OnDestroy {
    @ViewChild('renderContainer') renderContainer!: ElementRef<HTMLElement>;

    // Clone config to avoid modifying the constant directly initially
    config = { ...DEFAULT_MOTION_CONFIG };

    constructor(private sceneService: SceneService) { }

    ngAfterViewInit(): void {
        if (this.renderContainer) {
            this.sceneService.initialize(this.renderContainer.nativeElement);

            // Handle resize
            window.addEventListener('resize', this.onResize);
        }
    }

    updateConfig(): void {
        this.sceneService.updateConfig(this.config);
    }

    onResize = (): void => {
        if (this.renderContainer) {
            const { clientWidth, clientHeight } = this.renderContainer.nativeElement;
            this.sceneService.resize(clientWidth, clientHeight);
        }
    }

    ngOnDestroy(): void {
        window.removeEventListener('resize', this.onResize);
        this.sceneService.dispose();
    }
}
