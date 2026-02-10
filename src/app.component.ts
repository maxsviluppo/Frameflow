
import { Component, signal, computed, inject, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoProcessorService, ExtractedFrame } from './services/video-processor.service';

interface Toast {
  message: string;
  type: 'success' | 'info' | 'error';
  visible: boolean;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrls: []
})
export class AppComponent {
  private videoProcessor = inject(VideoProcessorService);

  videoUrl = signal<string | null>(null);
  isExtracting = signal<boolean>(false);
  frames = signal<ExtractedFrame[]>([]);
  intervalMs = signal<number>(41.7);

  fpsPresets = [
    { name: '24 FPS - DEFAULT', value: 41.7, description: 'Standard cinematografico' },
    { name: '30 FPS - BILANCIATO', value: 33.3, description: 'Standard TV/Web' },
    { name: '60 FPS - FLUIDO', value: 16.7, description: 'Massima precisione' },
    { name: '12 FPS - PIXEL GAME', value: 83.3, description: 'Stile Retro/Pixel Art' }
  ];

  setPreset(value: number) {
    this.intervalMs.set(value);
    this.showToast(`Preset applicato: ${value}ms`, 'info');
  }
  currentTime = signal<number>(0);
  duration = signal<number>(0);

  // UI States
  showConfirmReset = signal<boolean>(false);
  toast = signal<Toast>({ message: '', type: 'success', visible: false });

  // Preview State
  previewFrameIndex = signal<number>(0);
  spriteSheetPreview = signal<string | null>(null);
  private previewInterval: any = null;

  // Export Settings
  spriteSize = signal<number>(0);
  spriteBgColor = signal<string>('transparent');

  bgColors = [
    { name: 'Trasparente', value: 'transparent' },
    { name: 'Bianco', value: '#ffffff' },
    { name: 'Nero', value: '#000000' },
    { name: 'Grigio Scuro', value: '#222222' }
  ];

  selectedCount = computed(() => this.frames().filter(f => f.selected).length);
  selectedFrames = computed(() => {
    const selected = this.frames().filter(f => f.selected);
    return selected.length > 0 ? selected : this.frames();
  });

  constructor() {
    effect(() => {
      // Re-start loop and generate preview when selection or interval changes
      this.startPreviewLoop();
      this.generatePreviewSheet();
    });
  }

  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  showToast(message: string, type: 'success' | 'info' | 'error' = 'success') {
    // Reset toast to trigger animation if one is already visible
    this.toast.set({ message, type, visible: true });

    // Auto-hide after 4 seconds for better readability
    setTimeout(() => {
      this.toast.update(t => ({ ...t, visible: false }));
    }, 4000);
  }

  handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const url = URL.createObjectURL(file);
      this.videoUrl.set(url);
      this.frames.set([]);
      this.showToast('Ottimo! Video caricato e pronto per l\'analisi.', 'success');
    }
  }

  onMetadataLoaded(event: Event) {
    const video = event.target as HTMLVideoElement;
    this.duration.set(video.duration);
  }

  onTimeUpdate(event: Event) {
    const video = event.target as HTMLVideoElement;
    this.currentTime.set(video.currentTime);
  }

  updateInterval(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.intervalMs.set(parseFloat(val) || 100);
  }

  async startExtraction() {
    if (!this.videoUrl()) return;
    this.isExtracting.set(true);
    this.showToast('Analisi in corso: stiamo catturando i fotogrammi sequenziali...', 'info');

    try {
      const result = await this.videoProcessor.extractFrames(this.videoUrl()!, this.intervalMs());
      this.frames.set(result);
      this.showToast(`Operazione completata! Abbiamo generato ${result.length} fotogrammi.`, 'success');
      this.startPreviewLoop();
      this.generatePreviewSheet();
    } catch (err) {
      this.showToast('Ops! Qualcosa è andato storto durante l\'estrazione.', 'error');
    } finally {
      this.isExtracting.set(false);
    }
  }

  startPreviewLoop() {
    if (this.previewInterval) clearInterval(this.previewInterval);
    const targetFrames = this.selectedFrames();
    if (targetFrames.length === 0) return;

    // Reset index to avoid out of bounds when selection narrows
    this.previewFrameIndex.set(0);

    this.previewInterval = setInterval(() => {
      this.previewFrameIndex.update(i => (i + 1) % targetFrames.length);
    }, this.intervalMs());
  }

  async generatePreviewSheet() {
    const targetFrames = this.selectedFrames();
    if (targetFrames.length === 0) {
      this.spriteSheetPreview.set(null);
      return;
    };
    try {
      const url = await this.videoProcessor.createFullSpriteSheet(targetFrames, 64, this.spriteBgColor());
      this.spriteSheetPreview.set(url);
    } catch (e) {
      console.error('Preview generation failed', e);
    }
  }

  toggleSelect(id: string) {
    this.frames.update(current =>
      current.map(f => f.id === id ? { ...f, selected: !f.selected } : f)
    );
  }

  selectAll() {
    this.frames.update(current => current.map(f => ({ ...f, selected: true })));
    this.showToast('Tutti i fotogrammi sono stati selezionati per l\'esportazione.', 'info');
  }

  selectNone() {
    this.frames.update(current => current.map(f => ({ ...f, selected: false })));
  }

  confirmReset() {
    this.showConfirmReset.set(true);
  }

  executeReset() {
    if (this.videoUrl()) {
      URL.revokeObjectURL(this.videoUrl()!);
    }
    this.videoUrl.set(null);
    this.frames.set([]);
    this.currentTime.set(0);
    this.duration.set(0);
    this.showConfirmReset.set(false);
    this.showToast('Sessione pulita. Puoi caricare un nuovo video.', 'info');
  }

  downloadSelected(format: 'png' | 'jpg') {
    const selected = this.frames().filter(f => f.selected);
    if (selected.length === 0) return;

    this.showToast(`Preparazione download: stiamo scaricando ${selected.length} file sul tuo dispositivo.`, 'info');

    selected.forEach((frame) => {
      const link = document.createElement('a');
      link.href = frame.dataUrl;
      link.download = `frame_${frame.timestamp}ms.${format}`;
      link.click();
    });
  }

  async downloadSpriteSheet() {
    const selected = this.frames().filter(f => f.selected);
    const targetFrames = selected.length > 0 ? selected : this.frames();
    if (targetFrames.length === 0) return;

    this.showToast(`Generazione Sprite Sheet: ${this.spriteSize()}x${this.spriteSize()}...`, 'info');
    this.isExtracting.set(true);

    try {
      const spriteSheet = await this.videoProcessor.createFullSpriteSheet(
        targetFrames,
        this.spriteSize(),
        this.spriteBgColor()
      );
      const link = document.createElement('a');
      link.href = spriteSheet;
      link.download = `spritesheet_${this.spriteSize()}.png`;
      link.click();
      this.showToast('Il tuo Sprite Sheet è pronto e il download è stato avviato.', 'success');
    } catch (e) {
      this.showToast('Errore durante la creazione della mappa Sprite.', 'error');
    } finally {
      this.isExtracting.set(false);
    }
  }

  formatTime(time: number): string {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }
}
