import { useCallback, useRef } from 'react';
import { Constants, StepTypes, ContentTypes, ToolCallTypes, getNonEmptyValue, } from 'librechat-data-provider';
import { MESSAGE_UPDATE_INTERVAL } from '~/common';
export default function useStepHandler({ setMessages, getMessages, announcePolite, lastAnnouncementTimeRef, }) {
    const toolCallIdMap = useRef(new Map());
    const messageMap = useRef(new Map());
    const stepMap = useRef(new Map());
    /** Buffer for deltas that arrive before their corresponding run step */
    const pendingDeltaBuffer = useRef(new Map());
    /**
     * Calculate content index for a run step.
     * For edited content scenarios, offset by initialContent length.
     */
    const calculateContentIndex = useCallback((serverIndex, initialContent, incomingContentType, existingContent) => {
        /** Only apply -1 adjustment for TEXT or THINK types when they match existing content */
        if (initialContent.length > 0 &&
            (incomingContentType === ContentTypes.TEXT || incomingContentType === ContentTypes.THINK)) {
            const targetIndex = serverIndex + initialContent.length - 1;
            const existingType = existingContent?.[targetIndex]?.type;
            if (existingType === incomingContentType) {
                return targetIndex;
            }
        }
        return serverIndex + initialContent.length;
    }, []);
    /** Metadata to propagate onto content parts for parallel rendering - uses ContentMetadata from data-provider */
    const updateContent = (message, index, contentPart, finalUpdate = false, metadata) => {
        const contentType = contentPart.type ?? '';
        if (!contentType) {
            console.warn('No content type found in content part');
            return message;
        }
        const updatedContent = [...(message.content || [])];
        if (!updatedContent[index] && contentType !== ContentTypes.TOOL_CALL) {
            updatedContent[index] = { type: contentPart.type };
        }
        /** Prevent overwriting an existing content part with a different type */
        const existingType = updatedContent[index]?.type ?? '';
        if (existingType &&
            existingType !== contentType &&
            !contentType.startsWith(existingType) &&
            !existingType.startsWith(contentType)) {
            console.warn('Content type mismatch', { existingType, contentType, index });
            return message;
        }
        if (contentType.startsWith(ContentTypes.TEXT) &&
            ContentTypes.TEXT in contentPart &&
            typeof contentPart.text === 'string') {
            const currentContent = updatedContent[index];
            const update = {
                type: ContentTypes.TEXT,
                text: (currentContent.text || '') + contentPart.text,
            };
            if (contentPart.tool_call_ids != null) {
                update.tool_call_ids = contentPart.tool_call_ids;
            }
            updatedContent[index] = update;
        }
        else if (contentType.startsWith(ContentTypes.AGENT_UPDATE) &&
            ContentTypes.AGENT_UPDATE in contentPart &&
            contentPart.agent_update) {
            const update = {
                type: ContentTypes.AGENT_UPDATE,
                agent_update: contentPart.agent_update,
            };
            updatedContent[index] = update;
        }
        else if (contentType.startsWith(ContentTypes.THINK) &&
            ContentTypes.THINK in contentPart &&
            typeof contentPart.think === 'string') {
            const currentContent = updatedContent[index];
            const update = {
                type: ContentTypes.THINK,
                think: (currentContent.think || '') + contentPart.think,
            };
            updatedContent[index] = update;
        }
        else if (contentType === ContentTypes.IMAGE_URL && 'image_url' in contentPart) {
            const currentContent = updatedContent[index];
            updatedContent[index] = {
                ...currentContent,
            };
        }
        else if (contentType === ContentTypes.TOOL_CALL && 'tool_call' in contentPart) {
            const existingContent = updatedContent[index];
            const existingToolCall = existingContent?.tool_call;
            const toolCallArgs = contentPart.tool_call.args;
            /** When args are a valid object, they are likely already invoked */
            let args = finalUpdate ||
                typeof existingToolCall?.args === 'object' ||
                typeof toolCallArgs === 'object'
                ? contentPart.tool_call.args
                : (existingToolCall?.args ?? '') + (toolCallArgs ?? '');
            /** Preserve previously streamed args when final update omits them */
            if (finalUpdate && args == null && existingToolCall?.args != null) {
                args = existingToolCall.args;
            }
            const id = getNonEmptyValue([contentPart.tool_call.id, existingToolCall?.id]) ?? '';
            const name = getNonEmptyValue([contentPart.tool_call.name, existingToolCall?.name]) ?? '';
            const newToolCall = {
                id,
                name,
                args,
                type: ToolCallTypes.TOOL_CALL,
                auth: contentPart.tool_call.auth,
                expires_at: contentPart.tool_call.expires_at,
            };
            if (finalUpdate) {
                newToolCall.progress = 1;
                newToolCall.output = contentPart.tool_call.output;
            }
            updatedContent[index] = {
                type: ContentTypes.TOOL_CALL,
                tool_call: newToolCall,
            };
        }
        // Apply metadata to the content part for parallel rendering
        // This must happen AFTER all content updates to avoid being overwritten
        if (metadata?.agentId != null || metadata?.groupId != null) {
            const part = updatedContent[index];
            if (metadata.agentId != null) {
                part.agentId = metadata.agentId;
            }
            if (metadata.groupId != null) {
                part.groupId = metadata.groupId;
            }
        }
        return { ...message, content: updatedContent };
    };
    /** Extract metadata from runStep for parallel content rendering */
    const getStepMetadata = (runStep) => {
        if (!runStep?.agentId && runStep?.groupId == null) {
            return undefined;
        }
        const metadata = {
            agentId: runStep.agentId,
            // Only set groupId when explicitly provided by the server
            // Sequential handoffs have agentId but no groupId
            // Parallel execution has both agentId AND groupId
            groupId: runStep.groupId,
        };
        return metadata;
    };
    const stepHandler = useCallback(({ event, data }, submission) => {
        const messages = getMessages() || [];
        const { userMessage } = submission;
        let parentMessageId = userMessage.messageId;
        const currentTime = Date.now();
        if (currentTime - lastAnnouncementTimeRef.current > MESSAGE_UPDATE_INTERVAL) {
            announcePolite({ message: 'composing', isStatus: true });
            lastAnnouncementTimeRef.current = currentTime;
        }
        let initialContent = [];
        // For editedContent scenarios, use the initial response content for index offsetting
        if (submission?.editedContent != null) {
            initialContent = submission?.initialResponse?.content ?? initialContent;
        }
        if (event === 'on_run_step') {
            const runStep = data;
            let responseMessageId = runStep.runId ?? '';
            if (responseMessageId === Constants.USE_PRELIM_RESPONSE_MESSAGE_ID) {
                responseMessageId = submission?.initialResponse?.messageId ?? '';
                parentMessageId = submission?.initialResponse?.parentMessageId ?? '';
            }
            if (!responseMessageId) {
                console.warn('No message id found in run step event');
                return;
            }
            stepMap.current.set(runStep.id, runStep);
            // Calculate content index - use server index, offset by initialContent for edit scenarios
            const contentIndex = runStep.index + initialContent.length;
            let response = messageMap.current.get(responseMessageId);
            if (!response) {
                // Find the actual response message - check if last message is a response, otherwise use initialResponse
                const lastMessage = messages[messages.length - 1];
                const responseMessage = lastMessage && !lastMessage.isCreatedByUser
                    ? lastMessage
                    : submission?.initialResponse;
                // For edit scenarios, initialContent IS the complete starting content (not to be merged)
                // For resume scenarios (no editedContent), initialContent is empty and we use existingContent
                const existingContent = responseMessage?.content ?? [];
                const mergedContent = initialContent.length > 0 ? initialContent : existingContent;
                response = {
                    ...responseMessage,
                    parentMessageId,
                    conversationId: userMessage.conversationId,
                    messageId: responseMessageId,
                    content: mergedContent,
                };
                messageMap.current.set(responseMessageId, response);
                // Get fresh messages to handle multi-tab scenarios where messages may have loaded
                // after this handler started (Tab 2 may have more complete history now)
                const freshMessages = getMessages() || [];
                const currentMessages = freshMessages.length > messages.length ? freshMessages : messages;
                // Remove any existing response placeholder
                let updatedMessages = currentMessages.filter((m) => m.messageId !== responseMessageId);
                // Ensure userMessage is present (multi-tab: Tab 2 may not have it yet)
                if (!updatedMessages.some((m) => m.messageId === userMessage.messageId)) {
                    updatedMessages = [...updatedMessages, userMessage];
                }
                setMessages([...updatedMessages, response]);
            }
            // Store tool call IDs if present
            if (runStep.stepDetails.type === StepTypes.TOOL_CALLS) {
                let updatedResponse = { ...response };
                runStep.stepDetails.tool_calls.forEach((toolCall) => {
                    const toolCallId = toolCall.id ?? '';
                    if ('id' in toolCall && toolCallId) {
                        toolCallIdMap.current.set(runStep.id, toolCallId);
                    }
                    const contentPart = {
                        type: ContentTypes.TOOL_CALL,
                        tool_call: {
                            name: toolCall.name ?? '',
                            args: toolCall.args,
                            id: toolCallId,
                        },
                    };
                    // Use the pre-calculated contentIndex which handles parallel agent indexing
                    updatedResponse = updateContent(updatedResponse, contentIndex, contentPart, false, getStepMetadata(runStep));
                });
                messageMap.current.set(responseMessageId, updatedResponse);
                const updatedMessages = messages.map((msg) => msg.messageId === responseMessageId ? updatedResponse : msg);
                setMessages(updatedMessages);
            }
            const bufferedDeltas = pendingDeltaBuffer.current.get(runStep.id);
            if (bufferedDeltas && bufferedDeltas.length > 0) {
                pendingDeltaBuffer.current.delete(runStep.id);
                for (const bufferedDelta of bufferedDeltas) {
                    stepHandler({ event: bufferedDelta.event, data: bufferedDelta.data }, submission);
                }
            }
        }
        else if (event === 'on_agent_update') {
            const { agent_update } = data;
            let responseMessageId = agent_update.runId || '';
            if (responseMessageId === Constants.USE_PRELIM_RESPONSE_MESSAGE_ID) {
                responseMessageId = submission?.initialResponse?.messageId ?? '';
                parentMessageId = submission?.initialResponse?.parentMessageId ?? '';
            }
            if (!responseMessageId) {
                console.warn('No message id found in agent update event');
                return;
            }
            const response = messageMap.current.get(responseMessageId);
            if (response) {
                // Agent updates don't need index adjustment
                const currentIndex = agent_update.index + initialContent.length;
                // Agent updates carry their own agentId - use default groupId if agentId is present
                const agentUpdateMeta = agent_update.agentId
                    ? { agentId: agent_update.agentId, groupId: 1 }
                    : undefined;
                const updatedResponse = updateContent(response, currentIndex, data, false, agentUpdateMeta);
                messageMap.current.set(responseMessageId, updatedResponse);
                const currentMessages = getMessages() || [];
                setMessages([...currentMessages.slice(0, -1), updatedResponse]);
            }
        }
        else if (event === 'on_message_delta') {
            const messageDelta = data;
            const runStep = stepMap.current.get(messageDelta.id);
            let responseMessageId = runStep?.runId ?? '';
            if (responseMessageId === Constants.USE_PRELIM_RESPONSE_MESSAGE_ID) {
                responseMessageId = submission?.initialResponse?.messageId ?? '';
                parentMessageId = submission?.initialResponse?.parentMessageId ?? '';
            }
            if (!runStep || !responseMessageId) {
                const buffer = pendingDeltaBuffer.current.get(messageDelta.id) ?? [];
                buffer.push({ event: 'on_message_delta', data: messageDelta });
                pendingDeltaBuffer.current.set(messageDelta.id, buffer);
                return;
            }
            const response = messageMap.current.get(responseMessageId);
            if (response && messageDelta.delta.content) {
                const contentPart = Array.isArray(messageDelta.delta.content)
                    ? messageDelta.delta.content[0]
                    : messageDelta.delta.content;
                if (contentPart == null) {
                    return;
                }
                const currentIndex = calculateContentIndex(runStep.index, initialContent, contentPart.type || '', response.content);
                const updatedResponse = updateContent(response, currentIndex, contentPart, false, getStepMetadata(runStep));
                messageMap.current.set(responseMessageId, updatedResponse);
                const currentMessages = getMessages() || [];
                setMessages([...currentMessages.slice(0, -1), updatedResponse]);
            }
        }
        else if (event === 'on_reasoning_delta') {
            const reasoningDelta = data;
            const runStep = stepMap.current.get(reasoningDelta.id);
            let responseMessageId = runStep?.runId ?? '';
            if (responseMessageId === Constants.USE_PRELIM_RESPONSE_MESSAGE_ID) {
                responseMessageId = submission?.initialResponse?.messageId ?? '';
                parentMessageId = submission?.initialResponse?.parentMessageId ?? '';
            }
            if (!runStep || !responseMessageId) {
                const buffer = pendingDeltaBuffer.current.get(reasoningDelta.id) ?? [];
                buffer.push({ event: 'on_reasoning_delta', data: reasoningDelta });
                pendingDeltaBuffer.current.set(reasoningDelta.id, buffer);
                return;
            }
            const response = messageMap.current.get(responseMessageId);
            if (response && reasoningDelta.delta.content != null) {
                const contentPart = Array.isArray(reasoningDelta.delta.content)
                    ? reasoningDelta.delta.content[0]
                    : reasoningDelta.delta.content;
                if (contentPart == null) {
                    return;
                }
                const currentIndex = calculateContentIndex(runStep.index, initialContent, contentPart.type || '', response.content);
                const updatedResponse = updateContent(response, currentIndex, contentPart, false, getStepMetadata(runStep));
                messageMap.current.set(responseMessageId, updatedResponse);
                const currentMessages = getMessages() || [];
                setMessages([...currentMessages.slice(0, -1), updatedResponse]);
            }
        }
        else if (event === 'on_run_step_delta') {
            const runStepDelta = data;
            const runStep = stepMap.current.get(runStepDelta.id);
            let responseMessageId = runStep?.runId ?? '';
            if (responseMessageId === Constants.USE_PRELIM_RESPONSE_MESSAGE_ID) {
                responseMessageId = submission?.initialResponse?.messageId ?? '';
                parentMessageId = submission?.initialResponse?.parentMessageId ?? '';
            }
            if (!runStep || !responseMessageId) {
                const buffer = pendingDeltaBuffer.current.get(runStepDelta.id) ?? [];
                buffer.push({ event: 'on_run_step_delta', data: runStepDelta });
                pendingDeltaBuffer.current.set(runStepDelta.id, buffer);
                return;
            }
            const response = messageMap.current.get(responseMessageId);
            if (response &&
                runStepDelta.delta.type === StepTypes.TOOL_CALLS &&
                runStepDelta.delta.tool_calls) {
                let updatedResponse = { ...response };
                runStepDelta.delta.tool_calls.forEach((toolCallDelta) => {
                    const toolCallId = toolCallIdMap.current.get(runStepDelta.id) ?? '';
                    const contentPart = {
                        type: ContentTypes.TOOL_CALL,
                        tool_call: {
                            name: toolCallDelta.name ?? '',
                            args: toolCallDelta.args ?? '',
                            id: toolCallId,
                        },
                    };
                    if (runStepDelta.delta.auth != null) {
                        contentPart.tool_call.auth = runStepDelta.delta.auth;
                        contentPart.tool_call.expires_at = runStepDelta.delta.expires_at;
                    }
                    // Use server's index, offset by initialContent for edit scenarios
                    const currentIndex = runStep.index + initialContent.length;
                    updatedResponse = updateContent(updatedResponse, currentIndex, contentPart, false, getStepMetadata(runStep));
                });
                messageMap.current.set(responseMessageId, updatedResponse);
                const updatedMessages = messages.map((msg) => msg.messageId === responseMessageId ? updatedResponse : msg);
                setMessages(updatedMessages);
            }
        }
        else if (event === 'on_run_step_completed') {
            const { result } = data;
            const { id: stepId } = result;
            const runStep = stepMap.current.get(stepId);
            let responseMessageId = runStep?.runId ?? '';
            if (responseMessageId === Constants.USE_PRELIM_RESPONSE_MESSAGE_ID) {
                responseMessageId = submission?.initialResponse?.messageId ?? '';
                parentMessageId = submission?.initialResponse?.parentMessageId ?? '';
            }
            if (!runStep || !responseMessageId) {
                console.warn('No run step or runId found for completed tool call event');
                return;
            }
            const response = messageMap.current.get(responseMessageId);
            if (response) {
                let updatedResponse = { ...response };
                const contentPart = {
                    type: ContentTypes.TOOL_CALL,
                    tool_call: result.tool_call,
                };
                // Use server's index, offset by initialContent for edit scenarios
                const currentIndex = runStep.index + initialContent.length;
                updatedResponse = updateContent(updatedResponse, currentIndex, contentPart, true, getStepMetadata(runStep));
                messageMap.current.set(responseMessageId, updatedResponse);
                const updatedMessages = messages.map((msg) => msg.messageId === responseMessageId ? updatedResponse : msg);
                setMessages(updatedMessages);
            }
        }
        return () => {
            toolCallIdMap.current.clear();
            messageMap.current.clear();
            stepMap.current.clear();
        };
    }, [getMessages, lastAnnouncementTimeRef, announcePolite, setMessages, calculateContentIndex]);
    const clearStepMaps = useCallback(() => {
        toolCallIdMap.current.clear();
        messageMap.current.clear();
        stepMap.current.clear();
        pendingDeltaBuffer.current.clear();
    }, []);
    /**
     * Sync a message into the step handler's messageMap.
     * Call this after receiving sync event to ensure subsequent deltas
     * build on the synced content, not stale content.
     */
    const syncStepMessage = useCallback((message) => {
        if (message?.messageId) {
            messageMap.current.set(message.messageId, { ...message });
        }
    }, []);
    return { stepHandler, clearStepMaps, syncStepMessage };
}
