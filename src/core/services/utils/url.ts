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

import { Injectable } from '@angular/core';

import { CoreLang } from '@services/lang';
import { CoreTextUtils } from '@services/utils/text';
import { CoreConstants } from '@/core/constants';
import { makeSingleton } from '@singletons';
import { CoreUrl } from '@singletons/url';
import { CoreSites } from '@services/sites';
import { CorePath } from '@singletons/path';
import { CorePlatform } from '@services/platform';
import { CoreMedia } from '@singletons/media';

/*
 * "Utils" service with helper functions for URLs.
 */
@Injectable({ providedIn: 'root' })
export class CoreUrlUtilsProvider {

    /**
     * Add or remove 'www' from a URL. The url needs to have http or https protocol.
     *
     * @param url URL to modify.
     * @returns Modified URL.
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
     * Add params to a URL.
     *
     * @param url URL to add the params to.
     * @param params Object with the params to add.
     * @param anchor Anchor text if needed.
     * @param boolToNumber Whether to convert bools to 1 or 0.
     * @returns URL with params.
     */
    addParamsToUrl(url: string, params?: Record<string, unknown>, anchor?: string, boolToNumber?: boolean): string {
        // Remove any existing anchor to add the params before it.
        const urlAndAnchor = url.split('#');
        url = urlAndAnchor[0];

        let separator = url.indexOf('?') != -1 ? '&' : '?';

        for (const key in params) {
            let value = params[key];

            if (boolToNumber && typeof value == 'boolean') {
                // Convert booleans to 1 or 0.
                value = value ? '1' : '0';
            }

            // Ignore objects.
            if (typeof value != 'object') {
                url += separator + key + '=' + value;
                separator = '&';
            }
        }

        // Re-add the anchor if any.
        if (urlAndAnchor.length > 1) {
            // Remove the URL from the array.
            urlAndAnchor.shift();

            // Use a join in case there is more than one #.
            url += '#' + urlAndAnchor.join('#');
        }

        if (anchor) {
            url += '#' + anchor;
        }

        return url;
    }

    /**
     * Given a URL and a text, return an HTML link.
     *
     * @param url URL.
     * @param text Text of the link.
     * @returns Link.
     */
    buildLink(url: string, text: string): string {
        return '<a href="' + url + '">' + text + '</a>';
    }

    /**
     * Check whether we can use tokenpluginfile.php endpoint for a certain URL.
     *
     * @param url URL to check.
     * @param siteUrl The URL of the site the URL belongs to.
     * @param accessKey User access key for tokenpluginfile.
     * @returns Whether tokenpluginfile.php can be used.
     */
    canUseTokenPluginFile(url: string, siteUrl: string, accessKey?: string): boolean {
        // Do not use tokenpluginfile if site doesn't use slash params, the URL doesn't work.
        // Also, only use it for "core" pluginfile endpoints. Some plugins can implement their own endpoint (like customcert).
        return !CoreConstants.CONFIG.disableTokenFile && !!accessKey && !url.match(/[&?]file=/) && (
            url.indexOf(CorePath.concatenatePaths(siteUrl, 'pluginfile.php')) === 0 ||
            url.indexOf(CorePath.concatenatePaths(siteUrl, 'webservice/pluginfile.php')) === 0) &&
            !CoreMedia.sourceUsesJavascriptPlayer({ src: url });
    }

    /**
     * Extracts the parameters from a URL and stores them in an object.
     *
     * @param url URL to treat.
     * @returns Object with the params.
     */
    extractUrlParams(url: string): CoreUrlParams {
        const regex = /[?&]+([^=&]+)=?([^&]*)?/gi;
        const subParamsPlaceholder = '@@@SUBPARAMS@@@';
        const params: CoreUrlParams = {};
        const urlAndHash = url.split('#');
        const questionMarkSplit = urlAndHash[0].split('?');
        let subParams: string;

        if (questionMarkSplit.length > 2) {
            // There is more than one question mark in the URL. This can happen if any of the params is a URL with params.
            // We only want to treat the first level of params, so we'll remove this second list of params and restore it later.
            questionMarkSplit.splice(0, 2);

            subParams = '?' + questionMarkSplit.join('?');
            urlAndHash[0] = urlAndHash[0].replace(subParams, subParamsPlaceholder);
        }

        urlAndHash[0].replace(regex, (match: string, key: string, value: string): string => {
            params[key] = value !== undefined ? CoreTextUtils.decodeURIComponent(value) : '';

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
     * @param url The url to be fixed.
     * @param token Token to use.
     * @param siteUrl The URL of the site the URL belongs to.
     * @param accessKey User access key for tokenpluginfile.
     * @returns Fixed URL.
     */
    fixPluginfileURL(url: string, token: string, siteUrl: string, accessKey?: string): string {
        if (!url) {
            return '';
        }

        url = url.replace(/&amp;/g, '&');

        const canUseTokenPluginFile = accessKey && this.canUseTokenPluginFile(url, siteUrl, accessKey);

        // First check if we need to fix this url or is already fixed.
        if (!canUseTokenPluginFile && url.indexOf('token=') != -1) {
            return url;
        }

        // Check if is a valid URL (contains the pluginfile endpoint) and belongs to the site.
        if (!this.isPluginFileUrl(url) || url.indexOf(CoreTextUtils.addEndingSlash(siteUrl)) !== 0) {
            return url;
        }

        if (canUseTokenPluginFile) {
            // Use tokenpluginfile.php.
            url = url.replace(/(\/webservice)?\/pluginfile\.php/, '/tokenpluginfile.php/' + accessKey);
        } else {
            // Use pluginfile.php. Some webservices returns directly the correct download url, others not.
            if (url.indexOf(CorePath.concatenatePaths(siteUrl, 'pluginfile.php')) === 0) {
                url = url.replace('/pluginfile', '/webservice/pluginfile');
            }

            url = this.addParamsToUrl(url, { token });
        }

        return this.addParamsToUrl(url, { offline: '1' }); // Always send offline=1 (it's for external repositories).
    }

    /**
     * Formats a URL, trim, lowercase, etc...
     *
     * @param url The url to be formatted.
     * @returns Fromatted url.
     */
    formatURL(url: string): string {
        url = url.trim();

        // Check if the URL starts by http or https.
        if (! /^http(s)?:\/\/.*/i.test(url)) {
            // Test first allways https.
            url = 'https://' + url;
        }

        // http always in lowercase.
        url = url.replace(/^http/i, 'http');
        url = url.replace(/^https/i, 'https');

        // Replace last slash.
        url = url.replace(/\/$/, '');

        return url;
    }

    /**
     * Returns the URL to the documentation of the app, based on Moodle version and current language.
     *
     * @param release Moodle release.
     * @param page Docs page to go to.
     * @returns Promise resolved with the Moodle docs URL.
     */
    async getDocsUrl(release?: string, page: string = 'Mobile_app'): Promise<string> {
        let docsUrl = 'https://docs.moodle.org/en/' + page;

        if (release !== undefined) {
            const version = CoreSites.getMajorReleaseNumber(release).replace('.', '');

            // Check is a valid number.
            if (Number(version) >= 24) {
                // Append release number.
                docsUrl = docsUrl.replace('https://docs.moodle.org/', 'https://docs.moodle.org/' + version + '/');
            }
        }

        try {
            let lang = await CoreLang.getCurrentLanguage();
            lang = CoreLang.getParentLanguage(lang) || lang;

            return docsUrl.replace('/en/', '/' + lang + '/');
        } catch (error) {
            return docsUrl;
        }
    }

    /**
     * Returns the Youtube Embed Video URL or null if not found.
     *
     * @param url URL
     * @returns Youtube Embed Video URL or null if not found.
     */
    getYoutubeEmbedUrl(url?: string): string | void {
        if (!url) {
            return;
        }

        let videoId = '';
        const params: CoreUrlParams = {};

        url = CoreTextUtils.decodeHTML(url);

        // Get the video ID.
        let match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);

        if (match && match[2].length === 11) {
            videoId = match[2];
        }

        // No videoId, do not continue.
        if (!videoId) {
            return;
        }

        // Now get the playlist (if any).
        match = url.match(/[?&]list=([^#&?]+)/);

        if (match && match[1]) {
            params.list = match[1];
        }

        // Now get the start time (if any).
        match = url.match(/[?&]start=(\d+)/);

        if (match && match[1]) {
            params.start = parseInt(match[1], 10).toString();
        } else {
            // No start param, but it could have a time param.
            match = url.match(/[?&]t=(\d+h)?(\d+m)?(\d+s)?/);
            if (match) {
                const start = (match[1] ? parseInt(match[1], 10) * 3600 : 0) +
                    (match[2] ? parseInt(match[2], 10) * 60 : 0) +
                    (match[3] ? parseInt(match[3], 10) : 0);
                params.start = start.toString();
            }
        }

        return this.addParamsToUrl('https://www.youtube.com/embed/' + videoId, params);
    }

    /**
     * Given a URL, returns what's after the last '/' without params.
     * Example:
     * http://mysite.com/a/course.html?id=1 -> course.html
     *
     * @param url URL to treat.
     * @returns Last file without params.
     */
    getLastFileWithoutParams(url: string): string {
        let filename = url.substring(url.lastIndexOf('/') + 1);
        if (filename.indexOf('?') != -1) {
            filename = filename.substring(0, filename.indexOf('?'));
        }

        return filename;
    }

    /**
     * Get the protocol from a URL.
     * E.g. http://www.google.com returns 'http'.
     *
     * @param url URL to treat.
     * @returns Protocol, undefined if no protocol found.
     */
    getUrlProtocol(url: string): string | void {
        if (!url) {
            return;
        }

        const matches = url.match(/^([^/:.?]*):\/\//);
        if (matches && matches[1]) {
            return matches[1];
        }
    }

    /**
     * Get the scheme from a URL. Please notice that, if a URL has protocol, it will return the protocol.
     * E.g. javascript:doSomething() returns 'javascript'.
     *
     * @param url URL to treat.
     * @returns Scheme, undefined if no scheme found.
     */
    getUrlScheme(url: string): string | void {
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
     * @param url URL to treat.
     * @returns Username. Undefined if no username found.
     */
    getUsernameFromUrl(url: string): string | undefined {
        if (url.indexOf('@') > -1) {
            // Get URL without protocol.
            const withoutProtocol = url.replace(/^[^?@/]*:\/\//, '');
            const matches = withoutProtocol.match(/[^@]*/);

            // Make sure that @ is at the start of the URL, not in a param at the end.
            if (matches && matches.length && !matches[0].match(/[/|?]/)) {
                return matches[0];
            }
        }
    }

    /**
     * Returns if a URL has any protocol (not a relative URL).
     *
     * @param url The url to test against the pattern.
     * @returns Whether the url is absolute.
     */
    isAbsoluteURL(url: string): boolean {
        return /^[^:]{2,}:\/\//i.test(url) || /^(tel:|mailto:|geo:)/.test(url);
    }

    /**
     * Returns if a URL is downloadable: plugin file OR theme/image.php OR gravatar.
     *
     * @param url The URL to test.
     * @returns Whether the URL is downloadable.
     */
    isDownloadableUrl(url: string): boolean {
        return this.isPluginFileUrl(url) || this.isTokenPluginFileUrl(url) || this.isThemeImageUrl(url) || this.isGravatarUrl(url);
    }

    /**
     * Returns if a URL is a gravatar URL.
     *
     * @param url The URL to test.
     * @returns Whether the URL is a gravatar URL.
     */
    isGravatarUrl(url: string): boolean {
        return url?.indexOf('gravatar.com/avatar') !== -1;
    }

    /**
     * Check if a URL uses http or https protocol.
     *
     * @param url The url to test.
     * @returns Whether the url uses http or https protocol.
     */
    isHttpURL(url: string): boolean {
        return /^https?:\/\/.+/i.test(url);
    }

    /**
     * Check whether an URL belongs to a local file.
     *
     * @param url URL to check.
     * @returns Whether the URL belongs to a local file.
     */
    isLocalFileUrl(url: string): boolean {
        const urlParts = CoreUrl.parse(url);

        return this.isLocalFileUrlScheme(urlParts?.protocol || '', urlParts?.domain || '');
    }

    /**
     * Check whether a URL scheme belongs to a local file.
     *
     * @param scheme Scheme to check.
     * @returns Whether the scheme belongs to a local file.
     */
    isLocalFileUrlScheme(scheme: string, domain: string): boolean {
        if (!scheme) {
            return false;
        }
        scheme = scheme.toLowerCase();

        return scheme == 'cdvfile' ||
                scheme == 'file' ||
                scheme == 'filesystem' ||
                scheme == CoreConstants.CONFIG.ioswebviewscheme ||
                (CorePlatform.isMobile() && scheme === 'http' && domain === 'localhost'); // @todo Get served domain from ENV.
    }

    /**
     * Returns if a URL is a pluginfile URL.
     *
     * @param url The URL to test.
     * @returns Whether the URL is a pluginfile URL.
     */
    isPluginFileUrl(url: string): boolean {
        return url.indexOf('/pluginfile.php') !== -1;
    }

    /**
     * Returns if a URL is a tokenpluginfile URL.
     *
     * @param url The URL to test.
     * @returns Whether the URL is a tokenpluginfile URL.
     */
    isTokenPluginFileUrl(url: string): boolean {
        return url.indexOf('/tokenpluginfile.php') !== -1;
    }

    /**
     * Returns if a URL is a theme image URL.
     *
     * @param url The URL to test.
     * @returns Whether the URL is a theme image URL.
     */
    isThemeImageUrl(url: string): boolean {
        return url?.indexOf('/theme/image.php') !== -1;
    }

    /**
     * Remove protocol and www from a URL.
     *
     * @param url URL to treat.
     * @returns Treated URL.
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
     * @param url URL to treat.
     * @returns URL without params.
     */
    removeUrlParams(url: string): string {
        const matches = url.match(/^[^?]+/);

        return matches ? matches[0] : '';
    }

    /**
     * Modifies a pluginfile URL to use the default pluginfile script instead of the webservice one.
     *
     * @param url The url to be fixed.
     * @param siteUrl The URL of the site the URL belongs to.
     * @returns Modified URL.
     */
    unfixPluginfileURL(url: string, siteUrl?: string): string {
        if (!url) {
            return '';
        }

        url = url.replace(/&amp;/g, '&');

        // It site URL is supplied, check if the URL belongs to the site.
        if (siteUrl && url.indexOf(CoreTextUtils.addEndingSlash(siteUrl)) !== 0) {
            return url;
        }

        // Not a pluginfile URL. Treat webservice/pluginfile case.
        url = url.replace(/\/webservice\/pluginfile\.php\//, '/pluginfile.php/');

        // Make sure the URL doesn't contain the token.
        url = url.replace(/([?&])token=[^&]*&?/, '$1');

        return url;
    }

}

export const CoreUrlUtils = makeSingleton(CoreUrlUtilsProvider);

export type CoreUrlParams = {[key: string]: string};
