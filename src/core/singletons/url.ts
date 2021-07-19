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

import { CoreText } from './text';

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
     * Url credentials: username and password (if any).
     */
    credentials?: string;

    /**
     * Url's username.
     */
    username?: string;

    /**
     * Url's password.
     */
    password?: string;

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
    private constructor() {
        // Nothing to do.
    }

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

        const host = match[4] || '';

        // Get the credentials and the port from the host.
        const [domainAndPort, credentials]: string[] = host.split('@').reverse();
        const [domain, port]: string[] = domainAndPort.split(':');
        const [username, password]: string[] = credentials ? credentials.split(':') : [];

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
            '/my/?',
            '/\\?redirect=0',
            '/index\\.php',
            '/course/view\\.php',
            '\\/login/index\\.php',
            '/mod/page/view\\.php',
        ];
        const match = url.match(new RegExp(`^https?://(.*?)(${knownSuffixes.join('|')})`));

        if (match) {
            return match[1];
        }

        // If nothing else worked, parse the domain.
        const urlParts = CoreUrl.parse(url);

        return urlParts?.domain ? urlParts.domain : null;
    }

    /**
     * Returns the pattern to check if the URL is a valid Moodle Url.
     *
     * @return Desired RegExp.
     */
    static getValidMoodleUrlPattern(): RegExp {
        // Regular expression based on RFC 3986: https://tools.ietf.org/html/rfc3986#appendix-B.
        // Improved to not admit spaces.
        return new RegExp(/^(([^:/?# ]+):)?(\/\/([^/?# ]*))?([^?# ]*)(\?([^#]*))?(#(.*))?$/);
    }

    /**
     * Check if the given url is valid for the app to connect.
     *
     * @param url Url to check.
     * @return True if valid, false otherwise.
     */
    static isValidMoodleUrl(url: string): boolean {
        const patt = CoreUrl.getValidMoodleUrlPattern();

        return patt.test(url.trim());
    }

    /**
     * Removes protocol from the url.
     *
     * @param url Site url.
     * @return Url without protocol.
     */
    static removeProtocol(url: string): string {
        return url.replace(/^[a-zA-Z]+:\/\//i, '');
    }

    /**
     * Check if two URLs have the same domain and path.
     *
     * @param urlA First URL.
     * @param urlB Second URL.
     * @return Whether they have same domain and path.
     */
    static sameDomainAndPath(urlA: string, urlB: string): boolean {
        // Add protocol if missing, the parse function requires it.
        if (!urlA.match(/^[^/:.?]*:\/\//)) {
            urlA = `https://${urlA}`;
        }
        if (!urlB.match(/^[^/:.?]*:\/\//)) {
            urlB = `https://${urlB}`;
        }

        const partsA = CoreUrl.parse(urlA);
        const partsB = CoreUrl.parse(urlB);

        partsA && Object.entries(partsA).forEach(([part, value]) => partsA[part] = value?.toLowerCase());
        partsB && Object.entries(partsB).forEach(([part, value]) => partsB[part] = value?.toLowerCase());

        return partsA?.domain === partsB?.domain
            && CoreText.removeEndingSlash(partsA?.path) === CoreText.removeEndingSlash(partsB?.path);
    }

}
