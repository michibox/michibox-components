/* eslint-disable class-methods-use-this */
/* eslint-disable no-inner-declarations */
/* eslint-disable no-multi-assign */
/* eslint-disable consistent-return */
/* eslint-disable no-undef */
/* eslint-disable lines-between-class-members */
/* eslint-disable camelcase */
/* eslint-disable no-param-reassign */
/* eslint-disable no-return-assign */
import { orderBy } from 'lodash';
import { AbortError } from '../UploadFile/AbortController';

const DONE_STATE = 4;

interface UploaderOptionProps {
    urlService: string;
    chunkSize: number;
    params: any;
    fileName: any;
    extension: any;
    controller: any;
}

export class Downloader {
    chunkSize: any;
    threadsQuantity: number;
    params: any;
    fileName: any;
    extension: any;
    aborted: boolean;
    isCompleted: boolean;
    downloadedSize: number;
    progressCache: {};
    activeConnections: {};
    parts: any[];
    downloadedParts: any[];
    controller: any;
    contentLength: any;
    contentDisposition: any;
    contentType: any;

    onProgressFn: any;
    onErrorFn: any;
    onCompleteFn: any;
    onInitFn: any;
    urlService: string;

    constructor(options: UploaderOptionProps) {
        this.chunkSize = options.chunkSize || 1024 * 1024 * 5;
        // number of parallel downloads
        this.threadsQuantity = 6; //  Math.min(options.threadsQuantity || 5, 15)
        this.params = options.params;
        this.fileName = options.fileName;
        this.extension = options.extension;
        this.aborted = false;
        this.isCompleted = false;
        this.downloadedSize = 0;
        this.progressCache = {};
        this.activeConnections = {};
        this.parts = [];
        this.downloadedParts = [];
        this.controller = options?.controller || null;
        this.contentLength = null;
        this.contentDisposition = null;
        this.contentType = null;

        this.onProgressFn = () => {};
        this.onErrorFn = () => {};
        this.onCompleteFn = () => {};
        this.onInitFn = () => {};
        this.urlService =
            `${options?.urlService}/api/file/download/download-file-signed-url` ||
            '';
    }

    start() {
        this.initialize();
    }

    async initialize() {
        try {
            // eslint-disable-next-line prefer-const
            const { params, chunkSize } = this;
            // eslint-disable-next-line no-undef
            const { contentLength, contentDisposition, contentType }: any =
                await this.getContentLength(params);

            this.contentLength = contentLength;
            this.contentDisposition = contentDisposition;
            this.contentType = contentType;

            const chunks =
                typeof chunkSize === 'number'
                    ? Math.ceil(contentLength / chunkSize)
                    : 1;

            const iterable = [...new Array(chunks).keys()];

            const newArray: any[] = [];
            // eslint-disable-next-line no-restricted-syntax
            for (const i of iterable) {
                const start = i * chunkSize;
                const end =
                    i + 1 === chunks
                        ? contentLength - 1
                        : (i + 1) * chunkSize - 1;

                newArray.push({
                    PartNumber: i,
                    start,
                    end,
                    params,
                    controller: this.controller,
                });
            }

            this.parts = [...newArray];

            this.onInitFn();
            this.sendNext();
        } catch (error) {
            // @ts-ignore
            await this.complete(error);
        }
    }

    sendNext() {
        try {
            const activeConnections = Object.keys(
                this.activeConnections
            ).length;

            if (activeConnections >= this.threadsQuantity) {
                return;
            }

            if (!this.parts.length) {
                if (!activeConnections) {
                    this.complete();
                }

                return;
            }

            const part = this.parts.pop();
            if (part) {
                const sendChunkStarted = () => {
                    this.sendNext();
                };

                this.sendChunk(part, sendChunkStarted)
                    .then(() => {
                        this.sendNext();
                    })
                    .catch((error) => {
                        this.parts.push(part);

                        this.complete(error);
                    });
            }
        } catch (error) {
            this.onErrorFn(error);
        }
    }

    async complete(error = null) {
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
            // eslint-disable-next-line no-shadow
        } catch (error) {
            this.onErrorFn(error);
        }
    }

    concatenate(arrays) {
        if (!arrays.length) return null;
        const totalLength = arrays.reduce(
            (acc: any, value: any) => acc + value.length,
            0
        );
        const result = new Uint8Array(totalLength);
        let length = 0;
        // eslint-disable-next-line no-restricted-syntax
        for (const array of arrays) {
            result.set(array, length);
            length += array.length;
        }
        return result;
    }

    async sendCompleteRequest() {
        try {
            const finalParts = orderBy(
                this.downloadedParts,
                ['PartNumber'],
                ['asc']
            );
            const sortedBuffers = finalParts.map(
                (item) => new Uint8Array(item.buffer)
            );
            const buffers = this.concatenate(sortedBuffers);

            /* this.saveAs({
                name: this.fileName,
                buffers,
                mime: this.contentType,
                extension: this.extension,
            }); */

            return {
                fileSize: this.contentLength,
                blob: this.getBlob({
                    name: this.fileName,
                    buffers,
                    mime: this.contentType,
                    extension: this.extension,
                }),
            };
        } catch (error) {
            this.onErrorFn(error);
        }
    }

    sendChunk(part: any, sendChunkStarted: () => void) {
        return new Promise((resolve, reject) => {
            this.download(part, sendChunkStarted)
                .then((status: any) => {
                    if (!(status >= 200 && status < 400)) {
                        reject(new Error('Failed chunk download'));
                        return;
                    }
                    resolve(true);
                })
                .catch((error) => {
                    reject(error);
                });
        });
    }

    download(part: any, sendChunkStarted: () => void) {
        return new Promise((resolve, reject) => {
            try {
                const { start, end, PartNumber, params } = part;
                const options = part.controller;
                if (options.signal && options.signal.aborted) {
                    return reject(new AbortError());
                }

                const xhr = (this.activeConnections[part.PartNumber - 1] =
                    new XMLHttpRequest());
                xhr.withCredentials = true;

                function abort() {
                    xhr.abort();
                }

                sendChunkStarted();

                const progressListener = this.handleProgress.bind(
                    this,
                    part.PartNumber - 1
                );

                xhr.addEventListener('progress', progressListener);
                xhr.addEventListener('error', progressListener);
                xhr.addEventListener('abort', progressListener);
                xhr.addEventListener('loadend', progressListener);

                const parameters = `url=${encodeURIComponent(params.url)}`;
                xhr.open('GET', `${this.urlService}?${parameters}`, true);

                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                // xhr.setRequestHeader('Authorization', this.token)

                xhr.setRequestHeader('Range', `bytes=${start}-${end}`); // Set range request information
                xhr.responseType = 'arraybuffer'; // Set the returned type to arraybuffer

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 400) {
                        const downloadedPart = {
                            index: PartNumber,
                            PartNumber: PartNumber,
                            buffer: xhr.response,
                        };

                        this.downloadedParts.push(downloadedPart);
                        delete this.activeConnections[part.PartNumber - 1];

                        resolve(xhr.status);
                    }
                    return reject(xhr);
                };

                if (options.signal) {
                    options.signal.addEventListener('abort', abort);
                }
                xhr.onreadystatechange = () => {
                    if (options.signal) {
                        if (xhr.readyState === DONE_STATE) {
                            options.signal.removeEventListener('abort', abort);
                        }
                    }
                    /*
                    if (
                        xhr.readyState === 4 &&
                        (xhr.status >= 200 &&
                        xhr.status < 400)
                    ) {
                        delete this.activeConnections[part.PartNumber - 1]
                        resolve(xhr.status)
                       
                    } */
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
                    reject(new AbortError());
                    delete this.activeConnections[part.PartNumber - 1];
                };
                xhr.send();
            } catch (err) {
                // @ts-ignore
                reject(new Error(err));
            }
        });
    }

    handleProgress(part: number, event: { type: string; loaded: any }) {
        if (
            event.type === 'progress' ||
            event.type === 'error' ||
            event.type === 'abort'
        ) {
            this.progressCache[part] = event.loaded;
        }

        if (event.type === 'uploaded') {
            this.downloadedSize += this.progressCache[part] || 0;
            delete this.progressCache[part];
        }

        const inProgress = Object.keys(this.progressCache)
            .map(Number)
            .reduce((memo, id) => (memo += this.progressCache[id]), 0);

        const sent = Math.min(
            this.downloadedSize + inProgress,
            this.contentLength
        );

        const total = this.contentLength;

        const percentage = Math.round((sent / total) * 100); // progress

        this.onProgressFn({
            sent: sent,
            total: total,
            percentage: percentage,
            fileSize: sent,
        });
    }

    getContentLength(params: any) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.withCredentials = true;

            const parameters = `url=${encodeURIComponent(params.url)}`;
            xhr.open('HEAD', `${this.urlService}?${parameters}`);

            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            // xhr.setRequestHeader('Authorization', token)

            xhr.send();
            // eslint-disable-next-line func-names
            xhr.onload = function () {
                resolve({
                    // xhr.getResponseHeader("Accept-Ranges") === "bytes" &&
                    // eslint-disable-next-line no-bitwise
                    // @ts-ignore
                    contentLength: ~~xhr.getResponseHeader('Content-Length'),
                    contentDisposition: xhr.getResponseHeader(
                        'Content-Disposition'
                    ),
                    contentType: xhr.getResponseHeader('Content-Type'),
                });
            };
            xhr.onerror = reject;
        });
    }
    getBlob({
        name,
        buffers,
        mime = 'application/octet-stream',
        extension,
    }): Blob {
        const fileName = name;

        const removeExtension = (filename: any) => {
            const lastDotPosition = filename.lastIndexOf('.');
            if (lastDotPosition === -1) return filename;
            // eslint-disable-next-line no-else-return
            else return filename.substr(0, lastDotPosition);
        };
        const getFullName = () => `${removeExtension(fileName)}.${extension}`;

        const blob = new Blob([buffers], { type: mime });
        // @ts-ignore
        blob.name = getFullName();
        return blob;
    }
    saveAs({ name, buffers, mime = 'application/octet-stream', extension }) {
        const fileName = name;

        const removeExtension = (filename: any) => {
            const lastDotPosition = filename.lastIndexOf('.');
            if (lastDotPosition === -1) return filename;
            // eslint-disable-next-line no-else-return
            else return filename.substr(0, lastDotPosition);
        };
        const getFullName = () => `${removeExtension(fileName)}.${extension}`;

        const blob = new Blob([buffers], { type: mime });
        const blobUrl = (window.URL || window.webkitURL).createObjectURL(blob);
        const link = document.createElement('a');

        link.setAttribute('download', getFullName());

        link.download = name || Math.random();
        link.href = blobUrl;
        link.click();
        // @ts-ignore
        URL.revokeObjectURL(blob);
    }
    getParts() {
        return this.parts.length;
    }

    getCompleted() {
        return this.isCompleted;
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
