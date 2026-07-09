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

import { CoreErrorLogs } from '@static/error-logs';

describe('CoreErrorLogs', () => {

    beforeEach(() => {
        CoreErrorLogs.getErrorLogs().splice(0);
    });

    it('adds and retrieves error logs', () => {
        const error = {
            message: 'Something failed',
            method: 'core_test_method',
            time: 123,
            type: 'error',
            data: {
                value: 'ok',
            },
        };

        CoreErrorLogs.addErrorLog(error);

        const logs = CoreErrorLogs.getErrorLogs();

        expect(logs).toHaveLength(1);
        expect(logs[0]).toEqual(error);
        expect(logs[0]).not.toBe(error);
    });

    it('sanitizes possible tokens in message and nested data', () => {
        CoreErrorLogs.addErrorLog({
            message: 'Token ABCDEFGHIJKLMNOPQRSTUV failed',
            method: 'core_test_method',
            time: 123,
            type: 'error',
            data: {
                token: '12345678901234567890',
                nested: {
                    array: ['safe', 'ZYXWVUTSRQPONMLKJIHG'],
                    text: 'Bearer QWERTYUIOPASDFGHJKLZXCVB',
                },
            },
        });

        expect(CoreErrorLogs.getErrorLogs()).toEqual([{
            message: 'Token *** failed',
            method: 'core_test_method',
            time: 123,
            type: 'error',
            data: {
                token: '***',
                nested: {
                    array: ['safe', '***'],
                    text: 'Bearer ***',
                },
            },
        }]);
    });

    it('sanitizes token-like query parameters', () => {
        CoreErrorLogs.addErrorLog({
            message: 'GET /webservice/rest/server.php?wstoken=12345678901234567890&wsfunction=test',
            method: 'core_test_method',
            time: 123,
            type: 'error',
            data: {
                url: 'https://example.com/path?token=abcdefghijabcdefghij&foo=bar&KEY=zyxwvutsrqponmlkjihg',
                privateTokenUrl: 'https://example.com/path?privatetoken=ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            },
        });

        expect(CoreErrorLogs.getErrorLogs()[0]).toEqual({
            message: 'GET /webservice/rest/server.php?wstoken=***&wsfunction=test',
            method: 'core_test_method',
            time: 123,
            type: 'error',
            data: {
                url: 'https://example.com/path?token=***&foo=bar&KEY=***',
                privateTokenUrl: 'https://example.com/path?privatetoken=***',
            },
        });
    });

    it('sanitizes tokenpluginfile token path segment', () => {
        CoreErrorLogs.addErrorLog({
            message: 'File URL /tokenpluginfile.php/abc123token/45/mod_folder/content/file.txt',
            method: 'core_test_method',
            time: 123,
            type: 'error',
            data: {
                first: '/tokenpluginfile.php/firsttoken/1/fileA.png',
                second: '/tokenpluginfile.php/secondtoken/2/fileB.png',
            },
        });

        expect(CoreErrorLogs.getErrorLogs()[0]).toEqual({
            message: 'File URL /tokenpluginfile.php/***/45/mod_folder/content/file.txt',
            method: 'core_test_method',
            time: 123,
            type: 'error',
            data: {
                first: '/tokenpluginfile.php/***/1/fileA.png',
                second: '/tokenpluginfile.php/***/2/fileB.png',
            },
        });
    });

    it('does not mutate the original error data object', () => {
        const data = {
            token: 'ABCDEFGHIJABCDEFGHIJ',
            nested: {
                token: '12345678901234567890',
            },
        };

        CoreErrorLogs.addErrorLog({
            message: 'Message with token ABCDEFGHIJKLMNOPQRST',
            method: 'core_test_method',
            time: 123,
            type: 'error',
            data,
        });

        expect(data).toEqual({
            token: 'ABCDEFGHIJABCDEFGHIJ',
            nested: {
                token: '12345678901234567890',
            },
        });
        expect(CoreErrorLogs.getErrorLogs()[0].data).toEqual({
            token: '***',
            nested: {
                token: '***',
            },
        });
    });

});
