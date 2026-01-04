import React from 'react';
import { AppSettings } from '../types';

interface SettingsPanelProps {
  settings: AppSettings;
  updateSettings: (key: keyof AppSettings, value: any) => void;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, updateSettings, onClose }) => {
  return (
    <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center z-50 p-8">
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Audio */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">Microphone Audio</h3>
              <p className="text-xs text-slate-400">Record system audio and microphone</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer"
                checked={settings.audioEnabled}
                onChange={(e) => updateSettings('audioEnabled', e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* FPS */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-white">Frame Rate (FPS)</label>
              <span className="text-sm text-blue-400">{settings.frameRate} FPS</span>
            </div>
            <input 
              type="range" 
              min="24" 
              max="60" 
              step="1"
              value={settings.frameRate}
              onChange={(e) => updateSettings('frameRate', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

           {/* Bitrate */}
           <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-white">Video Quality (Bitrate)</label>
              <span className="text-sm text-blue-400">{(settings.videoBitrate / 1000000).toFixed(1)} Mbps</span>
            </div>
            <input 
              type="range" 
              min="1000000" 
              max="15000000" 
              step="500000"
              value={settings.videoBitrate}
              onChange={(e) => updateSettings('videoBitrate', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>

          {/* Format */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">Export Format</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => updateSettings('saveFormat', 'mp4')}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${settings.saveFormat === 'mp4' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'}`}
              >
                MP4 (Compatible)
              </button>
              <button 
                onClick={() => updateSettings('saveFormat', 'webm')}
                className={`p-3 rounded-lg border text-sm font-medium transition-all ${settings.saveFormat === 'webm' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'}`}
              >
                WebM (Native)
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Note: MP4 depends on browser support. WebM is guaranteed.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-700 bg-slate-800/50">
           <button 
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors shadow-lg shadow-blue-900/20"
           >
             Save Changes
           </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;