/* eslint-disable no-undef */
// https://blog.bitsrc.io/implement-concurrent-download-of-large-files-in-javascript-4e94202c5373

function concatenate(arrays: any) {
    if (!arrays.length) return null;
    const totalLength = arrays.reduce((acc, value) => acc + value.length, 0);
    const result = new Uint8Array(totalLength);
    let length = 0;
    // eslint-disable-next-line no-restricted-syntax
    for (const array of arrays) {
        result.set(array, length);
        length += array.length;
    }
    return result;
}

function getContentLength(url,  params) { // token,
    return new Promise((resolve, reject) => {
        const parameters = `url=${encodeURIComponent(params.url)}`;
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.open('HEAD', `${url}?${parameters}`);

        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      //  xhr.setRequestHeader('Authorization', token);

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

function getBinaryContent(url, start, end, i, params) {// , token
    return new Promise((resolve, reject) => {
        try {
            const parameters = `url=${encodeURIComponent(params.url)}`;
            const xhr = new XMLHttpRequest();
            xhr.withCredentials = true;

            xhr.open('GET', `${url}?${parameters}`, true);

            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
           // xhr.setRequestHeader('Authorization', token);

            xhr.setRequestHeader('Range', `bytes=${start}-${end}`); // Set range request information
            xhr.responseType = 'arraybuffer'; // Set the returned type to arraybuffer
            // eslint-disable-next-line func-names
            xhr.onload = function () {
                resolve({
                    index: i, // file block index
                    buffer: xhr.response,
                });
            };
            xhr.send();
        } catch (err) {
            // @ts-ignore
            reject(new Error(err));
        }
    });
}

async function asyncPool(concurrency: any, iterable: any, iteratorFn: any) {
    const ret = []; // Store all asynchronous tasks
    const executing = new Set(); // Stores executing asynchronous tasks
    // eslint-disable-next-line no-restricted-syntax
    for (const item of iterable) {
        // Call the iteratorFn function to create an asynchronous task
        const p = Promise.resolve().then(() => iteratorFn(item, iterable));
        // @ts-ignore
        ret.push(p); // save new async task
        executing.add(p); // Save an executing asynchronous task

        const clean = () => executing.delete(p);
        p.then(clean).catch(clean);
        if (executing.size >= concurrency) {
            // Wait for faster task execution to complete
            // eslint-disable-next-line no-await-in-loop
            await Promise.race(executing);
        }
    }
    return Promise.all(ret);
}

export async function downloadMultiThreadDownload({
    url,
    chunkSize,
    poolLimit = 1,
   // token,
    params,
}) {
    // @ts-ignore
    const { contentLength, contentDisposition, contentType } =
        await getContentLength(url, 
            // token, 
            params);

    const chunks =
        typeof chunkSize === 'number'
            ? Math.ceil(contentLength / chunkSize)
            : 1;

    const results = await asyncPool(
        poolLimit,
        [...new Array(chunks).keys()],
        (i) => {
            const start = i * chunkSize;
            const end =
                i + 1 === chunks ? contentLength - 1 : (i + 1) * chunkSize - 1;

            return getBinaryContent(url, start, end, i, params); // token, 
        }
    );
     // @ts-ignore
    const sortedBuffers = results.map((item) => new Uint8Array(item.buffer));

    const buffers = concatenate(sortedBuffers);

    return { buffers, contentDisposition, contentType };
}

export function saveAs({
    name,
    buffers,
    mime = 'application/octet-stream',
    extension,
}) {
    const fileName = name;

    const removeExtension = (filename) => {
        const lastDotPosition = filename.lastIndexOf('.');
        if (lastDotPosition === -1) return filename;
        // eslint-disable-next-line no-else-return
        else return filename.substr(0, lastDotPosition);
    };
    const getFullName = () => `${removeExtension(fileName)}.${extension}`;

    const blob = new Blob([buffers], { type: mime });
    const blobUrl = (window.URL || window.webkitURL).createObjectURL(blob);
    const link = document.createElement('a');

    // @ts-ignore
    link.setAttribute('download', fileName ? getFullName() : defaultFileName);

    link.download = name || Math.random();
    link.href = blobUrl;
    link.click();
    // @ts-ignore
    URL.revokeObjectURL(blob);
}
