"use client";

import React, { useState, useCallback, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { formatVnd } from "@/lib/formatVndCompact";
import Logo from "@/components/Logo";

function getProxyUrl(rawUrl: string | null): string | null {
  if (!rawUrl) return null;
  return `/api/vietqr-proxy?url=${encodeURIComponent(rawUrl)}`;
}

export type PaymentGates = { vnpay: boolean; momo: boolean; zalopay: boolean };

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
  /** Current plan id for wallet APIs */
  planId: string | null;
  accessToken: string | null;
  locale: string;
  /** SePay path: exact code customer must put in bank transfer description */
  bankTransferCode?: string | null;
  bankTransferAuto?: boolean;
}

type WalletTab = "bank" | "momo" | "zalopay";

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
  planId,
  accessToken,
  locale,
  bankTransferCode,
  bankTransferAuto,
}: PaymentModalProps) {
  const [qrEnlarged, setQrEnlarged] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgSrc = getProxyUrl(qrUrl);

  const [gates, setGates] = useState<PaymentGates>({ vnpay: false, momo: false, zalopay: false });
  const [tab, setTab] = useState<WalletTab>("bank");
  const [momoPayUrl, setMomoPayUrl] = useState<string | null>(null);
  const [momoLoading, setMomoLoading] = useState(false);
  const [momoErr, setMomoErr] = useState<string | null>(null);
  const [zaloQrPayload, setZaloQrPayload] = useState<string | null>(null);
  const [zaloOrderUrl, setZaloOrderUrl] = useState<string | null>(null);
  const [zaloLoading, setZaloLoading] = useState(false);
  const [zaloErr, setZaloErr] = useState<string | null>(null);

  useEffect(() => {
    if (qrUrl) {
      setImgLoaded(false);
      setImgError(false);
    }
  }, [qrUrl]);

  useEffect(() => {
    if (!open) return;
    fetch("/api/payment-gates")
      .then((r) => r.json())
      .then((d) => {
        setGates({
          vnpay: !!d.vnpay,
          momo: !!d.momo,
          zalopay: !!d.zalopay,
        });
      })
      .catch(() => setGates({ vnpay: false, momo: false, zalopay: false }));
  }, [open]);

  useEffect(() => {
    if (!open || !planId || !accessToken) return;
    setMomoPayUrl(null);
    setMomoErr(null);
    setZaloQrPayload(null);
    setZaloOrderUrl(null);
    setZaloErr(null);
    if (tab !== "momo" && tab !== "zalopay") return;

    const returnUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/${locale}/dashboard`
        : "";

    if (tab === "momo") {
      setMomoLoading(true);
      fetch(`/api/member/momo?plan_id=${encodeURIComponent(planId)}&return_url=${encodeURIComponent(returnUrl)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || "MoMo failed");
          const url = (d.qr_code_url as string) || (d.deeplink as string) || (d.pay_url as string);
          setMomoPayUrl(url || null);
          if (!url) setMomoErr(isVi ? "Không lấy được liên kết MoMo." : "Could not get MoMo link.");
        })
        .catch((e) => setMomoErr(e instanceof Error ? e.message : "MoMo error"))
        .finally(() => setMomoLoading(false));
    }

    if (tab === "zalopay") {
      setZaloLoading(true);
      fetch(`/api/member/zalopay?plan_id=${encodeURIComponent(planId)}&return_url=${encodeURIComponent(returnUrl)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || "ZaloPay failed");
          const qc = d.qr_code as string | undefined;
          const ou = d.order_url as string | undefined;
          setZaloOrderUrl(ou || null);
          setZaloQrPayload(qc || ou || null);
          if (!qc && !ou) setZaloErr(isVi ? "Không lấy được ZaloPay." : "Could not get ZaloPay.");
        })
        .catch((e) => setZaloErr(e instanceof Error ? e.message : "ZaloPay error"))
        .finally(() => setZaloLoading(false));
    }
  }, [open, planId, accessToken, tab, locale, isVi]);

  useEffect(() => {
    if (open) setTab("bank");
  }, [open, planId]);

  const handleDownloadQr = useCallback(async () => {
    const url = imgSrc ?? qrUrl;
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `leo-may-payment-${planName.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(qrUrl ?? undefined, "_blank");
    }
  }, [imgSrc, qrUrl, planName]);

  if (!open) return null;
  const loc = isVi ? "vi-VN" : "en-US";
  const showWalletTabs = gates.momo || gates.zalopay;

  const walletQrSection = (
    <div className="w-full flex flex-col items-center">
      {tab === "momo" && (
        <>
          {momoLoading && <p className="text-sm text-white/60 mb-4">{isVi ? "Đang tải MoMo…" : "Loading MoMo…"}</p>}
          {momoErr && <p className="text-sm text-amber-300 mb-4 text-center">{momoErr}</p>}
          {!momoLoading && momoPayUrl && (
            <>
              <div className="rounded-2xl bg-white p-4">
                <QRCodeSVG value={momoPayUrl} size={220} level="M" includeMargin />
              </div>
              <p className="mt-3 text-xs text-white/75 text-center max-w-xs">
                {isVi
                  ? "Quét bằng ứng dụng MoMo. Thẻ hội viên cập nhật tự động sau khi thanh toán."
                  : "Scan with the MoMo app. Membership updates automatically after payment."}
              </p>
              <a
                href={momoPayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 text-sm text-emerald-300 underline"
              >
                {isVi ? "Mở trong trình duyệt / MoMo" : "Open in browser / MoMo"}
              </a>
            </>
          )}
        </>
      )}
      {tab === "zalopay" && (
        <>
          {zaloLoading && <p className="text-sm text-white/60 mb-4">{isVi ? "Đang tải ZaloPay…" : "Loading ZaloPay…"}</p>}
          {zaloErr && <p className="text-sm text-amber-300 mb-4 text-center">{zaloErr}</p>}
          {!zaloLoading && zaloQrPayload && (
            <>
              <div className="rounded-2xl bg-white p-4">
                <QRCodeSVG value={zaloQrPayload} size={220} level="M" includeMargin />
              </div>
              <p className="mt-3 text-xs text-white/75 text-center max-w-xs">
                {isVi
                  ? "Quét bằng ZaloPay hoặc app ngân hàng (Napas). Hội viên cập nhật tự động."
                  : "Scan with ZaloPay or bank app (Napas). Membership updates automatically."}
              </p>
              {zaloOrderUrl && (
                <a
                  href={zaloOrderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-sm text-emerald-300 underline"
                >
                  {isVi ? "Mở cổng thanh toán ZaloPay" : "Open ZaloPay payment page"}
                </a>
              )}
            </>
          )}
        </>
      )}
    </div>
  );

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
      <div className="w-full max-w-sm mx-auto flex flex-col items-center px-6 overflow-y-auto max-h-[90vh] pb-6">
        <div className="w-[180px] mb-4 shrink-0">
          <Logo className="w-full h-auto object-contain" />
        </div>
        <h2 className="text-sm font-semibold text-white/80 tracking-[0.18em] uppercase mb-2">
          {isVi ? "THANH TOÁN" : "PAYMENT"}
        </h2>
        <p className="text-base font-medium text-white mb-4 text-center">
          {planName} — {formatVnd(priceVnd)}
        </p>

        {(currentExpiry || newExpiry || visitsAdded) && (
          <div className="w-full mb-4 rounded-xl bg-white/10 border border-white/20 p-4 text-sm text-white/90">
            <p className="text-white/70 mb-1">{isVi ? "Hết hạn hiện tại:" : "Current expiry:"}</p>
            <p className="font-medium mb-3">{formatExpiry(currentExpiry, loc)}</p>
            <p className="text-white/70 mb-1">
              {visitsAdded ? (isVi ? "Thêm lượt:" : "Adds visits:") : isVi ? "Sau khi mua:" : "After purchase:"}
            </p>
            <p className="font-medium text-emerald-300">
              {visitsAdded != null ? `+${visitsAdded} ${isVi ? "lượt" : "visits"}` : formatExpiry(newExpiry, loc)}
            </p>
          </div>
        )}

        {showWalletTabs && (
          <div className="flex flex-wrap gap-1.5 justify-center mb-4 w-full">
            <button
              type="button"
              onClick={() => setTab("bank")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                tab === "bank" ? "bg-white text-slate-900" : "bg-white/10 text-white/90 hover:bg-white/15"
              }`}
            >
              {isVi ? "Ngân hàng (VietQR)" : "Bank (VietQR)"}
            </button>
            {gates.momo && (
              <button
                type="button"
                onClick={() => setTab("momo")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  tab === "momo" ? "bg-pink-600 text-white" : "bg-white/10 text-white/90 hover:bg-white/15"
                }`}
              >
                MoMo
              </button>
            )}
            {gates.zalopay && (
              <button
                type="button"
                onClick={() => setTab("zalopay")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  tab === "zalopay" ? "bg-blue-600 text-white" : "bg-white/10 text-white/90 hover:bg-white/15"
                }`}
              >
                ZaloPay
              </button>
            )}
          </div>
        )}

        {tab === "bank" && bankTransferAuto && bankTransferCode && (
          <div className="w-full mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-white">
            <p className="font-semibold text-emerald-300 mb-1">
              {isVi ? "Kích hoạt tự động" : "Automatic activation"}
            </p>
            <p className="text-white/85 text-xs mb-2">
              {isVi
                ? "Chuyển đúng số tiền bên trên. Trong nội dung chuyển khoản gõ chính xác:"
                : "Transfer the exact amount above. In the transfer description, enter exactly:"}
            </p>
            <p className="font-mono text-lg font-bold tracking-wider text-center py-2 px-3 rounded-lg bg-black/30 select-all">
              {bankTransferCode}
            </p>
            <p className="text-[11px] text-white/60 mt-2">
              {isVi
                ? "MoMo / app ngân hàng / ZaloPay đều được. Hội viên cập nhật sau vài giây khi tiền về."
                : "Bank app, MoMo, or ZaloPay — all work. Membership updates within seconds once the transfer lands."}
            </p>
          </div>
        )}

        {tab === "bank" && (
          <>
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
                  <div className="relative w-64 h-64 flex items-center justify-center bg-slate-100">
                    {!imgLoaded && !imgError && (
                      <p className="text-sm text-slate-500 absolute">{isVi ? "Đang tải mã QR…" : "Loading QR…"}</p>
                    )}
                    {imgError && (
                      <p className="text-sm text-amber-600 absolute px-2 text-center">
                        {isVi ? "Không tải được mã QR. Thử lại." : "Failed to load QR. Try again."}
                      </p>
                    )}
                    {imgSrc && (
                      <img
                        src={imgSrc}
                        alt="VietQR"
                        className={`w-64 h-64 object-contain ${!imgLoaded ? "opacity-0 absolute" : ""}`}
                        onLoad={() => {
                          setImgLoaded(true);
                          setImgError(false);
                        }}
                        onError={() => setImgError(true)}
                      />
                    )}
                  </div>
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
                      {imgSrc && <img src={imgSrc} alt="VietQR" className="w-full h-auto object-contain" />}
                    </div>
                  </div>
                )}
                <p className="mt-4 text-xs text-white/80 text-center">
                  {isVi ? "Quét bằng app ngân hàng, MoMo hoặc ZaloPay." : "Scan with banking app, MoMo, or ZaloPay."}
                </p>
              </>
            )}
          </>
        )}

        {(tab === "momo" || tab === "zalopay") && walletQrSection}

        {gates.vnpay && (
          <button
            type="button"
            onClick={onPayWithVnpay}
            disabled={vnpayLoading}
            className="w-full mt-4 py-3 rounded-xl text-sm font-medium bg-white/15 text-white hover:bg-white/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {vnpayLoading
              ? isVi
                ? "Đang chuyển hướng…"
                : "Redirecting…"
              : isVi
                ? "Thanh toán qua VNPay (thẻ)"
                : "Pay with VNPay (cards)"}
          </button>
        )}
      </div>
    </div>
  );
}
