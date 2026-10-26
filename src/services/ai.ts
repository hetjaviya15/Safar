import { supabase } from '@/lib/supabase';
import type { AICapability, AIConversation, AIMessage, AIProposal } from '@/types/models';

export type AIReply = { remainingRequests?: number; conversationId: string; proposalId: string | null; text: string; status: 'needs_input' | 'proposal' | 'answer'; missingFields: string[]; state: Record<string, unknown> };

export async function sendAIMessage(input: { conversationId?: string; tripId?: string; capability: AICapability; request: string }) {
  const { data, error } = await supabase.functions.invoke('safar-ai', { body: input });
  if (error) {
    const context = (error as { context?: Response }).context;
    if (context) {
      try { const body = await context.clone().json() as { error?: string }; if (body.error) throw new Error(body.error); } catch (contextError) { if (contextError instanceof Error && contextError.message !== 'Unexpected end of JSON input') throw contextError; }
    }
    throw error;
  }
  if (!data || typeof data.text !== 'string' || typeof data.conversationId !== 'string') throw new Error(data?.error ?? 'Safar AI returned an invalid response.');
  return data as AIReply;
}

export async function listAIConversations(tripId?: string) {
  let query = supabase.from('ai_conversations').select('*').order('updated_at', { ascending: false }).limit(12);
  query = tripId ? query.eq('trip_id', tripId) : query.is('trip_id', null);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AIConversation[];
}

export async function getAIConversation(conversationId: string) {
  const [{ data: conversation, error: conversationError }, { data: messages, error: messageError }] = await Promise.all([
    supabase.from('ai_conversations').select('*').eq('id', conversationId).single(),
    supabase.from('ai_messages').select('*').eq('conversation_id', conversationId).order('created_at'),
  ]);
  if (conversationError) throw conversationError;
  if (messageError) throw messageError;
  return { conversation: conversation as AIConversation, messages: (messages ?? []) as AIMessage[] };
}

export async function getAIProposal(proposalId: string) {
  const { data, error } = await supabase.from('ai_proposals').select('*').eq('id', proposalId).single();
  if (error) throw error;
  return data as AIProposal;
}

export async function applyAIProposal(proposal: AIProposal) {
  const rpc = proposal.capability === 'create_trip_draft' ? 'apply_ai_trip_proposal' : 'apply_ai_workspace_proposal';
  const { data, error } = await supabase.rpc(rpc, { p_proposal_id: proposal.id });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('The backend did not confirm the saved trip.');
  return data;
}

export async function rejectAIProposal(proposalId: string) {
  const { error } = await supabase.rpc('reject_ai_proposal', { p_proposal_id: proposalId });
  if (error) throw error;
}

/** Only metadata of an owned, still-pending creation preview is editable.
 * Does not write any saved trip or activity; the approval RPC does that later. */
export async function editAIProposalDetails(proposal: AIProposal, details: Pick<AIProposal['proposal']['trip'], 'title' | 'travelers' | 'budget' | 'noBudgetLimit' | 'currency'>) {
  if (proposal.status !== 'pending' || proposal.capability !== 'create_trip_draft') throw new Error('This preview can no longer be edited.');
  const currencyChanged = details.currency !== proposal.proposal.trip.currency;
  const updatedProposal = {
    ...proposal.proposal,
    trip: { ...proposal.proposal.trip, ...details },
    ...(currencyChanged ? {
      activities: proposal.proposal.activities.map(activity => ({ ...activity, estimatedCost: null })),
      assumptions: [...proposal.proposal.assumptions, 'Currency changed by the traveler. Previous activity cost estimates were cleared; no exchange rate was applied.'],
    } : {}),
  };
  const { data, error } = await supabase.from('ai_proposals')
    .update({ proposal: updatedProposal })
    .eq('id', proposal.id).eq('status', 'pending').select('*').single();
  if (error) throw error;
  return data as AIProposal;
}
