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

import {
    asyncObservable,
    firstValueFrom,
    formControlValue,
    ignoreErrors,
    resolved,
    startWithOnSubscribed,
    zipIncludingComplete,
} from '@/core/utils/rxjs';
import { mock } from '@/testing/utils';
import { FormControl } from '@angular/forms';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';

describe('RXJS Utils', () => {

    it('formControlValue emits filtered form values', () => {
        // Arrange.
        let value = 'one';
        const emited: string[] = [];
        const valueChanges = new Subject();
        const control = mock<FormControl>({
            get value() {
                return value;
            },
            setValue(newValue) {
                value = newValue;

                valueChanges.next(newValue);
            },
            valueChanges,
        });

        // Act.
        control.setValue('two');

        formControlValue<string>(control).subscribe(value => emited.push(value));

        control.setValue(null);
        control.setValue('three');

        // Assert.
        expect(emited).toEqual(['two', 'three']);
    });

    it('resolved emits resolved values', async () => {
        // Arrange.
        const emited: string[] = [];
        const promises = [
            Promise.resolve('one'),
            Promise.resolve('two'),
            Promise.resolve('three'),
        ];
        const source = of(...promises);

        // Act.
        source.pipe(resolved()).subscribe(value => emited.push(value));

        // Assert.
        await Promise.all(promises);

        expect(emited).toEqual(['one', 'two', 'three']);
    });

    it('startWithOnSubscribed adds starting values on subscription', () => {
        // Arrange.
        let store = 'one';
        const emited: string[] = [];
        const source = of('final');

        // Act.
        const withStore = source.pipe(startWithOnSubscribed(() => store));

        store = 'two';
        withStore.subscribe(value => emited.push(value));

        store = 'three';
        withStore.subscribe(value => emited.push(value));

        // Assert.
        expect(emited).toEqual(['two', 'final', 'three', 'final']);
    });

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

    it('firstValueFrom returns first value emitted by an observable', async () => {
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

    it('ignoreErrors ignores observable errors', (done) => {
        const subject = new Subject();

        ignoreErrors(subject, 'default value').subscribe({
            next: (value) => {
                expect(value).toEqual('default value');
                done();
            },
        });

        subject.error('foo');
    });

    it('zipIncludingComplete zips observables including complete events', () => {
        const scheduler = new TestScheduler((actual, expected) => {
            expect(actual).toEqual(expected);
        });

        scheduler.run(({ expectObservable, cold }) => {
            expectObservable(zipIncludingComplete(
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

    it('zipIncludingComplete emits all pending values when last observable completes', () => {
        const scheduler = new TestScheduler((actual, expected) => {
            expect(actual).toEqual(expected);
        });

        scheduler.run(({ expectObservable, cold }) => {
            expectObservable(zipIncludingComplete(
                cold('-a-b-|', {
                    a: 'A1',
                    b: 'A2',
                    c: 'A3',
                }),
                cold('-a-----|', {
                    a: 'B1',
                }),
            )).toBe(
                '-a-----(b|)',
                {
                    a: ['A1','B1'],
                    b: ['A2','B1'],
                },
            );
        });
    });

});
