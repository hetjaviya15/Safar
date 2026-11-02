import { supabase } from '@/lib/supabase';
export async function sendAIMessage(input) {
  const {
    data,
    error
  } = await supabase.functions.invoke('safar-ai', {
    body: input
  });
  if (error) {
    const context = error.context;
    if (context) {
      try {
        const body = await context.clone().json();
        if (body.error) throw new Error(body.error);
      } catch (contextError) {
        if (contextError instanceof Error && contextError.message !== 'Unexpected end of JSON input') throw contextError;
      }
    }
    throw error;
  }
  if (!data || typeof data.text !== 'string' || typeof data.conversationId !== 'string') throw new Error(data?.error ?? 'Safar AI returned an invalid response.');
  return data;
}
export async function listAIConversations(tripId) {
  let query = supabase.from('ai_conversations').select('*').order('updated_at', {
    ascending: false
  }).limit(12);
  query = tripId ? query.eq('trip_id', tripId) : query.is('trip_id', null);
  const {
    data,
    error
  } = await query;
  if (error) throw error;
  return data ?? [];
}
export async function getAIConversation(conversationId) {
  const [{
    data: conversation,
    error: conversationError
  }, {
    data: messages,
    error: messageError
  }] = await Promise.all([supabase.from('ai_conversations').select('*').eq('id', conversationId).single(), supabase.from('ai_messages').select('*').eq('conversation_id', conversationId).order('created_at')]);
  if (conversationError) throw conversationError;
  if (messageError) throw messageError;
  return {
    conversation: conversation,
    messages: messages ?? []
  };
}
export async function getAIProposal(proposalId) {
  const {
    data,
    error
  } = await supabase.from('ai_proposals').select('*').eq('id', proposalId).single();
  if (error) throw error;
  return data;
}
export async function applyAIProposal(proposal) {
  const rpc = proposal.capability === 'create_trip_draft' ? 'apply_ai_trip_proposal' : 'apply_ai_workspace_proposal';
  const {
    data,
    error
  } = await supabase.rpc(rpc, {
    p_proposal_id: proposal.id
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('The backend did not confirm the saved trip.');
  return data;
}
export async function rejectAIProposal(proposalId) {
  const {
    error
  } = await supabase.rpc('reject_ai_proposal', {
    p_proposal_id: proposalId
  });
  if (error) throw error;
}

/** Only metadata of an owned, still-pending creation preview is editable.
 * Does not write any saved trip or activity; the approval RPC does that later. */
export async function editAIProposalDetails(proposal, details) {
  if (proposal.status !== 'pending' || proposal.capability !== 'create_trip_draft') throw new Error('This preview can no longer be edited.');
  const currencyChanged = details.currency !== proposal.proposal.trip.currency;
  const updatedProposal = {
    ...proposal.proposal,
    trip: {
      ...proposal.proposal.trip,
      ...details
    },
    ...(currencyChanged ? {
      activities: proposal.proposal.activities.map(activity => ({
        ...activity,
        estimatedCost: null
      })),
      assumptions: [...proposal.proposal.assumptions, 'Currency changed by the traveler. Previous activity cost estimates were cleared; no exchange rate was applied.']
    } : {})
  };
  const {
    data,
    error
  } = await supabase.from('ai_proposals').update({
    proposal: updatedProposal
  }).eq('id', proposal.id).eq('status', 'pending').select('*').single();
  if (error) throw error;
  return data;
}