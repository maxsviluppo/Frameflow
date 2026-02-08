
import { Component, signal, computed, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoProcessorService, ExtractedFrame } from './services/video-processor.service';

interface Toast {
  message: string;
  type: 'success' | 'error';
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
  intervalMs = signal<number>(500);
  currentTime = signal<number>(0);
  duration = signal<number>(0);
  
  // UI States
  showConfirmReset = signal<boolean>(false);
  toast = signal<Toast>({ message: '', type: 'success', visible: false });

  selectedCount = computed(() => this.frames().filter(f => f.selected).length);
  
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toast.set({ message, type, visible: true });
    setTimeout(() => {
      this.toast.update(t => ({ ...t, visible: false }));
    }, 3000);
  }

  handleFileUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const url = URL.createObjectURL(file);
      this.videoUrl.set(url);
      this.frames.set([]);
      this.showToast('Video caricato con successo!');
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
    this.intervalMs.set(parseInt(val, 10) || 100);
  }

  async startExtraction() {
    if (!this.videoUrl()) return;
    this.isExtracting.set(true);
    try {
      const result = await this.videoProcessor.extractFrames(this.videoUrl()!, this.intervalMs());
      this.frames.set(result);
      this.showToast(`${result.length} fotogrammi estratti!`);
    } catch (err) {
      this.showToast('Errore durante l\'estrazione', 'error');
    } finally {
      this.isExtracting.set(false);
    }
  }

  toggleSelect(id: string) {
    this.frames.update(current => 
      current.map(f => f.id === id ? { ...f, selected: !f.selected } : f)
    );
  }

  selectAll() {
    this.frames.update(current => current.map(f => ({ ...f, selected: true })));
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
    this.showToast('Sessione resettata');
  }

  downloadSelected(format: 'png' | 'jpg') {
    const selected = this.frames().filter(f => f.selected);
    if (selected.length === 0) return;

    selected.forEach((frame) => {
      const link = document.createElement('a');
      link.href = frame.dataUrl;
      link.download = `frame_${frame.timestamp}ms.${format}`;
      link.click();
    });
    this.showToast(`Download di ${selected.length} immagini avviato`);
  }

  async downloadSpriteSheet() {
    const selected = this.frames().filter(f => f.selected);
    const targetFrames = selected.length > 0 ? selected : this.frames();
    if (targetFrames.length === 0) return;

    this.isExtracting.set(true);
    try {
      const spriteSheet = await this.videoProcessor.createFullSpriteSheet(targetFrames, 128);
      const link = document.createElement('a');
      link.href = spriteSheet;
      link.download = `spritesheet_128.png`;
      link.click();
      this.showToast('Sprite Sheet generato con successo!');
    } catch (e) {
      this.showToast('Errore durante la creazione dello Sprite Sheet', 'error');
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
