"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";

export type QrScanResult =
  | { type: "member"; id: string }
  | { type: "staff"; id: string };

function parseQrContent(content: string): QrScanResult | null {
  const raw = content.trim();
  if (raw.startsWith("leo-staff:")) {
    const parts = raw.split(":");
    const id = parts.length === 2 ? parts[1].trim() : "";
    return id ? { type: "staff", id } : null;
  }
  if (raw.startsWith("leo-member:")) {
    const parts = raw.split(":");
    const id = parts.length === 2 ? parts[1].trim() : "";
    return id ? { type: "member", id } : null;
  }
  const memberMatch = raw.match(/member_id=([^&\s#]+)/);
  const memberId = (memberMatch?.[1] ?? "").trim();
  return memberId ? { type: "member", id: memberId } : null;
}

interface QrScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScanned: (result: QrScanResult) => void;
  onError?: (message: string) => void;
}

export default function QrScannerModal({ open, onClose, onScanned, onError }: QrScannerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
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
    if (!containerRef.current) return;

    const startScanner = async () => {
      try {
        const scanner = new Html5Qrcode("qr-reader");
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
            const result = parseQrContent(decodedText);
            if (result) {
              stopScanner();
              onScanned(result);
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-scanner-title"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-4 shadow-xl">
        <h2 id="qr-scanner-title" className="mb-3 text-lg font-semibold text-slate-900">
          Scan QR code
        </h2>
        <div id="qr-reader" ref={containerRef} className="min-h-[280px] rounded-lg overflow-hidden [&_video]:rounded-lg [&_img]:rounded-lg" />
        <p className="mt-2 text-sm text-slate-500">
          Point at a member or staff QR. Member = check-in. Staff = daily attendance. Closes when a valid code is detected.
        </p>
        <button
          type="button"
          onClick={() => {
            stopScanner();
            onClose();
          }}
          className="mt-4 w-full rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
