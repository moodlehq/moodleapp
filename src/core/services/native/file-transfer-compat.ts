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

/* eslint-disable @typescript-eslint/no-deprecated */

import type { PluginListenerHandle } from '@capacitor/core';
import type { DownloadFileOptions, ProgressStatus, UploadFileOptions } from '@capacitor/file-transfer';
import { FileEntry } from '@classes/native/filesystem';
import { CoreErrorHelper } from '@services/error-helper';
import { FileTransferErrorCode } from '@services/native/file-transfer';
import { FileTransfer } from '@singletons';

/**
 * Class to keep backwards compatibility for plugins using Cordova FileTransfer.
 *
 * @deprecated since 6.0. Use CoreWS.downloadFile and CoreWS.uploadFile instead.
 */
export class FileTransferCompat {

	onprogress: ((event: ProgressEvent) => void) | null = null;

    protected isAborted = false;

	/**
	 * Upload a file to a server.
	 *
	 * @param fileURL File URL or path to upload.
	 * @param server Server URL.
	 * @param successCallback Success callback.
	 * @param errorCallback Error callback.
	 * @param options Upload options.
	 * @param trustAllHosts Whether to trust all hosts.
	 */
	upload(
		fileURL: string,
		server: string,
		successCallback: (result: FileUploadResult) => void,
		errorCallback: (error: FileTransferErrorCompat) => void,
		options?: FileUploadOptions,
		trustAllHosts?: boolean,
	): void {
		void trustAllHosts;
		this.isAborted = false;

		const method = options?.httpMethod?.toUpperCase() === 'PUT' ? 'PUT' : 'POST';

		void this.runUpload(
			successCallback,
			errorCallback,
			{
				chunkedMode: options?.chunkedMode,
				fileKey: options?.fileKey,
				headers: options?.headers,
				method,
				mimeType: options?.mimeType,
				params: options?.params,
				path: fileURL,
				progress: !!this.onprogress,
				url: server,
			},
		);
	}

	/**
	 * Download a file from a server.
	 *
	 * @param source Source URL.
	 * @param target Target path.
	 * @param successCallback Success callback.
	 * @param errorCallback Error callback.
	 * @param trustAllHosts Whether to trust all hosts.
	 * @param options Download options.
	 */
	download(
		source: string,
		target: string,
		successCallback: (result: FileTransferDownloadSuccessResult) => void,
		errorCallback: (error: FileTransferErrorCompat) => void,
		trustAllHosts?: boolean,
		options?: FileDownloadOptions,
	): void {
		void trustAllHosts;
		this.isAborted = false;

		void this.runDownload(
			target,
			successCallback,
			errorCallback,
			{
				headers: (options?.headers ?? {}) as Record<string, string>,
				path: target,
				progress: !!this.onprogress,
				url: source,
			},
		);
	}

	/**
	 * Abort all active transfers in this instance.
	 */
	abort(): void {
		this.isAborted = true;
	}

	/**
	 * Run an upload operation.
	 *
	 * @param successCallback Success callback.
	 * @param errorCallback Error callback.
	 * @param request Upload request options.
	 */
	protected async runUpload(
		successCallback: (result: FileUploadResult) => void,
		errorCallback: (error: FileTransferErrorCompat) => void,
		request: UploadFileOptions,
	): Promise<void> {
		let listener: PluginListenerHandle | undefined;

		try {
			listener = await FileTransfer.addListener('progress', progress => {
				this.notifyProgress(request.url, 'upload', progress);
			});

			const result = await FileTransfer.uploadFile(request);

			if (this.isAborted) {
				return;
			}

			successCallback({
				bytesSent: result.bytesSent,
				headers: result.headers,
				response: result.response ?? '',
				responseCode: parseInt(result.responseCode, 10) || 0,
			});
		} catch (error) {
			if (this.isAborted) {
				return;
			}

			errorCallback(this.toFileTransferError(error, request.path, request.url));
		} finally {
			await listener?.remove();
		}
	}

	/**
	 * Run a download operation.
	 *
	 * @param target Target path.
	 * @param successCallback Success callback.
	 * @param errorCallback Error callback.
	 * @param request Download request options.
	 */
	protected async runDownload(
		target: string,
		successCallback: (result: FileTransferDownloadSuccessResult) => void,
		errorCallback: (error: FileTransferErrorCompat) => void,
		request: DownloadFileOptions,
	): Promise<void> {
		let listener: PluginListenerHandle | undefined;

		try {
			listener = await FileTransfer.addListener('progress', progress => {
				this.notifyProgress(request.url, 'download', progress);
			});

			const result = await FileTransfer.downloadFile(request);

			if (this.isAborted) {
				return;
			}

			successCallback({
				entry: new FileEntry(result.path ?? target),
				headers: result.headers,
			});
		} catch (error) {
			if (this.isAborted) {
				return;
			}

			errorCallback(this.toFileTransferError(error, request.url, target));
		} finally {
			await listener?.remove();
		}
	}

	/**
	 * Notify progress listeners if the event belongs to this transfer.
	 *
	 * @param url URL of the transfer.
	 * @param type Type of transfer ('download' or 'upload').
	 * @param progress Progress data.
	 */
	protected notifyProgress(url: string, type: 'download' | 'upload', progress: ProgressStatus): void {
		if (!this.onprogress || progress.type !== type) {
			return;
		}

		if (progress.url && url && progress.url !== url) {
			return;
		}

		this.onprogress(new ProgressEvent('progress', {
			lengthComputable: progress.lengthComputable,
			loaded: progress.bytes,
			total: progress.contentLength,
		}));
	}

	/**
	 * Convert a Capacitor file transfer error to a FileTransferErrorCompat instance.
	 *
	 * @param error Original error.
	 * @param source Fallback source.
	 * @param target Fallback target.
	 * @returns Compat error.
	 */
	protected toFileTransferError(error: unknown, source: string, target: string): FileTransferErrorCompat {
		if (error instanceof FileTransferErrorCompat) {
			return error;
		}

		if (!CoreErrorHelper.isCapacitorLikeError(error)) {
			return new FileTransferErrorCompat(
				FileTransferErrorCompat.CONNECTION_ERR,
				source,
				target,
				0,
				'',
				'File transfer failed.',
			);
		}

		const errorData = error?.data as CapacitorFileTransferErrorData | undefined;

		const message = typeof errorData?.message === 'string'
			? errorData.message
			: typeof error?.message === 'string'
				? error.message
				: 'File transfer failed.';

		const resolvedSource = errorData?.source ?? source;
		const resolvedTarget = errorData?.target ?? target;
		const httpStatus = this.getStatusCode(errorData);
		const body = typeof errorData?.body === 'string' ? errorData.body : '';
		const exception = typeof errorData?.exception === 'string' ? errorData.exception : message;
		const code = this.mapFileTransferCode(errorData?.code ?? error?.code, httpStatus, message);

		return new FileTransferErrorCompat(code, resolvedSource, resolvedTarget, httpStatus, body, exception);
	}

	/**
	 * Map a Capacitor code to a Cordova FileTransferError code.
	 *
	 * @param code Capacitor code.
	 * @param httpStatus HTTP status.
	 * @param message Error message.
	 * @returns Compat code.
	 */
	protected mapFileTransferCode(code: string | number | undefined, httpStatus: number, message: string): number {
		if (this.isAborted || message.toLowerCase().includes('abort')) {
			return FileTransferErrorCompat.ABORT_ERR;
		}

		if (httpStatus === 304) {
			return FileTransferErrorCompat.NOT_MODIFIED_ERR;
		}

		if (typeof code === 'number' && this.isKnownCompatCode(code)) {
			return code;
		}

		switch (code) {
			case FileTransferErrorCode.INVALID_URL:
				return FileTransferErrorCompat.INVALID_URL_ERR;
			case FileTransferErrorCode.FILE_NOT_FOUND:
				return FileTransferErrorCompat.FILE_NOT_FOUND_ERR;
			case FileTransferErrorCode.NOT_MODIFIED:
				return FileTransferErrorCompat.NOT_MODIFIED_ERR;
			default:
				return FileTransferErrorCompat.CONNECTION_ERR;
		}
	}

	/**
	 * Check whether a value is a known compatibility code.
	 *
	 * @param code Numeric code.
	 * @returns Whether code is known.
	 */
	protected isKnownCompatCode(code: number): boolean {
		return [
			FileTransferErrorCompat.FILE_NOT_FOUND_ERR,
			FileTransferErrorCompat.INVALID_URL_ERR,
			FileTransferErrorCompat.CONNECTION_ERR,
			FileTransferErrorCompat.ABORT_ERR,
			FileTransferErrorCompat.NOT_MODIFIED_ERR,
		].includes(code);
	}

	/**
	 * Get an HTTP status code from error data.
	 *
	 * @param errorData Error data.
	 * @returns Status code or -1.
	 */
	protected getStatusCode(errorData?: CapacitorFileTransferErrorData): number {
		const legacyStatus = this.isObject(errorData)
			? (errorData as Record<string, unknown>)['http_status']
			: undefined;
		const status = errorData?.httpStatus ?? legacyStatus;

		if (typeof status === 'number') {
			return status;
		}

		if (typeof status === 'string') {
			const parsedStatus = parseInt(status, 10);

			return Number.isFinite(parsedStatus) ? parsedStatus : -1;
		}

		return -1;
	}

	/**
	 * Check whether a value is an object.
	 *
	 * @param value Value to check.
	 * @returns Whether value is an object.
	 */
	protected isObject(value: unknown): value is object {
		return !!value && typeof value === 'object';
	}

}

/**
 * Class to keep backwards compatibility for plugins using Cordova FileTransfer.
 *
 * @deprecated since 6.0
 */
export class FileTransferErrorCompat {

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

type CapacitorFileTransferErrorData = {
	code?: string;
	message?: string;
	source?: string;
	target?: string;
	httpStatus?: number | string;
	body?: string;
	exception?: string;
};

type FileTransferDownloadSuccessResult = {
	entry: FileEntry;
	headers: Record<string, string> | undefined;
};

interface FileUploadResult {
    /** The number of bytes sent to the server as part of the upload. */
    bytesSent: number;
    /** The HTTP response code returned by the server. */
    responseCode: number;
    /** The HTTP response returned by the server. */
    response: string;
    /** The HTTP response headers by the server. Currently supported on iOS only.*/
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    headers: any;
}

interface FileUploadOptions {
    /** The name of the form element. Defaults to file. */
    fileKey?: string;
    /** The file name to use when saving the file on the server. Defaults to image.jpg. */
    fileName?: string;
    /** The HTTP method to use - either `PUT` or `POST`. Defaults to `POST`. */
    httpMethod?: string;
    /** The mime type of the data to upload. Defaults to image/jpeg. */
    mimeType?: string;
    /** A set of optional key/value pairs to pass in the HTTP request. */
    params?: Record<string, string>;
    /** Whether to upload the data in chunked streaming mode. Defaults to true. */
    chunkedMode?: boolean;
    /** A map of header name/header values. Use an array to specify more than one value. */
    headers?: Record<string, string>;
}

interface FileDownloadOptions {
    /** A map of header name/header values. */
    headers?: Record<string, string>;
}
