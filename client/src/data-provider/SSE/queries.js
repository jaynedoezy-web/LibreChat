import { useEffect, useMemo, useState } from 'react';
import { apiBaseUrl, QueryKeys, request, dataService } from 'librechat-data-provider';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { updateConvoInAllQueries } from '~/utils';
export const streamStatusQueryKey = (conversationId) => ['streamStatus', conversationId];
export const fetchStreamStatus = async (conversationId) => {
    return request.get(`${apiBaseUrl()}/api/agents/chat/status/${conversationId}`);
};
export function useStreamStatus(conversationId, enabled = true) {
    return useQuery({
        queryKey: streamStatusQueryKey(conversationId || ''),
        queryFn: () => fetchStreamStatus(conversationId),
        enabled: !!conversationId && enabled,
        staleTime: 1000,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        retry: false,
    });
}
export const genTitleQueryKey = (conversationId) => ['genTitle', conversationId];
/** Module-level queue for title generation (survives re-renders).
 * Stores conversationIds that need title generation once their job completes */
const titleQueue = new Set();
const processedTitles = new Set();
/** Listeners to notify when queue changes (for non-resumable streams like assistants) */
const queueListeners = new Set();
/** Queue a conversation for title generation (call when starting new conversation) */
export function queueTitleGeneration(conversationId) {
    if (!processedTitles.has(conversationId)) {
        titleQueue.add(conversationId);
        queueListeners.forEach((listener) => listener());
    }
}
/**
 * Hook to process the title generation queue.
 * Only fetches titles AFTER the job completes (not in activeJobIds).
 * Place this high in the component tree (e.g., Nav.tsx).
 */
export function useTitleGeneration(enabled = true) {
    const queryClient = useQueryClient();
    const [queueVersion, setQueueVersion] = useState(0);
    const [readyToFetch, setReadyToFetch] = useState([]);
    const { data: activeJobsData } = useActiveJobs(enabled);
    const activeJobIds = useMemo(() => activeJobsData?.activeJobIds ?? [], [activeJobsData?.activeJobIds]);
    useEffect(() => {
        const listener = () => setQueueVersion((v) => v + 1);
        queueListeners.add(listener);
        return () => {
            queueListeners.delete(listener);
        };
    }, []);
    useEffect(() => {
        const activeSet = new Set(activeJobIds);
        const completedJobs = [];
        for (const conversationId of titleQueue) {
            if (!activeSet.has(conversationId) && !processedTitles.has(conversationId)) {
                completedJobs.push(conversationId);
            }
        }
        if (completedJobs.length > 0) {
            setReadyToFetch((prev) => [...new Set([...prev, ...completedJobs])]);
        }
    }, [activeJobIds, queueVersion]);
    // Fetch titles for ready conversations
    const titleQueries = useQueries({
        queries: readyToFetch.map((conversationId) => ({
            queryKey: genTitleQueryKey(conversationId),
            queryFn: () => dataService.genTitle({ conversationId }),
            staleTime: Infinity,
            retry: false,
        })),
    });
    useEffect(() => {
        titleQueries.forEach((titleQuery, index) => {
            const conversationId = readyToFetch[index];
            if (!conversationId || processedTitles.has(conversationId))
                return;
            if (titleQuery.isSuccess && titleQuery.data) {
                const { title } = titleQuery.data;
                queryClient.setQueryData([QueryKeys.conversation, conversationId], (convo) => (convo ? { ...convo, title } : convo));
                updateConvoInAllQueries(queryClient, conversationId, (c) => ({ ...c, title }));
                // Only update document title if this conversation is currently active
                if (window.location.pathname.includes(conversationId)) {
                    document.title = title;
                }
                processedTitles.add(conversationId);
                titleQueue.delete(conversationId);
                setReadyToFetch((prev) => prev.filter((id) => id !== conversationId));
            }
            else if (titleQuery.isError) {
                // Mark as processed even on error to avoid infinite retries
                processedTitles.add(conversationId);
                titleQueue.delete(conversationId);
                setReadyToFetch((prev) => prev.filter((id) => id !== conversationId));
            }
        });
    }, [titleQueries, readyToFetch, queryClient]);
}
/**
 * React Query hook for active job IDs.
 * - Polls while jobs are active
 * - Shows generation indicators in conversation list
 */
export function useActiveJobs(enabled = true) {
    return useQuery({
        queryKey: [QueryKeys.activeJobs],
        queryFn: () => dataService.getActiveJobs(),
        enabled,
        staleTime: 5_000,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchInterval: (data) => ((data?.activeJobIds?.length ?? 0) > 0 ? 5_000 : false),
        retry: false,
    });
}
