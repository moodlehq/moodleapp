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

import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { asyncObservable, firstValueFrom, ignoreErrors, zipIncudingComplete } from '../observables';

describe('Observables utility functions', () => {

    it('asyncObservable emits values', (done) => {
        const subject = new Subject();
        const promise = new Promise<Observable<unknown>>((resolve) => {
            resolve(subject);
        });

        asyncObservable(() => promise).subscribe({
            next: (value) => {
                expect(value).toEqual('foo');
                done();
            },
        });

        // Wait for the promise callback to be called before emitting the value.
        setTimeout(() => subject.next('foo'));
    });

    it('asyncObservable emits errors', (done) => {
        const subject = new Subject();
        const promise = new Promise<Observable<unknown>>((resolve) => {
            resolve(subject);
        });

        asyncObservable(() => promise).subscribe({
            error: (value) => {
                expect(value).toEqual('foo');
                done();
            },
        });

        // Wait for the promise callback to be called before emitting the value.
        setTimeout(() => subject.error('foo'));
    });

    it('asyncObservable emits complete', (done) => {
        const subject = new Subject();
        const promise = new Promise<Observable<unknown>>((resolve) => {
            resolve(subject);
        });

        asyncObservable(() => promise).subscribe({
            complete: () => done(),
        });

        // Wait for the promise callback to be called before emitting the value.
        setTimeout(() => subject.complete());
    });

    it('asyncObservable emits error if promise is rejected', (done) => {
        const promise = new Promise<Observable<unknown>>((resolve, reject) => {
            reject('Custom error');
        });

        asyncObservable(() => promise).subscribe({
            error: (error) => {
                expect(error).toEqual('Custom error');
                done();
            },
        });
    });

    it('returns first value emitted by an observable', async () => {
        const subject = new Subject();
        setTimeout(() => subject.next('foo'), 10);

        await expect(firstValueFrom(subject)).resolves.toEqual('foo');

        // Check that running it again doesn't get last value, it gets the new one.
        setTimeout(() => subject.next('bar'), 10);
        await expect(firstValueFrom(subject)).resolves.toEqual('bar');

        // Check we cannot get first value if a subject is already completed.
        subject.complete();
        await expect(firstValueFrom(subject)).rejects.toThrow();

        // Check that we get last value when using BehaviourSubject.
        const behaviorSubject = new BehaviorSubject('baz');
        await expect(firstValueFrom(behaviorSubject)).resolves.toEqual('baz');

        // Check we get last value even if behaviour subject is completed.
        behaviorSubject.complete();
        await expect(firstValueFrom(behaviorSubject)).resolves.toEqual('baz');

        // Check that Promise is rejected if the observable emits an error.
        const errorSubject = new Subject();
        setTimeout(() => errorSubject.error('foo error'), 10);

        await expect(firstValueFrom(errorSubject)).rejects.toMatch('foo error');
    });

    it('ignores observable errors', (done) => {
        const subject = new Subject();

        ignoreErrors(subject, 'default value').subscribe({
            next: (value) => {
                expect(value).toEqual('default value');
                done();
            },
        });

        subject.error('foo');
    });

    it('zips observables including complete events', () => {
        const scheduler = new TestScheduler((actual, expected) => {
            expect(actual).toEqual(expected);
        });

        scheduler.run(({ expectObservable, cold }) => {
            expectObservable(zipIncudingComplete(
                cold('-a-b---|', {
                    a: 'A1',
                    b: 'A2',
                }),
                cold('-a----b-c--|', {
                    a: 'B1',
                    b: 'B2',
                    c: 'B3',
                }),
                cold('-a-b-c--de-----|', {
                    a: 'C1',
                    b: 'C2',
                    c: 'C3',
                    d: 'C4',
                    e: 'C5',
                }),
            )).toBe(
                '-a----b-c--(de)|',
                {
                    a: ['A1','B1','C1'],
                    b: ['A2','B2','C2'],
                    c: ['A2','B3','C3'],
                    d: ['A2','B3','C4'],
                    e: ['A2','B3','C5'],
                },
            );
        });
    });

});
