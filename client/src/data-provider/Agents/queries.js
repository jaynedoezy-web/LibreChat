import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, dataService, EModelEndpoint, PermissionBits } from 'librechat-data-provider';
import { isEphemeralAgent } from '~/common';
/**
 * AGENTS
 */
export const defaultAgentParams = {
    limit: 10,
    requiredPermission: PermissionBits.EDIT,
};
/**
 * Hook for getting all available tools for A
 */
export const useAvailableAgentToolsQuery = () => {
    const queryClient = useQueryClient();
    const endpointsConfig = queryClient.getQueryData([QueryKeys.endpoints]);
    const enabled = !!endpointsConfig?.[EModelEndpoint.agents];
    return useQuery([QueryKeys.tools], () => dataService.getAvailableAgentTools(), {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        enabled,
    });
};
/**
 * Hook for listing all Agents, with optional parameters provided for pagination and sorting
 */
export const useListAgentsQuery = (params = defaultAgentParams, config) => {
    const queryClient = useQueryClient();
    const endpointsConfig = queryClient.getQueryData([QueryKeys.endpoints]);
    const enabled = !!endpointsConfig?.[EModelEndpoint.agents];
    return useQuery([QueryKeys.agents, params], () => dataService.listAgents(params), {
        // Example selector to sort them by created_at
        // select: (res) => {
        //   return res.data.sort((a, b) => a.created_at - b.created_at);
        // },
        staleTime: 1000 * 5,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: false,
        ...config,
        enabled: config?.enabled !== undefined ? config.enabled && enabled : enabled,
    });
};
/**
 * Hook for retrieving basic details about a single agent (VIEW permission)
 */
export const useGetAgentByIdQuery = (agent_id, config) => {
    const isValidAgentId = !!agent_id && !isEphemeralAgent(agent_id);
    return useQuery([QueryKeys.agent, agent_id], () => dataService.getAgentById({
        agent_id: agent_id,
    }), {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: false,
        enabled: isValidAgentId && (config?.enabled ?? true),
        ...config,
    });
};
/**
 * Hook for retrieving full agent details including sensitive configuration (EDIT permission)
 */
export const useGetExpandedAgentByIdQuery = (agent_id, config) => {
    return useQuery([QueryKeys.agent, agent_id, 'expanded'], () => dataService.getExpandedAgentById({
        agent_id,
    }), {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: false,
        ...config,
    });
};
/**
 * MARKETPLACE
 */
/**
 * Hook for getting agent categories for marketplace tabs
 */
export const useGetAgentCategoriesQuery = (config) => {
    return useQuery([QueryKeys.agentCategories], () => dataService.getAgentCategories(), {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
        ...config,
    });
};
/**
 * Hook for infinite loading of marketplace agents with cursor-based pagination
 */
export const useMarketplaceAgentsInfiniteQuery = (params, config) => {
    return useInfiniteQuery({
        queryKey: [QueryKeys.marketplaceAgents, params],
        queryFn: ({ pageParam }) => {
            const queryParams = { ...params };
            if (pageParam) {
                queryParams.cursor = pageParam.toString();
            }
            return dataService.getMarketplaceAgents(queryParams);
        },
        getNextPageParam: (lastPage) => lastPage?.after ?? undefined,
        enabled: !!params.requiredPermission,
        keepPreviousData: true,
        staleTime: 2 * 60 * 1000, // 2 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        ...config,
    });
};
