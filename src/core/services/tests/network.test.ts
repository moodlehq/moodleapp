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

import { TestBed } from '@angular/core/testing';
import { mockSingleton } from '@/testing/utils';
import { CoreConstants } from '@/core/constants';
import { CoreConfig } from '@services/config';
import { CoreNetwork, CoreNetworkConnectionType, CoreNetworkService } from '@services/network';
import { CorePlatform } from '@services/platform';

describe('CoreNetwork', () => {

    let network: CoreNetworkService;

    beforeEach(() => {
        mockSingleton(CorePlatform, { isMobile: () => false, isAndroid: () => false });
        // Use a new real instance: the default mocks wrap the injected one's signals with jest functions.
        network = TestBed.runInInjectionContext(() => new CoreNetworkService());
        CoreNetwork.setInstance(network);
        jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
        network.setForceConnectionMode(undefined);
    });

    it('forces offline mode', () => {
        network.setForceConnectionMode(CoreNetworkConnectionType.OFFLINE);

        expect(network.isOnline()).toBe(false);
        expect(network.connectionType).toBe(CoreNetworkConnectionType.OFFLINE);
        expect(network.getForceConnectionMode()).toBe(CoreNetworkConnectionType.OFFLINE);
    });

    it('forces cellular mode', () => {
        network.setForceConnectionMode(CoreNetworkConnectionType.CELL);

        expect(network.isOnline()).toBe(true);
        expect(network.isCellular()).toBe(true);
        expect(network.isWifi()).toBe(false);
    });

    it('resets the forced mode', () => {
        network.setForceConnectionMode(CoreNetworkConnectionType.OFFLINE);
        network.setForceConnectionMode(undefined);

        expect(network.isOnline()).toBe(true);
        expect(network.getForceConnectionMode()).toBeUndefined();
        expect(network.connectionType).toBe(CoreNetworkConnectionType.WIFI);
    });

    it('restores the stored mode in development builds', async () => {
        jest.spyOn(CoreConstants, 'isDevOrTestingBuild').mockReturnValue(true);
        mockSingleton(CoreConfig, { get: <T>() => Promise.resolve(CoreNetworkConnectionType.OFFLINE as T) });

        await expect(network.restoreForcedConnectionMode()).resolves.toBe(CoreNetworkConnectionType.OFFLINE);
        expect(network.isOnline()).toBe(false);
    });

    it('ignores invalid stored modes', async () => {
        jest.spyOn(CoreConstants, 'isDevOrTestingBuild').mockReturnValue(true);
        mockSingleton(CoreConfig, { get: <T>() => Promise.resolve(CoreNetworkConnectionType.UNKNOWN as T) });

        await expect(network.restoreForcedConnectionMode()).resolves.toBeUndefined();
        expect(network.getForceConnectionMode()).toBeUndefined();
    });

    it('does not restore the stored mode in production builds', async () => {
        jest.spyOn(CoreConstants, 'isDevOrTestingBuild').mockReturnValue(false);
        const config = mockSingleton(CoreConfig, { get: <T>() => Promise.resolve(CoreNetworkConnectionType.OFFLINE as T) });
        const getSpy = jest.spyOn(config, 'get');

        await expect(network.restoreForcedConnectionMode()).resolves.toBeUndefined();
        expect(getSpy).not.toHaveBeenCalled();
        expect(network.isOnline()).toBe(true);
    });

});
