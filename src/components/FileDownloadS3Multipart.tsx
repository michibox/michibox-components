import React, { useEffect, useState } from 'react';
import { v4 } from 'uuid';
import { DownloadFile } from './DownloadFile/DownloadFile';
import { ERROR_STATUS, PENDING_STATUS } from './UploadFile/fileStatus';

import TransferService from './UploadFile/FileService';
import { getErrorMessage } from './UploadFile/util';

export interface FileDownloadS3MultipartProps {
    fileUUID: string;
    urlService: string;
    errorCallback?: (values: any) => void;
}

const defaultModel = () => ({
    progress: 0,
    id: null,
    detail: null,
    instance: null,
    isCompleted: false,
});

export const FileDownloadS3Multipart = ({
    fileUUID,
    urlService,
    errorCallback,
}: FileDownloadS3MultipartProps) => {
    const [detailProgress, setDetailProgress] = useState(defaultModel());
    const [urlBlob, setUrlBlob] = useState<string | null>(null);

    const initService = async () => {
        try {
            const responseServicePreUrl =
                await TransferService.generateDownloadSignedUrl({
                    fileUUID,
                    urlService,
                });
            // @ts-ignore
            const { preSignedUrl } = responseServicePreUrl?.data;

            const downloadFile = new DownloadFile();
            downloadFile.id = v4();

            const detail = {
                fileStatus: PENDING_STATUS,
                isDownload: true,
                preSignedUrl,
                progress: 0,
            };

            downloadFile.setDetail({ ...detail });
            downloadFile.setInstance(downloadFile);

            downloadFile.on('status', ({ target }: any) => {
                const { id } = target;
                const detail = target.getDetail();
                const instance = target.getInstance();
                if (detail?.fileStatus === ERROR_STATUS) {
                    if (errorCallback) {
                        errorCallback({
                            message:
                                'Existió un error al cargar el archivo, intente nuevamente.',
                        });
                    }
                    setDetailProgress(defaultModel());
                }
            });

            downloadFile.on('progress', ({ target }: any) => {
                const { id } = target;
                const detail = target.getDetail();
                const instance = target.getInstance();

                setDetailProgress((values) => ({
                    ...values,
                    id,
                    detail: { ...detail },
                    instance: instance,
                    progress: detail.progress
                }));
            });

            downloadFile.on('completeDownload', ({ target }: any) => {
                const detail = target.getDetail();
                const { blob } = detail;
                const url = (window.URL || window.webkitURL).createObjectURL(
                    blob
                );
                setUrlBlob(url);
                setDetailProgress((values) => ({
                    ...values,
                    detail: { ...detail },
                    progress: detail.progress,
                    isCompleted: true
                }));
            });
        } catch (errors) {
            if (errorCallback) {
                errorCallback({
                    message: getErrorMessage(errors),
                });
            }
        }
    };

    useEffect(() => {
        initService();
    }, []);

    return {
        detailProgress,
        urlBlob,
    };
};

export default FileDownloadS3Multipart;
