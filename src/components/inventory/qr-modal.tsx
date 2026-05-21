"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { X, Download } from "lucide-react";

interface Props {
  sku: string;
  name: string;
  onClose: () => void;
}

export function QrModal({ sku, name, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, sku, { width: 240, margin: 2 });
    }
  }, [sku]);

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-${sku}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative rounded-2xl border bg-card p-6 shadow-2xl w-80">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="text-center">
          <h2 className="text-base font-semibold">{name}</h2>
          <p className="text-xs text-muted-foreground mb-4 font-mono">{sku}</p>
          <canvas ref={canvasRef} className="mx-auto rounded-lg" />
          <button
            onClick={handleDownload}
            className="mt-4 flex items-center gap-2 mx-auto rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download className="h-4 w-4" /> Download PNG
          </button>
        </div>
      </div>
    </div>
  );
}
