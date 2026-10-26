export const PHOTO_ROTATION_MS = 5_000;
export const HOME_PHOTO_IDS = ['bali', 'paris', 'kyoto', 'zermatt', 'jaipur'] as const;
export function nextPhotoIndex(index: number, count: number) { return count > 0 ? (index + 1) % count : 0; }
export function startPhotoRotation(advance: () => void) {
  const timer = setInterval(advance, PHOTO_ROTATION_MS);
  return () => clearInterval(timer);
}
