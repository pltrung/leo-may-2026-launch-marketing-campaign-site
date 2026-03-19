"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { getMessages } from "@/lib/messages";
import { parseCccdPipeDelimited, extractIdFromVnEidQr } from "@/lib/vnEidQr";
import { memberIdentityComplete } from "@/lib/memberIdentity";
import EidQrScannerModal from "@/components/dashboard/EidQrScannerModal";

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  member: {
    full_name?: string | null;
    display_name?: string | null;
    email?: string | null;
    phone?: string | null;
    instagram_handle?: string | null;
    gender?: string | null;
    profile_photo_url?: string | null;
    id_number?: string | null;
    date_of_birth?: string | null;
    address?: string | null;
    id_verified_from_cccd?: boolean;
    is_minor?: boolean;
    guardian_name?: string | null;
    guardian_phone?: string | null;
    zalo_user_id?: string | null;
    prefer_zalo_notifications?: boolean;
    prefer_sms_notifications?: boolean;
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
  const d = getMessages(isVi ? "vi" : "en").dashboard;
  const [fullName, setFullName] = useState(member.full_name ?? "");
  const [displayName, setDisplayName] = useState(member.display_name ?? "");
  const [email, setEmail] = useState(member.email ?? "");
  const [phone, setPhone] = useState(member.phone ?? "");
  const [instagramHandle, setInstagramHandle] = useState(member.instagram_handle ?? "");
  const [gender, setGender] = useState<"male" | "female" | "">(
    member.gender === "male" || member.gender === "female" ? member.gender : ""
  );
  const [idNumber, setIdNumber] = useState(member.id_number ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(
    member.date_of_birth ? member.date_of_birth.slice(0, 10) : ""
  );
  const [address, setAddress] = useState(member.address ?? "");
  const [cccdScanPending, setCccdScanPending] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    member.profile_photo_url ?? null
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [eidScannerOpen, setEidScannerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMinor, setIsMinor] = useState(!!member.is_minor);
  const [guardianName, setGuardianName] = useState(member.guardian_name ?? "");
  const [guardianPhone, setGuardianPhone] = useState(member.guardian_phone ?? "");
  const [zaloUserId, setZaloUserId] = useState(member.zalo_user_id ?? "");
  const [preferZalo, setPreferZalo] = useState(!!member.prefer_zalo_notifications);
  const [preferSms, setPreferSms] = useState(!!member.prefer_sms_notifications);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [extrasMsg, setExtrasMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFullName(member.full_name ?? "");
      setEmail(member.email ?? "");
      setPhone(member.phone ?? "");
      setInstagramHandle(member.instagram_handle ?? "");
      setGender(member.gender === "male" || member.gender === "female" ? member.gender : "");
      setIdNumber(member.id_number ?? "");
      setDateOfBirth(member.date_of_birth ? member.date_of_birth.slice(0, 10) : "");
      setAddress(member.address ?? "");
      setCccdScanPending(false);
      setPhotoPreview(member.profile_photo_url ?? null);
      setPhotoFile(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setPasswordError(null);
      setPasswordSuccess(false);
      setEidScannerOpen(false);
      setIsMinor(!!member.is_minor);
      setGuardianName(member.guardian_name ?? "");
      setGuardianPhone(member.guardian_phone ?? "");
      setZaloUserId(member.zalo_user_id ?? "");
      setPreferZalo(!!member.prefer_zalo_notifications);
      setPreferSms(!!member.prefer_sms_notifications);
      setExtrasMsg(null);
    }
  }, [
    open,
    member.full_name,
    member.display_name,
    member.email,
    member.phone,
    member.instagram_handle,
    member.gender,
    member.id_number,
    member.date_of_birth,
    member.address,
    member.profile_photo_url,
    member.id_verified_from_cccd,
    member.is_minor,
    member.guardian_name,
    member.guardian_phone,
    member.zalo_user_id,
    member.prefer_zalo_notifications,
    member.prefer_sms_notifications,
  ]);

  const lockedFromCccd = Boolean(member.id_verified_from_cccd);

  const identityReady =
    lockedFromCccd ||
    cccdScanPending ||
    memberIdentityComplete({
      id_verified_from_cccd: false,
      id_number: idNumber,
      full_name: fullName,
      gender: gender || null,
      date_of_birth: dateOfBirth || null,
    });
  const photoReady = Boolean(photoFile || member.profile_photo_url);
  const canSaveProfile = identityReady && photoReady;

  const handleEidScanned = useCallback(
    async (rawContent: string) => {
      const cccd = parseCccdPipeDelimited(rawContent);
      if (cccd) {
        setError(null);
        if (!accessToken) return;
        try {
          const res = await fetch(
            `/api/member/profile/check-id?id_number=${encodeURIComponent(cccd.id_number)}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? d.idAlreadyRegistered);
            return;
          }
          if (!data.available) {
            setError(d.idAlreadyRegistered);
            return;
          }
          setIdNumber(cccd.id_number);
          setFullName(cccd.full_name);
          setDateOfBirth(cccd.date_of_birth);
          setGender(cccd.gender);
          setAddress(cccd.address);
          setCccdScanPending(true);
        } catch {
          setError(isVi ? "Không thể kiểm tra. Thử lại." : "Could not check. Try again.");
        }
        return;
      }
      const parsed = extractIdFromVnEidQr(rawContent);
      if (!parsed) {
        setError(d.noIdInQr);
        return;
      }
      setError(null);
      if (!accessToken) return;
      try {
        const res = await fetch(
          `/api/member/profile/check-id?id_number=${encodeURIComponent(parsed)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? d.idAlreadyRegistered);
          return;
        }
        if (data.available) {
          setIdNumber(parsed);
        } else {
          setError(d.idAlreadyRegistered);
        }
      } catch {
        setError(isVi ? "Không thể kiểm tra. Thử lại." : "Could not check. Try again.");
      }
    },
    [accessToken, d.noIdInQr, d.idAlreadyRegistered, isVi]
  );

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
    if (!photoReady) {
      setError(d.profileSaveNeedPhoto);
      return;
    }
    if (!identityReady) {
      setError(d.profileSaveNeedIdentity);
      return;
    }
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
        full_name: fullName.trim() || null,
        display_name: displayName.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        instagram_handle: instagramHandle.trim() || null,
        gender: gender || null,
        id_number: idNumber.trim() || null,
        date_of_birth: dateOfBirth.trim() || null,
        address: address.trim() || null,
      };
      if (cccdScanPending) body.id_verified_from_cccd = true;
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
      setCccdScanPending(false);
      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message ?? (isVi ? "Lưu thất bại." : "Save failed."));
    } finally {
      setLoading(false);
    }
  }, [accessToken, fullName, displayName, email, phone, instagramHandle, gender, idNumber, dateOfBirth, address, cccdScanPending, photoFile, onSaved, onClose, isVi, d.profileSaveNeedPhoto, d.profileSaveNeedIdentity, photoReady, identityReady]);

  const handleChangePassword = useCallback(async () => {
    if (!accessToken) return;
    setPasswordError(null);
    setPasswordSuccess(false);
    if (!currentPassword) {
      setPasswordError(isVi ? "Nhập mật khẩu hiện tại." : "Enter current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError(isVi ? "Mật khẩu mới tối thiểu 6 ký tự." : "New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(d.passwordMismatch);
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/member/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPasswordError((e as Error).message ?? d.passwordError);
    } finally {
      setPasswordLoading(false);
    }
  }, [accessToken, currentPassword, newPassword, confirmPassword, isVi, d.passwordMismatch, d.passwordError]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[calc(100dvh-2rem)] rounded-2xl bg-slate-900 border border-white/10 shadow-xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {/* Header - fixed */}
        <div className="shrink-0 p-4 pb-0">
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
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain px-4 pb-4">
          <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2.5 mb-4">
            <p className="text-xs font-semibold text-amber-100">{d.profileGovtIdRequiredTitle}</p>
            <p className="text-[11px] text-amber-100/85 mt-1 leading-relaxed">{d.profileGovtIdRequiredBody}</p>
          </div>
          {cccdScanPending && (
            <p className="text-xs text-emerald-400 mb-3">{d.profileScanVerifiedPending}</p>
          )}

          {/* Govt ID + legal identity */}
          <div className="space-y-4 mb-6">
            <label className="block">
              <span className="text-xs text-white/70">
                {isVi ? "Số CCCD / Hộ chiếu" : "Govt ID / Passport"}
                {!lockedFromCccd && !cccdScanPending && <span className="text-amber-300 ml-0.5">*</span>}
              </span>
              {lockedFromCccd && <span className="text-xs text-white/50 ml-1">({d.verifiedFromCccdLocked})</span>}
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => { setIdNumber(e.target.value); setError(null); }}
                  placeholder={isVi ? "Nhập số CCCD hoặc hộ chiếu" : "Enter CCCD or passport number"}
                  disabled={lockedFromCccd}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-70 disabled:cursor-not-allowed"
                />
                {!lockedFromCccd && (
                  <button
                    type="button"
                    onClick={() => { setError(null); setEidScannerOpen(true); }}
                    className="shrink-0 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    title={d.scanVnEid}
                  >
                    {d.scanVnEid}
                  </button>
                )}
              </div>
            </label>
            <EidQrScannerModal
              open={eidScannerOpen}
              onClose={() => setEidScannerOpen(false)}
              onScanned={handleEidScanned}
              onError={(msg) => setError(msg)}
              title={d.scanVnEid}
              hint={d.scanVnEidHint}
            />
            <label className="block">
              <span className="text-xs text-white/70">
                {d.fullName}
                {!lockedFromCccd && !cccdScanPending && <span className="text-amber-300 ml-0.5">*</span>}
              </span>
              {lockedFromCccd && <span className="text-xs text-white/50 ml-1">({d.verifiedFromCccdLocked})</span>}
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={isVi ? "Họ tên đầy đủ" : "Full name"}
                disabled={lockedFromCccd}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-70 disabled:cursor-not-allowed"
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/70">
                {d.gender}
                {!lockedFromCccd && !cccdScanPending && <span className="text-amber-300 ml-0.5">*</span>}
              </span>
              {lockedFromCccd && <span className="text-xs text-white/50 ml-1">({d.verifiedFromCccdLocked})</span>}
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as "male" | "female" | "")}
                disabled={lockedFromCccd}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 [color-scheme:dark] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <option value="">{isVi ? "Chọn" : "Select"}</option>
                <option value="male">{d.genderMale}</option>
                <option value="female">{d.genderFemale}</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-white/70">
                {isVi ? "Ngày sinh" : "Date of birth"}
                {!lockedFromCccd && !cccdScanPending && <span className="text-amber-300 ml-0.5">*</span>}
              </span>
              {lockedFromCccd && <span className="text-xs text-white/50 ml-1">({d.verifiedFromCccdLocked})</span>}
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                disabled={lockedFromCccd}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 [color-scheme:dark] disabled:opacity-70 disabled:cursor-not-allowed"
              />
            </label>

          {/* Profile photo — required */}
          <div className="flex flex-col items-center mb-6 pt-2 border-t border-white/10">
            <p className="text-xs font-medium text-white/80 mb-2 w-full text-left">
              {d.profilePhotoRequiredLabel}
            </p>
            <div className="relative">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt=""
                  className="w-24 h-24 rounded-full object-cover border-2 border-white/20"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-2xl font-semibold">
                  {fullName?.charAt(0).toUpperCase() || member.full_name?.charAt(0).toUpperCase() || "?"}
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

            <label className="block">
              <span className="text-xs text-white/70">{d.profileDisplayName}</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={d.profileDisplayNamePlaceholder}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/70">{d.email}</span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isVi ? "Email" : "Email"}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/70">{d.phone}</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={isVi ? "Số điện thoại" : "Phone"}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/70">{d.instagram}</span>
              <input
                type="text"
                autoComplete="off"
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder={isVi ? "@username hoặc username" : "@username or username"}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </label>
            <label className="block">
              <span className="text-xs text-white/70">{d.address}</span>
              {lockedFromCccd && <span className="text-xs text-white/50 ml-1">({d.verifiedFromCccdLocked})</span>}
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={isVi ? "Địa chỉ" : "Address"}
                disabled={lockedFromCccd}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-70 disabled:cursor-not-allowed"
              />
            </label>
          </div>

          {/* Minors + Zalo/SMS prefs (separate API — no CCCD gate) */}
          <div className="border-t border-white/10 pt-4 mb-4 space-y-3">
            <p className="text-xs text-white/70 font-medium">
              {isVi ? "Trẻ em / Zalo / SMS (tùy chọn)" : "Minors / Zalo / SMS (optional)"}
            </p>
            <p className="text-[11px] text-white/45">
              {isVi
                ? "Gym có thể liên hệ qua Zalo/SMS khi bạn bật. Trẻ em: điền người giám hộ."
                : "Enable if you want desk campaigns via Zalo/SMS. Minors: add guardian contact."}
            </p>
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" checked={isMinor} onChange={(e) => setIsMinor(e.target.checked)} className="rounded" />
              {isVi ? "Thành viên dưới 18 tuổi" : "Member is under 18"}
            </label>
            {isMinor && (
              <>
                <input
                  value={guardianName}
                  onChange={(e) => setGuardianName(e.target.value)}
                  placeholder={isVi ? "Tên người giám hộ" : "Guardian name"}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder-white/40"
                />
                <input
                  value={guardianPhone}
                  onChange={(e) => setGuardianPhone(e.target.value)}
                  placeholder={isVi ? "SĐT người giám hộ" : "Guardian phone"}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder-white/40"
                />
              </>
            )}
            <input
              value={zaloUserId}
              onChange={(e) => setZaloUserId(e.target.value)}
              placeholder={isVi ? "Zalo (ID / số điện thoại Zalo)" : "Zalo ID / phone on Zalo"}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm placeholder-white/40"
            />
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" checked={preferZalo} onChange={(e) => setPreferZalo(e.target.checked)} className="rounded" />
              {isVi ? "Nhận thông báo qua Zalo (khi gym gửi)" : "OK to reach me on Zalo"}
            </label>
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" checked={preferSms} onChange={(e) => setPreferSms(e.target.checked)} className="rounded" />
              {isVi ? "Nhận SMS" : "OK to receive SMS"}
            </label>
            <button
              type="button"
              disabled={extrasLoading || !accessToken}
              onClick={async () => {
                if (!accessToken) return;
                setExtrasLoading(true);
                setExtrasMsg(null);
                try {
                  const res = await fetch("/api/member/profile-extras", {
                    method: "PATCH",
                    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                      is_minor: isMinor,
                      guardian_name: guardianName.trim() || null,
                      guardian_phone: guardianPhone.trim() || null,
                      zalo_user_id: zaloUserId.trim() || null,
                      prefer_zalo_notifications: preferZalo,
                      prefer_sms_notifications: preferSms,
                    }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    setExtrasMsg((data as { error?: string }).error ?? "Error");
                    return;
                  }
                  setExtrasMsg(isVi ? "Đã lưu." : "Saved.");
                  onSaved();
                } catch {
                  setExtrasMsg(isVi ? "Lỗi." : "Failed.");
                } finally {
                  setExtrasLoading(false);
                }
              }}
              className="px-4 py-2 rounded-lg bg-sky-600/90 text-white text-sm font-medium hover:bg-sky-500 disabled:opacity-50"
            >
              {extrasLoading ? "…" : isVi ? "Lưu Zalo / SMS / giám hộ" : "Save Zalo / SMS / guardian"}
            </button>
            {extrasMsg && <p className="text-xs text-emerald-300">{extrasMsg}</p>}
          </div>

          {/* Password change */}
          <div className="border-t border-white/10 pt-4 mb-4">
            <p className="text-xs text-white/70 mb-3">{d.setPassword}</p>
            <div className="space-y-3">
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={d.currentPassword}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={d.newPassword}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={d.confirmPassword}
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
                className="w-full py-2 rounded-lg text-sm font-medium bg-white/15 text-white hover:bg-white/25 disabled:opacity-50 disabled:hover:bg-white/15"
              >
                {passwordLoading ? (isVi ? "Đang cập nhật…" : "Updating…") : d.updatePassword}
              </button>
              {passwordSuccess && (
                <p className="text-sm text-emerald-400">{d.passwordUpdated}</p>
              )}
              {passwordError && (
                <p className="text-sm text-amber-300">{passwordError}</p>
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-amber-300 mb-4">{error}</p>
          )}
        </div>

        {/* Footer - fixed Save/Cancel */}
        <div className="shrink-0 p-4 pt-4 border-t border-white/10">
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
              disabled={loading || !canSaveProfile}
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
