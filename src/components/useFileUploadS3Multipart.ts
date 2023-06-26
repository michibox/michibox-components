import React, {
    useImperativeHandle,
    useState,
    useRef,
    Fragment,
    useEffect,
    ChangeEvent,
} from 'react';
import CryptoJS from 'crypto-js';
import { v4 as uuid } from 'uuid';
import { Form } from './index';
import ModalUploading from './UploadFile/ModalUploading';
import { UploadFile } from './UploadFile/UploadFile';
import { ERROR_STATUS, PENDING_STATUS } from './UploadFile/fileStatus';

import TransferService from './UploadFile/FileService';
import { getErrorMessage } from './UploadFile/util';

export interface useFileUploadS3MultipartProps {
    appUUID: string;
    moduleUUID: string;
    uploadedCallback: (values: any) => void | undefined;
    errorCallback: (values: any) => void | undefined;
    progressCallback?: (values: any) => void | undefined;
    initCallback?: (values: any) => void | undefined;
    urlService: string;
    urlOCRService?: string | null | undefined;
}

const useFileUploadS3Multipart = ({
    appUUID,
    moduleUUID,
    urlService = '',
    urlOCRService = null,
    errorCallback,
    uploadedCallback,
    progressCallback,
    initCallback,
}: useFileUploadS3MultipartProps) => {
    const defaultModel = () => ({
        message: 'Sin estatus',
        progress: 0,
        status: false,
    });

    const [detailProgress, setDetailProgress] = useState(defaultModel());

    const addFile = (file: File): void => {
        /*
         * calculate sha256
         */

        const urlBlob = (window.URL || window.webkitURL).createObjectURL(file);
        const SHA256 = CryptoJS.algo.SHA256.create();

        const blobSlice = File.prototype.slice; //||
        //  File.prototype?.mozSlice ||
        //  File.prototype?.webkitSlice;

        const chunkSize = 2097152; // read in chunks of 2MB
        const chunks = Math.ceil(file.size / chunkSize);
        let currentChunk = 0;

        const loadNext = () => {
            const fileReader = new FileReader();
            fileReader.onload = frOnload;
            fileReader.onerror = frOnerror;
            const start = currentChunk * chunkSize,
                end =
                    start + chunkSize >= file.size
                        ? file.size
                        : start + chunkSize;
            fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
        };
        const frOnload = (e: any) => {
            var wordBuffer = CryptoJS.lib.WordArray.create(e.target.result);
            SHA256.update(wordBuffer);

            currentChunk++;
            if (currentChunk < chunks) {
                loadNext();
            } else {
                const model = {
                    urlBlob,
                    name: file.name,
                    extension: file?.name?.split('.')?.pop()?.toLowerCase(),
                    mime: file.type,
                    size: file.size,
                    sha256: SHA256.finalize().toString(),
                    file,
                };
                upload(model);
            }
        };

        const frOnerror = (error: any) => console.log('frOnerror', error);

        const fileReader = new FileReader();
        fileReader.onload = frOnload;
        fileReader.onerror = frOnerror;

        const start = currentChunk * chunkSize,
            end =
                start + chunkSize >= file.size ? file.size : start + chunkSize;

        fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
    };

    const upload = async ({ name, extension, mime, size, sha256, file }) => {
        try {
            setDetailProgress((values) => {
                const payload = {
                    ...values,
                    message: 'preparando carga de documento',
                    progress: 0,
                    status: true,
                };
                if (progressCallback) {
                    progressCallback({ ...payload });
                }
                return payload;
            });

            let isEmpty = null;
            if (urlOCRService) {
                const ocrResponse = await TransferService.uploadToValidateOcr({
                    params: {
                        urlOCRService,
                        file,
                    },
                });
                // @ts-ignore
                const { isEmpty: isEmptyResponse } = ocrResponse?.data;
                isEmpty = isEmptyResponse;
            }

            const uploadFile = new UploadFile({
                urlService,
                appUUID,
                moduleUUID,
            });
            uploadFile.id = uuid();

            const detail = {
                file: file,
                fileName: name,
                extension: extension,
                contentType: mime,
                fileSize: size,
                sha256: sha256,
                fileStatus: PENDING_STATUS,
            };

            uploadFile.setDetail(detail);
            uploadFile.setInstance(uploadFile);

            uploadFile.on('status', ({ target }: any) => {
                const { id } = target;
                const detail = target.getDetail();
                const instance = target.getInstance();

                if (detail?.fileStatus === ERROR_STATUS) {
                    if (errorCallback) {
                        errorCallback({
                            uuid: null,
                            fileName: file.name,
                            message: detail?.errors
                                ? detail?.errors
                                : detail?.message
                                ? detail?.message
                                : 'Existió un error al cargar el archivo, intente nuevamente.',
                            httpStatus: detail?.httpStatus || 500,
                        });
                    }

                    setDetailProgress(() => {
                        const payload = {
                            ...defaultModel(),
                        };
                        if (progressCallback) {
                            progressCallback({ ...payload });
                        }
                        return payload;
                    });
                } else {
                    setDetailProgress((values) => {
                        const payload = {
                            ...values,
                            id,
                            detail: { ...detail },
                            instance: instance,
                            message: 'ejecutando multiparts...',
                            progress: detail.progress,
                            status: true,
                        };
                        if (progressCallback) {
                            progressCallback({ ...payload });
                        }
                        return payload;
                    });
                }
            });
            uploadFile.on('initUpload', ({ target }: any) => {
                const { id } = target;
                const detail = target.getDetail();
                const instance = target.getInstance();

                if (initCallback) {
                    initCallback({
                        fileUUID: detail.fileInit.uuid,
                        fileName: detail.fileName,
                        fileSize: detail.fileSize,
                        contentType: detail.contentType,
                        extension: detail.extension,
                        sha256: detail.sha256,
                    });
                }
            });

            uploadFile.on('progress', ({ target }: any) => {
                const { id } = target;
                const detail = target.getDetail();
                const instance = target.getInstance();

                setDetailProgress((values) => {
                    const payload = {
                        ...values,
                        id,
                        detail: { ...detail },
                        instance: instance,
                        message: 'subiendo...',
                        progress: detail.progress,
                        status: true,
                    };
                    if (progressCallback) {
                        progressCallback({ ...payload });
                    }
                    return payload;
                });
            });

            uploadFile.on('completeUploadFileSystem', ({ target }: any) => {
                const detail = target.getDetail();

                setDetailProgress((values) => {
                    const payload = {
                        ...values,
                        status: false,
                        message: 'completo',
                        progress: 100,
                    };
                    if (progressCallback) {
                        progressCallback({ ...payload });
                    }
                    return payload;
                });

                if (uploadedCallback) {
                    uploadedCallback({
                        ...detail,
                        fileName: file.name,
                        mimeType: file.type,
                        isEmpty,
                    });
                }
            });
        } catch (errors) {
            setDetailProgress(() => {
                const payload = {
                    ...defaultModel(),
                };
                if (progressCallback) {
                    progressCallback({ ...payload });
                }
                return payload;
            });
            if (errorCallback) {
                errorCallback({
                    uuid: null,
                    fileName: file.name,
                    message: getErrorMessage(errors),
                });
            }
        }
    };

    const addToUploadFile = (myFile: File) => {
        addFile(myFile);
    };
    return {
        addToUploadFile,
    };
};

export default useFileUploadS3Multipart;
