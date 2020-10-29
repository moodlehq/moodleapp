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

import { CoreUrlUtilsProvider } from '@services/utils/url';

describe('CoreUrlUtilsProvider', () => {

    let urlUtils: CoreUrlUtilsProvider;

    beforeEach(() => {
        urlUtils = new CoreUrlUtilsProvider();
    });

    it('adds www if missing', () => {
        const originalUrl = 'https://moodle.org';
        const url = urlUtils.addOrRemoveWWW(originalUrl);

        expect(url).toEqual('https://www.moodle.org');
    });

    it('removes www if present', () => {
        const originalUrl = 'https://www.moodle.org';
        const url = urlUtils.addOrRemoveWWW(originalUrl);

        expect(url).toEqual('https://moodle.org');
    });

    it('adds params to URL without params', () => {
        const originalUrl = 'https://moodle.org';
        const params = {
            first: '1',
            second: '2',
        };
        const url = urlUtils.addParamsToUrl(originalUrl, params);

        expect(url).toEqual('https://moodle.org?first=1&second=2');
    });

    it('adds params to URL with existing params', () => {
        const originalUrl = 'https://moodle.org?existing=1';
        const params = {
            first: '1',
            second: '2',
        };
        const url = urlUtils.addParamsToUrl(originalUrl, params);

        expect(url).toEqual('https://moodle.org?existing=1&first=1&second=2');
    });

    it('doesn\'t change URL if no params supplied', () => {
        const originalUrl = 'https://moodle.org';
        const url = urlUtils.addParamsToUrl(originalUrl);

        expect(url).toEqual(originalUrl);
    });

    it('adds anchor to URL', () => {
        const originalUrl = 'https://moodle.org';
        const params = {
            first: '1',
            second: '2',
        };
        const url = urlUtils.addParamsToUrl(originalUrl, params, 'myanchor');

        expect(url).toEqual('https://moodle.org?first=1&second=2#myanchor');
    });

});
