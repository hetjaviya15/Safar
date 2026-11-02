import { createContext, forwardRef, useContext } from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput } from 'react-native';
import { fontForWeight } from '@/constants/typography';
export const TypographyReady = createContext(false);
const InheritedWeight = createContext('400');
export const Text = forwardRef(function Text({
  style,
  children,
  ...props
}, ref) {
  const ready = useContext(TypographyReady);
  const inherited = useContext(InheritedWeight);
  const flat = StyleSheet.flatten(style);
  const weight = flat?.fontWeight ?? inherited;
  // Preserve intentional overrides, such as the monospaced code style.
  const face = ready && !flat?.fontFamily ? {
    fontFamily: fontForWeight(weight),
    fontWeight: 'normal'
  } : undefined;
  return <InheritedWeight.Provider value={weight}><NativeText {...props} ref={ref} style={[style, face]}>{children}</NativeText></InheritedWeight.Provider>;
});
export const TextInput = forwardRef(function TextInput({
  style,
  ...props
}, ref) {
  const ready = useContext(TypographyReady);
  const flat = StyleSheet.flatten(style);
  const face = ready && !flat?.fontFamily ? {
    fontFamily: fontForWeight(flat?.fontWeight),
    fontWeight: 'normal'
  } : undefined;
  return <NativeTextInput {...props} ref={ref} style={[style, face]} />;
});