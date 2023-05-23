import React, {
    useImperativeHandle,
    useState,
    useRef,
    Fragment,
    useEffect,
    ChangeEvent,
} from 'react';
import CryptoJS from 'crypto-js';
import { saveAs } from 'file-saver';
import { FullScreen, useFullScreenHandle } from 'react-full-screen';
import { v4 as uuid } from 'uuid';

import { Form, Button, Modal, Row, Col } from './index';
import ModalUploading from './UploadFile/ModalUploading';
import { UploadFile } from './UploadFile/UploadFile';
import { ERROR_STATUS, PENDING_STATUS } from './UploadFile/fileStatus';

const b64toBlob = require('b64-to-blob');
import TransferService from './UploadFile/FileService';
import { getErrorMessage } from './UploadFile/util';



const blobToBase64 = function (blob: any, callback: any) {
    let reader = new FileReader();
    reader.onload = function () {
        const dataUrl = reader.result;
        // @ts-ignore
        const base64 = dataUrl.split(',')[1];
        callback(base64);
    };
    reader.readAsDataURL(blob);
};

const ComponentUpload = React.forwardRef((props: any, ref: any) => {
    const {
        appUUID,
        moduleUUID,
        extensions,
        accept,
        uploadedCallback,
        errorCallback,
        style,
        placeHolder,
        setSelectedFile,
        uuids,
        maxMb,
        urlService,
        urlOCRService,
    }: ComponentUploadProps = props;

    const inputRef = useRef(`input-file-${props.key}`);

    useImperativeHandle(ref, () => ({
        click() {
            // @ts-ignore
            inputRef.current.click();
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

    const [detailProgress, setDetailProgress] = useState(defaultModel());
    const [customFileId] = useState(`customFileId-${uuid()}`);

    const [fileName, setFileName] = useState(placeHolder);

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
            setDetailProgress((values) => ({
                ...values,
                message: 'Cargando documento',
                progress: 0,
                status: true,
            }));
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
                    errorCallback({
                        uuid: null,
                        fileName: file.name,
                        message:
                            'Existió un error al cargar el archivo, intente nuevamente.',
                    });

                    setDetailProgress(defaultModel());
                }
            });
            uploadFile.on('progress', ({ target }: any) => {
                const { id } = target;
                const detail = target.getDetail();
                const instance = target.getInstance();
                setDetailProgress((values) => ({
                    ...values,
                    id,
                    detail: { ...detail },
                    instance: instance,
                    message: 'cargando',
                    progress: detail.progress,
                    status: true,
                }));
            });

            uploadFile.on('completeUploadFileSystem', ({ target }: any) => {
                const detail = target.getDetail();

                if (setSelectedFile) {
                    setSelectedFile(file);
                }

                setDetailProgress((values) => ({
                    ...values,
                    status: false,
                }));

                uploadedCallback({
                    ...detail,
                    fileName: file.name,
                    mimeType: file.type,
                    isEmpty,
                });
            });
        } catch (errors) {
            setDetailProgress(defaultModel());

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

            setDetailProgress((values) => ({
                ...values,
                message: 'Validando documento',
                progress: 0,
                status: true,
            }));

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

            if (sizeCheck > maxMb) {
                // 5MB
                // @ts-ignore
                inputRef.current.value = null;
                setFileName(placeHolder || 'Seleccionar foto');

                setDetailProgress((values) => ({
                    ...values,
                    message: 'Validando tamaño de archivo',
                    progress: 0,
                    status: false,
                }));

                errorCallback({
                    uuid: null,
                    fileName: myFile.name,
                    message: `El archivo debe ser menor de ${maxMb} MB`,
                });

                return;
            }

            addFile(myFile);
        } catch (errors) {
            setDetailProgress(defaultModel());
            console.log('errors', errors);
        } finally {
            setDetailProgress(defaultModel());

            // @ts-ignore
            event.target.value = null;
        }
    };

    return (
        <Fragment>
            <Form.File
                {...props}
                ref={inputRef}
                id={customFileId}
                label={fileName}
                className="file-button"
                data-browse="Seleccionar"
                custom
                onChange={(ev: any) => selectFile(ev)}
                style={style}
                accept={accept}
            />

            <ModalUploading
                show={detailProgress?.status}
                message={detailProgress?.message}
                progress={detailProgress?.progress}
            />
        </Fragment>
    );
});

export interface FileUploadS3MultipartProps {
    appUUID: string;
    moduleUUID: string;
    extensions?: string[];
    accept?: string;
    uploadedCallback: (values: any) => void;
    errorCallback: (values: any) => void;
    style?: any;
    placeHolder?: string;
    setSelectedFile?: (values: any) => void;
    uuids?: string[];
    readOnly?: boolean;
    preview?: boolean;
    maxMb?: number;
    key?: any;
    urlService: string;
    urlOCRService?: string | null;
    remove?: boolean;
    handleRemove?: (uuid: string) => void;
}

export interface ComponentUploadProps {
    appUUID: string;
    moduleUUID: string;
    extensions: string[];
    accept: string;
    uploadedCallback: (values: any) => void;
    errorCallback: (values: any) => void;
    style: any;
    placeHolder: string;
    setSelectedFile: (values: any) => void;
    uuids: string[];
    readOnly: boolean;
    maxMb: number;
    urlService: string;
    urlOCRService?: string | null;
}

const FileUploadS3Multipart = React.forwardRef((propsMain: any, ref: any) => {
    const {
        appUUID,
        moduleUUID,
        extensions = ['.pdf', '.jpg', '.jpeg', '.png', '.docx', '.xlsx'],
        accept = 'image/jpeg,image/gif,image/png,application/pdf',
        uploadedCallback,
        errorCallback,
        style = {},
        placeHolder = 'Seleccionar',
        setSelectedFile = () => {},
        uuids = [],
        readOnly = false,
        preview = false,
        maxMb = 5,
        urlService = '',
        urlOCRService = null,
        remove = false,
        handleRemove,
    }: FileUploadS3MultipartProps = propsMain;

    const props = {
        ...propsMain,
        appUUID,
        moduleUUID,
        extensions,
        accept,
        uploadedCallback,
        errorCallback,
        style,
        placeHolder,
        setSelectedFile,
        uuids,
        readOnly,
        preview,
        maxMb,
        urlService,
        urlOCRService,
    };

    const componentUploadRef = useRef(null);

    useImperativeHandle(ref, () => ({
        click() {
            // @ts-ignore
            componentUploadRef?.current?.click?.();
        },
        clear() {
            // @ts-ignore
            componentUploadRef?.current?.clear?.();
        },
    }));

    return (
        <Fragment>
            <ComponentUpload
                ref={componentUploadRef}
                {...{
                    ...props,
                }}
            />
        </Fragment>
    );
});

export default FileUploadS3Multipart;