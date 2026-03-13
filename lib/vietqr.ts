/**
 * VietQR bank transfer QR code URLs
 * https://img.vietqr.io/image/BANKCODE-ACCOUNT-print.png?amount=AMOUNT&addInfo=MEMO
 */

// Techcombank BIN (NAPAS247): 970407
const BANK_CODE = process.env.VIETQR_BANK_CODE ?? "970407";
const ACCOUNT = process.env.VIETQR_ACCOUNT ?? "19027030091996";

export function getVietQRUrl(amountVnd: number, memo: string): string {
  const params = new URLSearchParams();
  params.set("amount", String(amountVnd));
  if (memo) params.set("addInfo", memo);
  return `https://img.vietqr.io/image/${BANK_CODE}-${ACCOUNT}-print.png?${params.toString()}`;
}
