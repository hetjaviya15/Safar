import { Icon } from '@/components/ui/Icon';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, TextInput } from '@/components/ui/Typography';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AIMessageBubble, AIQuestionCard, AppHeader, CategoryChip, ErrorState, IconButton, LoadingSkeleton, SafarButton } from '@/components/ui/SafarUI';
import { colors, radius, shadow } from '@/constants/theme';
import { getAIConversation, listAIConversations, sendAIMessage } from '@/services/ai';
import { messageFromError } from '@/utils/errors';
const existingCapabilities = [{
  value: 'suggest_itinerary',
  label: 'Itinerary',
  icon: '🗓'
}, {
  value: 'suggest_activities',
  label: 'Activities',
  icon: '🥾'
}, {
  value: 'packing_suggestions',
  label: 'Packing',
  icon: '🎒'
}, {
  value: 'budget_suggestions',
  label: 'Budget',
  icon: '◉'
}, {
  value: 'trip_question',
  label: 'Ask',
  icon: '?'
}];
export default function SafarAIScreen() {
  const {
    tripId,
    capability: initialCapability
  } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const [capability, setCapability] = useState(tripId && existingCapabilities.some(item => item.value === initialCapability) ? initialCapability : tripId ? 'suggest_itinerary' : 'create_trip_draft');
  const [conversationId, setConversationId] = useState();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [remaining, setRemaining] = useState();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const restore = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const latest = (await listAIConversations(tripId))[0];
      if (!latest || latest.status === 'completed') return;
      const detail = await getAIConversation(latest.id);
      setConversationId(latest.id);
      setCapability(latest.capability);
      setMessages(detail.messages.map(message => ({
        id: message.id,
        role: message.role,
        text: message.content.text ?? '',
        proposalId: message.content.proposalId
      })));
    } catch (e) {
      setError(messageFromError(e, 'Could not restore your Safar AI conversation.'));
    } finally {
      setLoading(false);
    }
  }, [tripId]);
  useEffect(() => {
    restore();
  }, [restore]);
  useEffect(() => {
    if (!loading) setTimeout(() => scrollRef.current?.scrollToEnd({
      animated: true
    }), 80);
  }, [messages, loading]);
  async function send(text = input) {
    const value = text.trim();
    if (!value || sending) return;
    setInput('');
    setError('');
    setMessages(items => [...items, {
      id: `local-${Date.now()}`,
      role: 'user',
      text: value
    }]);
    setSending(true);
    try {
      const reply = await sendAIMessage({
        conversationId,
        tripId,
        capability,
        request: value
      });
      setRemaining(reply.remainingRequests);
      setConversationId(reply.conversationId);
      setMessages(items => [...items, {
        id: `reply-${Date.now()}`,
        role: 'assistant',
        text: reply.text,
        proposalId: reply.proposalId
      }]);
    } catch (e) {
      setInput(current => current || value);
      setError(messageFromError(e, 'Safar AI is unavailable. Your manual planning tools still work.'));
    } finally {
      setSending(false);
    }
  }
  function newConversation() {
    if (sending) return;
    setConversationId(undefined);
    setMessages([]);
    setError('');
  }
  const intro = tripId ? 'Ask about this trip or request changes. Safar AI will always show a proposal before anything is added.' : 'Tell me where you want to go. I’ll collect the dates and traveler count, then build a trip preview for you to approve.';
  const examples = tripId ? ['Make Day 2 more adventurous', 'Suggest a practical packing list', 'Where can I reduce the estimated budget?'] : ['Create a trip to Japan', 'Plan seven days in Kerala for two people', 'I want a food and culture trip to Italy'];
  return <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
    <View style={[styles.headerArea, {
      paddingTop: Math.max(insets.top, 14)
    }]}>
      <AppHeader title="Safar AI" subtitle="Ideas first. Changes only after you approve." left={<IconButton icon="‹" label="Go back" tone="ai" onPress={() => router.back()} />} right={<IconButton icon="＋" label="New conversation" tone="ai" onPress={newConversation} />} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.capabilities}>{tripId ? existingCapabilities.map(item => <CategoryChip key={item.value} label={item.label} icon={item.icon} tone="ai" selected={capability === item.value} onPress={() => {
          if (sending) return;
          setCapability(item.value);
          newConversation();
        }} />) : <CategoryChip label="Create a trip" icon="✦" tone="ai" selected onPress={() => undefined} />}</ScrollView>
    </View>
    {remaining !== undefined ? <Text style={{
      textAlign: 'center',
      color: colors.muted,
      fontSize: 11,
      padding: 8
    }}>Up to {remaining} requests left in your daily allowance · token limits also apply</Text> : null}
    <ScrollView ref={scrollRef} style={styles.chat} contentContainerStyle={styles.chatContent} keyboardShouldPersistTaps="handled">
      <View style={styles.intro}><View style={styles.orb}><Icon name="ai" color="#fff" size={24} /></View><View style={{
          flex: 1
        }}><Text style={styles.introTitle}>Plan with a thoughtful copilot</Text><Text style={styles.introText}>{intro}</Text></View></View>
      {loading ? <LoadingSkeleton rows={4} /> : <>{messages.length === 0 ? <AIQuestionCard title="Try one of these" examples={examples} onChoose={send} /> : null}{messages.map(message => <View key={message.id}><AIMessageBubble role={message.role} text={message.text} />{message.proposalId ? <SafarButton label="Review proposal" icon="→" tone="ai" style={styles.review} onPress={() => router.push({
            pathname: '/ai-result',
            params: {
              proposalId: message.proposalId
            }
          })} /> : null}</View>)}{sending ? <View style={styles.thinking}><Text style={styles.thinkingText}>✦ Safar is shaping a careful proposal…</Text></View> : null}{error ? <ErrorState message={error} /> : null}</>}
    </ScrollView>
    <View style={[styles.composer, {
      paddingBottom: Math.max(insets.bottom, 10)
    }]}><TextInput accessibilityLabel="Message Safar AI" value={input} onChangeText={setInput} multiline maxLength={1500} placeholder={tripId ? 'Ask about this trip…' : 'Describe your trip…'} placeholderTextColor={colors.placeholder} style={styles.input} /><Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={!input.trim() || sending || loading} onPress={() => send()} style={[styles.send, (!input.trim() || sending || loading) && styles.sendDisabled]}><Icon name="send" color="#fff" /></Pressable></View>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
  },
  headerArea: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: colors.border
  },
  capabilities: {
    gap: 8
  },
  chat: {
    flex: 1
  },
  chatContent: {
    padding: 17,
    paddingBottom: 24
  },
  intro: {
    flexDirection: 'row',
    gap: 13,
    backgroundColor: colors.aiSoft,
    borderRadius: radius.lg,
    padding: 17,
    marginBottom: 18
  },
  orb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.ai,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow
  },
  orbText: {
    color: '#fff',
    fontSize: 20
  },
  introTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 17
  },
  introText: {
    color: colors.muted,
    lineHeight: 20,
    marginTop: 5
  },
  review: {
    alignSelf: 'flex-start',
    minHeight: 44,
    marginTop: -4,
    marginBottom: 14
  },
  thinking: {
    alignSelf: 'flex-start',
    backgroundColor: colors.aiSoft,
    padding: 13,
    borderRadius: radius.md,
    marginBottom: 10
  },
  thinkingText: {
    color: colors.ai,
    fontWeight: '800',
    fontSize: 12
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 9,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 13,
    paddingTop: 10
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 48,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: colors.text
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.ai,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendDisabled: {
    opacity: 0.4
  },
  sendText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900'
  }
});