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

import { CoreFile } from '@services/file';
import { CapacitorException, ExceptionCode, PluginListenerHandle } from '@capacitor/core';
import {
    type DownloadFileOptions,
    type DownloadFileResult,
    type FileTransferError,
    type FileTransferPlugin,
    type ProgressStatus,
    type UploadFileOptions,
    type UploadFileResult,
} from '@capacitor/file-transfer';
import { CoreUrl } from '@static/url';
import { CoreFileUtils } from '@static/file-utils';
import { CoreErrorHelper } from '@services/error-helper';

/**
 * Emulates the Capacitor FileTransfer plugin in desktop apps and in browser.
 */
export class FileTransferMock implements FileTransferPlugin {

    protected progressListeners = new Set<(progress: ProgressStatus) => void>();

    /**
     * Perform an HTTP request to a server and download the file to the specified destination.
     *
     * @param options Download options.
     * @returns Promise resolved with download result.
     */
    async downloadFile(options: DownloadFileOptions): Promise<DownloadFileResult> {
        // Send params as GET params to mimic Capacitor behaviour.
        const source = CoreUrl.addParamsToUrl(options.url, options.params);

        return new Promise((resolve, reject) => {
            // Use XMLHttpRequest instead of HttpClient to support onprogress and abort.
            const xhr = new XMLHttpRequest();

            xhr.open(options.method || 'GET', source, true);
            xhr.responseType = 'blob';

            this.applyHeaders(xhr, options.headers);

            xhr.onprogress = (event: ProgressEvent): void => {
                this.notifyProgress('download', source, event);
            };

            xhr.onerror = (): void => {
                reject(new CapacitorException('Failed to download file.', 'OS-PLUG-FLTR-0011' as ExceptionCode));
            };

            xhr.onload = async (): Promise<void> => {
                const status = Math.max(xhr.status === 1223 ? 204 : xhr.status, 0);
                if (status < 200 || status >= 300) {
                    const body = xhr.response ? await this.blobToText(xhr.response) : '';

                    reject(this.createHttpError(source, options.path, status, xhr, body));

                    return;
                }

                if (!xhr.response) {
                    reject(new CapacitorException('No response obtained.', 'OS-PLUG-FLTR-0011' as ExceptionCode));

                    return;
                }

                try {
                    const entry = await CoreFile.writeFile(options.path, xhr.response);

                    resolve({
                        path: entry.toURL(),
                        headers: this.getHeadersAsObject(xhr),
                    });
                } catch (error) {
                    reject(new CapacitorException(
                        CoreErrorHelper.getErrorMessageFromError(error) ?? 'Error downloading file',
                        'OS-PLUG-FLTR-0011' as ExceptionCode,
                    ));
                }
            };

            xhr.send();
        });
    }

    /**
     * Perform an HTTP request to upload a file to a server.
     *
     * @param options Upload options.
     * @returns Promise resolved with upload result.
     */
    async uploadFile(options: UploadFileOptions): Promise<UploadFileResult> {
        const url = options.url;
        const sourcePath = options.path;
        const file = options.blob || await this.readFileBlob(sourcePath);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const headers = options.headers || {};

            xhr.open(options.method || 'POST', url, true);
            xhr.responseType = 'text';

            // Adding a Content-Type header with the mimeType makes the request fail (it doesn't detect the token in the params).
            // Don't include this header, and delete it if it's supplied.
            delete headers['Content-Type'];

            this.applyHeaders(xhr, headers);

            xhr.upload.onprogress = (event: ProgressEvent): void => {
                this.notifyProgress('upload', url, event);
            };

            xhr.onerror = (): void => {
                reject(new CapacitorException('Failed to upload file.', 'OS-PLUG-FLTR-0011' as ExceptionCode));
            };

            xhr.onload = (): void => {
                const status = Math.max(xhr.status === 1223 ? 204 : xhr.status, 0);
                if (status < 200 || status >= 300) {
                    reject(this.createHttpError(sourcePath, url, status, xhr, xhr.responseText || ''));

                    return;
                }

                resolve({
                    bytesSent: file.size,
                    responseCode: String(status),
                    response: xhr.responseText || '',
                    headers: this.getHeadersAsObject(xhr),
                });
            };

            xhr.send(this.createUploadPayload(file, options));
        });
    }

    /**
     * Add listener for progress events.
     *
     * @param eventName Event name.
     * @param listenerFunc Callback.
     * @returns Listener handle.
     */
    async addListener(eventName: 'progress', listenerFunc: (progress: ProgressStatus) => void): Promise<PluginListenerHandle> {
        if (eventName === 'progress') {
            this.progressListeners.add(listenerFunc);
        }

        return {
            remove: async () => {
                this.progressListeners.delete(listenerFunc);
            },
        };
    }

    /**
     * Remove all registered listeners.
     */
    async removeAllListeners(): Promise<void> {
        this.progressListeners.clear();
    }

    /**
     * Notify all listeners of transfer progress.
     *
     * @param type Transfer type.
     * @param url Transfer URL.
     * @param event Progress event.
     */
    protected notifyProgress(type: 'download' | 'upload', url: string, event: ProgressEvent): void {
        const progress: ProgressStatus = {
            type,
            url,
            bytes: event.loaded,
            contentLength: event.total,
            lengthComputable: event.lengthComputable,
        };

        this.progressListeners.forEach(listener => listener(progress));
    }

    /**
     * Apply request headers to XHR skipping blocked browser headers.
     *
     * @param xhr XHR instance.
     * @param headers Headers to set.
     */
    protected applyHeaders(xhr: XMLHttpRequest, headers?: Record<string, string>): void {
        if (!headers) {
            return;
        }

        for (const name in headers) {
            // Browsers do not allow setting these headers programmatically.
            if (name.toLowerCase() !== 'user-agent' && name.toLowerCase() !== 'connection') {
                xhr.setRequestHeader(name, headers[name]);
            }
        }
    }

    /**
     * Create upload payload.
     *
     * @param file File blob.
     * @param options Upload options.
     * @returns Payload to send.
     */
    protected createUploadPayload(file: Blob, options: UploadFileOptions): Blob | FormData {
        const formData = new FormData();
        const fileKey = options.fileKey || 'file';
        const fileName = CoreFileUtils.getFileAndDirectoryFromPath(options.path).name;

        formData.append(fileKey, file, fileName);
        this.appendParamsToFormData(formData, options.params);

        return formData;
    }

    /**
     * Append upload params to multipart form data.
     *
     * @param formData Multipart payload.
     * @param params Upload params.
     */
    protected appendParamsToFormData(formData: FormData, params?: UploadFileOptions['params']): void {
        if (!params) {
            return;
        }

        for (const key in params) {
            const value = params[key];

            if (value === null || value === undefined) {
                continue;
            }

            if (Array.isArray(value)) {
                value.forEach(item => formData.append(key, String(item)));
            } else {
                formData.append(key, String(value));
            }
        }
    }

    /**
     * Read file from app storage and return it as blob.
     *
     * @param path File path.
     * @returns Blob with file contents.
     */
    protected async readFileBlob(path: string): Promise<Blob> {
        const fileEntry = await CoreFile.getFile(path);

        return CoreFile.getFileObjectFromFileEntry(fileEntry);
    }

    /**
     * Create an HTTP transfer error compatible with Capacitor FileTransfer errors.
     *
     * @param source Source path/URL.
     * @param target Target path/URL.
     * @param status HTTP status.
     * @param xhr XHR instance.
     * @param body Response body.
     * @returns Error instance.
     */
    protected createHttpError(
        source: string,
        target: string,
        status: number,
        xhr: XMLHttpRequest,
        body: string,
    ): CapacitorException {
        const message = `Request failed with status code ${status}.`;
        const code = 'OS-PLUG-FLTR-0010';
        const fileTransferData: FileTransferError = {
            message,
            code,
            source,
            target,
            httpStatus: status,
            headers: this.getHeadersAsObject(xhr),
            body,
        };

        return new CapacitorException(message, code as ExceptionCode, fileTransferData);
    }

    /**
     * Given an instance of XMLHttpRequest, get the response headers as an object.
     *
     * @param xhr XMLHttpRequest instance.
     * @returns Object with the headers.
     */
    protected getHeadersAsObject(xhr: XMLHttpRequest): Record<string, string> {
        const headersString = xhr.getAllResponseHeaders() || '';
        const result: Record<string, string> = {};

        if (headersString) {
            const headers = headersString.split('\n');
            for (const headerString of headers) {
                const separatorPos = headerString.indexOf(':');
                if (separatorPos !== -1) {
                    result[headerString.substring(0, separatorPos)] = headerString.substring(separatorPos + 1).trim();
                }
            }
        }

        return result;
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
                resolve(String(reader.result || ''));
            };
            reader.readAsText(blob);
        });
    }

}
