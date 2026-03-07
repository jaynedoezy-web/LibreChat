import { dataService } from 'librechat-data-provider';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
export const useGetFavoritesQuery = (config) => {
    return useQuery(['favorites'], () => dataService.getFavorites(), {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        ...config,
    });
};
export const useUpdateFavoritesMutation = () => {
    const queryClient = useQueryClient();
    return useMutation((favorites) => dataService.updateFavorites(favorites), {
        // Optimistic update to prevent UI flickering when toggling favorites
        // Sets query cache immediately before the request completes
        onMutate: async (newFavorites) => {
            await queryClient.cancelQueries(['favorites']);
            const previousFavorites = queryClient.getQueryData(['favorites']);
            queryClient.setQueryData(['favorites'], newFavorites);
            return { previousFavorites };
        },
        onError: (_err, _newFavorites, context) => {
            if (context?.previousFavorites) {
                queryClient.setQueryData(['favorites'], context.previousFavorites);
            }
        },
    });
};
