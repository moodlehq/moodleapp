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

import Faker from 'faker';

import { CoreError } from '@classes/errors/error';

describe('CoreError', () => {

    it('behaves like an error', () => {
        // Arrange
        const message = Faker.lorem.sentence();

        let error: CoreError | null = null;

        // Act
        try {
            throw new CoreError(message);
        } catch (e) {
            error = e;
        }

        // Assert
        expect(error).not.toBeNull();
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(CoreError);
        expect(error!.name).toEqual('CoreError');
        expect(error!.message).toEqual(message);
        expect(error!.stack).not.toBeNull();
        expect(error!.stack).toContain('src/core/classes/tests/error.test.ts');
    });

    it('can be subclassed', () => {
        // Arrange
        class CustomCoreError extends CoreError {

            constructor(m: string) {
                super(`Custom message: ${m}`);
            }

        }

        const message = Faker.lorem.sentence();

        let error: CustomCoreError | null = null;

        // Act
        try {
            throw new CustomCoreError(message);
        } catch (e) {
            error = e;
        }

        // Assert
        expect(error).not.toBeNull();
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(CoreError);
        expect(error).toBeInstanceOf(CustomCoreError);
        expect(error!.name).toEqual('CustomCoreError');
        expect(error!.message).toEqual(`Custom message: ${message}`);
        expect(error!.stack).not.toBeNull();
        expect(error!.stack).toContain('src/core/classes/tests/error.test.ts');
    });

});
