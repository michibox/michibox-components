/* eslint-disable no-unused-vars */
/* eslint-disable no-underscore-dangle */
/* eslint-disable lines-between-class-members */
/* eslint-disable no-param-reassign */
/* eslint-disable no-undef */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-this-before-super */
import {
    PENDING_STATUS,
    UPLOADING_STATUS,
    COMPLETE_STATUS,
    ERROR_STATUS,
    CANCELING_STATUS,
    CANCELLED_STATUS,
} from '../UploadFile/fileStatus';
import { Evented } from '../UploadFile/evented';
import { bindAll, extend } from '../UploadFile/util';
import { Downloader } from './downloader';
import { AbortController } from '../UploadFile/AbortController';

export interface detailProps {
    fileStatus: number;
    isDownload: boolean;
    preSignedUrl?: string | null;
    progress: number;
}
export class DownloadFile extends Evented {
    id: any;
    downloader: any;
    controller: any;
    detail: any;
    instance: any;

    // eslint-disable-next-line no-useless-constructor, constructor-super
    constructor(options?: any, legacyOptions?: any) {
        super();
        // For backward compatibility -- the constructor used to accept the element as a
        // required first argument, before it was made optional.
        if (options instanceof window.HTMLElement || legacyOptions) {
            options = extend({ element: options }, legacyOptions);
        }

        bindAll(['_update', '_resume', '_abort'], this);

        this.id = null;
        this.downloader = null;
        this.start();
        this.controller = null;
    }

    start() {
        return this;
    }

    setDetail(detail: detailProps) {
        this.detail = {
            ...detail,
            progress: 0,
            fileStatus: PENDING_STATUS,
        };
        this.controller = new AbortController();
        this.fire('status');
        this.initDownload();
        return this;
    }

    getDetail() {
        return this.detail;
    }

    setInstance(instance: any) {
        this.instance = instance;
    }
    getInstance() {
        return this.instance;
    }

    setProgress({ percentage, fileSize }) {
        this.detail = {
            ...this.getDetail(),
            fileSize: fileSize,
            progress: percentage,
            fileStatus: UPLOADING_STATUS,
        };
        this.fire('progress');
        return this;
    }

    async setComplete(
        fileSize = 0,
        blob = null,
        fileName = null,
        contentType = null
    ) {
        this.detail = {
            ...this.getDetail(),
            progress: 100,
            fileSize,
            fileStatus: COMPLETE_STATUS,
            blob,
            fileName,
            contentType,
        };

        /*  if (this.detail?.executeAfterDownload) {
            try {
                const fileJson = {
                    ...this.detail.fileJson,
                };

                await this.detail?.executeAfterDownload(fileJson);
            } catch (error) {
                console.error(error);
            }
        } */

        this.fire('status');
        this.fire('completeDownload');
        return this;
    }

    setError(event: any) {
        console.error(event);
        const name = event?.name;

        if (name !== 'AbortError') {
            this.detail = {
                ...this.getDetail(),
                progress: 0,
                fileStatus: ERROR_STATUS,
            };
            this.fire('status');
        }
        return this;
    }

    _update() {}
    _resume() {
        // eslint-disable-next-line prefer-destructuring
        const detail = this.detail;

        this.detail = {
            ...detail,
            progress: 0,
            fileStatus: PENDING_STATUS,
        };
        if (
            this.downloader.getParts() === 0 &&
            this.downloader.getCompleted() === true
        ) {
            this.setComplete();
        } else if (
            this.downloader.getParts() === 0 &&
            this.downloader.getCompleted() === false
        ) {
            this.downloader.start();
        } else {
            this.downloader.sendNext();
        }
        this.fire('status');
        return this;
    }
    _abort() {
        // eslint-disable-next-line prefer-destructuring
        const detail = this.detail;

        this.detail = {
            ...detail,
            progress: 0,
            fileStatus: CANCELING_STATUS,
        };
        this.fire('status');
        this.downloader.abort();
        setTimeout(() => {
            this.detail = {
                ...detail,
                progress: 0,
                fileStatus: CANCELLED_STATUS,
            };
            this.fire('status');
        }, 100);
        return this;
    }

    setFileUUID() {
        this.detail = {
            ...this.getDetail(),
            progress: 0,
            fileStatus: UPLOADING_STATUS,
        };
        this.fire('status');
        return this;
    }
    initDownload() {
        const downloaderOptions = this.detail;

        this.downloader = new Downloader({
            ...downloaderOptions,
            params: {
                url: downloaderOptions.preSignedUrl,
            },
            controller: this.controller,
        });

        this.downloader
            .onInit(() => {
                this.setFileUUID();
            })
            .onProgress(({ percentage, fileSize }) => {
                if (percentage !== 100) {
                    this.setProgress({ percentage, fileSize });
                }
            })
            .onComplete(({ fileSize, blob, fileName, contentType }) => {
                this.setComplete(fileSize, blob, fileName, contentType);
            })
            .onError((event: any) => {
                this.setError(event);
            });
        this.downloader.start();
        this.fire('status');
    }
}
