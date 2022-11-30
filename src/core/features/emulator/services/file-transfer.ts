// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { CoreTextUtils } from '@services/utils/text';
import { Injectable } from '@angular/core';
import { FileTransfer, FileTransferObject, FileUploadResult, FileTransferError } from '@ionic-native/file-transfer/ngx';

import { CoreFile } from '@services/file';

/**
 * Mock the File Transfer Error.
 */
export class FileTransferErrorMock implements FileTransferError {

    static readonly FILE_NOT_FOUND_ERR = 1;
    static readonly INVALID_URL_ERR = 2;
    static readonly CONNECTION_ERR = 3;
    static readonly ABORT_ERR = 4;
    static readonly NOT_MODIFIED_ERR = 5;

    constructor(
        public code: number,
        public source: string,
        public target: string,
        public http_status: number,
        public body: string,
        public exception: string,
    ) { }

}

/**
 * Emulates the Cordova FileTransfer plugin in desktop apps and in browser.
 */
@Injectable()
export class FileTransferMock extends FileTransfer {

    /**
     * Creates a new FileTransferObjectMock object.
     *
     * @returns a new file transfer mock.
     */
    create(): FileTransferObjectMock {
        return new FileTransferObjectMock();
    }

}

/**
 * Emulates the FileTransferObject class in desktop apps and in browser.
 */
export class FileTransferObjectMock extends FileTransferObject {

    progressListener?: (event: ProgressEvent) => void;
    source?: string;
    target?: string;
    xhr?: XMLHttpRequest;

    protected reject?: (reason?: unknown) => void;

    /**
     * Aborts an in-progress transfer. The onerror callback is passed a FileTransferError
     * object which has an error code of FileTransferError.ABORT_ERR.
     */
    abort(): void {
        if (this.xhr) {
            this.xhr.abort();
            this.reject?.(
                new FileTransferErrorMock(FileTransferErrorMock.ABORT_ERR, this.source || '', this.target || '', 0, '', ''),
            );
        }
    }

    /**
     * Downloads a file from server.
     *
     * @param source URL of the server to download the file, as encoded by encodeURI().
     * @param target Filesystem url representing the file on the device.
     * @param trustAllHosts If set to true, it accepts all security certificates.
     * @param options Optional parameters, currently only supports headers.
     * @returns Returns a Promise that resolves to a FileEntry object.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    download(source: string, target: string, trustAllHosts?: boolean, options?: { [s: string]: any }): Promise<unknown> {
        return new Promise((resolve, reject): void => {
            // Use XMLHttpRequest instead of HttpClient to support onprogress and abort.
            const basicAuthHeader = this.getBasicAuthHeader(source);
            const xhr = new XMLHttpRequest();

            this.xhr = xhr;
            this.source = source;
            this.target = target;
            this.reject = reject;

            if (basicAuthHeader) {
                source = source.replace(this.getUrlCredentials(source) + '@', '');

                options = options || {};
                options.headers = options.headers || {};
                options.headers[basicAuthHeader.name] = basicAuthHeader.value;
            }

            const headers = options?.headers || null;

            // Prepare the request.
            xhr.open('GET', source, true);
            xhr.responseType = 'blob';
            for (const name in headers) {
                // We can't set the User-Agent in browser.
                if (name !== 'User-Agent') {
                    xhr.setRequestHeader(name, headers[name]);
                }
            }

            xhr.onprogress = (ev: ProgressEvent): void => {
                if (this.progressListener) {
                    this.progressListener(ev);
                }
            };

            xhr.onerror = (): void => {
                reject(new FileTransferErrorMock(-1, source, target, xhr.status, xhr.statusText, ''));
            };

            xhr.onload = async (): Promise<void> => {
                // Finished dowloading the file.
                let response = xhr.response || xhr.responseText;

                const status = Math.max(xhr.status === 1223 ? 204 : xhr.status, 0);
                if (status < 200 || status >= 300) {
                    // Request failed. Try to get the error message.
                    response = await this.parseResponse(response);

                    reject(new FileTransferErrorMock(-1, source, target, xhr.status, response || xhr.statusText, ''));

                    return;
                }

                if (!response) {
                    reject();

                    return;
                }

                const basePath = CoreFile.getBasePathInstant();
                target = target.replace(basePath, ''); // Remove basePath from the target.
                target = target.replace(/%20/g, ' '); // Replace all %20 with spaces.

                // eslint-disable-next-line promise/catch-or-return
                CoreFile.writeFile(target, response).then(resolve, reject);
            };

            xhr.send();
        });
    }

    /**
     * Given a URL, check if it has a credentials in it and, if so, return them in a header object.
     * This code is extracted from Cordova FileTransfer plugin.
     *
     * @param urlString The URL to get the credentials from.
     * @returns The header with the credentials, null if no credentials.
     */
    protected getBasicAuthHeader(urlString: string): {name: string; value: string} | null {
        let header: {name: string; value: string} | null = null;

        // MS Windows doesn't support credentials in http uris so we detect them by regexp and strip off from result url.
        if (window.btoa) {
            const credentials = this.getUrlCredentials(urlString);
            if (credentials) {
                header = {
                    name: 'Authorization',
                    value: 'Basic ' + window.btoa(credentials),
                };
            }
        }

        return header;
    }

    /**
     * Given an instance of XMLHttpRequest, get the response headers as an object.
     *
     * @param xhr XMLHttpRequest instance.
     * @returns Object with the headers.
     */
    protected getHeadersAsObject(xhr: XMLHttpRequest): Record<string, string> {
        const headersString = xhr.getAllResponseHeaders();
        const result = {};

        if (headersString) {
            const headers = headersString.split('\n');
            for (const i in headers) {
                const headerString = headers[i];
                const separatorPos = headerString.indexOf(':');
                if (separatorPos != -1) {
                    result[headerString.substring(0, separatorPos)] = headerString.substring(separatorPos + 1).trim();
                }
            }
        }

        return result;
    }

    /**
     * Get the credentials from a URL.
     * This code is extracted from Cordova FileTransfer plugin.
     *
     * @param urlString The URL to get the credentials from.
     * @returns Retrieved credentials.
     */
    protected getUrlCredentials(urlString: string): string | null {
        const credentialsPattern = /^https?:\/\/(?:(?:(([^:@/]*)(?::([^@/]*))?)?@)?([^:/?#]*)(?::(\d*))?).*$/;
        const credentials = credentialsPattern.exec(urlString);

        return credentials && credentials[1];
    }

    /**
     * Registers a listener that gets called whenever a new chunk of data is transferred.
     *
     * @param listener Listener that takes a progress event.
     */
    onProgress(listener: (event: ProgressEvent) => void): void {
        this.progressListener = listener;
    }

    /**
     * Parse a response, converting it into text and the into an object if needed.
     *
     * @param response The response to parse.
     * @returns Promise resolved with the parsed response.
     */
    protected async parseResponse(response: Blob | ArrayBuffer | string | null): Promise<unknown> {
        if (!response) {
            return '';

        }

        let responseText = '';

        if (response instanceof Blob) {
            responseText = await this.blobToText(response);

        } else if (response instanceof ArrayBuffer) {
            // Convert the ArrayBuffer into text.
            responseText = String.fromCharCode.apply(null, new Uint8Array(response));

        } else {
            responseText = response;
        }

        return CoreTextUtils.parseJSON(responseText, '');
    }

    /**
     * Convert a Blob to text.
     *
     * @param blob Blob to convert.
     * @returns Promise resolved with blob contents.
     */
    protected blobToText(blob: Blob): Promise<string> {
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = (): void => {
                resolve(<string> reader.result);
            };
            reader.readAsText(blob);
        });
    }

    /**
     * Sends a file to a server.
     *
     * @param fileUrl Filesystem URL representing the file on the device or a data URI.
     * @param url URL of the server to receive the file, as encoded by encodeURI().
     * @param options Optional parameters.
     * @returns Promise that resolves to a FileUploadResult and rejects with FileTransferError.
     */
    upload(fileUrl: string, url: string, options?: FileUploadOptions): Promise<FileUploadResult> {
        return new Promise((resolve, reject): void => {
            const basicAuthHeader = this.getBasicAuthHeader(url);
            let fileKey: string | undefined;
            let fileName: string | undefined;
            let params: any; // eslint-disable-line @typescript-eslint/no-explicit-any
            let headers: any; // eslint-disable-line @typescript-eslint/no-explicit-any
            let httpMethod: string | undefined;

            if (basicAuthHeader) {
                url = url.replace(this.getUrlCredentials(url) + '@', '');

                options = options || {};
                options.headers = options.headers || {};
                options.headers[basicAuthHeader.name] = basicAuthHeader.value;
            }

            if (options) {
                fileKey = options.fileKey;
                fileName = options.fileName;
                headers = options.headers;
                httpMethod = options.httpMethod || 'POST';

                if (httpMethod.toUpperCase() == 'PUT') {
                    httpMethod = 'PUT';
                } else {
                    httpMethod = 'POST';
                }

                params = options.params || {};
            }

            // Add fileKey and fileName to the headers.
            headers = headers || {};
            if (!headers['Content-Disposition']) {
                headers['Content-Disposition'] = 'form-data;' + (fileKey ? ' name="' + fileKey + '";' : '') +
                    (fileName ? ' filename="' + fileName + '"' : '');
            }

            // Adding a Content-Type header with the mimeType makes the request fail (it doesn't detect the token in the params).
            // Don't include this header, and delete it if it's supplied.
            delete headers['Content-Type'];

            // Get the file to upload.
            CoreFile.getFile(fileUrl).then((fileEntry) =>
                CoreFile.getFileObjectFromFileEntry(fileEntry)).then((file) => {
                // Use XMLHttpRequest instead of HttpClient to support onprogress and abort.
                const xhr = new XMLHttpRequest();
                xhr.open(httpMethod || 'POST', url);
                for (const name in headers) {
                    // Filter "unsafe" headers.
                    if (name !=='Connection' && name !== 'User-Agent') {
                        xhr.setRequestHeader(name, headers[name]);
                    }
                }

                xhr.onprogress = (ev: ProgressEvent): void => {
                    if (this.progressListener) {
                        this.progressListener(ev);
                    }
                };

                this.xhr = xhr;
                this.source = fileUrl;
                this.target = url;
                this.reject = reject;

                xhr.onerror = (): void => {
                    reject(new FileTransferErrorMock(-1, fileUrl, url, xhr.status, xhr.statusText, ''));
                };

                xhr.onload = (): void => {
                    // Finished uploading the file.
                    resolve({
                        bytesSent: file.size,
                        responseCode: xhr.status,
                        response: xhr.response,
                        headers: this.getHeadersAsObject(xhr),
                    });
                };

                // Create a form data to send params and the file.
                const fd = new FormData();
                for (const name in params) {
                    fd.append(name, params[name]);
                }
                fd.append('file', file, fileName);

                xhr.send(fd);

                return;
            }).catch(reject);
        });
    }

}
