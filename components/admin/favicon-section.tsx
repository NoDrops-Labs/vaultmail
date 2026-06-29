'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/client/api-fetch';

export function FaviconSection() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    
    const fetchFavicon = async () => {
      try {
        const res = await apiFetch('/api/admin/favicon');
        if (res.ok) {
          const data = await res.json();
          if (data && data.data && mounted) {
            setPreview(`data:${data.contentType};base64,${data.data}`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch favicon', error);
      } finally {
        if (mounted) {
          setFetching(false);
        }
      }
    };

    fetchFavicon();
    return () => { mounted = false; };
  }, []);

  const extractPaletteAndSave = (img: HTMLImageElement, contentType: string, base64Data: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    
    const colorCounts: Record<string, number> = {};
    
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i];
      const g = imageData[i + 1];
      const b = imageData[i + 2];
      const a = imageData[i + 3];
      
      if (a < 128) continue;
      
      const qr = Math.round(r / 16) * 16;
      const qg = Math.round(g / 16) * 16;
      const qb = Math.round(b / 16) * 16;
      
      const hex = `#${(qr).toString(16).padStart(2, '0')}${(qg).toString(16).padStart(2, '0')}${(qb).toString(16).padStart(2, '0')}`;
      colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }
    
    const sortedColors = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
      .filter(color => color !== '#000000' && color !== '#ffffff')
      .slice(0, 6);
      
    apiFetch('/api/admin/favicon', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType, data: base64Data })
    }).then(async (res) => {
      if (res.ok) {
        toast.success('Favicon updated');
        if (sortedColors.length > 0) {
          await apiFetch('/api/admin/accent-color', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ palette: sortedColors })
          });
          window.dispatchEvent(new Event('accent-palette-updated'));
        }
      } else {
        toast.error('Failed to update favicon');
      }
    }).catch(() => {
      toast.error('Error uploading favicon');
    }).finally(() => {
      setLoading(false);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreview(dataUrl);
      
      const base64Data = dataUrl.split(',')[1];
      const contentType = file.type;

      const img = new Image();
      img.onload = () => extractPaletteAndSave(img, contentType, base64Data);
      img.onerror = () => {
        setLoading(false);
        toast.error('Invalid image file');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/favicon', {
        method: 'DELETE'
      });
      if (res.ok) {
        setPreview(null);
        toast.success('Favicon removed');
      } else {
        toast.error('Failed to remove favicon');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error removing favicon');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
        <h2 className="text-base md:text-xl font-semibold mb-4">Favicon</h2>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-white/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/40 p-4">
      <h2 className="text-base md:text-xl font-semibold mb-4">Favicon</h2>
      <p className="text-xs md:text-sm text-white/70 mb-4">
        Upload a custom favicon for your site. The dominant colors will be extracted for your accent palette.
      </p>
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="w-16 h-16 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Favicon preview" className="w-8 h-8 object-contain" />
          ) : (
            <span className="text-xs text-white/40">None</span>
          )}
        </div>
        
        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto">
          <input
            type="file"
            accept="image/png, image/x-icon, image/svg+xml"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10 sm:w-auto"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload Image
            </Button>
            
            {preview && (
              <Button
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 sm:w-auto"
                size="sm"
                onClick={handleDelete}
                disabled={loading}
              >
                <X className="mr-2 h-4 w-4" />
                Remove
              </Button>
            )}
          </div>
          <span className="text-xs text-white/40">Max 2MB. SVG, PNG or ICO.</span>
        </div>
      </div>
    </div>
  );
}
