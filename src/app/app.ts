import { Component, signal } from '@angular/core';
import { EngineViewerComponent } from './3d-engine/engine-viewer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [EngineViewerComponent],
  template: `<app-engine-viewer></app-engine-viewer>`,
  styles: [`
    :host {
      display: block;
      margin: 0;
      padding: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
  `]
})
export class App {
  protected readonly title = signal('motion-sickness-app');
}
