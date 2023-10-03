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

import { AsyncInstance, asyncInstance } from '@/core/utils/async-instance';
import { expectAnyType, expectSameTypes } from '@/testing/utils';

describe('AsyncInstance', () => {

    it('initializes instances lazily', async () => {
        const asyncService = asyncInstance(() => new LazyService());

        expect(asyncService.instance).toBe(undefined);
        expect(await asyncService.hello()).toEqual('Hi there!');
        expect(asyncService.instance).toBeInstanceOf(LazyService);
    });

    it('does not initialize instance for eager properties', async () => {
        const asyncService = asyncInstance(() => new LazyService());

        asyncService.setEagerInstance(new EagerService());

        expect(asyncService.instance).toBeUndefined();
        expect(asyncService.answer).toEqual(42);
        expect(asyncService.instance).toBeUndefined();
        expect(await asyncService.hello()).toEqual('Hi there!');
        expect(asyncService.instance).toBeInstanceOf(LazyService);
    });

    it('preserves undefined properties after initialization', async () => {
        const asyncService = asyncInstance(() => new LazyService()) as { thisDoesNotExist?: () => Promise<void>};

        await expect(asyncService.thisDoesNotExist?.()).rejects.toBeInstanceOf(Error);

        expect(asyncService.thisDoesNotExist).toBeUndefined();
    });

    it('restricts types hierarchy', () => {
        type GetInstances<T> = T extends AsyncInstance<infer TLazyInstance, infer TEagerInstance>
            ? { eager: TEagerInstance; lazy: TLazyInstance }
            : never;
        type GetEagerInstance<T> = GetInstances<T>['eager'];
        type GetLazyInstance<T> = GetInstances<T>['lazy'];

        expectSameTypes<GetLazyInstance<AsyncInstance<LazyService>>, LazyService>(true);
        expectSameTypes<GetEagerInstance<AsyncInstance<LazyService>>, Partial<LazyService>>(true);

        expectSameTypes<GetLazyInstance<AsyncInstance<LazyService, EagerService>>, LazyService>(true);
        expectSameTypes<GetEagerInstance<AsyncInstance<LazyService, EagerService>>, EagerService>(true);

        // @ts-expect-error LazyService should extend FakeEagerService.
        expectAnyType<AsyncInstance<LazyService, FakeEagerService>>();
    });

    it('makes methods asynchronous', () => {
        expectSameTypes<AsyncInstance<LazyService>['hello'], () => Promise<string>>(true);
        expectSameTypes<AsyncInstance<LazyService>['goodbye'], () => Promise<string>>(true);
    });

});

class EagerService {

    answer = 42;

}

class FakeEagerService {

    answer = '42';

}

class LazyService extends EagerService {

    hello(): string {
        return 'Hi there!';
    }

    async goodbye(): Promise<string> {
        return 'Sayonara!';
    }

}
