import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AppMode, AppSettings, RecordingItem } from './types';
import SettingsPanel from './components/SettingsPanel';
import ScreenshotEditor from './components/ScreenshotEditor';
import { useHotkeys } from './hooks/useHotkeys';

// Default Settings
const DEFAULT_SETTINGS: AppSettings = {
  showCursor: true,
  audioEnabled: false,
  frameRate: 30,
  videoBitrate: 5000000, // 5Mbps
  saveFormat: 'mp4'
};

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.IDLE);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [recordingTime, setRecordingTime] = useState(0);
  const [screenshotSrc, setScreenshotSrc] = useState<string | null>(null);
  
  // Refs for media handling
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  // Helper to update settings
  const updateSettings = (key: keyof AppSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // --- Recording Logic ---

  const startRecording = async () => {
    try {
      const displayMediaOptions: DisplayMediaStreamOptions = {
        video: {
          frameRate: settings.frameRate,
        },
        audio: settings.audioEnabled ? {
            echoCancellation: true,
            noiseSuppression: true,
        } : false
      };

      const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
      streamRef.current = stream;

      // Handle stream stop via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };

      // Check MIME type support
      let mimeType = 'video/webm;codecs=vp9';
      if (settings.saveFormat === 'mp4') {
         // Try to find an MP4 compatible mime type
         const mp4Types = [
            'video/mp4;codecs=avc1', 
            'video/mp4',
            'video/webm;codecs=h264'
         ];
         const supported = mp4Types.find(t => MediaRecorder.isTypeSupported(t));
         if (supported) mimeType = supported;
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: settings.videoBitrate
      });

      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = saveRecording;

      recorder.start(1000); // Collect 1s chunks
      setMode(AppMode.RECORDING);
      
      // Timer
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);

    } catch (err) {
      console.error("Error starting capture:", err);
      // Reset if cancelled
      setMode(AppMode.IDLE);
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setMode(AppMode.IDLE);
  }, []);

  const saveRecording = () => {
    const blob = new Blob(chunksRef.current, { 
      type: mediaRecorderRef.current?.mimeType || 'video/webm' 
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    // Force .mp4 extension if requested, though internal codec might be different depending on browser support
    const ext = settings.saveFormat === 'mp4' ? 'mp4' : 'webm';
    a.download = `recording-${new Date().getTime()}.${ext}`;
    a.click();
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // --- Screenshot Logic ---

  const takeScreenshot = async () => {
    try {
      // 1. Get the screen stream
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { displaySurface: 'monitor' }, 
        audio: false 
      });
      
      // 2. Create a hidden video element to play the stream
      const video = document.createElement('video');
      video.style.display = 'none';
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;

      // 3. Wait for video to be ready and play it
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => {
            // Small delay to ensure the first frame is actually rendered
            setTimeout(resolve, 150);
          });
        };
      });
      
      // 4. Draw the video frame to a canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setScreenshotSrc(dataUrl);
        setMode(AppMode.SCREENSHOT_PREVIEW);
      }
      
      // 5. Cleanup
      stream.getTracks().forEach(t => t.stop());
      video.remove();

    } catch (err) {
      console.error("Screenshot failed:", err);
    }
  };

  const saveScreenshot = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screenshot-${new Date().getTime()}.png`;
    a.click();
    setMode(AppMode.IDLE);
    setScreenshotSrc(null);
  };

  // --- Formatting ---
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // --- Hotkeys ---
  // Note: These work only when window is focused
  useHotkeys('ctrl+shift+r', () => {
    if (mode === AppMode.IDLE) startRecording();
    else if (mode === AppMode.RECORDING) stopRecording();
  });
  
  useHotkeys('ctrl+shift+s', () => {
    if (mode === AppMode.IDLE) takeScreenshot();
  });

  return (
    <div className="h-screen w-screen bg-slate-900 text-white flex flex-col font-sans selection:bg-blue-500/30">
      
      {/* Settings Modal */}
      {mode === AppMode.SETTINGS && (
        <SettingsPanel 
          settings={settings} 
          updateSettings={updateSettings} 
          onClose={() => setMode(AppMode.IDLE)} 
        />
      )}

      {/* Screenshot Editor Mode */}
      {mode === AppMode.SCREENSHOT_PREVIEW && screenshotSrc ? (
        <ScreenshotEditor 
          imageSrc={screenshotSrc} 
          onSave={saveScreenshot} 
          onDiscard={() => {
            setMode(AppMode.IDLE);
            setScreenshotSrc(null);
          }}
        />
      ) : (
        /* Main Dashboard Mode */
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Main Content Area */}
          <main className="flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden">
            
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
               <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px]"></div>
               <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600 rounded-full blur-[120px]"></div>
            </div>

            <div className="z-10 text-center max-w-2xl w-full">
              
              {mode === AppMode.RECORDING ? (
                 /* Active Recording State */
                 <div className="animate-pulse flex flex-col items-center justify-center space-y-8">
                    <div className="w-32 h-32 rounded-full border-4 border-red-500/30 flex items-center justify-center relative">
                        <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.6)]">
                           <div className="w-8 h-8 bg-white rounded-sm"></div>
                        </div>
                    </div>
                    <div>
                      <h2 className="text-4xl font-mono font-bold tracking-wider">{formatTime(recordingTime)}</h2>
                      <p className="text-slate-400 mt-2">Recording in progress...</p>
                      <button 
                        onClick={stopRecording}
                        className="mt-8 px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-bold shadow-lg transition-transform hover:scale-105"
                      >
                        Stop Recording
                      </button>
                    </div>
                 </div>
              ) : (
                /* Idle State */
                <>
                  <h1 className="text-5xl font-black tracking-tight mb-2 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    ScreenMaster Pro
                  </h1>
                  <p className="text-lg text-slate-400 mb-12">
                    Professional grade screen capture and recording for the web.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                    <button 
                      onClick={startRecording}
                      className="group relative p-8 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-2xl transition-all duration-300 flex flex-col items-center hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]"
                    >
                      <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                      </div>
                      <h3 className="text-xl font-bold mb-2">Start Recording</h3>
                      <p className="text-sm text-slate-400">Capture video with audio options</p>
                      <div className="mt-4 px-3 py-1 bg-slate-900 rounded text-xs text-slate-500 font-mono border border-slate-700 group-hover:border-blue-500/30 transition-colors">
                        Ctrl + Shift + R
                      </div>
                    </button>

                    <button 
                      onClick={takeScreenshot}
                      className="group relative p-8 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-purple-500/50 rounded-2xl transition-all duration-300 flex flex-col items-center hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]"
                    >
                      <div className="w-16 h-16 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                         <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                      </div>
                      <h3 className="text-xl font-bold mb-2">Quick Screenshot</h3>
                      <p className="text-sm text-slate-400">Capture and annotate instantly</p>
                      <div className="mt-4 px-3 py-1 bg-slate-900 rounded text-xs text-slate-500 font-mono border border-slate-700 group-hover:border-purple-500/30 transition-colors">
                        Ctrl + Shift + S
                      </div>
                    </button>
                  </div>

                  <div className="mt-8 flex justify-center gap-4">
                    <button 
                      onClick={() => setMode(AppMode.SETTINGS)}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                      Settings
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <div className="absolute bottom-4 left-0 w-full text-center text-xs text-slate-600">
               Press keys or click buttons to start. Keep this window open for background capture.
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default App;