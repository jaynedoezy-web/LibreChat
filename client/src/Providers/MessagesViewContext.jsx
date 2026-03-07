import React, { createContext, useContext, useMemo } from 'react';
import { useChatContext } from './ChatContext';
const MessagesViewContext = createContext(undefined);
// Export the context so it can be provided by other providers (e.g., ShareMessagesProvider)
export { MessagesViewContext };
export function MessagesViewProvider({ children }) {
    const chatContext = useChatContext();
    const { ask, index, regenerate, isSubmitting, conversation, latestMessage, setAbortScroll, handleContinue, setLatestMessage, abortScroll, getMessages, setMessages, } = chatContext;
    /** Memoize conversation-related values */
    const conversationValues = useMemo(() => ({
        conversation,
        conversationId: conversation?.conversationId,
    }), [conversation]);
    /** Memoize submission states */
    const submissionStates = useMemo(() => ({
        abortScroll,
        isSubmitting,
        setAbortScroll,
    }), [isSubmitting, abortScroll, setAbortScroll]);
    /** Memoize message operations (these are typically stable references) */
    const messageOperations = useMemo(() => ({
        ask,
        regenerate,
        getMessages,
        setMessages,
        handleContinue,
    }), [ask, regenerate, handleContinue, getMessages, setMessages]);
    /** Memoize message state values */
    const messageState = useMemo(() => ({
        index,
        latestMessage,
        setLatestMessage,
    }), [index, latestMessage, setLatestMessage]);
    /** Combine all values into final context value */
    const contextValue = useMemo(() => ({
        ...conversationValues,
        ...submissionStates,
        ...messageOperations,
        ...messageState,
    }), [conversationValues, submissionStates, messageOperations, messageState]);
    return (<MessagesViewContext.Provider value={contextValue}>{children}</MessagesViewContext.Provider>);
}
export function useMessagesViewContext() {
    const context = useContext(MessagesViewContext);
    if (!context) {
        throw new Error('useMessagesViewContext must be used within MessagesViewProvider');
    }
    return context;
}
/** Hook for components that only need conversation data */
export function useMessagesConversation() {
    const { conversation, conversationId } = useMessagesViewContext();
    return useMemo(() => ({ conversation, conversationId }), [conversation, conversationId]);
}
/** Hook for components that only need submission states */
export function useMessagesSubmission() {
    const { isSubmitting, abortScroll, setAbortScroll } = useMessagesViewContext();
    return useMemo(() => ({ isSubmitting, abortScroll, setAbortScroll }), [isSubmitting, abortScroll, setAbortScroll]);
}
/** Hook for components that only need message operations */
export function useMessagesOperations() {
    const { ask, regenerate, handleContinue, getMessages, setMessages } = useMessagesViewContext();
    return useMemo(() => ({ ask, regenerate, handleContinue, getMessages, setMessages }), [ask, regenerate, handleContinue, getMessages, setMessages]);
}
/** Hook for components that only need message state */
export function useMessagesState() {
    const { index, latestMessage, setLatestMessage } = useMessagesViewContext();
    return useMemo(() => ({ index, latestMessage, setLatestMessage }), [index, latestMessage, setLatestMessage]);
}
