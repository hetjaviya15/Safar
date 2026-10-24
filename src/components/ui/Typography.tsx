/* eslint-disable @typescript-eslint/no-redeclare */
import { createContext, forwardRef, useContext } from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput, type TextProps, type TextInputProps, type TextStyle } from 'react-native';
import { fontForWeight } from '@/constants/typography';

export const TypographyReady = createContext(false);
const InheritedWeight = createContext<TextStyle['fontWeight']>('400');

export type Text = NativeText;
export const Text = forwardRef<NativeText, TextProps>(function Text({ style, children, ...props }, ref) {
  const ready = useContext(TypographyReady);
  const inherited = useContext(InheritedWeight);
  const flat = StyleSheet.flatten(style);
  const weight = flat?.fontWeight ?? inherited;
  // Preserve intentional overrides, such as the monospaced code style.
  const face = ready && !flat?.fontFamily ? { fontFamily: fontForWeight(weight), fontWeight: 'normal' as const } : undefined;
  return <InheritedWeight.Provider value={weight}><NativeText {...props} ref={ref} style={[style, face]}>{children}</NativeText></InheritedWeight.Provider>;
});

export type TextInput = NativeTextInput;
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  const ready = useContext(TypographyReady);
  const flat = StyleSheet.flatten(style);
  const face = ready && !flat?.fontFamily ? { fontFamily: fontForWeight(flat?.fontWeight), fontWeight: 'normal' as const } : undefined;
  return <NativeTextInput {...props} ref={ref} style={[style, face]} />;
});
