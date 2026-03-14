"use client";

import React, { useState, useCallback } from "react";
import Logo from "@/components/Logo";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  planName: string;
  priceVnd: number;
  qrUrl: string | null;
  currentExpiry: string | null;
  newExpiry: string | null;
  visitsAdded?: number | null;
  error?: string | null;
  onPayWithVnpay: () => void;
  vnpayLoading: boolean;
  isVi: boolean;
}

function formatExpiry(iso: string | null, locale: "vi-VN" | "en-US"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}

export default function PaymentModal({
  open,
  onClose,
  planName,
  priceVnd,
  qrUrl,
  currentExpiry,
  newExpiry,
  visitsAdded,
  error,
  onPayWithVnpay,
  vnpayLoading,
  isVi,
}: PaymentModalProps) {
  const [qrEnlarged, setQrEnlarged] = useState(false);

  const handleDownloadQr = useCallback(async () => {
    if (!qrUrl) return;
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `leo-may-payment-${planName.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(qrUrl, "_blank");
    }
  }, [qrUrl, planName]);

  if (!open) return null;
  const locale = isVi ? "vi-VN" : "en-US";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-xl">
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/30 flex items-center justify-center text-white hover:bg-white/20"
          aria-label={isVi ? "Đóng" : "Close"}
        >
          <span className="text-lg">&times;</span>
        </button>
      </div>
      <div className="w-full max-w-sm mx-auto flex flex-col items-center px-6 overflow-y-auto max-h-[90vh]">
        <div className="w-[180px] mb-4 shrink-0">
          <Logo className="w-full h-auto object-contain" />
        </div>
        <h2 className="text-sm font-semibold text-white/80 tracking-[0.18em] uppercase mb-2">
          {isVi ? "THANH TOÁN" : "PAYMENT"}
        </h2>
        <p className="text-base font-medium text-white mb-4">
          {planName} — {priceVnd.toLocaleString("vi-VN")} VND
        </p>

        {/* Extension preview */}
        {(currentExpiry || newExpiry || visitsAdded) && (
          <div className="w-full mb-4 rounded-xl bg-white/10 border border-white/20 p-4 text-sm text-white/90">
            <p className="text-white/70 mb-1">
              {isVi ? "Hết hạn hiện tại:" : "Current expiry:"}
            </p>
            <p className="font-medium mb-3">{formatExpiry(currentExpiry, locale)}</p>
            <p className="text-white/70 mb-1">
              {visitsAdded ? (isVi ? "Thêm lượt:" : "Adds visits:") : (isVi ? "Sau khi mua:" : "After purchase:")}
            </p>
            <p className="font-medium text-emerald-300">
              {visitsAdded != null ? `+${visitsAdded} ${isVi ? "lượt" : "visits"}` : formatExpiry(newExpiry, locale)}
            </p>
          </div>
        )}

        {!qrUrl ? (
          <div className="py-8 text-center">
            {error ? (
              <p className="text-sm text-amber-300 mb-4">{error}</p>
            ) : (
              <p className="text-sm text-white/60">{isVi ? "Đang tải…" : "Loading…"}</p>
            )}
          </div>
        ) : (
          <>
            <div className="relative rounded-2xl bg-white p-4 shrink-0">
              <img src={qrUrl} alt="VietQR" className="w-64 h-64 object-contain" />
              <div className="absolute bottom-2 right-2 left-2 flex gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => setQrEnlarged(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/90 text-white hover:bg-slate-700"
                >
                  {isVi ? "Phóng to" : "Enlarge"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/90 text-white hover:bg-slate-700"
                >
                  {isVi ? "Tải xuống" : "Download"}
                </button>
              </div>
            </div>
            {qrEnlarged && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
                onClick={() => setQrEnlarged(false)}
              >
                <button
                  type="button"
                  onClick={() => setQrEnlarged(false)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white text-xl"
                  aria-label={isVi ? "Đóng" : "Close"}
                >
                  ×
                </button>
                <div
                  className="max-w-[min(90vw,400px)] max-h-[90vh] rounded-2xl bg-white p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img src={qrUrl} alt="VietQR" className="w-full h-auto object-contain" />
                </div>
              </div>
            )}
            <p className="mt-4 text-xs text-white/80 text-center">
              {isVi ? "Quét bằng ứng dụng ngân hàng, MoMo hoặc ZaloPay." : "Scan with banking app, MoMo, or ZaloPay."}
            </p>
            <button
              type="button"
              onClick={onPayWithVnpay}
              disabled={vnpayLoading}
              className="w-full mt-4 py-3 rounded-xl text-sm font-medium bg-white/15 text-white hover:bg-white/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {vnpayLoading
                ? (isVi ? "Đang chuyển hướng…" : "Redirecting…")
                : (isVi ? "Thanh toán qua VNPay" : "Pay with VNPay")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
