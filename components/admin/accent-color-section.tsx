'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/client/api-fetch';

const DEFAULT_PALETTE = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#ef4444', '#ec4899'];

export function AccentColorSection() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [currentColor, setCurrentColor] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>(DEFAULT_PALETTE);

  useEffect(() => {
    let mounted = true;
    
    const fetchColors = async () => {
      try {
        const res = await apiFetch('/api/admin/accent-color');
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setCurrentColor(data.color);
            if (data.palette && data.palette.length > 0) {
              setPalette(data.palette);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch colors', error);
      } finally {
        if (mounted) {
          setFetching(false);
        }
      }
    };

    fetchColors();
    
    const handlePaletteUpdate = () => {
      fetchColors();
    };
    
    window.addEventListener('accent-palette-updated', handlePaletteUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('accent-palette-updated', handlePaletteUpdate);
    };
  }, []);

  const handleSelectColor = async (color: string) => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/accent-color', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color })
      });
      
      if (res.ok) {
        setCurrentColor(color);
        toast.success('Accent color updated');
      } else {
        toast.error('Failed to update accent color');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error updating accent color');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/accent-color', {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setCurrentColor(null);
        toast.success('Accent color reset');
      } else {
        toast.error('Failed to reset accent color');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error resetting accent color');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
        <h2 className="text-xl font-semibold mb-4">Accent Color</h2>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-white/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">Accent Color</h2>
          <p className="text-xs md:text-sm text-white/70 mt-1">
            Choose a primary accent color for your brand. Colors are automatically extracted from your favicon if uploaded.
          </p>
        </div>
        <Palette className="h-5 w-5 text-white/40" />
      </div>
      
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          {palette.map((color, index) => (
            <button
              key={index}
              onClick={() => handleSelectColor(color)}
              disabled={loading}
              className={`w-10 h-10 rounded-full transition-all border-2 ${
                currentColor === color 
                  ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                  : 'border-transparent hover:scale-105 hover:border-white/50'
              }`}
              style={{ backgroundColor: color }}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
        
        {currentColor && (
          <div className="flex justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={loading}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs h-8"
            >
              {loading ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : null}
              Reset to default
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
