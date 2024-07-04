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

import { AsyncInstance, LazyMethodsGuard, asyncInstance } from '@/core/utils/async-instance';
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
        expect(await asyncService.isEager()).toBe(true);
        expect(await asyncService.hello()).toEqual('Hi there!');
        expect(asyncService.instance).toBeInstanceOf(LazyService);
        expect(await asyncService.isEager()).toBe(false);
    });

    it('initialize instance for forced eager properties', async () => {
        const asyncService = asyncInstance(() => new LazyService());

        asyncService.setEagerInstance(new EagerService());
        asyncService.setLazyOverrides(['isEager']);

        expect(await asyncService.isEager()).toBe(false);
    });

    it('does not return undefined methods when they are declared', async () => {
        const asyncService = asyncInstance<LazyService, EagerService>(() => new LazyService());

        asyncService.setEagerInstance(new EagerService());
        asyncService.setLazyMethods(['hello', 'goodbye']);

        expect(asyncService.hello).not.toBeUndefined();
        expect(asyncService.goodbye).not.toBeUndefined();
        expect(asyncService.isEager).not.toBeUndefined();
        expect(asyncService.notImplemented).toBeUndefined();
    });

    it('guards against missing or invalid instance methods', () => {
        // Define interfaces.
        interface Eager {
            lorem(): void;
            ipsum(): void;
        }

        interface Lazy extends Eager {
            foo(): void;
            bar(): void;
        }

        // Test valid method tuples.
        expectSameTypes<LazyMethodsGuard<['foo', 'bar'], Lazy, Eager>, ['foo', 'bar']>(true);
        expectSameTypes<LazyMethodsGuard<['bar', 'foo'], Lazy, Eager>, ['bar', 'foo']>(true);
        expectSameTypes<LazyMethodsGuard<['foo', 'foo', 'bar'], Lazy, Eager>, ['foo', 'foo', 'bar']>(true);

        // Test invalid method tuples.
        expectSameTypes<LazyMethodsGuard<['foo'], Lazy, Eager>, never>(true);
        expectSameTypes<LazyMethodsGuard<['foo', 'bar', 'lorem'], Lazy, Eager>, never>(true);
        expectSameTypes<LazyMethodsGuard<['foo', 'bar', 'baz'], Lazy, Eager>, never>(true);
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

    it('keeps eager methods synchronous', () => {
        // Arrange.
        const asyncService = asyncInstance<LazyService, EagerService>(() => new LazyService());

        asyncService.setEagerInstance(new EagerService());

        // Act.
        const message = asyncService.eagerHello();

        // Assert.
        expect(message).toEqual('hello');
        expectSameTypes<typeof message, string>(true);
    });

});

class EagerService {

    answer = 42;

    notImplemented?(): void;

    eagerHello(): string {
        return 'hello';
    }

    async isEager(): Promise<boolean> {
        return true;
    }

}

class FakeEagerService {

    answer = '42';

}

class LazyService extends EagerService {

    async isEager(): Promise<boolean> {
        return false;
    }

    hello(): string {
        return 'Hi there!';
    }

    async goodbye(): Promise<string> {
        return 'Sayonara!';
    }

}
