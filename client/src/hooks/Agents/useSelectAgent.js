import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Constants, QueryKeys, EModelEndpoint, isAssistantsEndpoint, } from 'librechat-data-provider';
import useDefaultConvo from '~/hooks/Conversations/useDefaultConvo';
import { useAgentsMapContext } from '~/Providers/AgentsMapContext';
import { useChatContext } from '~/Providers/ChatContext';
import { useGetAgentByIdQuery } from '~/data-provider';
import { logger } from '~/utils';
export default function useSelectAgent() {
    const queryClient = useQueryClient();
    const getDefaultConversation = useDefaultConvo();
    const { conversation, newConversation } = useChatContext();
    const agentsMap = useAgentsMapContext();
    const [selectedAgentId, setSelectedAgentId] = useState(conversation?.agent_id ?? null);
    const agentQuery = useGetAgentByIdQuery(selectedAgentId);
    const updateConversation = useCallback((agent, template) => {
        logger.log('conversation', 'Updating conversation with agent', agent);
        if (isAssistantsEndpoint(conversation?.endpoint)) {
            newConversation({
                template: { ...template },
                preset: template,
            });
            return;
        }
        const currentConvo = getDefaultConversation({
            conversation: { ...(conversation ?? {}), agent_id: agent.id },
            preset: template,
        });
        newConversation({
            template: currentConvo,
            preset: template,
            keepLatestMessage: true,
        });
    }, [conversation, getDefaultConversation, newConversation]);
    const onSelect = useCallback(async (value) => {
        const agent = agentsMap?.[value];
        if (!agent) {
            return;
        }
        setSelectedAgentId(agent.id);
        const template = {
            endpoint: EModelEndpoint.agents,
            agent_id: agent.id,
            conversationId: Constants.NEW_CONVO,
        };
        updateConversation({ id: agent.id }, template);
        // Fetch full agent data in the background
        try {
            await queryClient.invalidateQueries({
                queryKey: [QueryKeys.agent, agent.id],
                exact: true,
                refetchType: 'active',
            }, { throwOnError: true });
            const { data: fullAgent } = await agentQuery.refetch();
            if (fullAgent) {
                updateConversation(fullAgent, { ...template, agent_id: fullAgent.id });
            }
        }
        catch (error) {
            if (error?.silent) {
                console.warn('Current fetch was cancelled');
                return;
            }
            console.error('Error fetching full agent data:', error);
            updateConversation({}, { ...template, agent_id: undefined });
        }
    }, [agentsMap, updateConversation, queryClient, agentQuery]);
    return { onSelect };
}
