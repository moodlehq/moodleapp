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

import { formControlValue, resolved, startWithOnSubscribed } from '@/core/utils/rxjs';
import { mock } from '@/testing/utils';
import { FormControl } from '@angular/forms';
import { of, Subject } from 'rxjs';

describe('RXJS Utils', () => {

    it('Emits filtered form values', () => {
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

    it('Emits resolved values', async () => {
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

    it('Adds starting values on subscription', () => {
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

});
