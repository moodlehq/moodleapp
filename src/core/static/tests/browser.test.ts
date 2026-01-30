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

import { CoreBrowser } from '@static/browser';

describe('CoreBrowser', () => {

    it('detects if cookie exists', () => {
        document.cookie = 'first-cookie=foo';
        document.cookie = 'second-cookie=bar';

        expect(CoreBrowser.hasCookie('first-cookie')).toBe(true);
        expect(CoreBrowser.hasCookie('second-cookie')).toBe(true);
        expect(CoreBrowser.hasCookie('third-cookie')).toBe(false);
    });

    it('gets a cookie', () => {
        document.cookie = 'first-cookie=foo';
        document.cookie = 'second-cookie=bar';

        expect(CoreBrowser.getCookie('first-cookie')).toEqual('foo');
        expect(CoreBrowser.getCookie('second-cookie')).toEqual('bar');
        expect(CoreBrowser.getCookie('third-cookie')).toEqual(null);
    });

    it('detects if a localStorage entry exists', () => {
        localStorage.setItem('first', 'foo');
        localStorage.setItem('second', 'bar');

        expect(CoreBrowser.hasLocalStorage('first')).toBe(true);
        expect(CoreBrowser.hasLocalStorage('second')).toBe(true);
        expect(CoreBrowser.hasLocalStorage('third')).toBe(false);
    });

    it('gets a localStorage entry', () => {
        localStorage.setItem('first', 'foo');
        localStorage.setItem('second', 'bar');

        expect(CoreBrowser.getLocalStorage('first')).toEqual('foo');
        expect(CoreBrowser.getLocalStorage('second')).toEqual('bar');
        expect(CoreBrowser.getLocalStorage('third')).toEqual(null);
    });

    it('sets, gets and removes development settings', () => {
        CoreBrowser.setDevelopmentSetting('first', 'foo');
        CoreBrowser.setDevelopmentSetting('second', 'bar');

        expect(CoreBrowser.getDevelopmentSetting('first')).toEqual('foo');
        expect(CoreBrowser.getDevelopmentSetting('second')).toEqual('bar');
        expect(CoreBrowser.getDevelopmentSetting('third')).toEqual(null);

        CoreBrowser.clearDevelopmentSetting('second');

        expect(CoreBrowser.getDevelopmentSetting('second')).toEqual(null);
    });

});
