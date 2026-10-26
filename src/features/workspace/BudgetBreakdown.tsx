import { Text } from '@/components/ui/Typography';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { Expense } from '@/types/models';
import { chartColors, colors } from '@/constants/theme';

export function BudgetBreakdown({ expenses, currency, budget }: { expenses: Expense[]; currency: string; budget: number | null }) {
  const groups: Record<string, number> = {};
  expenses.filter(e => e.currency === currency).forEach(e => { groups[e.category] = (groups[e.category] ?? 0) + Number(e.amount); });
  const total = Object.values(groups).reduce((a, b) => a + b, 0); const circumference = 2 * Math.PI * 58; let offset = 0;
  const palette = chartColors;
  return <View style={s.card}><View style={s.chart}><Svg width={150} height={150} viewBox="0 0 150 150"><Circle cx={75} cy={75} r={58} fill="none" stroke={colors.border} strokeWidth={17} />{Object.entries(groups).map(([name, amount], i) => { const dash = total ? amount / total * circumference : 0; const start = offset; offset += dash; return <Circle key={name} cx={75} cy={75} r={58} fill="none" stroke={palette[i % palette.length]} strokeWidth={17} strokeDasharray={[dash, circumference - dash]} strokeDashoffset={-start} rotation={-90} origin="75, 75" />; })}</Svg><View style={s.center}><Text style={s.centerLabel}>Spent</Text></View></View><View style={s.legend}><Text style={s.heading}>Every moment, accounted for</Text>{Object.entries(groups).map(([name, amount], i) => <View key={name} style={s.row}><View style={[s.dot, { backgroundColor: palette[i % palette.length] }]} /><Text style={s.category}>{name}</Text><Text style={s.amount}>{amount.toLocaleString()}</Text></View>)}{!total ? <Text style={s.caption}>Add your first expense to see the breakdown.</Text> : null}{budget != null ? <Text style={s.caption}>Budget: {currency} {Number(budget).toLocaleString()}</Text> : null}</View>{expenses.some(e => e.currency !== currency) ? <Text style={s.caption}>Other currencies appear below and are excluded from this total. No exchange rate is assumed.</Text> : null}</View>;
}
const s = StyleSheet.create({ card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, borderRadius: 24, padding: 18, marginBottom: 16, gap: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }, chart: { width: 150, height: 150 }, center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: 150, height: 150, justifyContent: 'center', alignItems: 'center' }, centerLabel: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' }, caption: { color: colors.muted, fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 2 }, legend: { flex: 1, minWidth: 130, gap: 10 }, heading: { color: colors.text, fontWeight: '800', fontSize: 14, marginBottom: 4 }, row: { flexDirection: 'row', alignItems: 'center', gap: 7 }, dot: { width: 7, height: 7, borderRadius: 4 }, category: { flex: 1, color: colors.muted, fontSize: 11 }, amount: { color: colors.text, fontWeight: '700', fontSize: 11 } });





