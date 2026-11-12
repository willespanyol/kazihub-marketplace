// Shared upload validation for browser file selection and Supabase Storage.
export const UPLOAD_LIMITS = Object.freeze({
  "order-files": 50 * 1024 * 1024,
  "service-media": 50 * 1024 * 1024,
  "profile-images": 8 * 1024 * 1024,
  "portfolio-images": 8 * 1024 * 1024,
  "seller-verification-files": 15 * 1024 * 1024,
});
const IMAGE_TYPES = new Set(["image/jpeg","image/png","image/webp","image/gif"]);
const VERIFICATION_TYPES = new Set(["application/pdf","image/jpeg","image/png","image/webp"]);
const SERVICE_TYPES = new Set([...IMAGE_TYPES,"video/mp4","video/webm","video/quicktime"]);
export function validateUpload(file,bucket) {
  if (!file) return "Select a file before uploading.";
  if (!Number.isFinite(file.size) || file.size <= 0) return "The selected file is empty or unreadable.";
  const limit = UPLOAD_LIMITS[bucket];
  if (!limit) return "Unsupported upload destination.";
  if (file.size > limit) return `File is too large for this upload (maximum ${Math.floor(limit / 1048576)} MB). Compress it or split your deliverable into smaller files.`;
  if (bucket === "profile-images" || bucket === "portfolio-images") {
    if (!IMAGE_TYPES.has(file.type) || (bucket==="portfolio-images" && file.type==="image/gif"))
      return "Choose a JPG, PNG or WebP image.";
  } else if (bucket === "seller-verification-files" && !VERIFICATION_TYPES.has(file.type))
    return "Verification files must be PDF, JPG, PNG or WebP.";
  else if (bucket === "service-media" && !SERVICE_TYPES.has(file.type))
    return "Gig media must be an image (JPG, PNG, WebP, GIF) or a video (MP4, WebM, MOV).";
  return null;
}
export function uniqueUploadPath(prefix,file) {
  const safe = String(file?.name || "file").normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]/g,"_").replace(/^\.+/,"")
    .slice(-90) || "file";
  return `${prefix}/${crypto.randomUUID()}-${safe}`;
}
export function readableUploadError(error) {
  const detail=error?.message || "Unknown upload error";
  if (/payload too large|maximum.*size|exceeded.*size|file size|413/i.test(detail))
    return "The file exceeds the Storage upload limit. Try compressing or splitting it. "+detail;
  if (/invalid.*mime|mime.*not allowed|invalid content type|unsupported/i.test(detail))
    return "This file format is not allowed for the selected upload. "+detail;
  if (/row.level.security|permission|unauthori[sz]ed|403/i.test(detail))
    return "Storage permission denied. Check that you are signed in to an active account and belong to this order. "+detail;
  if (/failed to fetch|network|timeout|connection/i.test(detail))
    return "The upload could not reach Storage. Check your connection and try again. "+detail;
  return detail;
}
