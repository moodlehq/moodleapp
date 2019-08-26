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
import { CoreTextUtilsProvider } from './text';

/*
 * "Utils" service with helper functions for URLs.
 */
@Injectable()
export class CoreUrlUtilsProvider {

    constructor(private langProvider: CoreLangProvider, private textUtils: CoreTextUtilsProvider) { }

    /**
     * Add or remove 'www' from a URL. The url needs to have http or https protocol.
     *
     * @param {string} url URL to modify.
     * @return {string} Modified URL.
     */
    addOrRemoveWWW(url: string): string {
        if (url) {
            if (url.match(/http(s)?:\/\/www\./)) {
                // Already has www. Remove it.
                url = url.replace('www.', '');
            } else {
                url = url.replace('https://', 'https://www.');
                url = url.replace('http://', 'http://www.');
            }
        }

        return url;
    }

    /**
     * Given a URL and a text, return an HTML link.
     *
     * @param {string} url URL.
     * @param {string} text Text of the link.
     * @return {string} Link.
     */
    buildLink(url: string, text: string): string {
        return '<a href="' + url + '">' + text + '</a>';
    }

    /**
     * Extracts the parameters from a URL and stores them in an object.
     *
     * @param {string} url URL to treat.
     * @return {any} Object with the params.
     */
    extractUrlParams(url: string): any {
        const regex = /[?&]+([^=&]+)=?([^&]*)?/gi,
            subParamsPlaceholder = '@@@SUBPARAMS@@@',
            params: any = {},
            urlAndHash = url.split('#'),
            questionMarkSplit = urlAndHash[0].split('?');
        let subParams;

        if (questionMarkSplit.length > 2) {
            // There is more than one question mark in the URL. This can happen if any of the params is a URL with params.
            // We only want to treat the first level of params, so we'll remove this second list of params and restore it later.
            questionMarkSplit.splice(0, 2);

            subParams = '?' + questionMarkSplit.join('?');
            urlAndHash[0] = urlAndHash[0].replace(subParams, subParamsPlaceholder);
        }

        urlAndHash[0].replace(regex, (match: string, key: string, value: string): string => {
            params[key] = typeof value != 'undefined' ? this.textUtils.decodeURIComponent(value) : '';

            if (subParams) {
                params[key] = params[key].replace(subParamsPlaceholder, subParams);
            }

            return match;
        });

        if (urlAndHash.length > 1) {
            // Remove the URL from the array.
            urlAndHash.shift();

            // Add the hash as a param with a special name. Use a join in case there is more than one #.
            params.urlHash = urlAndHash.join('#');
        }

        return params;
    }

    /**
     * Generic function for adding the wstoken to Moodle urls and for pointing to the correct script.
     * For download remote files from Moodle we need to use the special /webservice/pluginfile passing
     * the ws token as a get parameter.
     *
     * @param {string} url The url to be fixed.
     * @param {string} token Token to use.
     * @param {string} siteUrl The URL of the site the URL belongs to.
     * @return {string} Fixed URL.
     */
    fixPluginfileURL(url: string, token: string, siteUrl: string): string {
        if (!url) {
            return '';
        }

        url = url.replace(/&amp;/g, '&');

        // First check if we need to fix this url or is already fixed.
        if (url.indexOf('token=') != -1) {
            return url;
        }

        // Check if is a valid URL (contains the pluginfile endpoint).
        if (!this.isPluginFileUrl(url)) {
            return url;
        }

        // Check if the URL already has params.
        if (url.match(/\?[^=]+=/)) {
            url += '&';
        } else {
            url += '?';
        }
        // Always send offline=1 (for external repositories). It shouldn't cause problems for local files or old Moodles.
        url += 'token=' + token + '&offline=1';

        // Some webservices returns directly the correct download url, others not.
        if (url.indexOf(this.textUtils.concatenatePaths(siteUrl, 'pluginfile.php')) === 0) {
            url = url.replace('/pluginfile', '/webservice/pluginfile');
        }

        return url;
    }

    /**
     * Formats a URL, trim, lowercase, etc...
     *
     * @param {string} url The url to be formatted.
     * @return {string} Fromatted url.
     */
    formatURL(url: string): string {
        url = url.trim();

        // Check if the URL starts by http or https.
        if (! /^http(s)?\:\/\/.*/i.test(url)) {
            // Test first allways https.
            url = 'https://' + url;
        }

        // http allways in lowercase.
        url = url.replace(/^http/i, 'http');
        url = url.replace(/^https/i, 'https');

        // Replace last slash.
        url = url.replace(/\/$/, '');

        return url;
    }

    /**
     * Returns the URL to the documentation of the app, based on Moodle version and current language.
     *
     * @param {string} [release] Moodle release.
     * @param {string} [page=Mobile_app] Docs page to go to.
     * @return {Promise<string>} Promise resolved with the Moodle docs URL.
     */
    getDocsUrl(release?: string, page: string = 'Mobile_app'): Promise<string> {
        let docsUrl = 'https://docs.moodle.org/en/' + page;

        if (typeof release != 'undefined') {
            const version = release.substr(0, 3).replace('.', '');
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
     * Given a URL, returns what's after the last '/' without params.
     * Example:
     * http://mysite.com/a/course.html?id=1 -> course.html
     *
     * @param {string} url URL to treat.
     * @return {string} Last file without params.
     */
    getLastFileWithoutParams(url: string): string {
        let filename = url.substr(url.lastIndexOf('/') + 1);
        if (filename.indexOf('?') != -1) {
            filename = filename.substr(0, filename.indexOf('?'));
        }

        return filename;
    }

    /**
     * Get the protocol from a URL.
     * E.g. http://www.google.com returns 'http'.
     *
     * @param {string} url URL to treat.
     * @return {string} Protocol, undefined if no protocol found.
     */
    getUrlProtocol(url: string): string {
        if (!url) {
            return;
        }

        const matches = url.match(/^([^\/:\.\?]*):\/\//);
        if (matches && matches[1]) {
            return matches[1];
        }
    }

    /**
     * Get the scheme from a URL. Please notice that, if a URL has protocol, it will return the protocol.
     * E.g. javascript:doSomething() returns 'javascript'.
     *
     * @param {string} url URL to treat.
     * @return {string} Scheme, undefined if no scheme found.
     */
    getUrlScheme(url: string): string {
        if (!url) {
            return;
        }

        const matches = url.match(/^([a-z][a-z0-9+\-.]*):/);
        if (matches && matches[1]) {
            return matches[1];
        }
    }

    /*
     * Gets a username from a URL like: user@mysite.com.
     *
     * @param {string} url URL to treat.
     * @return {string} Username. Undefined if no username found.
     */
    getUsernameFromUrl(url: string): string {
        if (url.indexOf('@') > -1) {
            // Get URL without protocol.
            const withoutProtocol = url.replace(/^[^?@\/]*:\/\//, ''),
                matches = withoutProtocol.match(/[^@]*/);

            // Make sure that @ is at the start of the URL, not in a param at the end.
            if (matches && matches.length && !matches[0].match(/[\/|?]/)) {
                return matches[0];
            }
        }
    }

    /**
     * Returns if a URL has any protocol (not a relative URL).
     *
     * @param {string} url The url to test against the pattern.
     * @return {boolean} Whether the url is absolute.
     */
    isAbsoluteURL(url: string): boolean {
        return /^[^:]{2,}:\/\//i.test(url) || /^(tel:|mailto:|geo:)/.test(url);
    }

    /**
     * Returns if a URL is downloadable: plugin file OR theme/image.php OR gravatar.
     *
     * @param {string} url The URL to test.
     * @return {boolean} Whether the URL is downloadable.
     */
    isDownloadableUrl(url: string): boolean {
        return this.isPluginFileUrl(url) || this.isThemeImageUrl(url) || this.isGravatarUrl(url);
    }

    /**
     * Returns if a URL is a gravatar URL.
     *
     * @param {string} url The URL to test.
     * @return {boolean} Whether the URL is a gravatar URL.
     */
    isGravatarUrl(url: string): boolean {
        return url && url.indexOf('gravatar.com/avatar') !== -1;
    }

    /**
     * Check if a URL uses http or https protocol.
     *
     * @param {string} url The url to test.
     * @return {boolean} Whether the url uses http or https protocol.
     */
    isHttpURL(url: string): boolean {
        return /^https?\:\/\/.+/i.test(url);
    }

    /**
     * Returns if a URL is a pluginfile URL.
     *
     * @param {string} url The URL to test.
     * @return {boolean} Whether the URL is a pluginfile URL.
     */
    isPluginFileUrl(url: string): boolean {
        return url && url.indexOf('/pluginfile.php') !== -1;
    }

    /**
     * Returns if a URL is a theme image URL.
     *
     * @param {string} url The URL to test.
     * @return {boolean} Whether the URL is a theme image URL.
     */
    isThemeImageUrl(url: string): boolean {
        return url && url.indexOf('/theme/image.php') !== -1;
    }

    /**
     * Remove protocol and www from a URL.
     *
     * @param {string} url URL to treat.
     * @return {string} Treated URL.
     */
    removeProtocolAndWWW(url: string): string {
        // Remove protocol.
        url = url.replace(/.*?:\/\//g, '');
        // Remove www.
        url = url.replace(/^www./, '');

        return url;
    }

    /**
     * Remove the parameters from a URL, returning the URL without them.
     *
     * @param {string} url URL to treat.
     * @return {string} URL without params.
     */
    removeUrlParams(url: string): string {
        const matches = url.match(/^[^\?]+/);

        return matches && matches[0];
    }
}
