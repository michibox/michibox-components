import { orderBy } from 'lodash';
/* import { AbortError } from './AbortController'; */
import UploadService from './FileService'; // , { NAME_TOKEN }
const DONE_STATE = 4;

interface UploaderOptionProps {
    chunkSize: number;
    threadsQuantity: any;
    file: any;
    fileName: string;
    contentType: any;
    sha256: string;
    fileSize: number;
    controller: any;
    urlService: string;
    appUUID: any;
    moduleUUID: any;
}

export class Uploader {
    chunkSize: number;
    threadsQuantity: number;
    file: any;
    fileName: string;
    contentType: any;
    sha256: string;
    fileSize: number;
    aborted: boolean;
    isCompleted: boolean;
    uploadedSize: number;
    progressCache: any;
    activeConnections: any;
    parts: any[];
    uploadedParts: any[];
    uploadId: any;
    fileKey: any;
    controller: any;
    urlService: string;

    appUUID: any;
    moduleUUID: any;

    onProgressFn: (response: any) => void;
    onErrorFn: (error: any) => void;
    onCompleteFn: (response: any) => void;
    onInitFn: (response: any) => void;

    constructor(options: UploaderOptionProps) {
        this.chunkSize = options.chunkSize || 1024 * 1024 * 5;
        // number of parallel uploads
        this.threadsQuantity = Math.min(options.threadsQuantity || 5, 15);
        this.file = options.file;
        this.fileName = options.fileName;
        this.contentType = options.contentType;
        this.sha256 = options.sha256;
        this.fileSize = options.fileSize;
        this.aborted = false;
        this.isCompleted = false;
        this.uploadedSize = 0;
        this.progressCache = {};
        this.activeConnections = {};
        this.parts = [];
        this.uploadedParts = [];
        this.uploadId = null;
        this.fileKey = null;
        this.controller = options?.controller || null;
        this.urlService = options?.urlService || '';
        this.appUUID = options?.appUUID || '';
        this.moduleUUID = options?.moduleUUID || '';

        this.onProgressFn = () => {};
        this.onErrorFn = () => {};
        this.onCompleteFn = () => {};
        this.onInitFn = () => {};
    }

    start() {
        this.initialize();
    }

    async initialize() {
        try {
            let { fileName, contentType, sha256, fileSize } = this;

            // initializing the multipart request
            const videoInitializationUploadInput = {
                filename: fileName,
                contentType: contentType,
                checksum: sha256,
                fileSize: fileSize,
            };

            const initializeReponse =
                await UploadService.initializeMultipartUpload(
                    // @ts-ignore
                    {
                        data: videoInitializationUploadInput,
                        controller: this.controller,
                        urlService: this.urlService,
                        appUUID: this.appUUID,
                        moduleUUID: this.moduleUUID,
                    }
                );

            const AWSFileDataOutput = initializeReponse;

            this.uploadId = AWSFileDataOutput.uploadId;
            this.fileKey = AWSFileDataOutput.fileKey;

            // retrieving the pre-signed URLs
            const numberOfparts = Math.ceil(this.file.size / this.chunkSize);

            const AWSMultipartFileDataInput = {
                uploadId: this.uploadId,
                fileKey: this.fileKey,
                parts: numberOfparts,
            };

            // @ts-ignore
            const urlsResponse = await UploadService.getMultipartPreSignedUrls({
                data: AWSMultipartFileDataInput,
                controller: this.controller,
                urlService: this.urlService,
                appUUID: this.appUUID,
                moduleUUID: this.moduleUUID,
            });

            const newParts = urlsResponse.parts.map((iteration: any) => ({
                ...iteration,
                controller: this.controller,
            }));

            this.parts.push(...newParts);

            this.onInitFn(initializeReponse);
            this.sendNext();
        } catch (error) {
            await this.complete(error);
        }
    }

    getParts() {
        return this.parts.length;
    }

    getCompleted() {
        return this.isCompleted;
    }

    sendNext() {
        const activeConnections = Object.keys(this.activeConnections).length;

        if (activeConnections >= this.threadsQuantity) {
            return;
        }

        if (!this.parts.length) {
            if (!activeConnections) {
                this.complete(null);
            }

            return;
        }

        const part = this.parts.pop();
        if (this.file && part) {
            const from_byte = (part.PartNumber - 1) * this.chunkSize;
            const to_byte = part.PartNumber * this.chunkSize;
            const chunk = this.file.slice(from_byte, to_byte);

            const sendChunkStarted = () => {
                this.sendNext();
            };

            this.sendChunk(chunk, part, sendChunkStarted)
                .then(() => {
                    this.sendNext();
                })
                .catch((error) => {
                    this.parts.push(part);

                    this.complete(error);
                });
        }
    }

    async complete(error: unknown) {
        if (error && !this.aborted) {
            this.onErrorFn(error);
            return;
        }

        if (error) {
            this.onErrorFn(error);
            return;
        }

        try {
            const reponse = await this.sendCompleteRequest();
            this.onCompleteFn(reponse);
        } catch (error) {
            this.onErrorFn(error);
        }
    }

    async sendCompleteRequest() {
        if (this.uploadId && this.fileKey) {
            const videoFinalizationMultiPartInput = {
                uploadId: this.uploadId,
                fileKey: this.fileKey,
                parts: orderBy(this.uploadedParts, ['PartNumber'], ['asc']),
            };

            try {
                // @ts-ignore
                const response = await UploadService.finalizeMultipartUpload({
                    data: videoFinalizationMultiPartInput,
                    urlService: this.urlService,
                    appUUID: this.appUUID,
                    moduleUUID: this.moduleUUID,
                });
                this.isCompleted = true;
                return Promise.resolve(response);
            } catch (errors) {
                return Promise.reject(errors);
            }
        }
    }

    sendChunk(chunk: any, part: any, sendChunkStarted: () => void) {
        return new Promise<void>((resolve, reject) => {
            this.upload(chunk, part, sendChunkStarted)
                .then((status) => {
                    if (status !== 200) {
                        reject(new Error('Failed chunk upload'));
                        return;
                    }

                    resolve();
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    handleProgress(part: number, event: { type: string; loaded: any }) {
        if (this.file) {
            if (
                event.type === 'progress' ||
                event.type === 'error' ||
                event.type === 'abort'
            ) {
                this.progressCache[part] = event.loaded;
            }

            if (event.type === 'uploaded') {
                this.uploadedSize += this.progressCache[part] || 0;
                delete this.progressCache[part];
            }

            const inProgress = Object.keys(this.progressCache)
                .map(Number)
                .reduce((memo, id) => (memo += this.progressCache[id]), 0);

            const sent = Math.min(
                this.uploadedSize + inProgress,
                this.file.size
            );

            const total = this.file.size;

            const percentage = Math.round((sent / total) * 100); // progress

            this.onProgressFn({
                sent: sent,
                total: total,
                percentage: percentage,
            });
        }
    }

    upload(
        file: Blob,
        part: { controller: any; signedUrl: string; PartNumber: number },
        sendChunkStarted: { (): void; (): void }
    ) {
        return new Promise((resolve, reject) => {
            if (this.uploadId && this.fileKey) {
                const options = part.controller;
                if (options?.signal && options?.signal?.aborted) {
                    return reject('eeor'); // return reject(new AbortError())
                }

                /* const data = new FormData();
                data.append('file', file);
                data.append('signedUrl', part.signedUrl); */

                const xhr = (this.activeConnections[part.PartNumber - 1] =
                    new XMLHttpRequest());
                
                xhr.withCredentials = true;

                const abort = () => {
                    xhr.abort();
                };

                sendChunkStarted();

                const progressListener = this.handleProgress.bind(
                    this,
                    part.PartNumber - 1
                );

                xhr.upload.addEventListener('progress', progressListener);

                xhr.addEventListener('error', progressListener);
                xhr.addEventListener('abort', progressListener);
                xhr.addEventListener('loadend', progressListener);

               // const token = sessionStorage.getItem(NAME_TOKEN);
               // const url = `${this.urlService}/api/file/upload/upload-signed-url`;
                const url = part.signedUrl;

                xhr.open('POST', url);

                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                // xhr.setRequestHeader('Authorization', `Bearer ${token}`);
               // xhr.setRequestHeader('App-UUID', this.appUUID);
               // xhr.setRequestHeader('Module-UUID', this.moduleUUID);

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 400) {
                        return resolve(xhr.responseText);
                    }

                    return reject(xhr.responseText);
                };

                if (options?.signal) {
                    options?.signal.addEventListener('abort', abort);
                }
                xhr.onreadystatechange = () => {
                    if (options?.signal) {
                        if (xhr.readyState === DONE_STATE) {
                            options?.signal.removeEventListener('abort', abort);
                        }
                    }

                    if (xhr.readyState === 4 && xhr.status === 200) {
                        const ETag = xhr.getResponseHeader('ETag');

                        if (ETag) {
                            const uploadedPart = {
                                PartNumber: part.PartNumber, // @ts-ignore
                                ETag: ETag.replaceAll('"', ''),
                            };

                            this.uploadedParts.push(uploadedPart);

                            resolve(xhr.status);
                            delete this.activeConnections[part.PartNumber - 1];
                        }
                    }
                };

                xhr.onerror = (error) => {
                    reject(error);
                    delete this.activeConnections[part.PartNumber - 1];
                };

                xhr.ontimeout = (error) => {
                    reject(error);
                    delete this.activeConnections[part.PartNumber - 1];
                };
                xhr.onabort = () => {
                    reject('eeor'); // new AbortError()
                    delete this.activeConnections[part.PartNumber - 1];
                };
                xhr.send(file)
            } else {
                reject();
            }
        });
    }

    onProgress(onProgress: (response: any) => void) {
        this.onProgressFn = onProgress;
        return this;
    }

    onError(onError: (error: any) => void) {
        this.onErrorFn = onError;
        return this;
    }

    onInit(onInit: () => void) {
        this.onInitFn = onInit;
        return this;
    }

    onComplete(onComplete: (response: any) => void) {
        this.onCompleteFn = onComplete;
        return this;
    }

    abort() {
        this.controller.abort();

        Object.keys(this.activeConnections)
            .map(Number)
            .forEach((id) => {
                this.activeConnections[id].abort();
            });

        this.aborted = true;
    }
}
