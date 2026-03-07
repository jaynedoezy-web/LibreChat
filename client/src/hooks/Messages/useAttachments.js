import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { useSearchResultsByTurn } from './useSearchResultsByTurn';
import store from '~/store';
export default function useAttachments({ messageId, attachments, }) {
    const messageAttachmentsMap = useRecoilValue(store.messageAttachmentsMap);
    const messageAttachments = useMemo(() => attachments ?? messageAttachmentsMap[messageId ?? ''] ?? [], [attachments, messageAttachmentsMap, messageId]);
    const searchResults = useSearchResultsByTurn(messageAttachments);
    return {
        attachments: messageAttachments,
        searchResults,
    };
}
