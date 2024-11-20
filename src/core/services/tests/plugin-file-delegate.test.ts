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

import { mock, mockSingleton } from '@/testing/utils';
import { CoreSite } from '@classes/sites/site';
import { CorePluginFileDelegateService, CorePluginFileHandler } from '@services/plugin-file-delegate';
import { CoreSites } from '@services/sites';
import { CoreUrl } from '@singletons/url';

describe('CorePluginFileDelegate', () => {

    let pluginFileDelegate: CorePluginFileDelegateService;

    beforeEach(async () => {
        const site = mock(new CoreSite('42', 'https://mysite.com', 'token'), {
            isFeatureDisabled: () => false,
        });

        mockSingleton(CoreSites, { getCurrentSite: () => site, getCurrentSiteId: () => '42', isLoggedIn: () => true });

        pluginFileDelegate = new CorePluginFileDelegateService();
        pluginFileDelegate.registerHandler(new ModFooRevisionHandler());

        await pluginFileDelegate.updateHandlers();
    });

    it('removes revision from a URL', () => {
        const urlsToTest = [
            // Revision removed by mod_foo handler.
            {
                value: 'http://mysite.com/webservice/pluginfile.php/6/mod_foo/content/14/foo.txt',
                expected: 'http://mysite.com/webservice/pluginfile.php/6/mod_foo/content/0/foo.txt',
            },
            // Revision not removed because the component is not mod_foo.
            {
                value: 'http://mysite.com/webservice/pluginfile.php/6/mod_page/content/14/foo.txt',
                expected: 'http://mysite.com/webservice/pluginfile.php/6/mod_page/content/14/foo.txt',
            },
            // Revision not removed because it's not a pluginfile URL.
            {
                value: 'http://mysite.com/6/mod_foo/content/14/foo.txt',
                expected: 'http://mysite.com/6/mod_foo/content/14/foo.txt',
            },
        ];

        urlsToTest.forEach(data => {
            expect(
                pluginFileDelegate.removeRevisionFromUrl(data.value, CoreUrl.getPluginFileArgs(data.value) ?? []),
            ).toEqual(data.expected);
        });
    });

});

class ModFooRevisionHandler implements CorePluginFileHandler {

    name = 'ModFooHandler';
    component = 'mod_foo';

    /**
     * @inheritdoc
     */
    getComponentRevisionRegExp(args: string[]): RegExp | undefined {
        // Check filearea.
        if (args[2] == 'content') {
            // Component + Filearea + Revision
            return new RegExp('/mod_foo/content/([0-9]+)/');
        }
    }

    /**
     * @inheritdoc
     */
    getComponentRevisionReplace(): string {
        // Component + Filearea + Revision
        return '/mod_foo/content/0/';
    }

    /**
     * @inheritdoc
     */
    async isEnabled(): Promise<boolean> {
        return true;
    }

}
