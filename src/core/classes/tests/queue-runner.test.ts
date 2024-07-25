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

import { CoreQueueRunner } from '@classes/queue-runner';
import { CoreWait } from '@singletons/wait';

describe('CoreQueueRunner', () => {

    it('Locks threads launched synchronously', async () => {
        // Arrange
        const concurrency = 100;
        const range = Array.from({ length: concurrency }, (_, item) => item);
        const lock = new CoreQueueRunner();
        const items: string[] = [];

        // Act
        await Promise.all(range.map((i) => lock.run(async () => {
            await CoreWait.wait(Math.floor(Math.random() * 10));

            items.push(`Item #${i}`);
        })));

        // Assert
        expect(items).toEqual(range.map(i => `Item #${i}`));
    });

});
