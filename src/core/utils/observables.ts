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

import { CoreError } from '@classes/errors/error';
import { CoreSubscriptions } from '@singletons/subscriptions';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Convert to an Observable a Promise that resolves to an Observable.
 *
 * @param createObservable A function returning a promise that resolves to an Observable.
 * @returns Observable.
 */
export function asyncObservable<T>(createObservable: () => Promise<Observable<T>>): Observable<T> {
    const promise = createObservable();

    return new Observable(subscriber => {
        promise
            .then(observable => observable.subscribe(
                value => subscriber.next(value),
                error => subscriber.error(error),
                () => subscriber.complete(),
            ))
            .catch(error => subscriber.error(error));
    });
}

/**
 * Create a Promise that resolved with the first value returned from an observable.
 * This function can be removed when the app starts using rxjs v7.
 *
 * @param observable Observable.
 * @returns Promise resolved with the first value returned.
 */
export function firstValueFrom<T>(observable: Observable<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        CoreSubscriptions.once(observable, resolve, reject, () => {
            // Subscription is completed, check if we can get its value.
            if (observable instanceof BehaviorSubject) {
                resolve(observable.getValue());
            }

            reject(new CoreError('Couldn\'t get first value from observable because it\'s already completed'));
        });
    });
}

/**
 * Ignore errors from an observable, returning a certain value instead.
 *
 * @param observable Observable to ignore errors.
 * @param fallback Value to return if the observer errors.
 * @return Observable with ignored errors, returning the fallback result if provided.
 */
export function ignoreErrors<Result>(observable: Observable<Result>): Observable<Result | undefined>;
export function ignoreErrors<Result, Fallback>(observable: Observable<Result>, fallback: Fallback): Observable<Result | Fallback>;
export function ignoreErrors<Result, Fallback>(
    observable: Observable<Result>,
    fallback?: Fallback,
): Observable<Result | Fallback | undefined> {
    return observable.pipe(catchError(() => of(fallback)));
}
