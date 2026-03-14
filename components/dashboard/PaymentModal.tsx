"use client";

import React from "react";
import Logo from "@/components/Logo";

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  planName: string;
  priceVnd: number;
  qrUrl: string | null;
  currentExpiry: string | null;
  newExpiry: string | null;
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
  onPayWithVnpay,
  vnpayLoading,
  isVi,
}: PaymentModalProps) {
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
        {(currentExpiry || newExpiry) && (
          <div className="w-full mb-4 rounded-xl bg-white/10 border border-white/20 p-4 text-sm text-white/90">
            <p className="text-white/70 mb-1">
              {isVi ? "Hết hạn hiện tại:" : "Current expiry:"}
            </p>
            <p className="font-medium mb-3">{formatExpiry(currentExpiry, locale)}</p>
            <p className="text-white/70 mb-1">
              {isVi ? "Sau khi mua:" : "After purchase:"}
            </p>
            <p className="font-medium text-emerald-300">{formatExpiry(newExpiry, locale)}</p>
          </div>
        )}

        {!qrUrl ? (
          <p className="text-sm text-white/60 py-8">{isVi ? "Đang tải…" : "Loading…"}</p>
        ) : (
          <>
            <div className="rounded-2xl bg-white p-4 shrink-0">
              <img src={qrUrl} alt="VietQR" className="w-64 h-64 object-contain" />
            </div>
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
