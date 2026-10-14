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

import type * as CapacitorApp from '@capacitor/app';
import { CoreConstants } from '@/core/constants';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreCustomURLSchemesProvider } from '@services/urlschemes';
import { CoreEvents } from '@static/events';

describe('CoreCustomURLSchemes launch URL', () => {
    const tokenURL = `${CoreConstants.CONFIG.customurlscheme}://token=sso-callback`;
    const linkURL = `${CoreConstants.CONFIG.customurlscheme}://link=https://other.example.edu`;
    let service: CoreCustomURLSchemesProvider;
    let getLaunchUrl: jest.Mock;

    beforeEach(() => {
        const capacitorApp = jest.requireActual<typeof CapacitorApp>('@capacitor/app');
        getLaunchUrl = jest.fn().mockResolvedValue({ url: tokenURL });
        jest.replaceProperty(capacitorApp, 'App', { ...capacitorApp.App, getLaunchUrl });
        service = new CoreCustomURLSchemesProvider();
    });

    it('uses the initial token URL before receiving URL events', async () => {
        expect(await service.getLastLaunchURL()).toBe(tokenURL);
        expect(await service.appLaunchedWithTokenURL()).toBe(true);
    });

    it('uses the latest received URL instead of the initial token URL', async () => {
        jest.spyOn(service, 'handleCustomURL').mockResolvedValue(undefined);
        expect(await service.appLaunchedWithTokenURL()).toBe(true);

        service.handleLaunchURL(tokenURL);
        service.handleLaunchURL(linkURL);
        getLaunchUrl.mockClear();

        expect(await service.getLastLaunchURL()).toBe(linkURL);
        expect(await service.appLaunchedWithTokenURL()).toBe(false);
        expect(getLaunchUrl).not.toHaveBeenCalled();
    });

    it('prefers an event received while querying the initial URL', async () => {
        jest.spyOn(service, 'handleCustomURL').mockResolvedValue(undefined);
        const initialURL = new CorePromisedValue<{ url: string }>();
        getLaunchUrl.mockReturnValue(initialURL);
        const result = service.getLastLaunchURL();

        service.handleLaunchURL(linkURL);
        initialURL.resolve({ url: tokenURL });

        expect(await result).toBe(linkURL);
    });

    it('returns undefined if there is no launch URL', async () => {
        getLaunchUrl.mockResolvedValue(undefined);

        expect(await service.getLastLaunchURL()).toBeUndefined();
        expect(await service.appLaunchedWithTokenURL()).toBe(false);
    });

    it('updates the latest URL even when a repeated launch is ignored', async () => {
        const handle = jest.spyOn(service, 'handleCustomURL').mockResolvedValue(undefined);
        const trigger = jest.spyOn(CoreEvents, 'trigger');

        service.handleLaunchURL(tokenURL);
        service.handleLaunchURL(linkURL);
        service.handleLaunchURL(tokenURL);

        expect(await service.getLastLaunchURL()).toBe(tokenURL);
        expect(handle).toHaveBeenCalledTimes(2);
        expect(trigger).toHaveBeenCalledTimes(2);
        expect(trigger).toHaveBeenNthCalledWith(1, CoreEvents.APP_LAUNCHED_URL, { url: tokenURL });
        expect(trigger).toHaveBeenNthCalledWith(2, CoreEvents.APP_LAUNCHED_URL, { url: linkURL });
    });

    it('handles a repeated launch again after three seconds', () => {
        jest.useFakeTimers();
        const handle = jest.spyOn(service, 'handleCustomURL').mockResolvedValue(undefined);

        service.handleLaunchURL(linkURL);
        jest.advanceTimersByTime(3000);
        service.handleLaunchURL(linkURL);

        expect(handle).toHaveBeenCalledTimes(2);
    });

    it('stores unsupported launch URLs without processing or notifying observers', async () => {
        const url = 'https://example.edu';
        const handle = jest.spyOn(service, 'handleCustomURL').mockResolvedValue(undefined);
        const trigger = jest.spyOn(CoreEvents, 'trigger');

        service.handleLaunchURL(url);

        expect(await service.getLastLaunchURL()).toBe(url);
        expect(handle).not.toHaveBeenCalled();
        expect(trigger).not.toHaveBeenCalled();
    });

    it('routes processing failures through the existing error handler', async () => {
        const error = new Error('Cannot handle URL');
        jest.spyOn(service, 'handleCustomURL').mockRejectedValue(error);
        const treatError = jest.spyOn(service, 'treatHandleCustomURLError').mockImplementation(() => undefined);

        service.handleLaunchURL(linkURL);
        await Promise.resolve();

        expect(treatError).toHaveBeenCalledWith(error, linkURL, 'handleOpenURL');
    });
});
