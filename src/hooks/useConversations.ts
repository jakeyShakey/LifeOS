import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  createConversation,
  deleteConversation,
  getConversations,
  getConversationMessages,
  autoTitleConversation,
} from '@/lib/conversations';
import { runAgentTurn } from '@/lib/agent';
import type { AiConversation, AiMessage, AgentContext } from '@/types';

export function useConversations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: () => getConversations(user!.id),
    enabled: !!user,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: () => createConversation(user!.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
  });

  return {
    conversations: conversations as AiConversation[],
    isLoading,
    createConversation: () => createMutation.mutateAsync(),
    deleteConversation: (id: string) => deleteMutation.mutateAsync(id),
  };
}

export function useConversation(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: () => getConversationMessages(conversationId!),
    enabled: !!conversationId,
    staleTime: 0,
  });

  async function sendMessage(text: string, context?: AgentContext) {
    if (!user || !conversationId) return;

    // Auto-title after first message
    const isFirstMessage = (messages as AiMessage[]).length === 0;

    await runAgentTurn(user.id, conversationId, text, context);

    if (isFirstMessage) {
      autoTitleConversation(conversationId, text);
    }

    void queryClient.invalidateQueries({ queryKey: ['conversation-messages', conversationId] });
    void queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
  }

  return {
    messages: messages as AiMessage[],
    isLoading,
    sendMessage,
  };
}
