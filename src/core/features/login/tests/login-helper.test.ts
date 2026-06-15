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

import { Md5 } from 'ts-md5';

import { CoreConstants } from '@/core/constants';
import { CoreSite } from '@classes/sites/site';
import { CoreConfig } from '@services/config';
import { CoreSites } from '@services/sites';
import { CoreLoginHelper } from '../services/login-helper';
import { fakeTime, mockSingleton } from '@/testing/utils';

describe('CoreLoginHelperProvider', () => {

    describe('addUserIdToSsoUrl', () => {

        const siteUrl = 'https://campus.example.edu';
        const siteId = '42';
        const launchUrl = `${siteUrl}/admin/tool/mobile/launch.php`;

        const mockSite = (privateKey: string | undefined): void => {
            mockSingleton(CoreSites, {
                getSite: async () => ({
                    getURL: () => siteUrl,
                    containsUrl: () => true,
                    getUserId: () => 42,
                    getFilesAccessKey: () => privateKey,
                } as unknown as CoreSite),
            });
        };

        const previousAddUserIdToSsoUrl = CoreConstants.CONFIG.addUserIdToSsoUrl;
        const previousCustomUrlScheme = CoreConstants.CONFIG.customurlscheme;
        const previousWsService = CoreConstants.CONFIG.wsservice;

        beforeEach(() => {
            jest.spyOn(Math, 'random').mockReturnValue(0.25);

            CoreConstants.CONFIG.customurlscheme = 'moodlemobile';
            CoreConstants.CONFIG.wsservice = 'moodle_mobile_app';
            CoreConstants.CONFIG.addUserIdToSsoUrl = false;

            mockSingleton(CoreConfig, {
                set: jest.fn().mockResolvedValue(undefined),
            });
        });

        afterEach(() => {
            CoreConstants.CONFIG.addUserIdToSsoUrl = previousAddUserIdToSsoUrl;
            CoreConstants.CONFIG.customurlscheme = previousCustomUrlScheme;
            CoreConstants.CONFIG.wsservice = previousWsService;
        });

        it('adds userid and UTC signature when reconnect identity is enabled', async () => {
            fakeTime(new Date('2026-06-12T23:30:00-05:00'));

            CoreConstants.CONFIG.addUserIdToSsoUrl = true;
            mockSite('private-key');

            const loginUrl = await CoreLoginHelper.prepareForSSOLogin(siteUrl, {
                launchUrl,
                urlParams: { oauthsso: '77' },
                siteId,
            });

            const params = new URL(loginUrl).searchParams;

            expect(params.get('service')).toBe('moodle_mobile_app');
            expect(params.get('urlscheme')).toBe('moodlemobile');
            expect(params.get('oauthsso')).toBe('77');
            expect(params.get('userid')).toBe('42');
            expect(params.get('signature')).toBe(Md5.hashAsciiStr('2026-06-13-private-key'));
        });

        it('does not add userid or signature when app config flag is disabled', async () => {
            CoreConstants.CONFIG.addUserIdToSsoUrl = false;
            mockSite('private-key');

            const loginUrl = await CoreLoginHelper.prepareForSSOLogin(siteUrl, {
                launchUrl,
                siteId,
            });

            const params = new URL(loginUrl).searchParams;

            expect(params.get('userid')).toBeNull();
            expect(params.get('signature')).toBeNull();
        });

        it('does not add userid or signature when siteId is not supplied', async () => {
            CoreConstants.CONFIG.addUserIdToSsoUrl = true;
            mockSite('private-key');

            const loginUrl = await CoreLoginHelper.prepareForSSOLogin(siteUrl, {
                launchUrl,
            });

            const params = new URL(loginUrl).searchParams;

            expect(params.get('userid')).toBeNull();
            expect(params.get('signature')).toBeNull();
        });

        it('does not add userid or signature when user private key is missing', async () => {
            CoreConstants.CONFIG.addUserIdToSsoUrl = true;
            mockSite(undefined);

            const loginUrl = await CoreLoginHelper.prepareForSSOLogin(siteUrl, {
                launchUrl,
                siteId,
            });

            const params = new URL(loginUrl).searchParams;

            expect(params.get('userid')).toBeNull();
            expect(params.get('signature')).toBeNull();
        });

    });

});
