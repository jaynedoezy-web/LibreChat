import { useSetRecoilState } from 'recoil';
import { QueryKeys, Tools } from 'librechat-data-provider';
import { handleMemoryArtifact } from '~/utils/memory';
import store from '~/store';
export default function useAttachmentHandler(queryClient) {
    const setAttachmentsMap = useSetRecoilState(store.messageAttachmentsMap);
    return ({ data }) => {
        const { messageId } = data;
        const fileData = data;
        if (queryClient &&
            fileData?.file_id &&
            fileData?.filepath &&
            !fileData.filepath.includes('/api/files')) {
            queryClient.setQueryData([QueryKeys.files], (oldData) => {
                if (!oldData) {
                    return [fileData];
                }
                const existingIndex = oldData.findIndex((file) => file.file_id === fileData.file_id);
                if (existingIndex > -1) {
                    const updated = [...oldData];
                    updated[existingIndex] = { ...oldData[existingIndex], ...fileData };
                    return updated;
                }
                return [fileData, ...oldData];
            });
        }
        if (queryClient && data.type === Tools.memory && data[Tools.memory]) {
            const memoryArtifact = data[Tools.memory];
            queryClient.setQueryData([QueryKeys.memories], (oldData) => {
                if (!oldData) {
                    return oldData;
                }
                return handleMemoryArtifact({ memoryArtifact, currentData: oldData }) || oldData;
            });
        }
        setAttachmentsMap((prevMap) => {
            const messageAttachments = prevMap[messageId] || [];
            return {
                ...prevMap,
                [messageId]: [...messageAttachments, data],
            };
        });
    };
}
