import axios from 'axios';
import moment from 'moment';

import { encrypt, decrypt } from '../helper';
import { downloadMultiThreadDownload } from './MultithreadDownload';

// export const NAME_TOKEN = '_TOKEN';
const IS_ENCRYPT: boolean = false;
const API_KEY_CRYPTO = '';

// Transfer

const downloadFile = ({ response, fileName = '' }) => {
    const disposition = response.headers['content-disposition'];
    let defaultFileName = '';

    if (disposition) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
            defaultFileName = matches[1].replace(/['"]/g, '');
        }
    }
    // eslint-disable-next-line no-undef
    const blob = new Blob([response.data], { type: response.data.type });
    // eslint-disable-next-line no-undef
    const linkUrl = window.URL.createObjectURL(blob);
    // eslint-disable-next-line no-undef
    const link = document.createElement('a');
    link.href = linkUrl;
    // eslint-disable-next-line new-ca
    // @ts-ignore
    const time = new moment().unix();

    link.setAttribute(
        'download',
        defaultFileName ? `${time}-${defaultFileName}` : `${time}-${fileName}`
    );
    // eslint-disable-next-line no-undef
    document.body.appendChild(link);
    return link.click();
};

const headersDefaultTransfer = () => ({
    'Content-Type':  'application/json',
    'X-Requested-With': 'XMLHttpRequest',
});

const requestTransferF = (config) => {
    config.headers['Private-Ip-Address'] = '';

    if (config?.data && IS_ENCRYPT) {
        let dataApp = JSON.stringify(config.data);
        dataApp = encrypt({ payload: dataApp, key: API_KEY_CRYPTO });

        config.data = {
            encrypt: dataApp,
        };
    }
    if (config?.params && IS_ENCRYPT) {
        let paramsApp = JSON.stringify(config.params);
        paramsApp = encrypt({ payload: paramsApp, key: API_KEY_CRYPTO });

        config.params = {
            encryptParams: paramsApp,
        };
    }
    return config;
};

const requestTransfer = (config: any) => requestTransferF(config);
const requestError = (error: any) => Promise.reject(error);

const responseF = (response: any) => {
    if (response?.data && IS_ENCRYPT) {
        if (
            response?.config?.responseType === 'blob'
            // eslint-disable-next-line no-empty
        ) {
        } else {
            response.data = decrypt({
                encrypted: response.data.toString(),
                key: API_KEY_CRYPTO,
            });
        }
    }
    return response;
};

const responseErrorTransfer = (config: any) => Promise.reject(config);

const httpTransfer = axios.create({
    // baseURL: `${API_URL_TRANSFER_FILE}/api`,
    withCredentials: true,
    timeout: 0,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    // 'Content-Type':  'application/json',
   // 'X-Requested-With': 'XMLHttpRequest',
});
httpTransfer.defaults.headers.post['Content-Type'] = 'application/json';
httpTransfer.defaults.headers.common = headersDefaultTransfer();
httpTransfer.interceptors.request.use(requestTransfer, requestError);
httpTransfer.interceptors.response.use(responseF, responseErrorTransfer);

export default {
    // =====>
    async getUploadFileToken(params) {
        try {
            const resource = `${params?.urlService}/api/file`;
            // eslint-disable-next-line no-undef
            // const token = await sessionStorage.getItem(NAME_TOKEN);
            const response = await httpTransfer.get(
                `${resource}/get-upload-file-token`,
                {
                    params,
                    headers: {
                        // Authorization: `Bearer ${token}`,
                        'App-UUID': params?.appUUID,
                        'Module-UUID': params?.moduleUUID,
                    },
                }
            );
            if (response?.status === 202) {
                const { data: parsedResponse } = response;
                return Promise.resolve(parsedResponse);
            }
            return Promise.reject(response);
        } catch (error) {
            return Promise.reject(error);
        }
    },
    async getDownloadFileToken(formData: any, params: any) {
        try {
            const resource = `${params.urlService}/api/file`;
            // eslint-disable-next-line no-undef
            // const token = await sessionStorage.getItem(NAME_TOKEN);
            const response = await httpTransfer.post(
                `${resource}/get-download-file-token`,
                formData,
                {
                    headers: {
                        // Authorization: `Bearer ${token}`,
                        'Access-Control-Allow-Origin': '*',
                        'App-UUID': params?.appUUID,
                        'Module-UUID': params?.moduleUUID,
                    },
                }
            );
            if (response?.status === 202) {
                const { data: parsedResponse } = response;
                return Promise.resolve(parsedResponse);
            }
            return Promise.reject(response);
        } catch (error) {
            return Promise.reject(error);
        }
    },
    upload({ params, headers }, onUploadProgress) {
        const resource = `${params?.urlService}/api/file`;
        const { file, uuid } = params;
        // eslint-disable-next-line no-undef
        const formData = new FormData();
        formData.append('file', file);
        formData.append('uuid', uuid);

        return httpTransfer.post(`${resource}/store-file`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                ...headers,
            },
            onUploadProgress,
        });
    },
    async showFile({ uuid, headers, ...params }) {
        try {
            const resource = `${params?.urlService}/api/file`;
            const response = await httpTransfer.get(
                `${resource}/show-file/${uuid}`,
                {
                    headers: {
                        ...headers,
                    },
                }
            );
            if (response?.status === 202) {
                const { data: parsedResponse } = response;
                return Promise.resolve(parsedResponse);
            }
            return Promise.reject(response);
        } catch (error) {
            return Promise.reject(error);
        }
    },

    async showFileS3({ uuid, headers, ...params }, onDownloadProgress) {
        try {
            const resource = `${params?.urlService}/api/file`;
            const response = await httpTransfer.get(
                `${resource}/show-file-s3/${uuid}`,
                {
                    headers: {
                        ...headers,
                    },
                    onDownloadProgress,
                    responseType: 'blob',
                }
            );
            if (response?.status === 202) {
                return Promise.resolve(response);
            }
            return Promise.reject(response);
        } catch (error) {
            return Promise.reject(error);
        }
    },

    async showDetailFileS3({ uuid, headers, ...params }) {
        try {
            const resource = `${params?.urlService}/api/file`;
            const response = await httpTransfer.get(
                `${resource}/show-detail-file-s3/${uuid}`,
                {
                    headers: {
                        ...headers,
                    },
                }
            );
            if (response?.status === 202) {
                const { data: parsedResponse } = response;
                return Promise.resolve(parsedResponse);
            }
            return Promise.reject(response);
        } catch (error) {
            return Promise.reject(error);
        }
    },
    //
    async generateDownloadSignedUrl({ fileUUID, urlService }) {
        try {
            const resource = `${urlService}/api/file`;
            // eslint-disable-next-line no-undef
            // const token = await sessionStorage.getItem(NAME_TOKEN);
            const response = await httpTransfer.get(
                `${resource}/download/generate-download-signed-url/${fileUUID}`
            ); // ,
            /* {
                    headers: {
                        //   Authorization: `Bearer ${token}`,
                    },
                }
             */
            if (response?.status === 202) {
                const { data: parsedResponse } = response;
                return Promise.resolve(parsedResponse);
            }
            return Promise.reject(response);
        } catch (error) {
            return Promise.reject(error);
        }
    },

    // ==>

    async downloadFileSignedUrl({ params }) {
        try {
            const resource = `${params?.urlService}/api/file`;
            // eslint-disable-next-line no-undef

            // eslint-disable-next-line no-undef
            // const token = sessionStorage.getItem(NAME_TOKEN);

            const { buffers, contentType } = await downloadMultiThreadDownload({
                url: `${resource}/download/download-file-signed-url`,
                params,
                chunkSize: 5 * 1024 * 1024,
                poolLimit: 6,
                // token: `Bearer ${token}`,
            });

            if (buffers) {
                // eslint-disable-next-line no-undef
                const blob = new Blob([buffers], { type: contentType });

                return Promise.resolve(blob);
            }
            // eslint-disable-next-line prefer-promise-reject-errors
            return Promise.reject('Existió un error al descargar.');
        } catch (error) {
            return Promise.reject(error);
        }
    },

    /////

    async initializeMultipartUpload({
        data,
        controller,
        urlService,
        appUUID,
        moduleUUID,
    }) {
        try {
            const resource = `${urlService}/api/file`;
            // eslint-disable-next-line no-undef
            // const token = await sessionStorage.getItem(NAME_TOKEN);
            const response = await httpTransfer.post(
                `${resource}/upload/initialize-multipart-upload`,
                data,
                {
                    signal: controller?.signal,
                    headers: {
                        //           Authorization: `Bearer ${token}`,
                        'App-UUID': appUUID,
                        'Module-UUID': moduleUUID,
                    },
                }
            );
            if (response?.status === 201) {
                const { data: parsedResponse } = response;
                return Promise.resolve(parsedResponse);
            }
            return Promise.reject(response);
        } catch (error) {
            return Promise.reject(error);
        }
    },
    async getMultipartPreSignedUrls({
        appUUID,
        moduleUUID,
        data,
        controller,
        urlService,
    }) {
        try {
            const resource = `${urlService}/api/file`;
            // eslint-disable-next-line no-undef
            // const token = await sessionStorage.getItem(NAME_TOKEN);
            const response = await httpTransfer.post(
                `${resource}/upload/get-multipart-pre-signed-urls`,
                data,
                {
                    signal: controller?.signal,
                    headers: {
                        //    Authorization: `Bearer ${token}`,
                        'App-UUID': appUUID,
                        'Module-UUID': moduleUUID,
                    },
                }
            );
            if (response?.status === 202) {
                const { data: parsedResponse } = response;
                return Promise.resolve(parsedResponse);
            }
            return Promise.reject(response);
        } catch (error) {
            return Promise.reject(error);
        }
    },
    async finalizeMultipartUpload({ appUUID, moduleUUID, data, urlService }) {
        try {
            const resource = `${urlService}/api/file`;
            // eslint-disable-next-line no-undef
            // const token = await sessionStorage.getItem(NAME_TOKEN);
            const response = await httpTransfer.post(
                `${resource}/upload/finalize-multipart-upload`,
                data,
                {
                    headers: {
                        //   Authorization: `Bearer ${token}`,
                        'App-UUID': appUUID,
                        'Module-UUID': moduleUUID,
                    },
                }
            );
            if (response?.status === 202) {
                const { data: parsedResponse } = response;
                return Promise.resolve(parsedResponse);
            }
            return Promise.reject(response);
        } catch (error) {
            return Promise.reject(error);
        }
    },

    // end multiparts

    // start ocr

    uploadToValidateOcr({ params }) {
        const { file, urlOCRService } = params;
        const resource = `${urlOCRService}/api/file/validate-is-empty`;

        // eslint-disable-next-line no-undef
        const formData = new FormData();
        formData.append('file', file);

        return httpTransfer.post(resource, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
};
