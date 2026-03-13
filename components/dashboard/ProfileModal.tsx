"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  member: {
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    profile_photo_url?: string | null;
    id_number?: string | null;
    date_of_birth?: string | null;
  };
  accessToken: string | null;
  onSaved: () => void;
  isVi: boolean;
}

export default function ProfileModal({
  open,
  onClose,
  member,
  accessToken,
  onSaved,
  isVi,
}: ProfileModalProps) {
  const [idNumber, setIdNumber] = useState(member.id_number ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(
    member.date_of_birth ? member.date_of_birth.slice(0, 10) : ""
  );
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    member.profile_photo_url ?? null
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setIdNumber(member.id_number ?? "");
      setDateOfBirth(member.date_of_birth ? member.date_of_birth.slice(0, 10) : "");
      setPhotoPreview(member.profile_photo_url ?? null);
      setPhotoFile(null);
      setError(null);
    }
  }, [open, member.id_number, member.date_of_birth, member.profile_photo_url]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      setError(isVi ? "Chọn ảnh JPEG, PNG hoặc WebP." : "Choose JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(isVi ? "Ảnh tối đa 5MB." : "Photo max 5MB.");
      return;
    }
    setError(null);
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, [isVi]);

  const handleSave = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      let profilePhotoBase64: string | undefined;
      if (photoFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.onerror = reject;
          r.readAsDataURL(photoFile);
        });
        profilePhotoBase64 = base64;
      }

      const body: Record<string, unknown> = {
        id_number: idNumber.trim() || null,
        date_of_birth: dateOfBirth.trim() || null,
      };
      if (profilePhotoBase64) body.profile_photo_base64 = profilePhotoBase64;

      const res = await fetch("/api/member/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? (isVi ? "Lưu thất bại." : "Save failed."));
    } finally {
      setLoading(false);
    }
  }, [accessToken, idNumber, dateOfBirth, photoFile, onSaved, onClose, isVi]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 id="profile-modal-title" className="text-lg font-semibold text-white">
              {isVi ? "Hồ sơ cá nhân" : "Profile"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:bg-white/20"
              aria-label={isVi ? "Đóng" : "Close"}
            >
              ×
            </button>
          </div>

          {/* Photo */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt=""
                  className="w-24 h-24 rounded-full object-cover border-2 border-white/20"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-2xl font-semibold">
                  {member.full_name?.charAt(0).toUpperCase() ?? "?"}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm hover:bg-emerald-400"
                title={isVi ? "Chụp / tải ảnh" : "Take / upload photo"}
              >
                +
              </button>
            </div>
            <p className="text-xs text-white/60 mt-2">
              {isVi ? "Chụp ảnh hoặc chọn từ thư viện" : "Take photo or choose from library"}
            </p>
          </div>

          {/* Govt ID / Passport */}
          <div className="space-y-4 mb-4">
            <label className="block">
              <span className="text-xs text-white/70">
                {isVi ? "Số CCCD / Hộ chiếu" : "Govt ID / Passport"}
              </span>
              <input
                type="text"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder={isVi ? "Nhập số CCCD hoặc hộ chiếu" : "Enter CCCD or passport number"}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/70">
                {isVi ? "Ngày sinh" : "Date of birth"}
              </span>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 [color-scheme:dark]"
              />
            </label>
            <p className="text-xs text-white/50">
              {member.email && <span>Email: {member.email}</span>}
              {member.phone && <span className="ml-2">Phone: {member.phone}</span>}
            </p>
          </div>

          {error && (
            <p className="text-sm text-amber-300 mb-4">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-full text-sm font-medium bg-white/10 text-white hover:bg-white/20"
            >
              {isVi ? "Hủy" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-2 rounded-full text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-60"
            >
              {loading ? (isVi ? "Đang lưu…" : "Saving…") : (isVi ? "Lưu" : "Save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
