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

/**
 * Class with helper functions for urls.
 */
class Url {

    /**
     * Add params to a URL.
     *
     * @param url URL to add the params to.
     * @param params Object with the params to add.
     * @return URL with params.
     */
    static addParamsToUrl(url, params) {
        let separator = url.indexOf('?') != -1 ? '&' : '?';

        for (const key in params) {
            let value = params[key];

            // Ignore objects.
            if (typeof value != 'object') {
                url += separator + key + '=' + value;
                separator = '&';
            }
        }

        return url;
    }

    /**
     * Parse parts of a url, using an implicit protocol if it is missing from the url.
     *
     * @param url Url.
     * @return Url parts.
     */
    static parse(url) {
        // Parse url with regular expression taken from RFC 3986: https://tools.ietf.org/html/rfc3986#appendix-B.
        const match = url.trim().match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/);

        if (!match) {
            return null;
        }

        const host = match[4] || '';

        // Get the credentials and the port from the host.
        const [domainAndPort, credentials] = host.split('@').reverse();
        const [domain, port] = domainAndPort.split(':');
        const [username, password] = credentials ? credentials.split(':') : [];

        // Prepare parts replacing empty strings with undefined.
        return {
            protocol: match[2] || undefined,
            domain: domain || undefined,
            port: port || undefined,
            credentials: credentials || undefined,
            username: username || undefined,
            password: password || undefined,
            path: match[5] || undefined,
            query: match[7] || undefined,
            fragment: match[9] || undefined,
        };
    }
}

module.exports = Url;
