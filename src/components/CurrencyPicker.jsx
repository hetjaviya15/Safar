import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from '@/components/ui/Typography';
import { CategoryChip } from '@/components/ui/SafarUI';
import { Icon } from '@/components/ui/Icon';
import { ALL_CURRENCIES, QUICK_CURRENCIES } from '@/constants/currencies';
import { colors, radius } from '@/constants/theme';
export function CurrencyPicker({
  value,
  onChange,
  onMore
}) {
  const options = [...new Set([value, ...QUICK_CURRENCIES])];
  return <View style={s.chips}>
    {options.map(code => {
      const currency = ALL_CURRENCIES.find(item => item.code === code);
      return <CategoryChip key={code} label={`${code}${currency?.symbol ? ` ${currency.symbol}` : ''}`} selected={value === code} onPress={() => onChange(code)} />;
    })}
    <Pressable accessibilityRole="button" accessibilityLabel="Browse all currencies" onPress={onMore} style={s.more}>
      <Icon name="plus" size={15} color={colors.primary} />
      <Text style={s.moreText}>More currencies</Text>
    </Pressable>
  </View>;
}
export function CurrencyPickerSheet({
  visible,
  value,
  onSelect,
  onClose
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return search ? ALL_CURRENCIES.filter(item => `${item.code} ${item.name} ${item.symbol ?? ''}`.toLocaleLowerCase().includes(search)) : ALL_CURRENCIES;
  }, [query]);
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} onDismiss={() => setQuery('')}>
    <View style={s.sheet}>
      <View style={s.header}>
        <View><Text style={s.title}>Choose a currency</Text><Text style={s.subtitle}>Search by code, name or symbol</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close currency picker" hitSlop={10} onPress={onClose} style={s.close}><Icon name="close" color={colors.muted} /></Pressable>
      </View>
      <View style={s.search}>
        <Icon name="search" size={18} color={colors.muted} />
        <TextInput accessibilityLabel="Search currencies" placeholder="Search currencies…" placeholderTextColor={colors.placeholder} value={query} onChangeText={setQuery} autoCapitalize="none" autoCorrect={false} returnKeyType="search" style={s.input} />
      </View>
      <FlatList data={filtered} keyExtractor={item => item.code} keyboardShouldPersistTaps="handled" renderItem={({
        item
      }) => <Pressable accessibilityRole="button" accessibilityState={{
        selected: value === item.code
      }} onPress={() => {
        onSelect(item.code);
        onClose();
      }} style={[s.row, value === item.code && s.rowSelected]}>
          <Text style={s.code}>{item.code}</Text>
          <Text style={s.name} numberOfLines={1}>{item.name}</Text>
          {item.symbol ? <Text style={s.symbol}>{item.symbol}</Text> : null}
          {value === item.code ? <Icon name="check" size={18} color={colors.primary} /> : null}
        </Pressable>} ListEmptyComponent={<Text style={s.empty}>No currencies match “{query}”.</Text>} />
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8
  },
  more: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  moreText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800'
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingTop: 12
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 3
  },
  close: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: colors.surfaceMuted
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginBottom: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background
  },
  input: {
    flex: 1,
    color: colors.text,
    minHeight: 46
  },
  row: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  rowSelected: {
    backgroundColor: colors.surfaceMuted
  },
  code: {
    width: 48,
    color: colors.primary,
    fontWeight: '900',
    fontSize: 13
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: 14
  },
  symbol: {
    minWidth: 30,
    textAlign: 'right',
    color: colors.muted,
    fontSize: 14
  },
  empty: {
    padding: 24,
    color: colors.muted,
    textAlign: 'center'
  }
});