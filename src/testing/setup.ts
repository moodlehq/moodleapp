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

import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

import { setCreateSingletonMethodProxy, setSingletonsInjector } from '@singletons';

import { resetTestingEnvironment, getServiceInstance } from './utils';

setupZoneTestEnv();

// eslint-disable-next-line no-console
console.debug = () => {
    // Silence.
};

// eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
console.error = (...args: any[]) => {
    throw new Error(args.map(a => String(a)).join(''));
};

process.on('unhandledRejection', error => {
    throw new Error(error as string);
});

// Override the method to create singleton method proxies in order to facilitate setting up
// test expectations about method calls.
setCreateSingletonMethodProxy(
    (instance, method, property) =>
        instance[`mock_${String(property)}`] =
            instance[`mock_${String(property)}`] ??
            jest.fn((...args) => method.call(instance, ...args)),
);

setSingletonsInjector({ get: injectionToken => getServiceInstance(injectionToken) });
beforeEach(() => resetTestingEnvironment());
