import { useRecoilValue } from 'recoil';
import { QueryKeys, dataService } from 'librechat-data-provider';
import { useQuery } from '@tanstack/react-query';
import store from '~/store';
export const useGetEndpointsQuery = (config) => {
    const queriesEnabled = useRecoilValue(store.queriesEnabled);
    return useQuery([QueryKeys.endpoints], () => dataService.getAIEndpoints(), {
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        ...config,
        enabled: (config?.enabled ?? true) === true && queriesEnabled,
    });
};
export const useGetStartupConfig = (config) => {
    const queriesEnabled = useRecoilValue(store.queriesEnabled);
    return useQuery([QueryKeys.startupConfig], () => dataService.getStartupConfig(), {
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        ...config,
        enabled: (config?.enabled ?? true) === true && queriesEnabled,
    });
};
