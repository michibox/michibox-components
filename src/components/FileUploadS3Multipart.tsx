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

export interface FileUploadS3MultipartProps {
    appUUID: string;
    moduleUUID: string;
    extensions?: string[];
    accept?: string;
    uploadedCallback: (values: any) => void | undefined;
    errorCallback: (values: any) => void | undefined;
    progressCallback?: (values: any) => void | undefined;
    initCallback?: (values: any) => void | undefined;
    style?: any;
    placeHolder?: string;
    setSelectedFile?: (values: any) => void | null | undefined;
    maxMb?: number;
    urlService: string;
    urlOCRService?: string | null | undefined;
    showModalUploading?: boolean;
}

const FileUploadS3Multipart: React.FC<FileUploadS3MultipartProps> =
    React.forwardRef<HTMLElement, FileUploadS3MultipartProps>(
        (
            {
                appUUID,
                moduleUUID,
                extensions = [
                    '.pdf',
                    '.jpg',
                    '.jpeg',
                    '.png',
                    '.docx',
                    '.xlsx',
                ],
                accept = 'image/jpeg,image/gif,image/png,application/pdf',
                style = {},
                placeHolder = 'Seleccionar',
                setSelectedFile = () => {},

                maxMb = 5,
                urlService = '',
                urlOCRService = null,
                errorCallback,
                uploadedCallback,
                progressCallback,
                initCallback,
                showModalUploading = false,
            },
            ref: any
        ) => {
            const inputRef = useRef<HTMLInputElement | null>(null);
            useImperativeHandle(ref, () => ({
                click() {
                    // @ts-ignore
                    inputRef?.current?.click?.();
                },
                clear() {
                    // @ts-ignore
                    inputRef.current.value = null;
                    setFileName(placeHolder);
                },
            }));

            const defaultModel = () => ({
                message: 'Sin estatus',
                progress: 0,
                status: false,
            });

            const [detailProgress, setDetailProgress] = useState(
                defaultModel()
            );
            const [customFileId] = useState(`customFileId-${uuid()}`);

            const [fileName, setFileName] = useState(placeHolder);

            const addFile = (file: File): void => {
                /*
                 * calculate sha256
                 */

                const urlBlob = (
                    window.URL || window.webkitURL
                ).createObjectURL(file);
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
                    fileReader.readAsArrayBuffer(
                        blobSlice.call(file, start, end)
                    );
                };
                const frOnload = (e: any) => {
                    var wordBuffer = CryptoJS.lib.WordArray.create(
                        e.target.result
                    );
                    SHA256.update(wordBuffer);

                    currentChunk++;
                    if (currentChunk < chunks) {
                        loadNext();
                    } else {
                        const model = {
                            urlBlob,
                            name: file.name,
                            extension: file?.name
                                ?.split('.')
                                ?.pop()
                                ?.toLowerCase(),
                            mime: file.type,
                            size: file.size,
                            sha256: SHA256.finalize().toString(),
                            file,
                        };
                        upload(model);
                    }
                };

                const frOnerror = (error: any) =>
                    console.log('frOnerror', error);

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

            const upload = async ({
                name,
                extension,
                mime,
                size,
                sha256,
                file,
            }) => {
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
                        const ocrResponse =
                            await TransferService.uploadToValidateOcr({
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
                            errorCallback({
                                uuid: null,
                                fileName: file.name,
                                message:
                                    'Existió un error al cargar el archivo, intente nuevamente.',
                            });

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

                    uploadFile.on(
                        'completeUploadFileSystem',
                        ({ target }: any) => {
                            const detail = target.getDetail();

                            if (setSelectedFile) {
                                setSelectedFile(file);
                            }

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

                            uploadedCallback({
                                ...detail,
                                fileName: file.name,
                                mimeType: file.type,
                                isEmpty,
                            });
                        }
                    );
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

                    errorCallback({
                        uuid: null,
                        fileName: file.name,
                        message: getErrorMessage(errors),
                    });
                }
            };

            /* eslint-disable no-param-reassign */
            const selectFile = (
                event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
            ) => {
                const files = (event.target as HTMLInputElement).files;

                if (!files?.[0]) {
                    return;
                }
                try {
                    const myFile = files[0];

                    setFileName(myFile.name);

                    setDetailProgress((values) => {
                        const payload = {
                            ...values,
                            message: 'validando documento',
                            progress: 0,
                            status: true,
                        };
                        if (progressCallback) {
                            progressCallback({ ...payload });
                        }
                        return payload;
                    });

                    const newExtensions = extensions?.map((ext) =>
                        ext.replace('.', '')
                    );
                    const fileType = myFile.type;
                    const extensionOk = newExtensions.find((ext) =>
                        fileType.includes(ext)
                    );

                    if (!extensionOk) {
                        errorCallback({
                            uuid: null,
                            fileName: myFile.name,
                            message: `El archivo seleccionado debe ser de tipo ${extensions.join(
                                ', '
                            )}`,
                        });

                        return;
                    }

                    const sizeCheck = parseInt(
                        // @ts-ignore
                        parseFloat(myFile.size / (1024 * 1024)).toFixed(2),
                        10
                    );

                    setDetailProgress((values) => {
                        const payload = {
                            ...values,
                            message: 'validando tamaño de archivo',
                            progress: 0,
                            status: false,
                        };
                        if (progressCallback) {
                            progressCallback({ ...payload });
                        }
                        return payload;
                    });

                    if (sizeCheck > maxMb) {
                        // 5MB
                        // @ts-ignore
                        inputRef.current.value = null;
                        setFileName(placeHolder || 'Seleccionar foto');

                        errorCallback({
                            uuid: null,
                            fileName: myFile.name,
                            message: `El archivo debe ser menor de ${maxMb} MB`,
                        });

                        return;
                    }

                    addFile(myFile);
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
                    console.log('errors', errors);
                } finally {
                    // @ts-ignore
                    event.target.value = null;
                }
            };

            useEffect(() => {
                if (progressCallback) {
                    progressCallback({ ...detailProgress });
                }
            }, []);

            return (
                <Fragment>
                    <Form.File
                        id={customFileId}
                        label={fileName}
                        className="file-button"
                        data-browse="Seleccionar"
                        custom
                        onChange={(ev: any) => selectFile(ev)}
                        style={style}
                        accept={accept}
                        ref={inputRef}
                    />
                    {showModalUploading && (
                        <ModalUploading
                            show={detailProgress?.status}
                            message={detailProgress?.message}
                            progress={detailProgress?.progress}
                        />
                    )}
                </Fragment>
            );
        }
    );

export default FileUploadS3Multipart;
