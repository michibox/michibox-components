/* import dynamic from 'next/dynamic'; */
import {
    PENDING_STATUS,
    UPLOADING_STATUS,
    COMPLETE_STATUS,
    ERROR_STATUS,
    CANCELING_STATUS,
    CANCELLED_STATUS,
} from './fileStatus';
import { Evented } from './evented';
import { bindAll, extend } from './util';
import { Uploader } from './uploader';
/* import { AbortController } from './AbortController'; */

/* const AbortController = dynamic((() => import('./AbortController').then((mod) => {
    console.log()
}) as any, {
    ssr: false,
}); */

export interface IDetail {
    file: File;
    fileName: string;
    extension: string;
    contentType: string;
    fileSize: number;
    sha256: string;
    fileStatus: number;
}

export class UploadFile extends Evented {
    id: any;
    urlService: string;
    uploader: any;
    controller: any;
    detail: any;
    instance: any;
    slice: any;
    mozSlice: any;
    webkitSlice: any;

    appUUID: any;
    moduleUUID: any;
    constructor(options?: any, legacyOptions?: any) {
        super();

        if (options instanceof window.HTMLElement || legacyOptions) {
            options = extend({ element: options }, legacyOptions);
        }

        bindAll(['_update', '_resume', '_abort'], this);
        this.id = null;
        this.urlService = options.urlService;
        this.appUUID = options.appUUID;
        this.moduleUUID = options.moduleUUID;

        this.id = null;
        this.uploader = null;
        this.start();
        this.controller = null;
    }

    start() {
        return this;
    }

    setDetail(detail: IDetail) {
        this.detail = {
            ...detail,
            progress: 0,
            fileStatus: PENDING_STATUS,
        };
        /* console.log("AbortController", AbortController)
        console.log("new AbortController(", new AbortController()) */
        //  this.controller = new AbortController();
        this.fire('status');
        this.initUpload();
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

    setProgress(percentage: number) {
        this.detail = {
            ...this.getDetail(),
            progress: percentage,
            fileStatus: UPLOADING_STATUS,
        };
        this.fire('progress');
        return this;
    }

    setFileUUID(response: any) {
        this.detail = {
            ...this.getDetail(),
            progress: 0,
            fileStatus: UPLOADING_STATUS,
            fileInit: { ...response },
        };
        this.fire('status');
        this.fire('initUpload');
        return this;
    }

    async setComplete() {
        this.detail = {
            ...this.getDetail(),
            progress: 100,
            fileStatus: COMPLETE_STATUS,
        };

        this.fire('status');
        this.fire('completeUploadFileSystem');

        return this;
    }

    setError(event: any) {
        console.log('setError event:', event);
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
        const detail = this.detail;

        this.detail = {
            ...detail,
            progress: 0,
            fileStatus: PENDING_STATUS,
        };
        if (
            this.uploader.getParts() === 0 &&
            this.uploader.getCompleted() === true
        ) {
            this.setComplete();
        } else if (
            this.uploader.getParts() === 0 &&
            this.uploader.getCompleted() === false
        ) {
            this.uploader.start();
        } else {
            this.uploader.sendNext();
        }
        this.fire('status');
        return this;
    }
    _abort() {
        const detail = this.detail;

        this.detail = {
            ...detail,
            progress: 0,
            fileStatus: CANCELING_STATUS,
        };
        this.fire('status');
        this.uploader.abort();
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

    initUpload() {
        const uploaderOptions = this.detail;

        this.uploader = new Uploader({
            ...uploaderOptions,
            controller: this.controller,
            urlService: this.urlService,
            appUUID: this.appUUID,
            moduleUUID: this.moduleUUID,
        });

        this.uploader
            .onInit((responseInit: any) => {
                this.setFileUUID(responseInit);
            })
            .onProgress((response: any) => {
                if (response.percentage !== 100) {
                    this.setProgress(response.percentage);
                }
            })
            .onComplete(() => {
                this.setComplete();
            })
            .onError((event: any) => {
                this.setError(event);
            });
        this.uploader.start();
        this.fire('status');
    }
}
