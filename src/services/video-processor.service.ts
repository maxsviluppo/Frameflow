
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
      // Force loading of enough data to render the first frame
      video.preload = 'auto';

      video.onloadedmetadata = async () => {
        const duration = video.duration;
        const frames: ExtractedFrame[] = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject('Could not create canvas context');
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        let currentTime = 0;
        const intervalSec = intervalMs / 1000;

        // Loop through the video duration
        while (currentTime <= duration) {
          video.currentTime = currentTime;
          
          await new Promise(r => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              // Small delay to ensure the frame is actually decoded and ready for drawImage
              // This fixes the "empty first frame" issue in many browsers
              setTimeout(r, 40);
            };
            video.addEventListener('seeked', onSeeked);
          });

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          frames.push({
            id: Math.random().toString(36).substring(7),
            timestamp: Math.round(currentTime * 1000),
            dataUrl: canvas.toDataURL('image/png'),
            selected: false
          });

          currentTime += intervalSec;
          
          // Safety break to prevent browser hang on extremely long videos
          if (frames.length > 1000) break; 
        }

        resolve(frames);
      };

      video.onerror = () => reject('Error loading video');
    });
  }

  async createFullSpriteSheet(frames: ExtractedFrame[], frameSize: number = 128): Promise<string> {
    const count = frames.length;
    if (count === 0) return '';
    
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const canvas = document.createElement('canvas');
    canvas.width = cols * frameSize;
    canvas.height = rows * frameSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < frames.length; i++) {
      const img = await this.loadImage(frames[i].dataUrl);
      const x = (i % cols) * frameSize;
      const y = Math.floor(i / cols) * frameSize;
      
      // Calculate fit (contain) inside the 128x128 cell
      const ratio = Math.min(frameSize / img.width, frameSize / img.height);
      const nw = img.width * ratio;
      const nh = img.height * ratio;
      const ox = x + (frameSize - nw) / 2;
      const oy = y + (frameSize - nh) / 2;
      
      // Drawing strictly the image, no text/numbers added here
      ctx.drawImage(img, ox, oy, nw, nh);
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
