// (C) Copyright 2015 Martin Dougiamas
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

import { Injectable } from '@angular/core';
import { FileTransfer, FileTransferObject, FileUploadResult, FileTransferError } from '@ionic-native/file-transfer';
import { CoreAppProvider } from '@providers/app';
import { CoreFileProvider } from '@providers/file';

/**
 * Mock the File Transfer Error.
 */
export class FileTransferErrorMock implements FileTransferError {
    static FILE_NOT_FOUND_ERR = 1;
    static INVALID_URL_ERR = 2;
    static CONNECTION_ERR = 3;
    static ABORT_ERR = 4;
    static NOT_MODIFIED_ERR = 5;

    // tslint:disable-next-line: variable-name
    constructor(public code: number, public source: string, public target: string, public http_status: number,
        public body: string, public exception: string) { }
}

/**
 * Emulates the Cordova FileTransfer plugin in desktop apps and in browser.
 */
@Injectable()
export class FileTransferMock extends FileTransfer {

    constructor(private appProvider: CoreAppProvider, private fileProvider: CoreFileProvider) {
        super();
    }

    /**
     * Creates a new FileTransferObjectMock object.
     *
     * @return {FileTransferObjectMock}
     */
    create(): FileTransferObjectMock {
        return new FileTransferObjectMock(this.appProvider, this.fileProvider);
    }
}

/**
 * Emulates the FileTransferObject class in desktop apps and in browser.
 */
export class FileTransferObjectMock extends FileTransferObject {
    progressListener: (event: ProgressEvent) => any;
    source: string;
    target: string;
    xhr: XMLHttpRequest;
    protected reject: Function;

    constructor(private appProvider: CoreAppProvider, private fileProvider: CoreFileProvider) {
        super();
    }

    /**
     * Aborts an in-progress transfer. The onerror callback is passed a FileTransferError
     * object which has an error code of FileTransferError.ABORT_ERR.
     */
    abort(): void {
        if (this.xhr) {
            this.xhr.abort();
            this.reject(new FileTransferErrorMock(FileTransferErrorMock.ABORT_ERR, this.source, this.target, null, null, null));
        }
    }

    /**
     * Downloads a file from server.
     *
     * @param {string} source URL of the server to download the file, as encoded by encodeURI().
     * @param {string} target Filesystem url representing the file on the device.
     * @param {boolean} [trustAllHosts] If set to true, it accepts all security certificates.
     * @param {object} [options] Optional parameters, currently only supports headers.
     * @returns {Promise<any>} Returns a Promise that resolves to a FileEntry object.
     */
    download(source: string, target: string, trustAllHosts?: boolean, options?: { [s: string]: any; }): Promise<any> {
        return new Promise((resolve, reject): void => {
            // Use XMLHttpRequest instead of HttpClient to support onprogress and abort.
            const basicAuthHeader = this.getBasicAuthHeader(source),
                xhr = new XMLHttpRequest(),
                isDesktop = this.appProvider.isDesktop();
            let headers = null;

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

            if (options) {
                headers = options.headers || null;
            }

            // Prepare the request.
            xhr.open('GET', source, true);
            xhr.responseType = isDesktop ? 'arraybuffer' : 'blob';
            for (const name in headers) {
                xhr.setRequestHeader(name, headers[name]);
            }

            (<any> xhr).onprogress = (xhr, ev): void => {
                if (this.progressListener) {
                    this.progressListener(ev);
                }
            };

            xhr.onerror = (err): void => {
                reject(new FileTransferErrorMock(-1, source, target, xhr.status, xhr.statusText, null));
            };

            xhr.onload = (): void => {
                // Finished dowloading the file.
                let response = xhr.response || xhr.responseText;

                const status = Math.max(xhr.status === 1223 ? 204 : xhr.status, 0);
                if (status < 200 || status >= 300) {
                    // Request failed. Try to get the error message.
                    this.parseResponse(response).then((response) => {
                        reject(new FileTransferErrorMock(-1, source, target, xhr.status, response || xhr.statusText, null));
                    });

                    return;
                }

                if (!response) {
                    reject();
                } else {
                    const basePath = this.fileProvider.getBasePathInstant();
                    target = target.replace(basePath, ''); // Remove basePath from the target.
                    target = target.replace(/%20/g, ' '); // Replace all %20 with spaces.
                    if (isDesktop) {
                        // In desktop we need to convert the arraybuffer into a Buffer.
                        response = Buffer.from(<any> new Uint8Array(response));
                    }

                    this.fileProvider.writeFile(target, response).then(resolve, reject);
                }
            };

            xhr.send();
        });
    }

    /**
     * Given a URL, check if it has a credentials in it and, if so, return them in a header object.
     * This code is extracted from Cordova FileTransfer plugin.
     *
     * @param {string} urlString The URL to get the credentials from.
     * @return {any} The header with the credentials, null if no credentials.
     */
    protected getBasicAuthHeader(urlString: string): any {
        let header = null;

        // MS Windows doesn't support credentials in http uris so we detect them by regexp and strip off from result url.
        if (window.btoa) {
            const credentials = this.getUrlCredentials(urlString);
            if (credentials) {
                const authHeader = 'Authorization',
                    authHeaderValue = 'Basic ' + window.btoa(credentials);

                header = {
                    name: authHeader,
                    value: authHeaderValue
                };
            }
        }

        return header;
    }

    /**
     * Given an instance of XMLHttpRequest, get the response headers as an object.
     *
     * @param {XMLHttpRequest} xhr XMLHttpRequest instance.
     * @return {{[s: string]: any}} Object with the headers.
     */
    protected getHeadersAsObject(xhr: XMLHttpRequest): { [s: string]: any } {
        const headersString = xhr.getAllResponseHeaders(),
            result = {};

        if (headersString) {
            const headers = headersString.split('\n');
            for (const i in headers) {
                const headerString = headers[i],
                    separatorPos = headerString.indexOf(':');
                if (separatorPos != -1) {
                    result[headerString.substr(0, separatorPos)] = headerString.substr(separatorPos + 1).trim();
                }
            }
        }

        return result;
    }

    /**
     * Get the credentials from a URL.
     * This code is extracted from Cordova FileTransfer plugin.
     *
     * @param {string} urlString The URL to get the credentials from.
     * @return {string} Retrieved credentials.
     */
    protected getUrlCredentials(urlString: string): string {
        const credentialsPattern = /^https?\:\/\/(?:(?:(([^:@\/]*)(?::([^@\/]*))?)?@)?([^:\/?#]*)(?::(\d*))?).*$/,
            credentials = credentialsPattern.exec(urlString);

        return credentials && credentials[1];
    }

    /**
     * Registers a listener that gets called whenever a new chunk of data is transferred.
     *
     * @param {Function} listener Listener that takes a progress event.
     */
    onProgress(listener: (event: ProgressEvent) => any): void {
        this.progressListener = listener;
    }

    /**
     * Same as Javascript's JSON.parse, but it will handle errors.
     *
     * @param {string} json JSON text.
     * @return {any} JSON parsed as object or what it gets.
     */
    protected parseJSON(json: string): any {
        try {
            return JSON.parse(json);
        } catch (ex) {
            // Error.
        }

        return json;
    }

    /**
     * Parse a response, converting it into text and the into an object if needed.
     *
     * @param {any} response The response to parse.
     * @return {Promise<any>} Promise resolved with the parsed response.
     */
    protected parseResponse(response: any): Promise<any> {
        return new Promise((resolve, reject): void => {
            if (!response) {
                resolve('');
            } else if (response.toString && response.toString() == '[object Blob]') {
                // Convert the Blob into text.
                const reader = new FileReader();
                reader.onloadend = (): void => {
                    resolve(reader.result);
                };
                reader.readAsText(response);

            } else if (response.toString && response.toString() == '[object ArrayBuffer]') {
                // Convert the ArrayBuffer into text.
                resolve(String.fromCharCode.apply(null, new Uint8Array(response)));
            } else {
                resolve(response);
            }
        }).then((response: any) => {
            return this.parseJSON(response);
        });
    }

    /**
     * Sends a file to a server.
     *
     * @param {string} fileUrl Filesystem URL representing the file on the device or a data URI.
     * @param {string} url URL of the server to receive the file, as encoded by encodeURI().
     * @param {FileUploadOptions} [options] Optional parameters.
     * @param {boolean} [trustAllHosts] If set to true, it accepts all security certificates.
     * @returns {Promise<FileUploadResult>} Promise that resolves to a FileUploadResult and rejects with FileTransferError.
     */
    upload(fileUrl: string, url: string, options?: FileUploadOptions, trustAllHosts?: boolean): Promise<FileUploadResult> {
        return new Promise((resolve, reject): void => {
            const basicAuthHeader = this.getBasicAuthHeader(url);
            let fileKey = null,
                fileName = null,
                params = null,
                headers = null,
                httpMethod = null;

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

                if (options.params) {
                    params = options.params;
                } else {
                    params = {};
                }
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
            this.fileProvider.getFile(fileUrl).then((fileEntry) => {
                return this.fileProvider.getFileObjectFromFileEntry(fileEntry);
            }).then((file) => {
                // Use XMLHttpRequest instead of HttpClient to support onprogress and abort.
                const xhr = new XMLHttpRequest();
                xhr.open(httpMethod || 'POST', url);
                for (const name in headers) {
                    // Filter "unsafe" headers.
                    if (name != 'Connection') {
                        xhr.setRequestHeader(name, headers[name]);
                    }
                }

                xhr.onprogress = (ev: ProgressEvent): any => {
                    if (this.progressListener) {
                        this.progressListener(ev);
                    }
                };

                this.xhr = xhr;
                this.source = fileUrl;
                this.target = url;
                this.reject = reject;

                xhr.onerror = (): void => {
                    reject(new FileTransferErrorMock(-1, fileUrl, url, xhr.status, xhr.statusText, null));
                };

                xhr.onload = (): void => {
                    // Finished uploading the file.
                    resolve({
                        bytesSent: file.size,
                        responseCode: xhr.status,
                        response: xhr.response,
                        headers: this.getHeadersAsObject(xhr)
                    });
                };

                // Create a form data to send params and the file.
                const fd = new FormData();
                for (const name in params) {
                    fd.append(name, params[name]);
                }
                fd.append('file', file);

                xhr.send(fd);
            }).catch(reject);
        });
    }
}
