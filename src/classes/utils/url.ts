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

    // Avoid creating singleton instances
    private constructor() {}

    /**
     * Parse parts of a url, using an implicit protocol if it is missing from the url.
     *
     * @param url Url.
     * @param implicitProtocol Protocol to be used if the url doesn't have any.
     * @return Url parts.
     */
    static parse(url: string, implicitProtocol?: string): UrlParts | null {
        // Prepare url before parsing
        url = url.trim();

        if (implicitProtocol && !url.match(/^[a-zA-Z]+:\/\//)) {
            url = `${implicitProtocol}://${url}`;
        }

        // Regular expression taken from RFC 3986: https://tools.ietf.org/html/rfc3986#appendix-B
        const match = url.trim().match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/);

        if (!match) {
            return null;
        }

        // Prepare parts replacing empty strings with undefined
        return {
            protocol: match[2] || undefined,
            domain: match[4] || undefined,
            path: match[5] || undefined,
            query: match[7] || undefined,
            fragment: match[9] || undefined,
        };
    }

}
