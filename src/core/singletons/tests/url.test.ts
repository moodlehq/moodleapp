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

import { CoreUrl } from '@singletons/url';

describe('CoreUrl singleton', () => {

    it('parses standard urls', () => {
        expect(CoreUrl.parse('https://my.subdomain.com/path/?query=search#hash')).toEqual({
            protocol: 'https',
            domain: 'my.subdomain.com',
            path: '/path/',
            query: 'query=search',
            fragment: 'hash',
        });
    });

    it('parses domains without TLD', () => {
        expect(CoreUrl.parse('ftp://localhost/nested/path')).toEqual({
            protocol: 'ftp',
            domain: 'localhost',
            path: '/nested/path',
        });
    });

    it('parses ips', () => {
        expect(CoreUrl.parse('http://192.168.1.157:8080/')).toEqual({
            protocol: 'http',
            domain: '192.168.1.157',
            port: '8080',
            path: '/',
        });
    });

    it('compares domains and paths', () => {
        expect(CoreUrl.sameDomainAndPath('https://school.edu', 'https://school.edu')).toBe(true);
        expect(CoreUrl.sameDomainAndPath('https://school.edu', 'HTTPS://SCHOOL.EDU')).toBe(true);
        expect(CoreUrl.sameDomainAndPath('https://school.edu/moodle', 'https://school.edu/moodle')).toBe(true);
        expect(CoreUrl.sameDomainAndPath('https://school.edu/moodle', 'https://school.edu/moodle/')).toBe(true);
        expect(CoreUrl.sameDomainAndPath('https://school.edu/moodle', 'https://school.edu/moodle#about')).toBe(true);
        expect(CoreUrl.sameDomainAndPath('https://school.edu/moodle', 'HTTPS://SCHOOL.EDU/MOODLE')).toBe(true);
        expect(CoreUrl.sameDomainAndPath('https://school.edu/moodle', 'HTTPS://SCHOOL.EDU/MOODLE/')).toBe(true);
        expect(CoreUrl.sameDomainAndPath('https://school.edu/moodle', 'HTTPS://SCHOOL.EDU/MOODLE#ABOUT')).toBe(true);

        expect(CoreUrl.sameDomainAndPath('https://school.edu/moodle', 'https://school.edu/moodle/about')).toBe(false);
    });

});
