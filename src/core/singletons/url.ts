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

import { CoreSite } from '@classes/sites/site';
import { CorePath } from './path';
import { CoreText } from './text';

import { CorePlatform } from '@services/platform';
import { CoreConstants } from '../constants';
import { CoreMedia } from './media';
import { CoreLang, CoreLangFormat } from '@services/lang';
import { DomSanitizer } from '@singletons';
import { SafeUrl } from '@angular/platform-browser';

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

export const enum CoreUrlPartNames {
    Protocol = 'protocol',
    WWWInDomain = 'www', // Will remove starting www from domain.
    Query = 'query',
    Fragment = 'fragment',
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
     * Given an address as a string, return a URL to open the address in maps.
     *
     * @param address The address.
     * @returns URL to view the address.
     */
    static buildAddressURL(address: string): SafeUrl {
        const parsedUrl = CoreUrl.parse(address);
        if (parsedUrl?.protocol) {
            // It's already a URL, don't convert it.
            return DomSanitizer.bypassSecurityTrustUrl(address);
        }

        return DomSanitizer.bypassSecurityTrustUrl((CorePlatform.isAndroid() ? 'geo:0,0?q=' : 'http://maps.google.com?q=') +
                encodeURIComponent(address));
    }

    /**
     * Parse parts of a url, using an implicit protocol if it is missing from the url.
     *
     * @param url Url.
     * @returns Url parts.
     */
    static parse(url: string): UrlParts | null {
        url = url.trim();
        // Parse url with regular expression taken from RFC 3986: https://tools.ietf.org/html/rfc3986#appendix-B.
        const match = url.match(/^(([^:/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/);

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
     * Given some parts of a URL, returns the URL as a string.
     *
     * @param parts Parts.
     * @returns Assembled URL.
     */
    static assemble(parts: UrlParts): string {
        const protocol = parts.protocol;
        const credentials = parts.credentials ||
            (parts.password ? `${parts.username}:${parts.password}` : parts.username);

        return (protocol ? `${protocol}://` : '') +
            (credentials ? `${credentials}@` : '') +
            (parts.domain ?? '') +
            (parts.port ? `:${parts.port}` : '') +
            (parts.path ?? '') +
            (parts.query ? `?${parts.query}` : '') +
            (parts.fragment ? `#${parts.fragment}` : '');
    }

    /**
     * Guess the Moodle domain from a site url.
     *
     * @param url Site url.
     * @returns Guessed Moodle domain.
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
     * @returns Desired RegExp.
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
     * @returns True if valid, false otherwise.
     */
    static isValidMoodleUrl(url: string): boolean {
        const patt = CoreUrl.getValidMoodleUrlPattern();

        return patt.test(url.trim());
    }

    /**
     * Removes protocol from the url.
     *
     * @param url Site url.
     * @returns Url without protocol.
     * @deprecated since 4.5. Use CoreUrl.removeUrlParts(url, CoreUrlPartNames.Protocol) instead.
     */
    static removeProtocol(url: string): string {
        return CoreUrl.removeUrlParts(url, CoreUrlPartNames.Protocol);
    }

    /**
     * Check if two URLs have the same domain and path.
     *
     * @param urlA First URL.
     * @param urlB Second URL.
     * @returns Whether they have same domain and path.
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

    /**
     * Get the anchor of a URL. If there's more than one they'll all be returned, separated by #.
     * E.g. myurl.com#foo=1#bar=2 will return #foo=1#bar=2.
     *
     * @param url URL.
     * @returns Anchor, undefined if no anchor.
     */
    static getUrlAnchor(url: string): string | undefined {
        const urlParts = CoreUrl.parse(url);

        return urlParts?.fragment ? `#${urlParts.fragment}` : undefined;
    }

    /**
     * Remove the anchor from a URL.
     *
     * @param url URL.
     * @returns URL without anchor if any.
     *
     * @deprecated since 4.5. Use CoreUrl.removeUrlParts(url, CoreUrlPartNames.Fragment) instead.
     */
    static removeUrlAnchor(url: string): string {
        return CoreUrl.removeUrlParts(url, CoreUrlPartNames.Fragment);
    }

    /**
     * Convert a URL to an absolute URL (if it isn't already).
     *
     * @param parentUrl The parent URL.
     * @param url The url to convert.
     * @returns Absolute URL.
     */
    static toAbsoluteURL(parentUrl: string, url: string): string {
        const parsedUrl = CoreUrl.parse(url);

        if (parsedUrl?.protocol) {
            return url; // Already absolute URL.
        }

        const parsedParentUrl = CoreUrl.parse(parentUrl);

        if (url.startsWith('//')) {
            // It only lacks the protocol, add it.
            return (parsedParentUrl?.protocol || 'https') + ':' + url;
        }

        // The URL should be added after the domain (if starts with /) or after the parent path.
        const treatedParentUrl = CoreUrl.assemble({
            protocol: parsedParentUrl?.protocol || 'https',
            domain: parsedParentUrl?.domain,
            port: parsedParentUrl?.port,
            credentials: parsedParentUrl?.credentials,
            path: url.startsWith('/') ? undefined : parsedParentUrl?.path,
        });

        return CorePath.concatenatePaths(treatedParentUrl, url);
    }

    /**
     * Convert a URL to a relative URL (if it isn't already).
     *
     * @param parentUrl The parent URL.
     * @param url The url to convert.
     * @returns Relative URL.
     */
    static toRelativeURL(parentUrl: string, url: string): string {
        parentUrl = CoreUrl.removeUrlParts(parentUrl, CoreUrlPartNames.Protocol);

        if (!url.includes(parentUrl)) {
            return url; // Already relative URL.
        }

        return CoreText.removeStartingSlash(CoreUrl.removeUrlParts(url, CoreUrlPartNames.Protocol).replace(parentUrl, ''));
    }

    /**
     * Returns if URL is a Vimeo video URL.
     *
     * @param url URL.
     * @returns Whether is a Vimeo video URL.
     */
    static isVimeoVideoUrl(url: string): boolean {
        return !!url.match(/https?:\/\/player\.vimeo\.com\/video\/[0-9]+/);
    }

    /**
     * Get the URL to use to play a Vimeo video if the URL supplied is a Vimeo video URL.
     * If it's a Vimeo video, the app will use the site's wsplayer script instead to make restricted videos work.
     *
     * @param url URL to treat.
     * @param site Site that contains the URL.
     * @returns URL, undefined if not a Vimeo video.
     */
    static getVimeoPlayerUrl(
        url: string,
        site: CoreSite,
    ): string | undefined {
        const matches = url.match(/https?:\/\/player\.vimeo\.com\/video\/([0-9]+)([?&]+h=([a-zA-Z0-9]*))?/);
        if (!matches || !matches[1]) {
            // Not a Vimeo video.
            return;
        }

        let newUrl = CorePath.concatenatePaths(site.getURL(), '/media/player/vimeo/wsplayer.php?video=') +
            matches[1] + '&token=' + site.getToken();

        let privacyHash: string | undefined | null = matches[3];
        if (!privacyHash) {
            // No privacy hash using the new format. Check the legacy format.
            const matches = url.match(/https?:\/\/player\.vimeo\.com\/video\/([0-9]+)(\/([a-zA-Z0-9]+))?/);
            privacyHash = matches && matches[3];
        }

        if (privacyHash) {
            newUrl += `&h=${privacyHash}`;
        }

        return newUrl;
    }

    /**
     * Add or remove 'www' from a URL. The url needs to have http or https protocol.
     *
     * @param url URL to modify.
     * @returns Modified URL.
     */
    static addOrRemoveWWW(url: string): string {
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
    static addParamsToUrl(url: string, params?: Record<string, unknown>, anchor?: string, boolToNumber?: boolean): string {
        // Remove any existing anchor to add the params before it.
        const urlAndAnchor = url.split('#');
        url = urlAndAnchor[0];

        let separator = url.indexOf('?') !== -1 ? '&' : '?';

        for (const key in params) {
            let value = params[key];

            if (boolToNumber && typeof value === 'boolean') {
                // Convert booleans to 1 or 0.
                value = value ? '1' : '0';
            }

            // Ignore objects and undefined.
            if (typeof value !== 'object' && value !== undefined) {
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
    static buildLink(url: string, text: string): string {
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
    static canUseTokenPluginFile(url: string, siteUrl: string, accessKey?: string): boolean {
        // Do not use tokenpluginfile if site doesn't use slash params, the URL doesn't work.
        // Also, only use it for "core" pluginfile endpoints. Some plugins can implement their own endpoint (like customcert).
        return !CoreConstants.CONFIG.disableTokenFile && !!accessKey && !url.match(/[&?]file=/) && (
            url.indexOf(CorePath.concatenatePaths(siteUrl, 'pluginfile.php')) === 0 ||
            url.indexOf(CorePath.concatenatePaths(siteUrl, 'webservice/pluginfile.php')) === 0) &&
            !CoreMedia.sourceUsesJavascriptPlayer({ src: url });
    }

    /**
     * Same as Javascript's decodeURI, but if an exception is thrown it will return the original URI.
     *
     * @param uri URI to decode.
     * @returns Decoded URI, or original URI if an exception is thrown.
     */
    static decodeURI(uri: string): string {
        try {
            return decodeURI(uri);
        } catch {
            // Error, use the original URI.
        }

        return uri;
    }

    /**
     * Same as Javascript's decodeURIComponent, but if an exception is thrown it will return the original URI.
     *
     * @param uri URI to decode.
     * @returns Decoded URI, or original URI if an exception is thrown.
     */
    static decodeURIComponent(uri: string): string {
        try {
            return decodeURIComponent(uri);
        } catch {
            // Error, use the original URI.
        }

        return uri;
    }

    /**
     * Extracts the parameters from a URL and stores them in an object.
     *
     * @param url URL to treat.
     * @returns Object with the params.
     */
    static extractUrlParams(url: string): CoreUrlParams {
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
            params[key] = value !== undefined ? CoreUrl.decodeURIComponent(value) : '';

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
    static fixPluginfileURL(url: string, token: string, siteUrl: string, accessKey?: string): string {
        if (!url) {
            return '';
        }

        url = url.replace(/&amp;/g, '&');

        const canUseTokenPluginFile = accessKey && CoreUrl.canUseTokenPluginFile(url, siteUrl, accessKey);

        // First check if we need to fix this url or is already fixed.
        if (!canUseTokenPluginFile && url.indexOf('token=') != -1) {
            return url;
        }

        // Check if is a valid URL (contains the pluginfile endpoint) and belongs to the site.
        if (!CoreUrl.isPluginFileUrl(url) || url.indexOf(CoreText.addEndingSlash(siteUrl)) !== 0) {
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

            url = CoreUrl.addParamsToUrl(url, { token });
        }

        // Always send offline=1 (it's for external repositories).
        return CoreUrl.addParamsToUrl(url, { offline: '1', lang: CoreLang.getCurrentLanguageSync(CoreLangFormat.LMS) });
    }

    /**
     * Formats a URL, trim, lowercase, etc...
     *
     * @param url The url to be formatted.
     * @returns Fromatted url.
     */
    static formatURL(url: string): string {
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
     * Returns the Youtube Embed Video URL or undefined if not found.
     *
     * @param url URL
     * @returns Youtube Embed Video URL or undefined if not found.
     */
    static getYoutubeEmbedUrl(url?: string): string | void {
        if (!url) {
            return;
        }

        let videoId = '';
        const params: CoreUrlParams = {};

        url = CoreText.decodeHTML(url);

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

        // On iOS native, use local proxy to fix Error 153 on WKWebView
        // The proxy sets proper referrer headers that YouTube requires
        if (CorePlatform.isIOS()) {
            params.v = videoId;
            const proxyUrl = CoreUrl.addParamsToUrl('assets/youtube-proxy.html', params);
            console.log('[YouTube] iOS detected - using proxy:', proxyUrl);
            return proxyUrl;
        }

        // On other platforms, use youtube-nocookie.com directly with credentialless iframe
        const embedUrl = CoreUrl.addParamsToUrl('https://www.youtube-nocookie.com/embed/' + videoId, params);
        console.log('[YouTube] Non-iOS - using direct embed:', embedUrl);
        return embedUrl;
    }

    /**
     * Convert a YouTube embed URL to a watch URL for external opening.
     *
     * @param url URL to convert.
     * @returns Watch URL if it's a YouTube embed, original URL otherwise.
     */
    static getYoutubeWatchUrl(url: string): string {
        const params: CoreUrlParams = {};
        let videoId = '';

        // Check if it's our local proxy URL
        const proxyMatch = url.match(/youtube-proxy\.html\?.*v=([a-zA-Z0-9_-]{11})/);
        if (proxyMatch) {
            videoId = proxyMatch[1];
        } else {
            // Check if it's a YouTube embed URL
            const embedMatch = url.match(/(?:youtube\.com|youtube-nocookie\.com)\/embed\/([a-zA-Z0-9_-]{11})/);
            if (embedMatch) {
                videoId = embedMatch[1];
            }
        }

        if (!videoId) {
            return url;
        }

        // Extract start time if present
        const startMatch = url.match(/[?&](?:start|t)=(\d+)/);
        if (startMatch) {
            params.t = startMatch[1];
        }

        // Extract playlist if present
        const listMatch = url.match(/[?&]list=([^#&?]+)/);
        if (listMatch) {
            params.list = listMatch[1];
        }

        return CoreUrl.addParamsToUrl('https://www.youtube.com/watch?v=' + videoId, params);
    }

    /**
     * Given a URL, returns what's after the last '/' without params.
     * Example:
     * http://mysite.com/a/course.html?id=1 -> course.html
     *
     * @param url URL to treat.
     * @returns Last file without params.
     */
    static getLastFileWithoutParams(url: string): string {
        const parsedUrl = CoreUrl.parse(url);
        if (!parsedUrl) {
            return '';
        }
        const path = parsedUrl.path ?? '';

        return path.split('/').pop() ?? '';
    }

    /**
     * Return the array of arguments of the pluginfile or tokenpluginfile url.
     *
     * @param url URL to get the args.
     * @returns The args found, undefined if not a pluginfile.
     */
    static getPluginFileArgs(url: string): string[] | undefined {
        let args: string[] = [];

        if (CoreUrl.isPluginFileUrl(url)) {
            const relativePath = url.substring(url.indexOf('/pluginfile.php') + 16);
            args = relativePath.split('/');
        } else if (CoreUrl.isTokenPluginFileUrl(url)) {
            const relativePath = url.substring(url.indexOf('/tokenpluginfile.php') + 21);
            args = relativePath.split('/');
            args.shift(); // Remove the token.
        }

        if (args.length < 3) {
            // To be a plugin file it should have at least contextId, Component and Filearea.
            return;
        }

        return args;
    }

    /**
     * Get the protocol from a URL.
     * E.g. http://www.google.com returns 'http'.
     *
     * @param url URL to treat.
     * @returns Protocol, undefined if no protocol found.
     */
    static getUrlProtocol(url: string): string | void {
        return CoreUrl.parse(url)?.protocol;
    }

    /**
     * Gets a username from a URL like: user@mysite.com.
     *
     * @param url URL to treat.
     * @returns Username. Undefined if no username found.
     * @todo Use CoreUrl.parse. It cannot use it right now because it won't detect username on custom URL with double protocol.
     */
    static getUsernameFromUrl(url: string): string | undefined {
            if (url.indexOf('@') < 0) {
                return;
            }

            // Get URL without protocol.
            const withoutProtocol = url.replace(/^[^?@/]*:\/\//, '');
            const matches = withoutProtocol.match(/[^@]*/);

            // Make sure that @ is at the start of the URL, not in a param at the end.
            if (matches && matches.length && !matches[0].match(/[/|?]/)) {
                const credentials = matches[0];

                return credentials.split(':')[0];
            }
    }

    /**
     * Returns if a URL has any protocol (not a relative URL).
     *
     * @param url The url to test against the pattern.
     * @returns Whether the url is absolute.
     */
    static isAbsoluteURL(url: string): boolean {
        return /^[^:]{2,}:\/\//i.test(url) || /^(tel:|mailto:|geo:)/.test(url);
    }

    /**
     * Returns if a URL is downloadable: plugin file OR theme/image.php OR gravatar.
     *
     * @param url The URL to test.
     * @returns Whether the URL is downloadable.
     */
    static isDownloadableUrl(url: string): boolean {
        return CoreUrl.isPluginFileUrl(url) ||
            CoreUrl.isTokenPluginFileUrl(url) ||
            CoreUrl.isThemeImageUrl(url) ||
            CoreUrl.isGravatarUrl(url);
    }

    /**
     * Returns if a URL is a gravatar URL.
     *
     * @param url The URL to test.
     * @returns Whether the URL is a gravatar URL.
     */
    static isGravatarUrl(url: string): boolean {
        return url?.indexOf('gravatar.com/avatar') !== -1;
    }

    /**
     * Check if a URL uses http or https protocol.
     *
     * @param url The url to test.
     * @returns Whether the url uses http or https protocol.
     * @todo Use CoreUrl.parse
     */
    static isHttpURL(url: string): boolean {
        return /^https?:\/\/.+/i.test(url);
    }

    /**
     * Check whether an URL belongs to a local file.
     *
     * @param url URL to check.
     * @returns Whether the URL belongs to a local file.
     */
    static isLocalFileUrl(url: string): boolean {
        const urlParts = CoreUrl.parse(url);

        return CoreUrl.isLocalFileUrlScheme(urlParts?.protocol || '', urlParts?.domain || '');
    }

    /**
     * Check whether a URL scheme belongs to a local file.
     *
     * @param scheme Scheme to check.
     * @returns Whether the scheme belongs to a local file.
     */
    static isLocalFileUrlScheme(scheme: string, domain: string): boolean {
        if (!scheme) {
            return false;
        }
        scheme = scheme.toLowerCase();

        return scheme === 'cdvfile' ||
                scheme === 'file' ||
                scheme === 'filesystem' ||
                scheme === CoreConstants.CONFIG.ioswebviewscheme ||
                (CorePlatform.isMobile() && scheme === 'http' && domain === 'localhost'); // @todo Get served domain from ENV.
    }

    /**
     * Returns if a URL is a pluginfile URL.
     *
     * @param url The URL to test.
     * @returns Whether the URL is a pluginfile URL.
     */
    static isPluginFileUrl(url: string): boolean {
        return url.indexOf('/pluginfile.php') !== -1;
    }

    /**
     * Returns if a URL is a tokenpluginfile URL.
     *
     * @param url The URL to test.
     * @returns Whether the URL is a tokenpluginfile URL.
     */
    static isTokenPluginFileUrl(url: string): boolean {
        return url.indexOf('/tokenpluginfile.php') !== -1;
    }

    /**
     * Returns if a URL is a theme image URL.
     *
     * @param imageUrl The URL to test.
     * @param siteUrl The Site Url.
     * @returns Whether the URL is a theme image URL.
     */
    static isThemeImageUrl(imageUrl: string, siteUrl?: string): boolean {
        if (siteUrl) {
            return imageUrl.startsWith(`${siteUrl}/theme/image.php`);
        }

        return imageUrl?.indexOf('/theme/image.php') !== -1;
    }

    /**
     * Returns an specific param from an image URL.
     *
     * @param imageUrl Image Url
     * @param param Param to get from the URL.
     * @param siteUrl Site URL.
     * @returns Param from the URL.
     */
    static getThemeImageUrlParam(imageUrl: string, param: string, siteUrl?: string): string {
        if (!CoreUrl.isThemeImageUrl(imageUrl, siteUrl)) {
            // Cannot be guessed.
            return '';
        }

        const matches = imageUrl.match('/theme/image.php/(.*)');
        if (matches?.[1]) {
            // Slash arguments found.
            const slasharguments = matches[1].split('/');

            if (slasharguments.length < 4) {
                // Image not found, malformed URL.
                return '';
            }

            // Join from the third element to the end.
            const image = slasharguments.slice(3).join('/');
            switch (param) {
                case 'theme':
                    return slasharguments[0];
                case 'component':
                    return slasharguments[1];
                case 'rev':
                    return slasharguments[2];
                case 'image':
                    // Remove possible url params.
                    return CoreUrl.removeUrlParts(image, [CoreUrlPartNames.Query, CoreUrlPartNames.Fragment]);
                default:
                    return CoreUrl.extractUrlParams(image)[param] || '';
            }

        }

        // URL arguments found.
        const iconParams = CoreUrl.extractUrlParams(imageUrl);

        switch (param) {
            case 'theme':
                return iconParams[param] || 'standard';
            case 'component':
                return iconParams[param] || 'core';
            case 'rev':
                return iconParams[param] || '-1';
            case 'svg':
                return iconParams[param] || '1';
            case 'image':
            default:
                return iconParams[param] || '';
        }
    }

    /**
     * Returns the URL without the desired parts.
     *
     * @param url URL to treat.
     * @param parts Parts to remove.
     * @returns URL without the parts.
     */
    static removeUrlParts(url: string, parts: CoreUrlPartNames | CoreUrlPartNames[]): string {
        if (!url) {
            return url;
        }

        if (!Array.isArray(parts)) {
            parts = [parts];
        }

        parts.forEach((part) => {
            switch (part) {
                case CoreUrlPartNames.WWWInDomain:
                    // Remove www, no protocol.
                    url = url.replace(/^www./, '');
                    // Remove www, with protocol.
                    url = url.replace(/\/\/www./, '//');
                    break;
                case CoreUrlPartNames.Protocol:
                    // Remove the protocol from url
                    url = url.replace(/^.*?:\/\//, '');
                    break;
                case CoreUrlPartNames.Query:
                    url = url.match(/^[^?]+/)?.[0] || '';
                    break;
                case CoreUrlPartNames.Fragment:
                    url = url.split('#')[0];
                    break;
            }
        });

        return url;
    }

    /**
     * Modifies a pluginfile URL to use the default pluginfile script instead of the webservice one.
     *
     * @param url The url to be fixed.
     * @param siteUrl The URL of the site the URL belongs to.
     * @returns Modified URL.
     */
    static unfixPluginfileURL(url: string, siteUrl?: string): string {
        if (!url) {
            return '';
        }

        url = url.replace(/&amp;/g, '&');

        // It site URL is supplied, check if the URL belongs to the site.
        if (siteUrl && url.indexOf(CoreText.addEndingSlash(siteUrl)) !== 0) {
            return url;
        }

        // Check tokenpluginfile first.
        url = url.replace(/\/tokenpluginfile\.php\/[^/]+\//, '/pluginfile.php/');

        // Treat webservice/pluginfile case.
        url = url.replace(/\/webservice\/pluginfile\.php\//, '/pluginfile.php/');

        // Make sure the URL doesn't contain the token.
        url = url.replace(/([?&])token=[^&]*&?/, '$1');

        return url;
    }

}

export type CoreUrlParams = {[key: string]: string};
