import { createContext, useContext, useState } from 'react';
const ActivePanelContext = createContext(undefined);
export function ActivePanelProvider({ children, defaultActive, }) {
    const [active, _setActive] = useState(defaultActive);
    const setActive = (id) => {
        localStorage.setItem('side:active-panel', id);
        _setActive(id);
    };
    return (<ActivePanelContext.Provider value={{ active, setActive }}>
      {children}
    </ActivePanelContext.Provider>);
}
export function useActivePanel() {
    const context = useContext(ActivePanelContext);
    if (context === undefined) {
        throw new Error('useActivePanel must be used within an ActivePanelProvider');
    }
    return context;
}
