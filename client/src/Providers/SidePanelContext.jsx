import React, { createContext, useContext, useMemo } from 'react';
import { useChatContext } from './ChatContext';
const SidePanelContext = createContext(undefined);
export function SidePanelProvider({ children }) {
    const { conversation } = useChatContext();
    /** Context value only created when endpoint changes */
    const contextValue = useMemo(() => ({
        endpoint: conversation?.endpoint,
    }), [conversation?.endpoint]);
    return <SidePanelContext.Provider value={contextValue}>{children}</SidePanelContext.Provider>;
}
export function useSidePanelContext() {
    const context = useContext(SidePanelContext);
    if (!context) {
        throw new Error('useSidePanelContext must be used within SidePanelProvider');
    }
    return context;
}
