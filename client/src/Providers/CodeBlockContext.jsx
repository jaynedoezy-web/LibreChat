import { createContext, useContext, useCallback, useRef } from 'react';
export const CodeBlockContext = createContext({});
export const useCodeBlockContext = () => useContext(CodeBlockContext);
export function CodeBlockProvider({ children }) {
    const counterRef = useRef(0);
    const getNextIndex = useCallback((skip) => {
        if (skip) {
            return counterRef.current;
        }
        const nextIndex = counterRef.current;
        counterRef.current += 1;
        return nextIndex;
    }, []);
    const resetCounter = useCallback(() => {
        counterRef.current = 0;
    }, []);
    return (<CodeBlockContext.Provider value={{ getNextIndex, resetCounter }}>
      {children}
    </CodeBlockContext.Provider>);
}
