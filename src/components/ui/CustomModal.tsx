import { createContext, useCallback, useContext, useState, type PropsWithChildren } from 'react';
import { Text } from '@/components/ui/Typography';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { Icon } from './Icon';

type Action = { text?: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void | Promise<void> };
type Notice = { title: string; message?: string; actions: Action[] };
type Show = (title: string, message?: string, actions?: Action[]) => void;
const DialogContext = createContext<Show>(() => undefined);
export function DialogProvider({ children }: PropsWithChildren) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const show = useCallback<Show>((title, message, actions) => setNotice({ title, message, actions: actions?.length ? actions : [{ text: 'Got it' }] }), []);
  return <DialogContext.Provider value={show}>{children}<Modal transparent animationType="fade" visible={!!notice} onRequestClose={() => setNotice(null)}><View style={s.backdrop}><View accessibilityViewIsModal style={s.card}><View style={s.icon}><Icon name={notice?.actions.some(a => a.style === 'destructive') ? 'help' : 'check'} size={30} /></View><Text accessibilityRole="header" style={s.title}>{notice?.title}</Text>{notice?.message ? <Text style={s.message}>{notice.message}</Text> : null}<View style={s.actions}>{notice?.actions.map((action, i) => <Pressable accessibilityRole="button" key={i} style={[s.button, action.style === 'cancel' && s.cancel, action.style === 'destructive' && s.danger]} onPress={() => { setNotice(null); Promise.resolve().then(() => action.onPress?.()).catch(e => show('Could not complete action', e instanceof Error ? e.message : 'Please try again.')); }}><Text style={[s.label, action.style === 'cancel' && { color: colors.text }]}>{action.text ?? 'OK'}</Text></Pressable>)}</View></View></View></Modal></DialogContext.Provider>;
}
export function useDialog() { const alert = useContext(DialogContext); return { alert }; }
const s = StyleSheet.create({ backdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 }, card: { width: '100%', maxWidth: 420, padding: 24, borderRadius: 28, backgroundColor: colors.surface, gap: 16 }, icon: { backgroundColor: colors.accentSoft, borderRadius: 20, padding: 14, alignSelf: 'center' }, title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' }, message: { color: colors.muted, lineHeight: 22, textAlign: 'center' }, actions: { gap: 10, marginTop: 8 }, button: { backgroundColor: colors.primary, minHeight: 48, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' }, cancel: { backgroundColor: colors.surfaceMuted }, danger: { backgroundColor: colors.danger }, label: { color: '#fff', fontWeight: '800' } });
