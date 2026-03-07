import React, { createContext, useContext, useMemo } from 'react';
import { useChatContext } from './ChatContext';
import { getLatestText } from '~/utils';
const ArtifactsContext = createContext(undefined);
export function ArtifactsProvider({ children, value }) {
    const { isSubmitting, latestMessage, conversation } = useChatContext();
    const chatLatestMessageText = useMemo(() => {
        return getLatestText({
            messageId: latestMessage?.messageId ?? null,
            text: latestMessage?.text ?? null,
            content: latestMessage?.content ?? null,
        });
    }, [latestMessage?.messageId, latestMessage?.text, latestMessage?.content]);
    const defaultContextValue = useMemo(() => ({
        isSubmitting,
        latestMessageText: chatLatestMessageText,
        latestMessageId: latestMessage?.messageId ?? null,
        conversationId: conversation?.conversationId ?? null,
    }), [isSubmitting, chatLatestMessageText, latestMessage?.messageId, conversation?.conversationId]);
    /** Context value only created when relevant values change */
    const contextValue = useMemo(() => (value ? { ...defaultContextValue, ...value } : defaultContextValue), [defaultContextValue, value]);
    return <ArtifactsContext.Provider value={contextValue}>{children}</ArtifactsContext.Provider>;
}
export function useArtifactsContext() {
    const context = useContext(ArtifactsContext);
    if (!context) {
        throw new Error('useArtifactsContext must be used within ArtifactsProvider');
    }
    return context;
}
