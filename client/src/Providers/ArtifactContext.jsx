import { createContext, useContext, useCallback, useRef } from 'react';
export const ArtifactContext = createContext({});
export const useArtifactContext = () => useContext(ArtifactContext);
export function ArtifactProvider({ children }) {
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
    return (<ArtifactContext.Provider value={{ getNextIndex, resetCounter }}>
      {children}
    </ArtifactContext.Provider>);
}
