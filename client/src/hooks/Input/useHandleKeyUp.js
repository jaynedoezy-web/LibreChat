import { useCallback, useMemo } from 'react';
import { useSetRecoilState, useRecoilValue } from 'recoil';
import { PermissionTypes, Permissions } from 'librechat-data-provider';
import useHasAccess from '~/hooks/Roles/useHasAccess';
import store from '~/store';
/** Event Keys that shouldn't trigger a command */
const invalidKeys = {
    Escape: true,
    Backspace: true,
    Enter: true,
};
/**
 * Utility function to determine if a command should trigger.
 */
const shouldTriggerCommand = (textAreaRef, commandChar) => {
    const text = textAreaRef.current?.value;
    if (typeof text !== 'string' || text.length === 0 || text[0] !== commandChar) {
        return false;
    }
    const startPos = textAreaRef.current?.selectionStart;
    if (typeof startPos !== 'number') {
        return false;
    }
    return startPos === 1;
};
/**
 * Custom hook for handling key up events with command triggers.
 */
const useHandleKeyUp = ({ index, textAreaRef, setShowPlusPopover, setShowMentionPopover, }) => {
    const hasPromptsAccess = useHasAccess({
        permissionType: PermissionTypes.PROMPTS,
        permission: Permissions.USE,
    });
    const hasMultiConvoAccess = useHasAccess({
        permissionType: PermissionTypes.MULTI_CONVO,
        permission: Permissions.USE,
    });
    const latestMessage = useRecoilValue(store.latestMessageFamily(index));
    const setShowPromptsPopover = useSetRecoilState(store.showPromptsPopoverFamily(index));
    // Get the current state of command toggles
    const atCommandEnabled = useRecoilValue(store.atCommand);
    const plusCommandEnabled = useRecoilValue(store.plusCommand);
    const slashCommandEnabled = useRecoilValue(store.slashCommand);
    const handleAtCommand = useCallback(() => {
        if (atCommandEnabled && shouldTriggerCommand(textAreaRef, '@')) {
            setShowMentionPopover(true);
        }
    }, [textAreaRef, setShowMentionPopover, atCommandEnabled]);
    const handlePlusCommand = useCallback(() => {
        if (!hasMultiConvoAccess || !plusCommandEnabled) {
            return;
        }
        if (shouldTriggerCommand(textAreaRef, '+')) {
            setShowPlusPopover(true);
        }
    }, [textAreaRef, setShowPlusPopover, plusCommandEnabled, hasMultiConvoAccess]);
    const handlePromptsCommand = useCallback(() => {
        if (!hasPromptsAccess || !slashCommandEnabled) {
            return;
        }
        if (shouldTriggerCommand(textAreaRef, '/')) {
            setShowPromptsPopover(true);
        }
    }, [textAreaRef, hasPromptsAccess, setShowPromptsPopover, slashCommandEnabled]);
    const commandHandlers = useMemo(() => ({
        '@': handleAtCommand,
        '+': handlePlusCommand,
        '/': handlePromptsCommand,
    }), [handleAtCommand, handlePlusCommand, handlePromptsCommand]);
    const handleUpArrow = useCallback((event) => {
        if (!latestMessage) {
            return;
        }
        const element = document.getElementById(`edit-${latestMessage.parentMessageId}`);
        if (!element) {
            return;
        }
        event.preventDefault();
        element.click();
    }, [latestMessage]);
    /**
     * Main key up handler.
     */
    const handleKeyUp = useCallback((event) => {
        const text = textAreaRef.current?.value;
        if (event.key === 'ArrowUp' && text?.length === 0) {
            handleUpArrow(event);
            return;
        }
        if (typeof text !== 'string' || text.length === 0) {
            return;
        }
        if (invalidKeys[event.key]) {
            return;
        }
        const firstChar = text[0];
        const handler = commandHandlers[firstChar];
        if (typeof handler === 'function') {
            handler();
        }
    }, [textAreaRef, commandHandlers, handleUpArrow]);
    return handleKeyUp;
};
export default useHandleKeyUp;
