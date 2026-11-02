import { useEffect, useState } from 'react';
import { Text, TextInput } from '@/components/ui/Typography';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { suggestDestinations } from '@/services/autocomplete';
import { customDestination } from '@/services/destinations';
import { colors } from '@/constants/theme';
export function DestinationSearch({
  value,
  onChangeText,
  onSelect,
  onSubmit
}) {
  const [focused, setFocused] = useState(false);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    setItems([]);
    setError('');
    setBusy(false);
    if (!focused || value.trim().length < 3) return;
    const controller = new AbortController();
    let active = true;
    setBusy(true);
    const timer = setTimeout(() => {
      suggestDestinations(value, controller.signal).then(found => {
        if (active) setItems(found);
      }).catch(e => {
        if (active) setError(e.message);
      }).finally(() => {
        clearTimeout(timeout);
        if (active) setBusy(false);
      });
    }, 650);
    const timeout = setTimeout(() => {
      if (active) {
        controller.abort();
        setError('Suggestions timed out. Use your keyboard’s Search key or enter a custom destination.');
        setBusy(false);
      }
    }, 10000);
    return () => {
      active = false;
      clearTimeout(timer);
      clearTimeout(timeout);
      controller.abort();
    };
  }, [value, focused]);
  function choose(place) {
    setFocused(false);
    Keyboard.dismiss();
    onSelect(place);
  }
  const show = focused && value.trim().length >= 3;
  return <View><View style={s.inputRow}><Icon name="search" size={20} /><TextInput accessibilityLabel="Search destinations" value={value} onFocus={() => setFocused(true)} onChangeText={text => {
        setFocused(true);
        onChangeText(text);
      }} onSubmitEditing={() => {
        if (onSubmit && value.trim().length >= 2) {
          setFocused(false);
          Keyboard.dismiss();
          onSubmit();
        }
      }} placeholder="Search cities, islands, landmarks…" placeholderTextColor={colors.muted} autoCorrect={false} returnKeyType="search" style={s.input} />{value ? <Pressable accessibilityLabel="Clear search" hitSlop={8} onPress={() => onChangeText('')}><Icon name="close" size={18} /></Pressable> : null}</View>{show ? <View style={s.results}>{busy ? <View style={s.row}><ActivityIndicator size="small" color={colors.primary} /><Text style={s.detail}>Finding places…</Text></View> : null}{items.map(item => <Pressable key={item.placeId} accessibilityRole="button" style={s.row} onPress={() => choose(item)}><View style={s.icon}><Icon name="pin" size={19} /></View><View style={{
          flex: 1
        }}><Text style={s.name}>{item.name}</Text><Text style={s.detail} numberOfLines={2}>{item.displayName}</Text></View><Icon name="chevron-right" size={16} /></Pressable>)}{error ? <Text style={s.message}>{error}</Text> : !busy && !items.length ? <Text style={s.message}>No exact match. Try a nearby city or use your own destination.</Text> : null}<Pressable style={s.row} onPress={() => choose(customDestination(value))}><Icon name="plus" size={18} /><Text style={s.detail}>Use “{value.trim()}” as a custom destination</Text></Pressable><Text style={s.credit}>Suggestions: Photon · © OpenStreetMap contributors</Text></View> : null}</View>;
}
const s = StyleSheet.create({
  inputRow: {
    minHeight: 54,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12
  },
  input: {
    flex: 1,
    color: colors.text,
    minHeight: 52,
    fontSize: 14
  },
  results: {
    backgroundColor: '#fff',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
    overflow: 'hidden'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderBottomWidth: 0.5,
    borderColor: colors.border
  },
  icon: {
    backgroundColor: colors.accentSoft,
    padding: 8,
    borderRadius: 10
  },
  name: {
    color: colors.text,
    fontWeight: '700'
  },
  detail: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1
  },
  message: {
    color: colors.muted,
    padding: 13,
    fontSize: 12
  },
  credit: {
    color: colors.muted,
    padding: 10,
    fontSize: 9
  }
});