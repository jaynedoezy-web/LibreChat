import { useMemo, memo } from 'react';
import FileContainer from '~/components/Chat/Input/Files/FileContainer';
import Image from './Image';
const Files = ({ message }) => {
    const imageFiles = useMemo(() => {
        return message?.files?.filter((file) => file.type?.startsWith('image/')) || [];
    }, [message?.files]);
    const otherFiles = useMemo(() => {
        return message?.files?.filter((file) => !(file.type?.startsWith('image/') === true)) || [];
    }, [message?.files]);
    return (<>
      {otherFiles.length > 0 &&
            otherFiles.map((file) => <FileContainer key={file.file_id} file={file}/>)}
      {imageFiles.length > 0 &&
            imageFiles.map((file) => (<Image key={file.file_id} imagePath={file.preview ?? file.filepath ?? ''} height={file.height ?? 1920} width={file.width ?? 1080} altText={file.filename ?? 'Uploaded Image'} placeholderDimensions={{
                    height: `${file.height ?? 1920}px`,
                    width: `${file.height ?? 1080}px`,
                }}/>))}
    </>);
};
export default memo(Files);
