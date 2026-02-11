
import { Injectable } from '@angular/core';

export interface ExtractedFrame {
  id: string;
  timestamp: number;
  dataUrl: string;
  selected: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VideoProcessorService {

  async extractFrames(videoUrl: string, intervalMs: number): Promise<ExtractedFrame[]> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';

      video.onloadedmetadata = async () => {
        const duration = video.duration;
        const frames: ExtractedFrame[] = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject('Impossibile creare il contesto canvas');
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        let currentTime = 0;
        const intervalSec = intervalMs / 1000;

        while (currentTime <= duration) {
          video.currentTime = currentTime;

          await new Promise(r => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              // Tempo di attesa critico per evitare frame neri/vuoti iniziali
              setTimeout(r, 60);
            };
            video.addEventListener('seeked', onSeeked);
          });

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }

          frames.push({
            id: Math.random().toString(36).substring(7),
            timestamp: Math.round(currentTime * 1000),
            dataUrl: canvas.toDataURL('image/png'),
            selected: false
          });

          currentTime += intervalSec;

          if (frames.length > 1000) break;
        }

        resolve(frames);
      };

      video.onerror = () => reject('Errore nel caricamento del video');
    });
  }

  async createFullSpriteSheet(frames: ExtractedFrame[], frameSize: number = 128, bgColor: string = 'transparent'): Promise<string> {
    const count = frames.length;
    if (count === 0) return '';

    // Determinazione dimensioni frame finale
    let finalWidth = frameSize;
    let finalHeight = frameSize;

    if (frameSize === 0) {
      const firstImg = await this.loadImage(frames[0].dataUrl);
      finalWidth = firstImg.width;
      finalHeight = firstImg.height;
    }

    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const canvas = document.createElement('canvas');
    canvas.width = cols * finalWidth;
    canvas.height = rows * finalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Applica colore di sfondo se non è trasparente
    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    for (let i = 0; i < frames.length; i++) {
      const img = await this.loadImage(frames[i].dataUrl);
      const x = (i % cols) * finalWidth;
      const y = Math.floor(i / cols) * finalWidth;

      if (frameSize === 0) {
        // Disegno a dimensione originale per massimizzare la nitidezza
        ctx.drawImage(img, x, y);
      } else {
        const ratio = Math.min(finalWidth / img.width, finalHeight / img.height);
        const nw = img.width * ratio;
        const nh = img.height * ratio;
        const ox = x + (finalWidth - nw) / 2;
        const oy = y + (finalHeight - nh) / 2;
        ctx.drawImage(img, ox, oy, nw, nh);
      }
    }

    return canvas.toDataURL('image/png');
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = url;
    });
  }
}
