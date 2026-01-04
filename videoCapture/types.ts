export enum AppMode {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  SCREENSHOT_PREVIEW = 'SCREENSHOT_PREVIEW',
  SETTINGS = 'SETTINGS',
  GALLERY = 'GALLERY'
}

export interface AppSettings {
  showCursor: boolean;
  audioEnabled: boolean;
  frameRate: number;
  videoBitrate: number;
  saveFormat: 'mp4' | 'webm';
}

export interface RecordingItem {
  id: string;
  url: string;
  type: 'video' | 'image';
  date: number;
  name: string;
}

export enum DrawTool {
  PEN = 'PEN',
  RECTANGLE = 'RECTANGLE',
  ARROW = 'ARROW',
  TEXT = 'TEXT'
}

export interface Point {
  x: number;
  y: number;
}