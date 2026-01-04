import { useEffect } from 'react';

export const useHotkeys = (keyCombo: string, callback: () => void) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const keys = keyCombo.toLowerCase().split('+');
      const pressed: boolean[] = [];

      if (keys.includes('ctrl')) pressed.push(event.ctrlKey);
      if (keys.includes('shift')) pressed.push(event.shiftKey);
      if (keys.includes('alt')) pressed.push(event.altKey);
      
      const mainKey = keys.find(k => !['ctrl', 'shift', 'alt'].includes(k));
      if (mainKey && event.key.toLowerCase() === mainKey) {
        pressed.push(true);
      } else if (!mainKey) {
        // Only modifiers
      } else {
        pressed.push(false);
      }

      // Check if all requirements are met
      if (pressed.every(p => p) && pressed.length === keys.length) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyCombo, callback]);
};