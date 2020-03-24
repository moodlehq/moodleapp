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
 * Parts contained within a url.
 */
interface UrlParts {

    /**
     * Url protocol.
     */
    protocol?: string;

    /**
     * Url domain.
     */
    domain?: string;

    /**
     * Url port.
     */
    port?: string;

    /**
     * Url path.
     */
    path?: string;

    /**
     * Url query.
     */
    query?: string;

    /**
     * Url fragment.
     */
    fragment?: string;

}

/**
 * Singleton with helper functions for urls.
 */
export class CoreUrl {

    // Avoid creating singleton instances.
    private constructor() {}

    /**
     * Parse parts of a url, using an implicit protocol if it is missing from the url.
     *
     * @param url Url.
     * @return Url parts.
     */
    static parse(url: string): UrlParts | null {
        // Parse url with regular expression taken from RFC 3986: https://tools.ietf.org/html/rfc3986#appendix-B.
        const match = url.trim().match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/);

        if (!match) {
            return null;
        }

        // Split host into domain and port.
        const host = match[4] || '';
        const [domain, port]: string[] = host.indexOf(':') === -1 ? [host] : host.split(':');

        // Prepare parts replacing empty strings with undefined.
        return {
            protocol: match[2] || undefined,
            domain: domain || undefined,
            port: port || undefined,
            path: match[5] || undefined,
            query: match[7] || undefined,
            fragment: match[9] || undefined,
        };
    }

    /**
     * Guess the Moodle domain from a site url.
     *
     * @param url Site url.
     * @return Guessed Moodle domain.
     */
    static guessMoodleDomain(url: string): string | null {
        // Add protocol if it was missing. Moodle can only be served through http or https, so this is a fair assumption to make.
        if (!url.match(/^https?:\/\//)) {
            url = `https://${url}`;
        }

        // Match using common suffixes.
        const knownSuffixes = [
            '\/my\/?',
            '\/\\\?redirect=0',
            '\/index\\\.php',
            '\/course\/view\\\.php',
            '\/login\/index\\\.php',
            '\/mod\/page\/view\\\.php',
        ];
        const match = url.match(new RegExp(`^https?:\/\/(.*?)(${knownSuffixes.join('|')})`));

        if (match) {
            return match[1];
        }

        // If nothing else worked, parse the domain.
        const urlParts = CoreUrl.parse(url);

        return urlParts && urlParts.domain ? urlParts.domain : null;
    }

}
