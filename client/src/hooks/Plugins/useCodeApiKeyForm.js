// client/src/hooks/Plugins/useCodeApiKeyForm.ts
import { useRef, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import useAuthCodeTool from '~/hooks/Plugins/useAuthCodeTool';
export default function useCodeApiKeyForm({ onSubmit, onRevoke, }) {
    const methods = useForm();
    const menuTriggerRef = useRef(null);
    const badgeTriggerRef = useRef(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { installTool, removeTool } = useAuthCodeTool({ isEntityTool: true });
    const { reset } = methods;
    const onSubmitHandler = useCallback((data) => {
        reset();
        installTool(data.apiKey);
        setIsDialogOpen(false);
        onSubmit?.();
    }, [onSubmit, reset, installTool]);
    const handleRevokeApiKey = useCallback(() => {
        reset();
        removeTool();
        setIsDialogOpen(false);
        onRevoke?.();
    }, [reset, onRevoke, removeTool]);
    return {
        methods,
        isDialogOpen,
        setIsDialogOpen,
        handleRevokeApiKey,
        onSubmit: onSubmitHandler,
        badgeTriggerRef,
        menuTriggerRef,
    };
}
