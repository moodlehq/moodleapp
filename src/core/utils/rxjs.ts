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

import { FormControl } from '@angular/forms';
import { CoreError } from '@classes/errors/error';
import { CoreSubscriptions } from '@singletons/subscriptions';
import { BehaviorSubject, Observable, of, OperatorFunction, Subscription } from 'rxjs';
import { catchError, filter } from 'rxjs/operators';

/**
 * Create an observable that emits the current form control value.
 *
 * @param control Form control.
 * @returns Form control value observable.
 */
export function formControlValue<T = unknown>(control: FormControl): Observable<T> {
    return control.valueChanges.pipe(
        startWithOnSubscribed(() => control.value),
        filter(value => value !== null),
    );
}

/**
 * Observable operator that waits for a promise to resolve before emitting the result.
 *
 * @returns Operator.
 */
export function resolved<T>(): OperatorFunction<Promise<T>, T> {
    return source => new Observable(subscriber => {
        const subscription = source.subscribe(async promise => {
            const value = await promise;

            return subscriber.next(value);
        });

        return subscription;
    });
}

/**
 * Same as the built-in startWith operator, but evaluates the starting value for each subscriber
 * on subscription.
 *
 * @param onSubscribed Callback to calculate the starting value.
 * @returns Operator.
 */
export function startWithOnSubscribed<T>(onSubscribed: () => T): OperatorFunction<T, T> {
    return source => new Observable(subscriber => {
        subscriber.next(onSubscribed());

        return source.subscribe(value => subscriber.next(value));
    });
}

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
            .then(observable => observable.subscribe(subscriber)) // rxjs will automatically handle unsubscribes.
            .catch(error => subscriber.error(error));
    });
}

/**
 * Create a Promise resolved with the first value returned from an observable. The difference with toPromise is that
 * this function returns the value as soon as it's emitted, it doesn't wait until the observable completes.
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
 * @returns Observable with ignored errors, returning the fallback result if provided.
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
type ZipObservableData<T = unknown> = {
    values: T[];
    completed: boolean;
    subscription?: Subscription;
};

/**
 * Same as the built-in zip operator, but once an observable completes it'll continue to emit the last value as long
 * as the other observables continue to emit values.
 *
 * @param observables Observables to zip.
 * @returns Observable that emits the zipped values.
 */
export function zipIncludingComplete<T extends Observable<unknown>[]>(
    ...observables: T
): Observable<GetObservablesReturnTypes<T>> {
    return new Observable(subscriber => {
        let nextIndex = 0;
        let hasErrored = false;
        let hasCompleted = false;

        // Before subscribing, initialize the data for all observables.
        const observablesData = observables.map(() => <ZipObservableData> {
            values: [],
            completed: false,
        });

        // Treat an emitted event.
        const treatEmitted = (completed = false) => {
            if (hasErrored || hasCompleted) {
                return;
            }

            if (completed) {
                // Check if all observables have completed.
                const numCompleted = observablesData.reduce((total, data) => total + (data.completed ? 1 : 0), 0);
                if (numCompleted === observablesData.length) {
                    hasCompleted = true;

                    // Emit all pending values.
                    const maxValues = observablesData.reduce((maxValues, data) => Math.max(maxValues, data.values.length), 0);
                    while (nextIndex < maxValues) {
                        emitNextValue();
                        nextIndex++;
                    }

                    subscriber.complete();

                    return;
                }
            }

            // Check if any observable still doesn't have data for the index.
            const notReady = observablesData.some(data => !data.completed && !(nextIndex in data.values));
            if (notReady) {
                return;
            }

            emitNextValue();
            nextIndex++;

            if (completed) {
                // An observable was completed, there might be other values to emit.
                treatEmitted(true);
            }
        };
        const emitNextValue = () => {
            // For each observable, get the value for the next index, or last value if not present (completed).
            const valueToEmit = observablesData.map(observableData =>
                observableData.values[nextIndex] ?? observableData.values[observableData.values.length - 1]);

            subscriber.next(<GetObservablesReturnTypes<T>> valueToEmit);
        };

        observables.forEach((observable, obsIndex) => {
            const observableData = observablesData[obsIndex];

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
                    treatEmitted(true);
                },
            });
        });

        // When unsubscribing, unsubscribe from all observables.
        return () => {
            observablesData.forEach(observableData => observableData.subscription?.unsubscribe());
        };
    });
}
