import { atom } from 'recoil';
export const search = atom({
    key: 'search',
    default: {
        enabled: null,
        query: '',
        debouncedQuery: '',
        isSearching: false,
        isTyping: false,
    },
});
export default {
    search,
};
