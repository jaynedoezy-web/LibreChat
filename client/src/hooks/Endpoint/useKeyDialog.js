import { useState, useCallback } from 'react';
export const useKeyDialog = () => {
    const [keyDialogOpen, setKeyDialogOpen] = useState(false);
    const [keyDialogEndpoint, setKeyDialogEndpoint] = useState(null);
    const handleOpenKeyDialog = useCallback((ep, e) => {
        e.preventDefault();
        e.stopPropagation();
        setKeyDialogEndpoint(ep);
        setKeyDialogOpen(true);
    }, []);
    const onOpenChange = (open) => {
        if (!open && keyDialogEndpoint) {
            const button = document.getElementById(`endpoint-${keyDialogEndpoint}-settings`);
            if (button) {
                setTimeout(() => {
                    button.focus();
                }, 5);
            }
        }
        setKeyDialogOpen(open);
    };
    return {
        keyDialogOpen,
        keyDialogEndpoint,
        onOpenChange,
        handleOpenKeyDialog,
    };
};
export default useKeyDialog;
