import React, { useEffect, useState } from 'react';
import { v4 } from 'uuid';
import { DownloadFile } from './DownloadFile/DownloadFile';
import { ERROR_STATUS, PENDING_STATUS } from './UploadFile/fileStatus';

import TransferService from './UploadFile/FileService';
import { getErrorMessage } from './UploadFile/util';

export interface FileDownloadS3MultipartProps {
    urlService: string;
    errorCallback?: (values: any) => void;
}

const defaultModel = () => ({
    id: null,
    detail: null,
    instance: null,
    isCompleted: false,
    fileName: null,
    contentType: null,
    url: null,
    fileStatus: PENDING_STATUS,
    isDownload: true,
    preSignedUrl: '',
    progress: 0,
});

export const useFileDownloadS3Multipart = ({
    urlService,
    errorCallback,
}: FileDownloadS3MultipartProps) => {
    const [detail, setDetail] = useState<any>(defaultModel());

    const getFile = async (fileUUID: string) => {
        try {
            // @ts-ignore
            const { preSignedUrl } =
                await TransferService.generateDownloadSignedUrl({
                    fileUUID,
                    urlService,
                });

            const downloadFile = new DownloadFile();
            downloadFile.id = v4();

            const detail = {
                fileStatus: PENDING_STATUS,
                isDownload: true,
                preSignedUrl,
                progress: 0,
                urlService
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
                    setDetail(defaultModel());
                }
            });

            downloadFile.on('progress', ({ target }: any) => {
                const { id } = target;
                const detail = target.getDetail();
                const instance = target.getInstance();

                setDetail((values: any) => ({
                    ...values,
                    ...detail,
                    id,
                    instance: instance,
                    progress: detail.progress,
                }));
            });

            downloadFile.on('completeDownload', ({ target }: any) => {
                const detail = target.getDetail();
                const { blob, fileName, contentType } = detail;
                const url = (window.URL || window.webkitURL).createObjectURL(
                    blob
                );

                setDetail((values: any) => ({
                    ...values,
                    ...detail,
                    progress: detail.progress,
                    isCompleted: true,
                    fileName,
                    contentType,
                    url,
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

    return {
        file: { ...detail },
        getFile,
    };
};

export default useFileDownloadS3Multipart;
