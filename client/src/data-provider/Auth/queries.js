import { useRecoilValue } from 'recoil';
import { QueryKeys, dataService } from 'librechat-data-provider';
import { useQuery } from '@tanstack/react-query';
import store from '~/store';
export const useGetUserQuery = (config) => {
    const queriesEnabled = useRecoilValue(store.queriesEnabled);
    return useQuery([QueryKeys.user], () => dataService.getUser(), {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        retry: false,
        ...config,
        enabled: (config?.enabled ?? true) === true && queriesEnabled,
    });
};
export const useGraphTokenQuery = (options = {}, config) => {
    const { scopes, enabled = false } = options;
    const queryScopes = scopes ?? '';
    return useQuery({
        queryKey: [QueryKeys.graphToken, queryScopes],
        queryFn: () => dataService.getGraphApiToken({ scopes: queryScopes }),
        enabled: enabled && queryScopes.length > 0,
        staleTime: 50 * 60 * 1000, // 50 minutes (tokens expire in 60 minutes)
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        ...config,
    });
};
