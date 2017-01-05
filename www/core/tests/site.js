// (C) Copyright 2015 Martin Dougiamas
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

describe('$mmSite', function() {
    var mmSite;

    // Injecting.
    beforeEach(module('mm.core'));
    beforeEach(inject(function($mmSite, $httpBackend) {
        mmSite = $mmSite;
        $httpBackend.whenGET(/.*\/templates.*/)
            .respond(200, '');
        $httpBackend.whenGET(/build.*/)
            .respond(200, '');
        $httpBackend.whenGET(/core\/assets.*/)
            .respond(200, '');
    }));

    it('a user is not logged in by default', function() {
        expect(mmSite.isLoggedIn()).toEqual(false);
    });

    it('a site can logged in to', function() {
        mmSite.setSite('siteId', 'http://somesite.example', 'abc', {});
        expect(mmSite.isLoggedIn()).toEqual(true);
    });

    it('a site can return details about its config', function() {
        var infos = {a: 'b', c: 4};
        mmSite.setSite('siteId', 'http://somesite.example', 'abc', infos);

        expect(mmSite.getId()).toEqual('siteId');
        expect(mmSite.getURL()).toEqual('http://somesite.example');
        expect(mmSite.getToken()).toEqual('abc');
        expect(mmSite.getInfo()).toEqual(infos);
    });

    it('a site knows about transfer parameters', function() {
        var infos = {
            uploadfiles: true,
            downloadfiles: true,
            usercanmanageownfiles: true
        };
        mmSite.setSite('siteId', 'http://somesite.example', 'abc', infos);

        expect(mmSite.canUploadFiles()).toEqual(true);
        expect(mmSite.canDownloadFiles()).toEqual(true);
        expect(mmSite.canAccessMyFiles()).toEqual(true);

        infos = {
            uploadfiles: false,
            downloadfiles: false,
            usercanmanageownfiles: false
        };
        mmSite.setSite('siteId', 'http://somesite.example', 'abc', infos);

        expect(mmSite.canUploadFiles()).toEqual(false);
        expect(mmSite.canDownloadFiles()).toEqual(false);
        expect(mmSite.canAccessMyFiles()).toEqual(false);

        infos = {
            uploadfiles: false,
            downloadfiles: false,
        };
        mmSite.setSite('siteId', 'http://somesite.example', 'abc', infos);

        expect(mmSite.canAccessMyFiles()).toEqual(true);
    });

    it('a site knows what web services are available', function() {
        infos = {
            functions: [
                { name: 'core_some_function' },
                { name: 'local_mobile_core_extra_function' }
            ]
        };
        mmSite.setSite('siteId', 'http://somesite.example', 'abc', infos);

        expect(mmSite.wsAvailable('core_some_function', true)).toEqual(true);
        expect(mmSite.wsAvailable('core_some_function', false)).toEqual(true);

        expect(mmSite.wsAvailable('core_extra_function', false)).toEqual(false);
        expect(mmSite.wsAvailable('core_extra_function', true)).toEqual(true);

        expect(mmSite.wsAvailable('core_invalid_function', true)).toEqual(false);
        expect(mmSite.wsAvailable('core_invalid_function', true)).toEqual(false);
    });

});
