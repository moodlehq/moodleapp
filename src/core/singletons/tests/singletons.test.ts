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

import { mock } from '@/testing/utils';
import { CoreSingletonProxy, makeSingleton, setSingletonsInjector } from '@singletons';

import { MilkyWayService } from './stubs';

describe('Singletons', () => {

    let MilkyWay: CoreSingletonProxy<MilkyWayService>;

    beforeEach(() => {
        setSingletonsInjector(mock({ get: serviceClass => new serviceClass() }));

        MilkyWay = makeSingleton(MilkyWayService);
    });

    it('works using the service instance', () => {
        expect(MilkyWay.instance.getTheMeaningOfLife()).toBe(42);
    });

    it('works using magic methods', () => {
        expect(MilkyWay.getTheMeaningOfLife()).toBe(42);
    });

    it('works using magic methods defined as getters', () => {
        expect(MilkyWay.reduceYears(2)).toBe(-2);
    });

    it('works using magic getters', () => {
        expect(MilkyWay.meaningOfLife).toBe(42);
    });

    it('works using magic getters defined dynamically', () => {
        expect(MilkyWay.exists).toBeUndefined();

        MilkyWay.bigBang();

        expect(MilkyWay.exists).toBe(true);
    });

    it('magic getters use the same instance', () => {
        expect(MilkyWay.addYears(1)).toBe(1);
        expect(MilkyWay.instance.addYears(1)).toBe(2);
        expect(MilkyWay.addYears(1)).toBe(3);
        expect(MilkyWay.instance.addYears(2)).toBe(5);
    });

    it('magic methods respect inheritance', () => {
        expect(MilkyWay.isGalaxy()).toBe(true);
    });

});
