// Static faces avoid variable-font weight differences on Expo SDK 57.
export const fontFamilies = {
  regular: 'SafarGoogleSans-Regular',
  medium: 'SafarGoogleSans-Medium',
  bold: 'SafarGoogleSans-Bold',
} as const;

export function fontForWeight(weight?: string | number) {
  const numeric = weight === 'bold' ? 700 : Number(weight) || 400;
  return numeric >= 600 ? fontFamilies.bold : numeric >= 500 ? fontFamilies.medium : fontFamilies.regular;
}
