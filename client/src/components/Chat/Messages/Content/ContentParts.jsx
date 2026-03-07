import { memo, useMemo, useCallback } from 'react';
import { ContentTypes } from 'librechat-data-provider';
import { MessageContext, SearchContext } from '~/Providers';
import { ParallelContentRenderer } from './ParallelContent';
import { mapAttachments } from '~/utils';
import { EditTextPart, EmptyText } from './Parts';
import MemoryArtifacts from './MemoryArtifacts';
import Sources from '~/components/Web/Sources';
import Container from './Container';
import Part from './Part';
/**
 * ContentParts renders message content parts, handling both sequential and parallel layouts.
 *
 * For 90% of messages (single-agent, no parallel execution), this renders sequentially.
 * For multi-agent parallel execution, it uses ParallelContentRenderer to show columns.
 */
const ContentParts = memo(function ContentParts({ edit, isLast, content, messageId, enterEdit, siblingIdx, attachments, isSubmitting, setSiblingIdx, searchResults, conversationId, isCreatedByUser, isLatestMessage, }) {
    const attachmentMap = useMemo(() => mapAttachments(attachments ?? []), [attachments]);
    const effectiveIsSubmitting = isLatestMessage ? isSubmitting : false;
    /**
     * Render a single content part with proper context.
     */
    const renderPart = useCallback((part, idx, isLastPart) => {
        const toolCallId = part?.[ContentTypes.TOOL_CALL]?.id ?? '';
        const partAttachments = attachmentMap[toolCallId];
        return (<MessageContext.Provider key={`provider-${messageId}-${idx}`} value={{
                messageId,
                isExpanded: true,
                conversationId,
                partIndex: idx,
                nextType: content?.[idx + 1]?.type,
                isSubmitting: effectiveIsSubmitting,
                isLatestMessage,
            }}>
          <Part part={part} attachments={partAttachments} isSubmitting={effectiveIsSubmitting} key={`part-${messageId}-${idx}`} isCreatedByUser={isCreatedByUser} isLast={isLastPart} showCursor={isLastPart && isLast}/>
        </MessageContext.Provider>);
    }, [
        attachmentMap,
        content,
        conversationId,
        effectiveIsSubmitting,
        isCreatedByUser,
        isLast,
        isLatestMessage,
        messageId,
    ]);
    // Early return: no content
    if (!content) {
        return null;
    }
    // Edit mode: render editable text parts
    if (edit === true && enterEdit && setSiblingIdx) {
        return (<>
        {content.map((part, idx) => {
                if (!part) {
                    return null;
                }
                const isTextPart = part?.type === ContentTypes.TEXT ||
                    typeof part?.text !== 'string';
                const isThinkPart = part?.type === ContentTypes.THINK ||
                    typeof part?.think !== 'string';
                if (!isTextPart && !isThinkPart) {
                    return null;
                }
                const isToolCall = part.type === ContentTypes.TOOL_CALL || part['tool_call_ids'] != null;
                if (isToolCall) {
                    return null;
                }
                return (<EditTextPart index={idx} part={part} messageId={messageId} isSubmitting={isSubmitting} enterEdit={enterEdit} siblingIdx={siblingIdx ?? null} setSiblingIdx={setSiblingIdx} key={`edit-${messageId}-${idx}`}/>);
            })}
      </>);
    }
    const showEmptyCursor = content.length === 0 && effectiveIsSubmitting;
    const lastContentIdx = content.length - 1;
    // Parallel content: use dedicated renderer with columns (TMessageContentParts includes ContentMetadata)
    const hasParallelContent = content.some((part) => part?.groupId != null);
    if (hasParallelContent) {
        return (<ParallelContentRenderer content={content} messageId={messageId} conversationId={conversationId} attachments={attachments} searchResults={searchResults} isSubmitting={effectiveIsSubmitting} renderPart={renderPart}/>);
    }
    // Sequential content: render parts in order (90% of cases)
    const sequentialParts = [];
    content.forEach((part, idx) => {
        if (part) {
            sequentialParts.push({ part, idx });
        }
    });
    return (<SearchContext.Provider value={{ searchResults }}>
      <MemoryArtifacts attachments={attachments}/>
      <Sources messageId={messageId} conversationId={conversationId || undefined}/>
      {showEmptyCursor && (<Container>
          <EmptyText />
        </Container>)}
      {sequentialParts.map(({ part, idx }) => renderPart(part, idx, idx === lastContentIdx))}
    </SearchContext.Provider>);
});
export default ContentParts;
