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

import { CorePromisedValue } from '../promised-value';

describe('PromisedValue', () => {

    it('works like a promise', async () => {
        const promisedString = new CorePromisedValue<string>();
        expect(promisedString.value).toBe(null);
        expect(promisedString.isResolved()).toBe(false);

        promisedString.resolve('foo');
        expect(promisedString.isResolved()).toBe(true);
        expect(promisedString.value).toBe('foo');

        const resolvedValue = await promisedString;
        expect(resolvedValue).toBe('foo');
    });

    it('can update values', async () => {
        const promisedString = new CorePromisedValue<string>();
        promisedString.resolve('foo');
        promisedString.resolve('bar');

        expect(promisedString.isResolved()).toBe(true);
        expect(promisedString.value).toBe('bar');

        const resolvedValue = await promisedString;
        expect(resolvedValue).toBe('bar');
    });

});
