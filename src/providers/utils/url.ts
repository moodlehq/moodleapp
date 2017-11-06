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

import { Injectable } from '@angular/core';
import { CoreLangProvider } from '../lang';

/*
 * "Utils" service with helper functions for URLs.
 */
@Injectable()
export class CoreUrlUtilsProvider {

    constructor(private langProvider: CoreLangProvider) {}

    /**
     * Extracts the parameters from a URL and stores them in an object.
     *
     * @param {string} url URL to treat.
     * @return {object} Object with the params.
     */
    extractUrlParams(url: string) : object {
        let regex = /[?&]+([^=&]+)=?([^&]*)?/gi,
            params = {};

        url.replace(regex, (match: string, key: string, value: string) : string => {
            params[key] = typeof value != 'undefined' ? value : '';
            return match;
        });

        return params;
    }

    /**
     * Returns the URL to the documentation of the app, based on Moodle version and current language.
     *
     * @param {string} [release] Moodle release.
     * @param {string} [page=Mobile_app] Docs page to go to.
     * @return {Promise<string>} Promise resolved with the Moodle docs URL.
     */
    getDocsUrl(release?: string, page = 'Mobile_app') : Promise<string> {
        let docsUrl = 'https://docs.moodle.org/en/' + page;

        if (typeof release != 'undefined') {
            let version = release.substr(0, 3).replace('.', '');
            // Check is a valid number.
            if (parseInt(version) >= 24) {
                // Append release number.
                docsUrl = docsUrl.replace('https://docs.moodle.org/', 'https://docs.moodle.org/' + version + '/');
            }
        }

        return this.langProvider.getCurrentLanguage().then((lang) => {
            return docsUrl.replace('/en/', '/' + lang + '/');
        }).catch(() => {
            return docsUrl;
        });
    }

    /**
     * Returns if a URL has any protocol (not a relative URL).
     *
     * @param {string} url The url to test against the pattern.
     * @return {boolean} Whether the url is absolute.
     */
    isAbsoluteURL(url: string) : boolean {
        return /^[^:]{2,}:\/\//i.test(url) || /^(tel:|mailto:|geo:)/.test(url);
    }

    /**
     * Returns if a URL is downloadable: plugin file OR theme/image.php OR gravatar.
     *
     * @param {string} url The URL to test.
     * @return {boolean} Whether the URL is downloadable.
     */
    isDownloadableUrl(url: string) : boolean {
        return this.isPluginFileUrl(url) || this.isThemeImageUrl(url) || this.isGravatarUrl(url);
    }

    /**
     * Returns if a URL is a gravatar URL.
     *
     * @param {string} url The URL to test.
     * @return {boolean} Whether the URL is a gravatar URL.
     */
    isGravatarUrl(url: string) : boolean {
        return url && url.indexOf('gravatar.com/avatar') !== -1;
    }

    /**
     * Check if a URL uses http or https protocol.
     *
     * @param {string} url The url to test.
     * @return {boolean} Whether the url uses http or https protocol.
     */
    isHttpURL(url: string) : boolean {
        return /^https?\:\/\/.+/i.test(url);
    }

    /**
     * Returns if a URL is a pluginfile URL.
     *
     * @param {string} url The URL to test.
     * @return {boolean} Whether the URL is a pluginfile URL.
     */
    isPluginFileUrl(url: string) : boolean {
        return url && url.indexOf('/pluginfile.php') !== -1;
    }

    /**
     * Returns if a URL is a theme image URL.
     *
     * @param {string} url The URL to test.
     * @return {boolean} Whether the URL is a theme image URL.
     */
    isThemeImageUrl(url: string) : boolean {
        return url && url.indexOf('/theme/image.php') !== -1;
    }

    /**
     * Generic function for adding the wstoken to Moodle urls and for pointing to the correct script.
     * For download remote files from Moodle we need to use the special /webservice/pluginfile passing
     * the ws token as a get parameter.
     *
     * @param {string} url The url to be fixed.
     * @param {string} token Token to use.
     * @return {string} Fixed URL.
     */
    fixPluginfileURL(url: string, token: string) : string {
        if (!url || !token) {
            return '';
        }

        // First check if we need to fix this url or is already fixed.
        if (url.indexOf('token=') != -1) {
            return url;
        }

        // Check if is a valid URL (contains the pluginfile endpoint).
        if (!this.isPluginFileUrl(url)) {
            return url;
        }

        // In which way the server is serving the files? Are we using slash parameters?
        if (url.indexOf('?file=') != -1 || url.indexOf('?forcedownload=') != -1 || url.indexOf('?rev=') != -1) {
            url += '&';
        } else {
            url += '?';
        }
        // Always send offline=1 (for external repositories). It shouldn't cause problems for local files or old Moodles.
        url += 'token=' + token + '&offline=1';

        // Some webservices returns directly the correct download url, others not.
        if (url.indexOf('/webservice/pluginfile') == -1) {
            url = url.replace('/pluginfile', '/webservice/pluginfile');
        }
        return url;
    }

    /**
     * Remove the parameters from a URL, returning the URL without them.
     *
     * @param {string} url URL to treat.
     * @return {string} URL without params.
     */
    removeUrlParams(url: string) : string {
        let matches = url.match(/^[^\?]+/);
        return matches && matches[0];
    }
}
