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
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
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
            .then(observable => observable.subscribe(subscriber))
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

/**
 * Get return types of a list of observables.
 */
type GetObservablesReturnTypes<T> = { [key in keyof T]: T[key] extends Observable<infer R> ? R : never };

/**
 * Data for an observable when zipping.
 */
type ZipObservableData<T = any> = { // eslint-disable-line @typescript-eslint/no-explicit-any
    values: T[];
    completed: boolean;
    subscription?: Subscription;
};

/**
 * Similar to rxjs zip operator, but once an observable completes we'll continue to emit the last value as long
 * as the other observables continue to emit values.
 *
 * @param observables Observables to zip.
 * @return Observable that emits the zipped values.
 */
export function zipIncudingComplete<T extends Observable<any>[]>( // eslint-disable-line @typescript-eslint/no-explicit-any
    ...observables: T
): Observable<GetObservablesReturnTypes<T>> {
    return new Observable(subscriber => {
        const observablesData: ZipObservableData[] = [];
        let nextIndex = 0;
        let numCompleted = 0;
        let hasErrored = false;

        // Treat an emitted event.
        const treatEmitted = (completed = false) => {
            if (hasErrored) {
                return;
            }

            if (numCompleted >= observables.length) {
                subscriber.complete();

                return;
            }

            // Check if any observable still doesn't have data for the index.
            const notReady = observablesData.some(data => !data.completed && data.values[nextIndex] === undefined);
            if (notReady) {
                return;
            }

            // For each observable, get the value for the next index, or last value if not present (completed).
            const valueToEmit = observablesData.map(observableData =>
                observableData.values[nextIndex] ?? observableData.values[observableData.values.length - 1]);

            nextIndex++;
            subscriber.next(<GetObservablesReturnTypes<T>> valueToEmit);

            if (completed) {
                // An observable was completed, there might be other values to emit.
                treatEmitted(true);
            }
        };

        observables.forEach((observable, obsIndex) => {
            const observableData: ZipObservableData = {
                values: [],
                completed: false,
            };

            observableData.subscription = observable.subscribe({
                next: (value) => {
                    observableData.values.push(value);
                    treatEmitted();
                },
                error: (error) => {
                    hasErrored = true;
                    subscriber.error(error);
                },
                complete: () => {
                    observableData.completed = true;
                    numCompleted++;
                    treatEmitted(true);
                },
            });

            observablesData[obsIndex] = observableData;
        });

        // When unsubscribing, unsubscribe from all observables.
        return () => {
            observablesData.forEach(observableData => observableData.subscription?.unsubscribe());
        };
    });
}
