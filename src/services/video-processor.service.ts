
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

  async createFullSpriteSheet(frames: ExtractedFrame[], frameSize: number = 0, bgColor: string = 'transparent'): Promise<string> {
    const count = frames.length;
    if (count === 0) return '';

    // Determina dimensioni naturali dal primo frame tramite ImageBitmap (più preciso di HTMLImageElement)
    const firstBlob = await this.dataUrlToBlob(frames[0].dataUrl);
    const firstBitmap = await createImageBitmap(firstBlob);
    const naturalWidth = firstBitmap.width;
    const naturalHeight = firstBitmap.height;
    const aspectRatio = naturalWidth / naturalHeight;
    firstBitmap.close();

    // Dimensioni per cella sul foglio
    let cellW: number;
    let cellH: number;

    if (frameSize === 0) {
      // Qualità Originale: usa la risoluzione nativa del video
      cellW = naturalWidth;
      cellH = naturalHeight;
    } else if (aspectRatio >= 1) {
      cellW = frameSize;
      cellH = Math.round(frameSize / aspectRatio);
    } else {
      cellH = frameSize;
      cellW = Math.round(frameSize * aspectRatio);
    }

    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    // Protezione limite canvas browser (Chrome/Safari: max ~16384px per lato)
    // Se superato, il browser ridimensiona silenziosamente il canvas → sfoca tutto
    const MAX_SIDE = 16384;
    const rawW = cols * cellW;
    const rawH = rows * cellH;
    if (rawW > MAX_SIDE || rawH > MAX_SIDE) {
      const scale = Math.min(MAX_SIDE / rawW, MAX_SIDE / rawH);
      cellW = Math.floor(cellW * scale);
      cellH = Math.floor(cellH * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = cols * cellW;
    canvas.height = rows * cellH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (bgColor !== 'transparent') {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    for (let i = 0; i < frames.length; i++) {
      const blob = await this.dataUrlToBlob(frames[i].dataUrl);

      // createImageBitmap con resizeQuality:'high' usa Lanczos nativo del browser
      // Nettamente superiore all'interpolazione bilineare di drawImage()
      const bitmap = await createImageBitmap(blob, {
        resizeWidth: cellW,
        resizeHeight: cellH,
        resizeQuality: 'high'
      });

      const x = (i % cols) * cellW;
      const y = Math.floor(i / cols) * cellH;
      ctx.drawImage(bitmap, x, y);
      bitmap.close(); // libera memoria GPU subito dopo l'uso
    }

    // toBlob → dataUrl: più affidabile di toDataURL() per canvas grandi
    return await this.canvasToPngDataUrl(canvas);
  }

  /** Converte un dataUrl in Blob senza perdita (evita il ciclo encode/decode base64) */
  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return res.blob();
  }

  /** Usa toBlob() invece di toDataURL() — gestisce meglio i canvas di grandi dimensioni */
  private canvasToPngDataUrl(canvas: HTMLCanvasElement): Promise<string> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          // Fallback a toDataURL se toBlob fallisce
          resolve(canvas.toDataURL('image/png'));
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      }, 'image/png');
    });
  }
}
