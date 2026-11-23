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

import { Injectable } from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import type { PluginListenerHandle } from '@capacitor/core';
import type { FileTransferError, UploadFileOptions } from '@capacitor/file-transfer';
import { FileTransferErrorCode } from '@/core/constants';
import { CoreErrorHelper } from '@services/error-helper';
import { CoreLogger } from '@static/logger';
import { CoreText } from '@static/text';
import { FileTransfer, makeSingleton } from '@singletons';

/**
 * Service to download and upload files using the native file transfer plugin.
 */
@Injectable({ providedIn: 'root' })
export class CoreFileTransferService {

    protected static readonly MAX_REDIRECTS = 5;

    protected logger = CoreLogger.getInstance('CoreFileTransfer');

    /**
     * Download a file, following redirects if any.
     *
     * @param url The URL of the file to download.
     * @param path The local path where the file should be saved. It must be an absolute path.
     * @param onProgress Optional callback to track download progress.
     * @returns HTTP headers of the final response after following redirects.
     */
    async downloadFile(
        url: string,
        path: string,
        onProgress?: (event: ProgressEvent) => void,
    ): Promise<HttpHeaders> {
        let headers = new HttpHeaders();
        let redirectUrl: string | null = null;
        let maxRedirects = CoreFileTransferService.MAX_REDIRECTS;
        let currentDownloadUrl = url;

        const listener = await this.addProgressListener('download', () => currentDownloadUrl, onProgress);

        try {
            do {
                currentDownloadUrl = redirectUrl ?? url;

                try {
                    const result = await FileTransfer.downloadFile({
                        url: currentDownloadUrl,
                        path,
                        progress: !!onProgress,
                        headers: {
                            'User-Agent': navigator.userAgent,
                        },
                        disableRedirects: false,
                    });

                    headers = new HttpHeaders(result.headers); // Convert to HttpHeaders because names are normalised.

                    // Redirections should have been handled by the platform,
                    // but Android does not follow redirections between HTTP and HTTPS.
                    // See: https://developer.android.com/reference/java/net/HttpURLConnection#response-handling
                    redirectUrl = headers.get('Location');
                } catch (error) {
                    if (!CoreErrorHelper.isCapacitorLikeError(error) || error.code !== FileTransferErrorCode.HTTP_ERROR) {
                        throw error;
                    }

                    // HTTP error , treat 300 errors too in case we receive one.
                    const transferError = error.data as FileTransferError;
                    headers = new HttpHeaders(transferError.headers);
                    const transferErrorRedirectUrl = headers.get('Location');
                    const status = transferError.httpStatus ?? -1;

                    if (transferErrorRedirectUrl && status >= 300 && status < 400) {
                        redirectUrl = transferErrorRedirectUrl;
                    } else {
                        throw error;
                    }
                }

                maxRedirects--;
            } while (redirectUrl && maxRedirects >= 0);
        } finally {
            await listener?.remove();
        }

        return headers;
    }

    /**
     * Upload a file.
     *
     * @param options Upload options.
     * @param onProgress Optional callback to track upload progress.
     * @returns Result of the upload. Errors thrown by the plugin are not modified.
     */
    async uploadFile<T = unknown>(
        options: CoreFileTransferUploadOptions,
        onProgress?: (event: ProgressEvent) => void,
    ): Promise<CoreFileTransferUploadResult<T>> {
        const { jsonResponse, ...pluginOptions } = options;
        const listener = await this.addProgressListener('upload', () => options.url, onProgress);

        try {
            const result = await FileTransfer.uploadFile({
                ...pluginOptions,
                method: 'POST',
                progress: !!onProgress,
                chunkedMode: false,
                headers: {
                    'User-Agent': navigator.userAgent,
                    'connection': 'close',
                },
            });

            return {
                headers: new HttpHeaders(result.headers),
                responseCode: result.responseCode,
                response: jsonResponse
                    ? CoreText.parseJSON<T | null>(
                        result.response ?? '',
                        null,
                        error => this.logger.error('Error parsing response from upload', result.response, error),
                    )
                    : result.response as T | undefined,
            };
        } finally {
            await listener?.remove();
        }
    }

    /**
     * Listen to the plugin progress events of a transfer and convert them to ProgressEvent.
     *
     * @param type Type of transfer.
     * @param getUrl Function to get the URL of the transfer, to ignore events from other transfers.
     * @param onProgress Callback to call on progress. If not set, no listener will be added.
     * @returns Promise resolved with the listener handle, undefined if no listener was added.
     */
    protected async addProgressListener(
        type: 'download' | 'upload',
        getUrl: () => string,
        onProgress?: (event: ProgressEvent) => void,
    ): Promise<PluginListenerHandle | undefined> {
        if (!onProgress) {
            return;
        }

        return await FileTransfer.addListener('progress', progress => {
            if (progress.type !== type) {
                return;
            }

            if (progress.url && progress.url !== getUrl()) {
                return;
            }

            onProgress(new ProgressEvent('progress', {
                lengthComputable: progress.lengthComputable,
                loaded: progress.bytes,
                total: progress.contentLength,
            }));
        });
    }

}

export const CoreFileTransfer = makeSingleton(CoreFileTransferService);

/**
 * Options to upload a file.
 */
export type CoreFileTransferUploadOptions = Pick<UploadFileOptions, 'url' | 'path' | 'params' | 'mimeType' | 'fileKey'> & {
    jsonResponse?: boolean; // Whether to parse the response as JSON. If the response is not valid JSON, it will be null.
};

/**
 * Result of uploading a file.
 */
export type CoreFileTransferUploadResult<T = string> = {
    headers?: HttpHeaders; // Headers of the response, if available.
    responseCode: string; // HTTP response code.
    response?: T | null; // Response body. If JSON was requested, null if it couldn't be parsed.
};
