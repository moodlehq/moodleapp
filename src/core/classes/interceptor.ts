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
import { HttpRequest, HttpEvent, HttpInterceptorFn, HttpHandlerFn } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Interceptor for Http calls. Adds the header 'Content-Type'='application/x-www-form-urlencoded'
 * and serializes the parameters if needed.
 */
@Injectable()
export class CoreInterceptor {

    /**
     * Serialize an object to be used in a request.
     *
     * @param obj Object to serialize.
     * @param addNull Add null values to the serialized as empty parameters.
     * @returns Serialization of the object.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static serialize(obj: any, addNull?: boolean): string {
        let query = '';

        for (const name in obj) {
            const value = obj[name];

            if (value instanceof Array) {
                for (let i = 0; i < value.length; ++i) {
                    const subValue = value[i];
                    const fullSubName = `${name}[${i}]`;
                    const innerObj = {};
                    innerObj[fullSubName] = subValue;
                    query += `${this.serialize(innerObj)}&`;
                }
            } else if (value instanceof Object) {
                for (const subName in value) {
                    const subValue = value[subName];
                    const fullSubName = `${name}[${subName}]`;
                    const innerObj = {};
                    innerObj[fullSubName] = subValue;
                    query += `${this.serialize(innerObj)}&`;
                }
            } else if (addNull || (value !== undefined && value !== null)) {
                query += `${encodeURIComponent(name)}=${encodeURIComponent(value)}&`;
            }
        }

        return query.length ? query.substring(0, query.length - 1) : query;
    }

}

/**
 * Interceptor function to be used with Angular's HttpClient.
 * This function adds the 'Content-Type' header and serializes the body if needed.
 *
 * @inheritdoc
 */
export const coreInterceptorFn: HttpInterceptorFn =
    (req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> => {
    // Add the header and serialize the body if needed.
    const newReq = req.clone({
        headers: req.headers.set('Content-Type', 'application/x-www-form-urlencoded'),
        body: typeof req.body === 'object' && String(req.body) !== '[object File]' ?
            CoreInterceptor.serialize(req.body) : req.body,
    });

    // Pass on the cloned request instead of the original request.
    return next(newReq);
};
