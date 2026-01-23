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

import { makeSingleton } from '@singletons';
import { CoreUrl, CoreUrlParams as CoreUrlParamsNew, CoreUrlPartNames } from '@singletons/url';

/**
 * "Utils" service with helper functions for URLs.
 *
 * @deprecated since 4.5. Use CoreUrl instead.
 */
@Injectable({ providedIn: 'root' })
export class CoreUrlUtilsProvider {

    /**
     * Add or remove 'www' from a URL. The url needs to have http or https protocol.
     *
     * @param url URL to modify.
     * @returns Modified URL.
     * @deprecated since 4.5. Use CoreUrl.addOrRemoveWWW instead.
     */
    addOrRemoveWWW(url: string): string {
        return CoreUrl.addOrRemoveWWW(url);
    }

    /**
     * Add params to a URL.
     *
     * @param url URL to add the params to.
     * @param params Object with the params to add.
     * @param anchor Anchor text if needed.
     * @param boolToNumber Whether to convert bools to 1 or 0.
     * @returns URL with params.
     * @deprecated since 4.5. Use CoreUrl.addParamsToUrl instead.
     */
    addParamsToUrl(url: string, params?: Record<string, unknown>, anchor?: string, boolToNumber?: boolean): string {
        return CoreUrl.addParamsToUrl(url, params, { anchor, boolToNumber });
    }

    /**
     * Given a URL and a text, return an HTML link.
     *
     * @param url URL.
     * @param text Text of the link.
     * @returns Link.
     * @deprecated since 4.5. Use CoreUrl.buildLink instead.
     */
    buildLink(url: string, text: string): string {
        return CoreUrl.buildLink(url, text);
    }

    /**
     * Check whether we can use tokenpluginfile.php endpoint for a certain URL.
     *
     * @param url URL to check.
     * @param siteUrl The URL of the site the URL belongs to.
     * @param accessKey User access key for tokenpluginfile.
     * @returns Whether tokenpluginfile.php can be used.
     * @deprecated since 4.5. Use CoreUrl.canUseTokenPluginFile instead.
     */
    canUseTokenPluginFile(url: string, siteUrl: string, accessKey?: string): boolean {
        return CoreUrl.canUseTokenPluginFile(url, siteUrl, accessKey);
    }

    /**
     * Extracts the parameters from a URL and stores them in an object.
     *
     * @param url URL to treat.
     * @returns Object with the params.
     * @deprecated since 4.5. Use CoreUrl.extractUrlParams instead.
     */
    extractUrlParams(url: string): CoreUrlParamsNew {
        return CoreUrl.extractUrlParams(url);
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
     * @deprecated since 4.5. Use CoreUrl.fixPluginfileURL instead.
     */
    fixPluginfileURL(url: string, token: string, siteUrl: string, accessKey?: string): string {
        return CoreUrl.fixPluginfileURL(url, token, siteUrl, accessKey);
    }

    /**
     * Formats a URL, trim, lowercase, etc...
     *
     * @param url The url to be formatted.
     * @returns Fromatted url.
     * @deprecated since 4.5. Use CoreUrl.formatURL instead.
     */
    formatURL(url: string): string {
        return CoreUrl.formatURL(url);
    }

    /**
     * Returns the URL to the documentation of the app, based on Moodle version and current language.
     *
     * The URL has been simplified and always returns the English version of the latest version of Moodle
     * to simplify the circular dependencies.
     *
     * @param release Moodle release. Unused.
     * @param page Docs page to go to.
     * @returns Promise resolved with the Moodle docs URL.
     *
     * @deprecated since 4.5. You can use CoreAuthenticatedSite.getDocsUrl but is also deprecated.
     */
    async getDocsUrl(release?: string, page = 'Mobile_app'): Promise<string> {
        return `https://docs.moodle.org/en/${page}`;
    }

    /**
     * Returns the Youtube Embed Video URL or undefined if not found.
     *
     * @param url URL
     * @returns Youtube Embed Video URL or undefined if not found.
     * @deprecated since 4.5. Use CoreUrl.getYoutubeEmbedUrl instead.
     */
    getYoutubeEmbedUrl(url?: string): string | void {
        return CoreUrl.getYoutubeEmbedUrl(url);
    }

    /**
     * Given a URL, returns what's after the last '/' without params.
     * Example:
     * http://mysite.com/a/course.html?id=1 -> course.html
     *
     * @param url URL to treat.
     * @returns Last file without params.
     * @deprecated since 4.5. Use CoreUrl.getLastFileWithoutParams instead.
     */
    getLastFileWithoutParams(url: string): string {
        return CoreUrl.getLastFileWithoutParams(url);
    }

    /**
     * Get the protocol from a URL.
     * E.g. http://www.google.com returns 'http'.
     *
     * @param url URL to treat.
     * @returns Protocol, undefined if no protocol found.
     * @deprecated since 4.5. Use CoreUrl.getUrlProtocol instead.
     */
    getUrlProtocol(url: string): string | void {
        return CoreUrl.getUrlProtocol(url);
    }

    /**
     * Get the scheme from a URL. Please notice that, if a URL has protocol, it will return the protocol.
     * E.g. javascript:doSomething() returns 'javascript'.
     *
     * @param url URL to treat.
     * @returns Scheme, undefined if no scheme found.
     * @deprecated since 4.5. Use CoreUrl.getUrlProtocol instead.
     */
    getUrlScheme(url: string): string | void {
        return CoreUrl.getUrlProtocol(url);
    }

    /**
     * Gets a username from a URL like: user@mysite.com.
     *
     * @param url URL to treat.
     * @returns Username. Undefined if no username found.
     * @deprecated since 4.5. Use CoreUrl.getUsernameFromUrl instead.
     */
    getUsernameFromUrl(url: string): string | undefined {
        return CoreUrl.getUsernameFromUrl(url);
    }

    /**
     * Returns if a URL has any protocol (not a relative URL).
     *
     * @param url The url to test against the pattern.
     * @returns Whether the url is absolute.
     * @deprecated since 4.5. Use CoreUrl.isAbsoluteURL instead.
     */
    isAbsoluteURL(url: string): boolean {
        return CoreUrl.isAbsoluteURL(url);
    }

    /**
     * Returns if a URL is downloadable: plugin file OR theme/image.php OR gravatar.
     *
     * @param url The URL to test.
     * @returns Whether the URL is downloadable.
     * @deprecated since 4.5. Use CoreUrl.isDownloadableUrl instead.
     */
    isDownloadableUrl(url: string): boolean {
        return CoreUrl.isDownloadableUrl(url);
    }

    /**
     * Returns if a URL is a gravatar URL.
     *
     * @param url The URL to test.
     * @returns Whether the URL is a gravatar URL.
     * @deprecated since 4.5. Use CoreUrl.isGravatarUrl instead.
     */
    isGravatarUrl(url: string): boolean {
        return CoreUrl.isGravatarUrl(url);
    }

    /**
     * Check if a URL uses http or https protocol.
     *
     * @param url The url to test.
     * @returns Whether the url uses http or https protocol.
     * @deprecated since 4.5. Use CoreUrl.isHttpURL instead.
     */
    isHttpURL(url: string): boolean {
        return CoreUrl.isHttpURL(url);
    }

    /**
     * Check whether an URL belongs to a local file.
     *
     * @param url URL to check.
     * @returns Whether the URL belongs to a local file.
     * @deprecated since 4.5. Use CoreUrl.isLocalFileUrl instead.
     */
    isLocalFileUrl(url: string): boolean {
        return CoreUrl.isLocalFileUrl(url);
    }

    /**
     * Check whether a URL scheme belongs to a local file.
     *
     * @param scheme Scheme to check.
     * @returns Whether the scheme belongs to a local file.
     * @deprecated since 4.5. Use CoreUrl.isLocalFileUrlScheme instead.
     */
    isLocalFileUrlScheme(scheme: string, domain: string): boolean {
        return CoreUrl.isLocalFileUrlScheme(scheme, domain);
    }

    /**
     * Returns if a URL is a pluginfile URL.
     *
     * @param url The URL to test.
     * @returns Whether the URL is a pluginfile URL.
     * @deprecated since 4.5. Use CoreUrl.isPluginFileUrl instead.
     */
    isPluginFileUrl(url: string): boolean {
        return CoreUrl.isPluginFileUrl(url);
    }

    /**
     * Returns if a URL is a tokenpluginfile URL.
     *
     * @param url The URL to test.
     * @returns Whether the URL is a tokenpluginfile URL.
     * @deprecated since 4.5. Use CoreUrl.isTokenPluginFileUrl instead.
     */
    isTokenPluginFileUrl(url: string): boolean {
        return CoreUrl.isTokenPluginFileUrl(url);
    }

    /**
     * Returns if a URL is a theme image URL.
     *
     * @param imageUrl The URL to test.
     * @param siteUrl The Site Url.
     * @returns Whether the URL is a theme image URL.
     * @deprecated since 4.5. Use CoreUrl.isThemeImageUrl instead.
     */
    isThemeImageUrl(imageUrl: string, siteUrl?: string): boolean {
        return CoreUrl.isThemeImageUrl(imageUrl, siteUrl);
    }

    /**
     * Returns an specific param from an image URL.
     *
     * @param imageUrl Image Url
     * @param param Param to get from the URL.
     * @param siteUrl Site URL.
     * @returns Param from the URL.
     * @deprecated since 4.5. Use CoreUrl.getThemeImageUrlParam instead.
     */
    getThemeImageUrlParam(imageUrl: string, param: string, siteUrl?: string): string {
        return CoreUrl.getThemeImageUrlParam(imageUrl, param, siteUrl);
    }

    /**
     * Remove protocol and www from a URL.
     *
     * @param url URL to treat.
     * @returns Treated URL.
     * @deprecated since 4.5. Use CoreUrl.removeUrlParts(url, [CoreUrlPartNames.Protocol, CoreUrlPartNames.WWWInDomain]) instead.
     */
    removeProtocolAndWWW(url: string): string {
        return CoreUrl.removeUrlParts(url, [CoreUrlPartNames.Protocol, CoreUrlPartNames.WWWInDomain]);
    }

    /**
     * Remove the parameters from a URL, returning the URL without them.
     *
     * @param url URL to treat.
     * @returns URL without params.
     * @deprecated since 4.5. Use CoreUrl.removeUrlParts(url, [CoreUrlPartNames.Query, CoreUrlPartNames.Fragment]) instead.
     */
    removeUrlParams(url: string): string {
        return CoreUrl.removeUrlParts(url, [CoreUrlPartNames.Query, CoreUrlPartNames.Fragment]);
    }

    /**
     * Modifies a pluginfile URL to use the default pluginfile script instead of the webservice one.
     *
     * @param url The url to be fixed.
     * @param siteUrl The URL of the site the URL belongs to.
     * @returns Modified URL.
     * @deprecated since 4.5. Use CoreUrl.unfixPluginfileURL instead.
     */
    unfixPluginfileURL(url: string, siteUrl?: string): string {
        return CoreUrl.unfixPluginfileURL(url, siteUrl);
    }

}
/**
 * @deprecated since 4.5. Use CoreUrl instead.
 */
// eslint-disable-next-line @typescript-eslint/no-deprecated
export const CoreUrlUtils = makeSingleton(CoreUrlUtilsProvider);

/**
 * @deprecated since 4.5. Use CoreUrlParams on CoreUrl instead.
 */
export type CoreUrlParams = CoreUrlParamsNew;
