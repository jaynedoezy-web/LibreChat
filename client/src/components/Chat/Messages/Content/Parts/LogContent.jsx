import { isAfter } from 'date-fns';
import React, { useMemo } from 'react';
import { imageExtRegex } from 'librechat-data-provider';
import Image from '~/components/Chat/Messages/Content/Image';
import { useLocalize } from '~/hooks';
import LogLink from './LogLink';
const LogContent = ({ output = '', renderImages, attachments }) => {
    const localize = useLocalize();
    const processedContent = useMemo(() => {
        if (!output) {
            return '';
        }
        const parts = output.split('Generated files:');
        return parts[0].trim();
    }, [output]);
    const { imageAttachments, nonImageAttachments } = useMemo(() => {
        const imageAtts = [];
        const nonImageAtts = [];
        attachments?.forEach((attachment) => {
            const { width, height, filepath = null } = attachment;
            const isImage = imageExtRegex.test(attachment.filename ?? '') &&
                width != null &&
                height != null &&
                filepath != null;
            if (isImage) {
                imageAtts.push(attachment);
            }
            else {
                nonImageAtts.push(attachment);
            }
        });
        return {
            imageAttachments: renderImages === true ? imageAtts : null,
            nonImageAttachments: nonImageAtts,
        };
    }, [attachments, renderImages]);
    const renderAttachment = (file) => {
        const now = new Date();
        const expiresAt = 'expiresAt' in file && typeof file.expiresAt === 'number' ? new Date(file.expiresAt) : null;
        const isExpired = expiresAt ? isAfter(now, expiresAt) : false;
        const filename = file.filename || '';
        if (isExpired) {
            return `${filename} ${localize('com_download_expired')}`;
        }
        const fileData = file;
        const filepath = file.filepath || '';
        // const expirationText = expiresAt
        //   ? ` ${localize('com_download_expires', { 0: format(expiresAt, 'MM/dd/yy HH:mm') })}`
        //   : ` ${localize('com_click_to_download')}`;
        return (<LogLink href={filepath} filename={filename} file_id={fileData.file_id} user={fileData.user} source={fileData.source}>
        {'- '}
        {filename} {localize('com_click_to_download')}
      </LogLink>);
    };
    return (<>
      {processedContent && <div>{processedContent}</div>}
      {nonImageAttachments.length > 0 && (<div>
          <p>{localize('com_generated_files')}</p>
          {nonImageAttachments.map((file, index) => (<React.Fragment key={file.filepath}>
              {renderAttachment(file)}
              {index < nonImageAttachments.length - 1 && ', '}
            </React.Fragment>))}
        </div>)}
      {imageAttachments?.map((attachment, index) => {
            const { width, height, filepath } = attachment;
            return (<Image key={index} altText={attachment.filename} imagePath={filepath} height={height} width={width}/>);
        })}
    </>);
};
export default LogContent;
