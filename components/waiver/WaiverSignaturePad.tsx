"use client";

import React, { useRef, useEffect } from "react";

export default function WaiverSignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
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

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
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
      onChange(ctxObj.canvas.toDataURL("image/png"));
    } catch {
      onChange(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    finishStroke();
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
          onPointerLeave={() => drawingRef.current && finishStroke()}
        />
      </div>
      <div className="flex justify-between items-center text-xs text-white/60">
        <span>Draw your signature</span>
        <button type="button" onClick={handleClear} className="px-3 py-1 rounded-full border border-white/30 text-white/80 hover:bg-white/10">
          Clear
        </button>
      </div>
    </div>
  );
}
