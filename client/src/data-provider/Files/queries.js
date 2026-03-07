import { useRecoilValue } from 'recoil';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryKeys, DynamicQueryKeys, dataService } from 'librechat-data-provider';
import { isEphemeralAgent } from '~/common';
import { addFileToCache } from '~/utils';
import store from '~/store';
export const useGetFiles = (config) => {
    const queriesEnabled = useRecoilValue(store.queriesEnabled);
    return useQuery([QueryKeys.files], () => dataService.getFiles(), {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        ...config,
        enabled: (config?.enabled ?? true) === true && queriesEnabled,
    });
};
export const useGetAgentFiles = (agentId, config) => {
    const queriesEnabled = useRecoilValue(store.queriesEnabled);
    return useQuery(DynamicQueryKeys.agentFiles(agentId ?? ''), () => (agentId ? dataService.getAgentFiles(agentId) : Promise.resolve([])), {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        ...config,
        enabled: (config?.enabled ?? true) === true && queriesEnabled && !isEphemeralAgent(agentId),
    });
};
export const useGetFileConfig = (config) => {
    return useQuery([QueryKeys.fileConfig], () => dataService.getFileConfig(), {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        ...config,
    });
};
export const useFileDownload = (userId, file_id) => {
    const queryClient = useQueryClient();
    return useQuery([QueryKeys.fileDownload, file_id], async () => {
        if (!userId || !file_id) {
            console.warn('No user ID provided for file download');
            return;
        }
        const response = await dataService.getFileDownload(userId, file_id);
        const blob = response.data;
        const downloadURL = window.URL.createObjectURL(blob);
        try {
            const metadata = JSON.parse(response.headers['x-file-metadata']);
            if (!metadata) {
                console.warn('No metadata found for file download', response.headers);
                return downloadURL;
            }
            addFileToCache(queryClient, metadata);
        }
        catch (e) {
            console.error('Error parsing file metadata, skipped updating file query cache', e);
        }
        return downloadURL;
    }, {
        enabled: false,
        retry: false,
    });
};
export const useCodeOutputDownload = (url = '') => {
    return useQuery([QueryKeys.fileDownload, url], async () => {
        if (!url) {
            console.warn('No user ID provided for file download');
            return;
        }
        const response = await dataService.getCodeOutputDownload(url);
        const blob = response.data;
        const downloadURL = window.URL.createObjectURL(blob);
        return downloadURL;
    }, {
        enabled: false,
        retry: false,
    });
};
