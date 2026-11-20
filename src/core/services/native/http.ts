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
import { HttpHeaders, HttpResponse as AngularHttpResponse } from '@angular/common/http';
import {
    CapacitorHttp,
    type CapacitorException,
    type HttpOptions as CapacitorHttpOptions,
    type HttpResponse as CapacitorHttpResponse,
} from '@capacitor/core';
import { CoreError } from '@classes/errors/error';
import { CoreInterceptor } from '@classes/interceptor';
import { CoreFile, CoreFileFormat } from '@services/native/file';
import { CoreFileUtils } from '@static/file-utils';
import { makeSingleton, Translate } from '@singletons';
import { CorePlatform } from '@services/platform';

const HTTP_STATUS_MESSAGES: Record<number, string> = {
    100: 'Continue',
    101: 'Switching Protocol',
    102: 'Processing',
    103: 'Early Hints',
    200: 'OK',
    201: 'Created',
    202: 'Accepted',
    203: 'Non-Authoritative Information',
    204: 'No Content',
    205: 'Reset Content',
    206: 'Partial Content',
    207: 'Multi-Status',
    208: 'Already Reported',
    226: 'IM Used',
    300: 'Multiple Choice',
    301: 'Moved Permanently',
    302: 'Found',
    303: 'See Other',
    304: 'Not Modified',
    305: 'Use Proxy',
    306: 'unused',
    307: 'Temporary Redirect',
    308: 'Permanent Redirect',
    400: 'Bad Request',
    401: 'Unauthorized',
    402: 'Payment Required',
    403: 'Forbidden',
    404: 'Not Found',
    405: 'Method Not Allowed',
    406: 'Not Acceptable',
    407: 'Proxy Authentication Required',
    408: 'Request Timeout',
    409: 'Conflict',
    410: 'Gone',
    411: 'Length Required',
    412: 'Precondition Failed',
    413: 'Payload Too Large',
    414: 'URI Too Long',
    415: 'Unsupported Media Type',
    416: 'Range Not Satisfiable',
    417: 'Expectation Failed',
    418: 'I\'m a teapot',
    421: 'Misdirected Request',
    422: 'Unprocessable Entity',
    423: 'Locked',
    424: 'Failed Dependency',
    425: 'Too Early',
    426: 'Upgrade Required',
    428: 'Precondition Required',
    429: 'Too Many Requests',
    431: 'Request Header Fields Too Large',
    451: 'Unavailable For Legal Reasons',
    500: 'Internal Server Error',
    501: 'Not Implemented',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout',
    505: 'HTTP Version Not Supported',
    506: 'Variant Also Negotiates',
    507: 'Insufficient Storage',
    508: 'Loop Detected',
    510: 'Not Extended',
    511: 'Network Authentication Required',
};

/**
 * Service to perform HTTP requests using the Capacitor HTTP plugin (it uses fetch in browser).
 */
@Injectable({ providedIn: 'root' })
export class CoreHttpService {

    protected static readonly MAX_REDIRECTS = 5;

    /**
     * Send an HTTP request.
     *
     * @param url URL of the request.
     * @param options Options for the request.
     * @returns Promise resolved with the response. If the request fails or the status isn't 2XX, the plugin response or error
     *          is thrown without modifying it.
     */
    async request<T = unknown>(url: string, options: CoreHttpRequestOptions): Promise<AngularHttpResponse<T>> {
        const responseType = options.responseType ?? 'json';

        if (CoreFileUtils.isFileUrl(url) || url.startsWith('filesystem:')) {
            // We cannot load local files using the http plugin. Use file provider instead.
            const content = responseType === 'json' ?
                await CoreFile.readFile<T>(url, CoreFileFormat.FORMATJSON) :
                await CoreFile.readFile(url, CoreFileFormat.FORMATTEXT);

            return new AngularHttpResponse<T>({
                body: <T> content,
                headers: undefined,
                status: 200,
                statusText: 'OK',
                url,
            });
        }

        const headers = {
            ...options.headers,
        };
        if (!headers['User-Agent'] && !headers['user-agent']) {
            headers['User-Agent'] = navigator.userAgent;
        }

        let response: CapacitorHttpResponse | undefined = undefined;
        let redirectUrl: string | null = null;
        let maxRedirects = CoreHttpService.MAX_REDIRECTS;
        do {
            try {
                const { data: serializedData, contentType } = this.serializeData(options);
                if (contentType) {
                    headers['Content-Type'] = contentType;
                }

                const requestOptions: CapacitorHttpOptions = {
                    url: redirectUrl ?? url,
                    method: options.method.toUpperCase(),
                    params: options.params,
                    data: serializedData,
                    headers,
                    connectTimeout: options.timeout,
                    readTimeout: options.timeout,
                    disableRedirects: options.followRedirect === false,
                    responseType,
                    webFetchExtra: this.getWebFetchOptions(options),
                };

                response = await CapacitorHttp.request(requestOptions);

                if (response.status < 200 || response.status >= 300) {
                    throw response;
                }

                redirectUrl = null;
            } catch (error) {
                const responseOrError = error as CapacitorException | CapacitorHttpResponse;

                if ('headers' in responseOrError) {
                    // Convert to HttpHeaders because names are normalised.
                    const responseHeaders = new HttpHeaders(responseOrError.headers);

                    // Redirections should have been handled by the platform,
                    // but Android does not follow redirections between HTTP and HTTPS.
                    // See: https://developer.android.com/reference/java/net/HttpURLConnection#response-handling
                    redirectUrl = responseHeaders.get('Location');
                    maxRedirects--;
                }

                if (!redirectUrl || maxRedirects < 0) {
                    throw responseOrError;
                }
            }
        } while (redirectUrl);

        if (!response) {
            // Shouldn't happen, if the response failed the catch should have thrown an error.
            throw new CoreError(Translate.instant('core.unexpectederror'));
        }

        return this.convertToAngularResponse<T>(response);
    }

    /**
     * Get the options that are only used in browser, because the plugin doesn't support timeout or disabling redirects there.
     *
     * @param options Request options.
     * @returns Fetch options, undefined if not needed.
     */
    protected getWebFetchOptions(options: CoreHttpRequestOptions): RequestInit | undefined {
        if (CorePlatform.isMobile()) {
            return {};
        }

        const fetchOptions: RequestInit = {};

        if (options.timeout) {
            fetchOptions.signal = AbortSignal.timeout(options.timeout);
        }

        if (options.followRedirect === false) {
            fetchOptions.redirect = 'manual';
        }

        return Object.keys(fetchOptions).length ? fetchOptions : undefined;
    }

    /**
     * Convert a plugin HTTP response to an Angular HTTP response.
     *
     * @param response Plugin response.
     * @returns Angular response.
     */
    protected convertToAngularResponse<T>(response: CapacitorHttpResponse): AngularHttpResponse<T> {
        return new AngularHttpResponse<T>({
            body: response.data,
            headers: new HttpHeaders(response.headers),
            status: response.status,
            statusText: HTTP_STATUS_MESSAGES[response.status] || '',
            url: response.url || '',
        });
    }

    /**
     * Serialise request data.
     *
     * @param options Request options.
     * @returns Serialised request data and content type.
     */
    protected serializeData(options: CoreHttpRequestOptions): { data: unknown; contentType?: string } {
        if (options.data === undefined || options.data === null) {
            return { data: options.data };
        }

        if (options.serializer === 'json') {
            return {
                data: typeof options.data === 'string' ? options.data : JSON.stringify(options.data),
                contentType: 'application/json',
            };
        }

        return {
            data: typeof options.data === 'string' ? options.data : CoreInterceptor.serialize(options.data),
            contentType: 'application/x-www-form-urlencoded;charset=utf-8',
        };
    }

}

export const CoreHttp = makeSingleton(CoreHttpService);

/**
 * Options for HTTP requests.
 */
export type CoreHttpRequestOptions = {
    /**
     * The HTTP method.
     */
    method: 'get' | 'post' | 'put' | 'patch' | 'head' | 'delete' | 'options';

    /**
     * Payload to send to the server. Only applicable on post, put or patch methods.
     */
    data?: Record<string, unknown>;

    /**
     * Query params to be appended to the URL (only applicable on get, head or delete methods).
     */
    params?: Record<string, string>;

    /**
     * Response type. Defaults to json.
     */
    responseType?: 'json' | 'text';

    /**
     * Timeout for the request in milliseconds. If not set, no timeout.
     */
    timeout?: number;

    /**
     * Serializer to use. Defaults to 'urlencoded'.
     */
    serializer?: 'json' | 'urlencoded';

    /**
     * Whether to follow redirects. Defaults to true.
     */
    followRedirect?: boolean;

    /**
     * Headers.
     */
    headers?: Record<string, string>;
};
