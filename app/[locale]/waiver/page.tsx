"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { useLocale } from "@/components/LocaleProvider";
import { getMessages } from "@/lib/messages";
import { useMemberAuth } from "@/lib/useMemberAuth";
import { HERO_BG } from "@/lib/heroConstants";

const WAIVER_TEXT = `
Leo Mây Climbing Gym
Climbing Activity Waiver & Release of Liability

Leo Mây Climbing Gym – Ho Chi Minh City, Vietnam

Last Updated: [DATE]

1. Acknowledgment of Risk

I understand that climbing activities—including bouldering, training, and the use of climbing walls and equipment—are physically demanding and inherently dangerous activities.

I acknowledge that participation may involve risks including, but not limited to:

Falls from climbing walls

Impact with climbing holds, flooring, or structures

Injuries caused by other climbers or gym users

Sprains, fractures, head injuries, or other serious bodily harm

Equipment failure or misuse

Fatigue, loss of grip, or improper technique

I understand that bouldering is performed without ropes and falls are a normal part of the activity.

Even when safety padding and supervision are present, serious injury or death may occur.

By participating in climbing activities at Leo Mây Climbing Gym, I voluntarily accept and assume all such risks.

2. Health & Physical Condition

I confirm that:

I am physically able to participate in climbing activities.

I do not have any medical conditions that would make participation unsafe.

I will climb within my personal ability level.

If I have any injuries, medical conditions, or limitations, I agree to inform gym staff before climbing.

3. Safety Rules & Instructions

I agree to follow all Leo Mây Climbing Gym safety rules, including but not limited to:

Following posted gym rules and instructions

Using crash pads properly

Being aware of other climbers

Not climbing directly above or below other climbers

Using equipment responsibly

Listening to staff instructions

I understand that failure to follow safety rules may result in removal from the facility without refund.

4. Equipment Use

I understand that Leo Mây Climbing Gym may provide equipment such as:

climbing holds

crash pads

rental climbing shoes

chalk or training equipment

I acknowledge that improper use of equipment may result in injury.

I agree to use all equipment only as intended.

5. Release of Liability

To the fullest extent permitted by law, I hereby release and discharge:

Leo Mây Climbing Gym, its owners, employees, instructors, contractors, and affiliates

from any and all liability for injury, illness, damage, loss, or death arising from my participation in climbing activities or use of the facility.

This includes injuries caused by:

my own actions

the actions of other participants

facility conditions

equipment usage

except where prohibited by applicable law.

6. Property & Personal Belongings

I understand that Leo Mây Climbing Gym is not responsible for lost, stolen, or damaged personal property brought into the facility.

7. Photography & Media

Leo Mây Climbing Gym may capture photos or videos within the facility for marketing or promotional purposes.

By using the facility, I grant permission for Leo Mây Climbing Gym to use images or videos in which I may appear unless I explicitly request otherwise in writing.

8. Minors

Participants under the age of 18 must have this waiver signed by a parent or legal guardian.

Parents/guardians accept full responsibility for the minor’s participation.

9. Agreement

By signing below, I confirm that:

I have read and understood this waiver

I accept the risks of climbing activities

I agree to follow gym safety rules

I release Leo Mây Climbing Gym from liability

This agreement applies to all current and future visits to Leo Mây Climbing Gym unless revoked in writing.

End.
`;

type SignatureMode = "typed" | "drawn";

function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const getCtx = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    return { canvas, ctx };
  };

  const resizeCanvas = () => {
    const wrapper = canvasRef.current?.parentElement;
    if (!wrapper || !canvasRef.current) return;
    const rect = wrapper.getBoundingClientRect();
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = 180 * ratio;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(ratio, ratio);
      ctx.clearRect(0, 0, rect.width, 180);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#ffffff";
    }
  };

  React.useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctxObj = getCtx();
    if (!ctxObj) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pos = getPos(e);
    lastPosRef.current = pos;
    ctxObj.ctx.beginPath();
    ctxObj.ctx.moveTo(pos.x, pos.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const ctxObj = getCtx();
    if (!ctxObj || !lastPosRef.current) return;
    const pos = getPos(e);
    ctxObj.ctx.lineTo(pos.x, pos.y);
    ctxObj.ctx.stroke();
    lastPosRef.current = pos;
  };

  const finishStroke = () => {
    drawingRef.current = false;
    lastPosRef.current = null;
    const ctxObj = getCtx();
    if (!ctxObj) return;
    try {
      const dataUrl = ctxObj.canvas.toDataURL("image/png");
      onChange(dataUrl);
    } catch {
      onChange(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    finishStroke();
  };

  const handlePointerLeave = () => {
    if (drawingRef.current) finishStroke();
  };

  const handleClear = () => {
    const ctxObj = getCtx();
    if (!ctxObj) return;
    const { canvas, ctx } = ctxObj;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    resizeCanvas();
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg bg-white/5 border border-white/20 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-[180px] touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
      </div>
      <div className="flex justify-between items-center text-xs text-white/60">
        <span>Draw your signature</span>
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1 rounded-full border border-white/30 text-white/80 hover:bg-white/10"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

export default function WaiverPage() {
  const locale = useLocale();
  const router = useRouter();
  const m = getMessages(locale as "en" | "vi").waiver;
  const { user, member, loading, refresh } = useMemberAuth();
  const [fullName, setFullName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showWaiver, setShowWaiver] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [canSign, setCanSign] = useState(false);
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("typed");
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/${locale}/login`);
      return;
    }
    if (member?.waiver_signed) {
      router.replace(`/${locale}/dashboard`);
      return;
    }
    if (user && !member) {
      router.replace(`/${locale}/dashboard`);
    }
  }, [loading, user, member, locale, router]);

  const handleWaiverScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 5) {
      setHasScrolledToBottom(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !agreed) {
      setError("Full name and agreement required");
      return;
    }

    let signatureValue: string | null = null;
    if (signatureMode === "typed") {
      signatureValue = signature.trim() || null;
    } else {
      signatureValue = drawnSignature || null;
    }

    if (!signatureValue) {
      setError("Signature is required");
      return;
    }
    if (!user) return;
    setSubmitting(true);
    try {
      const { data: { session } } = await getSupabaseBrowserClient().auth.getSession();
      if (!session?.access_token) {
        setError("Session expired");
        setSubmitting(false);
        return;
      }
      const res = await fetch("/api/member/waiver", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          agreed: true,
          signature_data: signatureValue,
          waiver_text: WAIVER_TEXT,
        }),
      });
      let data: { error?: string; ok?: boolean } = {};
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text) as { error?: string; ok?: boolean };
      } catch {
        setError("Invalid response from server");
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        setError(data?.error || "Failed to save");
        setSubmitting(false);
        return;
      }
      // Full page redirect to avoid client-side exception during SPA transition
      window.location.assign(`/${locale}/dashboard`);
    } catch {
      setError("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center sky-auth-page">
        <p className="text-white/60 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20 sky-auth-page">
      <h1 className="text-2xl font-bold text-white mb-4" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
        {m.title}
      </h1>

      <div className="w-full max-w-md space-y-4">
        <button
          type="button"
          onClick={() => {
            setShowWaiver(true);
            setHasScrolledToBottom(false);
          }}
          className="w-full py-3 rounded-full bg-white text-[#0B0B0F] font-medium"
        >
          Open Waiver
        </button>

        {canSign && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              id="waiver-full-name"
              type="text"
              placeholder={m.fullName}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
            />
            <label className="flex items-center gap-2 text-white/90 text-sm">
              <input
                type="checkbox"
                checked={agreed}
                readOnly
                className="rounded"
              />
              {m.agreement}
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>{m.signature}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSignatureMode("typed")}
                    className={`px-3 py-1 rounded-full border text-xs ${
                      signatureMode === "typed"
                        ? "bg-white text-[#0B0B0F] border-white"
                        : "border-white/40 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    Type
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureMode("drawn")}
                    className={`px-3 py-1 rounded-full border text-xs ${
                      signatureMode === "drawn"
                        ? "bg-white text-[#0B0B0F] border-white"
                        : "border-white/40 text-white/80 hover:bg-white/10"
                    }`}
                  >
                    Draw
                  </button>
                </div>
              </div>

              {signatureMode === "typed" ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Type your full name as signature"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                  />
                  <button
                    type="button"
                    onClick={() => setSignature(fullName.trim())}
                    className="text-xs text-white/70 hover:text-white underline-offset-2 hover:underline"
                  >
                    Use full name as signature
                  </button>
                </div>
              ) : (
                <SignaturePad onChange={setDrawnSignature} />
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-full bg-white text-[#0B0B0F] font-medium disabled:opacity-60"
            >
              {submitting ? "…" : m.submit}
            </button>
          </form>
        )}
      </div>

      {showWaiver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70">
          <div className="relative w-full max-w-2xl rounded-2xl bg-[#12121a] border border-white/10 shadow-xl p-6">
            <button
              type="button"
              onClick={() => setShowWaiver(false)}
              className="absolute top-3 right-3 text-white/60 hover:text-white text-sm"
            >
              ✕
            </button>
            <h2 className="text-lg font-bold text-white mb-3" style={{ fontFamily: "MiSans-Bold, sans-serif" }}>
              Climbing Activity Waiver
            </h2>
            <div
              className="waiver-container text-sm text-white/90 rounded-lg bg-black/40 border border-white/10"
              onScroll={handleWaiverScroll}
            >
              {WAIVER_TEXT.split("\n\n").map((block, idx) => (
                <p key={idx} className="mb-3 whitespace-pre-wrap leading-relaxed">
                  {block.trim()}
                </p>
              ))}
            </div>
            {!hasScrolledToBottom && (
              <p className="mt-3 text-xs text-white/70">
                Please scroll to the bottom of the waiver before signing.
              </p>
            )}
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowWaiver(false)}
                className="px-4 py-2 rounded-full border border-white/40 text-white/90 text-sm"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!hasScrolledToBottom}
                onClick={() => {
                  if (!hasScrolledToBottom) return;
                  setAgreed(true);
                  setCanSign(true);
                  setShowWaiver(false);
                  setTimeout(() => {
                    const el = document.getElementById("waiver-full-name") as HTMLInputElement | null;
                    el?.focus();
                  }, 0);
                }}
                className="px-5 py-2 rounded-full bg-white text-[#0B0B0F] text-sm font-medium disabled:opacity-50"
              >
                Agree &amp; Sign Waiver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
