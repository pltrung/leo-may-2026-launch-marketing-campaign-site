"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";

const EID_QR_READER_ID = "eid-qr-reader";

interface EidQrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanned: (rawContent: string) => void;
  onError?: (message: string) => void;
  title?: string;
  hint?: string;
}

export default function EidQrScannerModal({
  open,
  onClose,
  onScanned,
  onError,
  title = "Scan VN eID",
  hint = "Point your camera at the QR code on your VN eID (CCCD) or passport.",
}: EidQrScannerModalProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

  const stopScanner = useCallback(() => {
    if (scannerRef.current && isScanningRef.current) {
      isScanningRef.current = false;
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current = null;
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }

    const el = document.getElementById(EID_QR_READER_ID);
    if (!el) return;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode(EID_QR_READER_ID);
        scannerRef.current = scanner;
        isScanningRef.current = true;
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (decodedText && decodedText.trim()) {
              stopScanner();
              onScanned(decodedText.trim());
              onClose();
            }
          },
          () => {}
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Camera access failed";
        onError?.(msg);
        stopScanner();
      }
    };

    startScanner();
    return () => stopScanner();
  }, [open, onClose, onScanned, onError, stopScanner]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="eid-scanner-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-4 shadow-xl">
        <h2 id="eid-scanner-title" className="mb-3 text-lg font-semibold text-white">
          {title}
        </h2>
        <div
          id={EID_QR_READER_ID}
          className="min-h-[280px] rounded-lg overflow-hidden [&_video]:rounded-lg [&_img]:rounded-lg bg-black"
        />
        <p className="mt-2 text-sm text-white/60">{hint}</p>
        <button
          type="button"
          onClick={() => {
            stopScanner();
            onClose();
          }}
          className="mt-4 w-full rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
