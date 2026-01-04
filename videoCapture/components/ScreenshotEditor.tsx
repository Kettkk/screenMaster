import React, { useRef, useEffect, useState, useCallback } from 'react';
import { DrawTool, Point } from '../types';

interface ScreenshotEditorProps {
  imageSrc: string;
  onSave: (blob: Blob) => void;
  onDiscard: () => void;
}

const ScreenshotEditor: React.FC<ScreenshotEditorProps> = ({ imageSrc, onSave, onDiscard }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTool, setSelectedTool] = useState<DrawTool>(DrawTool.PEN);
  const [color, setColor] = useState('#ef4444'); // Red default
  const [lineWidth, setLineWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);

  // Initialize Canvas
  useEffect(() => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      setOriginalImage(img);
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        // Fit to container but maintain aspect ratio
        const maxWidth = container.clientWidth - 40;
        const maxHeight = container.clientHeight - 100;
        
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
           const ratio = Math.min(maxWidth / width, maxHeight / height);
           width *= ratio;
           height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          saveState();
        }
      }
    };
  }, [imageSrc]);

  const saveState = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        setHistory(prev => [...prev.slice(-10), ctx.getImageData(0, 0, canvas.width, canvas.height)]);
      }
    }
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    const point = getCoordinates(e);
    setStartPoint(point);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !startPoint) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const currentPoint = getCoordinates(e);

    if (selectedTool === DrawTool.PEN) {
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();
    } else if (selectedTool === DrawTool.RECTANGLE || selectedTool === DrawTool.ARROW) {
      // Restore last state to avoid trails
      const lastState = history[history.length - 1];
      if (lastState) {
        ctx.putImageData(lastState, 0, 0);
      }
      
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;

      if (selectedTool === DrawTool.RECTANGLE) {
        ctx.rect(startPoint.x, startPoint.y, currentPoint.x - startPoint.x, currentPoint.y - startPoint.y);
        ctx.stroke();
      } else if (selectedTool === DrawTool.ARROW) {
        // Draw line
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(currentPoint.x, currentPoint.y);
        ctx.stroke();

        // Draw Arrowhead
        const angle = Math.atan2(currentPoint.y - startPoint.y, currentPoint.x - startPoint.x);
        const headLength = lineWidth * 4;
        ctx.beginPath();
        ctx.moveTo(currentPoint.x, currentPoint.y);
        ctx.lineTo(currentPoint.x - headLength * Math.cos(angle - Math.PI / 6), currentPoint.y - headLength * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(currentPoint.x, currentPoint.y);
        ctx.lineTo(currentPoint.x - headLength * Math.cos(angle + Math.PI / 6), currentPoint.y - headLength * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    }
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setStartPoint(null);
    saveState();
  };

  const undo = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop(); // Remove current state
      const previousState = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && previousState) {
        ctx.putImageData(previousState, 0, 0);
      }
    }
  };

  const handleSave = () => {
    canvasRef.current?.toBlob((blob) => {
      if (blob) onSave(blob);
    }, 'image/png');
  };

  return (
    <div className="flex flex-col h-full bg-slate-900" ref={containerRef}>
      {/* Toolbar */}
      <div className="bg-slate-800 border-b border-slate-700 p-3 flex items-center justify-between gap-4 shadow-md z-10 shrink-0">
        <div className="flex items-center gap-2">
           <button 
             onClick={() => setSelectedTool(DrawTool.PEN)} 
             className={`p-2 rounded-lg ${selectedTool === DrawTool.PEN ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
             title="Pen"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg>
           </button>
           <button 
             onClick={() => setSelectedTool(DrawTool.RECTANGLE)} 
             className={`p-2 rounded-lg ${selectedTool === DrawTool.RECTANGLE ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
             title="Rectangle"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>
           </button>
           <button 
             onClick={() => setSelectedTool(DrawTool.ARROW)} 
             className={`p-2 rounded-lg ${selectedTool === DrawTool.ARROW ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
             title="Arrow"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
           </button>
           
           <div className="w-px h-6 bg-slate-600 mx-2"></div>

           <input 
            type="color" 
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
            title="Color"
           />
           
           <div className="flex flex-col w-24 gap-1">
             <label className="text-[10px] text-slate-400 font-medium">Size: {lineWidth}px</label>
             <input 
               type="range" min="1" max="20" 
               value={lineWidth} 
               onChange={(e) => setLineWidth(parseInt(e.target.value))}
               className="h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
             />
           </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={undo} className="text-slate-400 hover:text-white p-2" title="Undo (Ctrl+Z)">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path></svg>
          </button>
          <div className="w-px h-6 bg-slate-600"></div>
          <button onClick={onDiscard} className="px-4 py-2 text-sm text-slate-300 hover:text-white font-medium hover:bg-slate-800 rounded-lg transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-lg shadow-blue-900/40 transition-all flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Save Image
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto flex items-center justify-center bg-slate-900/50 p-4" style={{ cursor: 'crosshair' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          className="shadow-2xl rounded border border-slate-700 bg-white"
        />
      </div>
    </div>
  );
};

export default ScreenshotEditor;