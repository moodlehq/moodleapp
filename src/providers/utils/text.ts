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
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { ModalController, Platform } from 'ionic-angular';
import { TranslateService } from '@ngx-translate/core';
import { CoreLangProvider } from '../lang';

/*
 * "Utils" service with helper functions for text.
*/
@Injectable()
export class CoreTextUtilsProvider {

    // List of regular expressions to convert the old nomenclature to new nomenclature for disabled features.
    protected DISABLED_FEATURES_COMPAT_REGEXPS = [
        {old: /\$mmLoginEmailSignup/g, new: 'CoreLoginEmailSignup'},
        {old: /\$mmSideMenuDelegate/g, new: 'CoreMainMenuDelegate'},
        {old: /\$mmCoursesDelegate/g, new: 'CoreCourseOptionsDelegate'},
        {old: /\$mmUserDelegate/g, new: 'CoreUserDelegate'},
        {old: /\$mmCourseDelegate/g, new: 'CoreCourseModuleDelegate'},
        {old: /_mmCourses/g, new: '_CoreCourses'},
        {old: /_mmaFrontpage/g, new: '_CoreSiteHome'},
        {old: /_mmaGrades/g, new: '_CoreGrades'},
        {old: /_mmaCompetency/g, new: '_AddonCompetency'},
        {old: /_mmaNotifications/g, new: '_AddonNotifications'},
        {old: /_mmaMessages/g, new: '_AddonMessages'},
        {old: /_mmaCalendar/g, new: '_AddonCalendar'},
        {old: /_mmaFiles/g, new: '_AddonFiles'},
        {old: /_mmaParticipants/g, new: '_CoreUserParticipants'},
        {old: /_mmaCourseCompletion/g, new: '_AddonCourseCompletion'},
        {old: /_mmaNotes/g, new: '_AddonNotes'},
        {old: /_mmaBadges/g, new: '_AddonBadges'},
        {old: /files_privatefiles/g, new: 'AddonFilesPrivateFiles'},
        {old: /files_sitefiles/g, new: 'AddonFilesSiteFiles'},
        {old: /files_upload/g, new: 'AddonFilesUpload'},
        {old: /_mmaModAssign/g, new: '_AddonModAssign'},
        {old: /_mmaModBook/g, new: '_AddonModBook'},
        {old: /_mmaModChat/g, new: '_AddonModChat'},
        {old: /_mmaModChoice/g, new: '_AddonModChoice'},
        {old: /_mmaModData/g, new: '_AddonModData'},
        {old: /_mmaModFeedback/g, new: '_AddonModFeedback'},
        {old: /_mmaModFolder/g, new: '_AddonModFolder'},
        {old: /_mmaModForum/g, new: '_AddonModForum'},
        {old: /_mmaModGlossary/g, new: '_AddonModGlossary'},
        {old: /_mmaModImscp/g, new: '_AddonModImscp'},
        {old: /_mmaModLabel/g, new: '_AddonModLabel'},
        {old: /_mmaModLesson/g, new: '_AddonModLesson'},
        {old: /_mmaModLti/g, new: '_AddonModLti'},
        {old: /_mmaModPage/g, new: '_AddonModPage'},
        {old: /_mmaModQuiz/g, new: '_AddonModQuiz'},
        {old: /_mmaModResource/g, new: '_AddonModResource'},
        {old: /_mmaModScorm/g, new: '_AddonModScorm'},
        {old: /_mmaModSurvey/g, new: '_AddonModSurvey'},
        {old: /_mmaModUrl/g, new: '_AddonModUrl'},
        {old: /_mmaModWiki/g, new: '_AddonModWiki'},
        {old: /_mmaModWorkshop/g, new: '_AddonModWorkshop'},
        {old: /remoteAddOn_/g, new: 'sitePlugin_'},
    ];

    protected template = document.createElement('template'); // A template element to convert HTML to element.

    constructor(private translate: TranslateService, private langProvider: CoreLangProvider, private modalCtrl: ModalController,
            private sanitizer: DomSanitizer, private platform: Platform) { }

    /**
     * Given an address as a string, return a URL to open the address in maps.
     *
     * @param {string} address The address.
     * @return {SafeUrl} URL to view the address.
     */
    buildAddressURL(address: string): SafeUrl {
        return this.sanitizer.bypassSecurityTrustUrl((this.platform.is('android') ? 'geo:0,0?q=' : 'http://maps.google.com?q=') +
                encodeURIComponent(address));
    }

    /**
     * Given a list of sentences, build a message with all of them wrapped in <p>.
     *
     * @param {string[]} messages Messages to show.
     * @return {string} Message with all the messages.
     */
    buildMessage(messages: string[]): string {
        let result = '';

        messages.forEach((message) => {
            if (message) {
                result += `<p>${message}</p>`;
            }
        });

        return result;
    }

    /**
     * Convert size in bytes into human readable format
     *
     * @param {number} bytes Number of bytes to convert.
     * @param {number} [precision=2] Number of digits after the decimal separator.
     * @return {string} Size in human readable format.
     */
    bytesToSize(bytes: number, precision: number = 2): string {

        if (typeof bytes == 'undefined' || bytes === null || bytes < 0) {
            return this.translate.instant('core.notapplicable');
        }

        if (precision < 0) {
            precision = 2;
        }

        const keys = ['core.sizeb', 'core.sizekb', 'core.sizemb', 'core.sizegb', 'core.sizetb'],
            units = this.translate.instant(keys);
        let pos = 0;

        if (bytes >= 1024) {
            while (bytes >= 1024) {
                pos++;
                bytes = bytes / 1024;
            }
            // Round to "precision" decimals if needed.
            bytes = Number(Math.round(parseFloat(bytes + 'e+' + precision)) + 'e-' + precision);
        }

        return this.translate.instant('core.humanreadablesize', { size: bytes, unit: units[keys[pos]] });
    }

    /**
     * Clean HTML tags.
     *
     * @param {string} text The text to be cleaned.
     * @param {boolean} [singleLine] True if new lines should be removed (all the text in a single line).
     * @return {string} Clean text.
     */
    cleanTags(text: string, singleLine?: boolean): string {
        if (typeof text != 'string') {
            return text;
        }

        if (!text) {
            return '';
        }

        // First, we use a regexpr.
        text = text.replace(/(<([^>]+)>)/ig, '');
        // Then, we rely on the browser. We need to wrap the text to be sure is HTML.
        const element = this.convertToElement(text);
        text = element.textContent;
        // Recover or remove new lines.
        text = this.replaceNewLines(text, singleLine ? ' ' : '<br>');

        return text;
    }

    /**
     * Concatenate two paths, adding a slash between them if needed.
     *
     * @param {string} leftPath Left path.
     * @param {string} rightPath Right path.
     * @return {string} Concatenated path.
     */
    concatenatePaths(leftPath: string, rightPath: string): string {
        if (!leftPath) {
            return rightPath;
        } else if (!rightPath) {
            return leftPath;
        }

        const lastCharLeft = leftPath.slice(-1),
            firstCharRight = rightPath.charAt(0);

        if (lastCharLeft === '/' && firstCharRight === '/') {
            return leftPath + rightPath.substr(1);
        } else if (lastCharLeft !== '/' && firstCharRight !== '/') {
            return leftPath + '/' + rightPath;
        } else {
            return leftPath + rightPath;
        }
    }

    /**
     * Convert some HTML as text into an HTMLElement. This HTML is put inside a div or a body.
     * This function is the same as in DomUtils, but we cannot use that one because of circular dependencies.
     *
     * @param {string} html Text to convert.
     * @return {HTMLElement} Element.
     */
    protected convertToElement(html: string): HTMLElement {
        // Add a div to hold the content, that's the element that will be returned.
        this.template.innerHTML = '<div>' + html + '</div>';

        return <HTMLElement> this.template.content.children[0];
    }

    /**
     * Count words in a text.
     *
     * @param {string} text Text to count.
     * @return {number} Number of words.
     */
    countWords(text: string): number {
        if (!text || typeof text != 'string') {
            return 0;
        }
        const blockTags = ['address', 'article', 'aside', 'blockquote', 'br', ' details', 'dialog', 'dd', 'div', 'dl', 'dt',
            'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr',
            'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul'];

        // Clean HTML scripts and tags.
        text = text.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
        // Replace block tags by space to get word count aware of line break and remove inline tags.
        text = text.replace(/<(\/[ ]*)?([a-zA-Z0-9]+)[^>]*>/gi, (str, p1, match) => {
            if (blockTags.indexOf(match) >= 0) {
                return ' ';
            }

            return '';
        });
        // Decode HTML entities.
        text = this.decodeHTMLEntities(text);
        // Replace underscores (which are classed as word characters) with spaces.
        text = text.replace(/_/gi, ' ');

        // This RegEx will detect any word change including Unicode chars. Some languages without spaces won't be counted fine.
        return text.match(/\S+/gi).length;
    }

    /**
     * Decode an escaped HTML text. This implementation is based on PHP's htmlspecialchars_decode.
     *
     * @param {string|number} text Text to decode.
     * @return {string} Decoded text.
     */
    decodeHTML(text: string | number): string {
        if (typeof text == 'undefined' || text === null || (typeof text == 'number' && isNaN(text))) {
            return '';
        } else if (typeof text != 'string') {
            return '' + text;
        }

        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, '\'')
            .replace(/&nbsp;/g, ' ');
    }

    /**
     * Decode HTML entities in a text. Equivalent to PHP html_entity_decode.
     *
     * @param {string} text Text to decode.
     * @return {string} Decoded text.
     */
    decodeHTMLEntities(text: string): string {
        if (text) {
            const element = this.convertToElement(text);
            text = element.textContent;
        }

        return text;
    }

    /**
     * Same as Javascript's decodeURI, but if an exception is thrown it will return the original URI.
     *
     * @param {string} uri URI to decode.
     * @return {string} Decoded URI, or original URI if an exception is thrown.
     */
    decodeURI(uri: string): string {
        try {
            return decodeURI(uri);
        } catch (ex) {
            // Error, use the original URI.
        }

        return uri;
    }

    /**
     * Same as Javascript's decodeURIComponent, but if an exception is thrown it will return the original URI.
     *
     * @param {string} uri URI to decode.
     * @return {string} Decoded URI, or original URI if an exception is thrown.
     */
    decodeURIComponent(uri: string): string {
        try {
            return decodeURIComponent(uri);
        } catch (ex) {
            // Error, use the original URI.
        }

        return uri;
    }

    /**
     * Escapes some characters in a string to be used as a regular expression.
     *
     * @param {string} text Text to escape.
     * @return {string} Escaped text.
     */
    escapeForRegex(text: string): string {
        if (!text || typeof text != 'string') {
            return '';
        }

        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }

    /**
     * Escape an HTML text. This implementation is based on PHP's htmlspecialchars.
     *
     * @param {string|number} text Text to escape.
     * @return {string} Escaped text.
     */
    escapeHTML(text: string | number): string {
        if (typeof text == 'undefined' || text === null || (typeof text == 'number' && isNaN(text))) {
            return '';
        } else if (typeof text != 'string') {
            return '' + text;
        }

        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Shows a text on a new page.
     *
     * @param {string} title Title of the new state.
     * @param {string} text Content of the text to be expanded.
     * @param {string} [component] Component to link the embedded files to.
     * @param {string|number} [componentId] An ID to use in conjunction with the component.
     * @param {any[]} [files] List of files to display along with the text.
     */
    expandText(title: string, text: string, component?: string, componentId?: string | number, files?: any[]): void {
        if (text.length > 0) {
            const params: any = {
                title: title,
                content: text,
                component: component,
                componentId: componentId,
                files: files
            };

            // Open a modal with the contents.
            params.isModal = true;

            const modal = this.modalCtrl.create('CoreViewerTextPage', params);
            modal.present();
        }
    }

    /**
     * Formats a text, in HTML replacing new lines by correct html new lines.
     *
     * @param {string} text Text to format.
     * @return {string} Formatted text.
     */
    formatHtmlLines(text: string): string {
        const hasHTMLTags = this.hasHTMLTags(text);
        if (text.indexOf('<p>') == -1) {
            // Wrap the text in <p> tags.
            text = '<p>' + text + '</p>';
        }

        if (!hasHTMLTags) {
            // The text doesn't have HTML, replace new lines for <br>.
            return this.replaceNewLines(text, '<br>');
        }

        return text;
    }

    /**
     * Formats a text, treating multilang tags and cleaning HTML if needed.
     *
     * @param {string} text Text to format.
     * @param {boolean} [clean] Whether HTML tags should be removed.
     * @param {boolean} [singleLine] Whether new lines should be removed. Only valid if clean is true.
     * @param {number} [shortenLength] Number of characters to shorten the text.
     * @param {number} [highlight] Text to highlight.
     * @return {Promise<string>} Promise resolved with the formatted text.
     */
    formatText(text: string, clean?: boolean, singleLine?: boolean, shortenLength?: number, highlight?: string): Promise<string> {
        return this.treatMultilangTags(text).then((formatted) => {
            if (clean) {
                formatted = this.cleanTags(formatted, singleLine);
            }
            if (shortenLength > 0) {
                formatted = this.shortenText(formatted, shortenLength);
            }
            if (highlight) {
                formatted = this.highlightText(formatted, highlight);
            }

            return formatted;
        });
    }

    /**
     * Get the error message from an error object.
     *
     * @param {any} error Error object.
     * @return {string} Error message, undefined if not found.
     */
    getErrorMessageFromError(error: any): string {
        if (typeof error == 'string') {
            return error;
        }

        return error && (error.message || error.error || error.content || error.body);
    }

    /**
     * Get the pluginfile URL to replace @@PLUGINFILE@@ wildcards.
     *
     * @param {any[]} files Files to extract the URL from. They need to have the URL in a 'url' or 'fileurl' attribute.
     * @return {string} Pluginfile URL, undefined if no files found.
     */
    getTextPluginfileUrl(files: any[]): string {
        if (files && files.length) {
            const fileURL = files[0].url || files[0].fileurl;

            // Remove text after last slash (encoded or not).
            return fileURL.substr(0, Math.max(fileURL.lastIndexOf('/'), fileURL.lastIndexOf('%2F')));
        }

        return undefined;
    }

    /**
     * Check if a text contains HTML tags.
     *
     * @param {string} text Text to check.
     * @return {boolean} Whether it has HTML tags.
     */
    hasHTMLTags(text: string): boolean {
        return /<[a-z][\s\S]*>/i.test(text);
    }

    /**
     * Highlight all occurrences of a certain text inside another text. It will add some HTML code to highlight it.
     *
     * @param {string} text Full text.
     * @param {string} searchText Text to search and highlight.
     * @return {string} Highlighted text.
     */
    highlightText(text: string, searchText: string): string {
        if (!text || typeof text != 'string') {
            return '';
        } else if (!searchText) {
            return text;
        }

        const regex = new RegExp('(' + searchText + ')', 'gi');

        return text.replace(regex, '<span class="matchtext">$1</span>');
    }

    /**
     * Check if HTML content is blank.
     *
     * @param {string} content HTML content.
     * @return {boolean} True if the string does not contain actual content: text, images, etc.
     */
    htmlIsBlank(content: string): boolean {
        if (!content) {
            return true;
        }

        const div = document.createElement('div');
        div.innerHTML = content;

        return div.textContent === '' && div.querySelector('img, object, hr') === null;
    }

    /**
     * Check if a text contains Unicode long chars.
     * Using as threshold Hex value D800
     *
     * @param {string} text Text to check.
     * @return {boolean} True if has Unicode chars, false otherwise.
     */
    hasUnicode(text: string): boolean {
        for (let x = 0; x < text.length; x++) {
            if (text.charCodeAt(x) > 55295) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if an object has any long Unicode char.
     *
     * @param {object} data Object to be checked.
     * @return {boolean} If the data has any long Unicode char on it.
     */
    hasUnicodeData(data: object): boolean {
        for (const el in data) {
            if (typeof data[el] == 'object') {
                if (this.hasUnicodeData(data[el])) {
                    return true;
                }
            } else if (typeof data[el] == 'string' && this.hasUnicode(data[el])) {
                return true;
            }
        }

        return false;
    }

    /**
     * Same as Javascript's JSON.parse, but it will handle errors.
     *
     * @param {string} json JSON text.
     * @param {any} [defaultValue] Default value t oreturn if the parse fails. Defaults to the original value.
     * @param {Function} [logErrorFn] An error to call with the exception to log the error. If not supplied, no error.
     * @return {any} JSON parsed as object or what it gets.
     */
    parseJSON(json: string, defaultValue?: any, logErrorFn?: Function): any {
        try {
            return JSON.parse(json);
        } catch (ex) {
            // Error, log the error if needed.
            if (logErrorFn) {
                logErrorFn(ex);
            }
        }

        // Error parsing, return the default value or the original value.
        return typeof defaultValue != 'undefined' ? defaultValue : json;
    }

    /**
     * Remove ending slash from a path or URL.
     *
     * @param {string} text Text to treat.
     * @return {string} Treated text.
     */
    removeEndingSlash(text: string): string {
        if (!text) {
            return '';
        }

        if (text.slice(-1) == '/') {
            return text.substr(0, text.length - 1);
        }

        return text;
    }

    /**
     * Replace all characters that cause problems with files in Android and iOS.
     *
     * @param {string} text Text to treat.
     * @return {string} Treated text.
     */
    removeSpecialCharactersForFiles(text: string): string {
        if (!text || typeof text != 'string') {
            return '';
        }

        return text.replace(/[#:\/\?\\]+/g, '_');
    }

    /**
     * Replace all the new lines on a certain text.
     *
     * @param {string} text The text to be treated.
     * @param {string} newValue Text to use instead of new lines.
     * @return {string} Treated text.
     */
    replaceNewLines(text: string, newValue: string): string {
        if (!text || typeof text != 'string') {
            return '';
        }

        return text.replace(/(?:\r\n|\r|\n)/g, newValue);
    }

    /**
     * Replace @@PLUGINFILE@@ wildcards with the real URL in a text.
     *
     * @param {string} Text to treat.
     * @param {any[]} files Files to extract the pluginfile URL from. They need to have the URL in a url or fileurl attribute.
     * @return {string} Treated text.
     */
    replacePluginfileUrls(text: string, files: any[]): string {
        if (text && typeof text == 'string') {
            const fileURL = this.getTextPluginfileUrl(files);
            if (fileURL) {
                return text.replace(/@@PLUGINFILE@@/g, fileURL);
            }
        }

        return text;
    }

    /**
     * Replace pluginfile URLs with @@PLUGINFILE@@ wildcards.
     *
     * @param {string} text Text to treat.
     * @param {any[]} files Files to extract the pluginfile URL from. They need to have the URL in a url or fileurl attribute.
     * @return {string} Treated text.
     */
    restorePluginfileUrls(text: string, files: any[]): string {
        if (text && typeof text == 'string') {
            const fileURL = this.getTextPluginfileUrl(files);
            if (fileURL) {
                return text.replace(new RegExp(this.escapeForRegex(fileURL), 'g'), '@@PLUGINFILE@@');
            }
        }

        return text;
    }

    /**
     * Rounds a number to use a certain amout of decimals or less.
     * Difference between this function and float's toFixed:
     * 7.toFixed(2) -> 7.00
     * roundToDecimals(7, 2) -> 7
     *
     * @param {number} num Number to round.
     * @param {number} [decimals=2] Number of decimals. By default, 2.
     * @return {number} Rounded number.
     */
    roundToDecimals(num: number, decimals: number = 2): number {
        const multiplier = Math.pow(10, decimals);

        return Math.round(num * multiplier) / multiplier;
    }

    /**
     * Add quotes to HTML characters.
     *
     * Returns text with HTML characters (like "<", ">", etc.) properly quoted.
     * Based on Moodle's s() function.
     *
     * @param {string} text Text to treat.
     * @return {string} Treated text.
     */
    s(text: string): string {
        if (!text) {
            return '';
        }

        return this.escapeHTML(text).replace(/&amp;#(\d+|x[0-9a-f]+);/i, '&#$1;');
    }

    /**
     * Shortens a text to length and adds an ellipsis.
     *
     * @param {string} text The text to be shortened.
     * @param {number} length The desired length.
     * @return {string} Shortened text.
     */
    shortenText(text: string, length: number): string {
        if (text.length > length) {
            text = text.substr(0, length);

            // Now, truncate at the last word boundary (if exists).
            const lastWordPos = text.lastIndexOf(' ');
            if (lastWordPos > 0) {
                text = text.substr(0, lastWordPos);
            }
            text += '&hellip;';
        }

        return text;
    }

    /**
     * Strip Unicode long char of a given text.
     * Using as threshold Hex value D800
     *
     * @param {string} text Text to check.
     * @return {string} Without the Unicode chars.
     */
    stripUnicode(text: string): string {
        let stripped = '';
        for (let x = 0; x < text.length; x++) {
            if (text.charCodeAt(x) <= 55295) {
                stripped += text.charAt(x);
            }
        }

        return stripped;
    }

    /**
     * Treat the list of disabled features, replacing old nomenclature with the new one.
     *
     * @param {string} features List of disabled features.
     * @return {string} Treated list.
     */
    treatDisabledFeatures(features: string): string {
        if (!features) {
            return '';
        }

        for (let i = 0; i < this.DISABLED_FEATURES_COMPAT_REGEXPS.length; i++) {
            const entry = this.DISABLED_FEATURES_COMPAT_REGEXPS[i];

            features = features.replace(entry.old, entry.new);
        }

        return features;
    }

    /**
     * Treat the multilang tags from a HTML code, leaving only the current language.
     *
     * @param {string} text The text to be treated.
     * @return {Promise<string>} Promise resolved with the formatted text.
     */
    treatMultilangTags(text: string): Promise<string> {
        if (!text || typeof text != 'string') {
            return Promise.resolve('');
        }

        return this.langProvider.getCurrentLanguage().then((language) => {
            // Match the current language.
            const anyLangRegEx = /<(?:lang|span)[^>]+lang="[a-zA-Z0-9_-]+"[^>]*>(.*?)<\/(?:lang|span)>/g;
            let currentLangRegEx = new RegExp('<(?:lang|span)[^>]+lang="' + language + '"[^>]*>(.*?)<\/(?:lang|span)>', 'g');

            if (!text.match(currentLangRegEx)) {
                // Current lang not found. Try to find the first language.
                const matches = text.match(anyLangRegEx);
                if (matches && matches[0]) {
                    language = matches[0].match(/lang="([a-zA-Z0-9_-]+)"/)[1];
                    currentLangRegEx = new RegExp('<(?:lang|span)[^>]+lang="' + language + '"[^>]*>(.*?)<\/(?:lang|span)>', 'g');
                } else {
                    // No multi-lang tag found, stop.
                    return text;
                }
            }
            // Extract contents of current language.
            text = text.replace(currentLangRegEx, '$1');
            // Delete the rest of languages
            text = text.replace(anyLangRegEx, '');

            return text;
        });
    }

    /**
     * If a number has only 1 digit, add a leading zero to it.
     *
     * @param {string|number} num Number to convert.
     * @return {string} Number with leading zeros.
     */
    twoDigits(num: string | number): string {
        if (num < 10) {
            return '0' + num;
        } else {
            return '' + num; // Convert to string for coherence.
        }
    }

    /**
     * Make a string's first character uppercase.
     *
     * @param {string} text Text to treat.
     * @return {string} Treated text.
     */
    ucFirst(text: string): string {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    /**
     * Unserialize Array from PHP.
     * Taken from: https://github.com/kvz/locutus/blob/master/src/php/var/unserialize.js
     *
     * @param  {string} data String to unserialize.
     * @param {Function} [logErrorFn] An error to call with the exception to log the error. If not supplied, no error.
     * @return {any}         Unserialized data.
     */
    unserialize (data: string, logErrorFn?: Function): any {
        //  Discuss at: http://locutus.io/php/unserialize/
        // Original by: Arpad Ray (mailto:arpad@php.net)
        // Improved by: Pedro Tainha (http://www.pedrotainha.com)
        // Improved by: Kevin van Zonneveld (http://kvz.io)
        // Improved by: Kevin van Zonneveld (http://kvz.io)
        // Improved by: Chris
        // Improved by: James
        // Improved by: Le Torbi
        // Improved by: Eli Skeggs
        // Bugfixed by: dptr1988
        // Bugfixed by: Kevin van Zonneveld (http://kvz.io)
        // Bugfixed by: Brett Zamir (http://brett-zamir.me)
        // Bugfixed by: philippsimon (https://github.com/philippsimon/)
        //  Revised by: d3x
        //    Input by: Brett Zamir (http://brett-zamir.me)
        //    Input by: Martin (http://www.erlenwiese.de/)
        //    Input by: kilops
        //    Input by: Jaroslaw Czarniak
        //    Input by: lovasoa (https://github.com/lovasoa/)
        //      Note 1: We feel the main purpose of this function should be
        //      Note 1: to ease the transport of data between php & js
        //      Note 1: Aiming for PHP-compatibility, we have to translate objects to arrays
        //   Example 1: unserialize('a:3:{i:0;s:5:"Kevin";i:1;s:3:"van";i:2;s:9:"Zonneveld";}')
        //   Returns 1: ['Kevin', 'van', 'Zonneveld']
        //   Example 2: unserialize('a:2:{s:9:"firstName";s:5:"Kevin";s:7:"midName";s:3:"van";}')
        //   Returns 2: {firstName: 'Kevin', midName: 'van'}
        //   Example 3: unserialize('a:3:{s:2:"ü";s:2:"ü";s:3:"四";s:3:"四";s:4:"𠜎";s:4:"𠜎";}')
        //   Returns 3: {'ü': 'ü', '四': '四', '𠜎': '𠜎'}

        const utf8Overhead = (str: string): number => {
            let s = str.length;

            for (let i = str.length - 1; i >= 0; i--) {
                const code = str.charCodeAt(i);
                if (code > 0x7f && code <= 0x7ff) {
                    s++;
                } else if (code > 0x7ff && code <= 0xffff) {
                    s += 2;
                }
                // Trail surrogate.
                if (code >= 0xDC00 && code <= 0xDFFF) {
                    i--;
                }
            }

            return s - 1;
        };

        const error = (type: string, msg: string): void => {
            if (logErrorFn) {
                logErrorFn(type + msg);
            }
        };

        const readUntil = (data: string, offset: number, stopchr: string): Array<any> => {
            let i = 2;
            const buf = [];
            let chr = data.slice(offset, offset + 1);

            while (chr !== stopchr) {
                if ((i + offset) > data.length) {
                    error('Error', 'Invalid');
                }
                buf.push(chr);
                chr = data.slice(offset + (i - 1), offset + i);
                i += 1;
            }

            return [buf.length, buf.join('')];
        };

        const readChrs = (data: string, offset: number, length: number): Array<any> => {
            let chr;
            const buf = [];

            for (let i = 0; i < length; i++) {
                chr = data.slice(offset + (i - 1), offset + i);
                buf.push(chr);
                length -= utf8Overhead(chr);
            }

            return [buf.length, buf.join('')];
        };

        const _unserialize = (data: string, offset: number): any => {
            let dtype,
                dataoffset,
                keyandchrs,
                keys,
                contig,
                length,
                array,
                readdata,
                readData,
                ccount,
                stringlength,
                i,
                key,
                kprops,
                kchrs,
                vprops,
                vchrs,
                value,
                chrs = 0,
                typeconvert = (x: any): any => {
                    return x;
                };

            if (!offset) {
                offset = 0;
            }
            dtype = (data.slice(offset, offset + 1)).toLowerCase();

            dataoffset = offset + 2;

            switch (dtype) {
                case 'i':
                    typeconvert = (x: any): number => {
                        return parseInt(x, 10);
                    };
                    readData = readUntil(data, dataoffset, ';');
                    chrs = readData[0];
                    readdata = readData[1];
                    dataoffset += chrs + 1;
                    break;
                case 'b':
                    typeconvert = (x: any): boolean => {
                        return parseInt(x, 10) !== 0;
                    };
                    readData = readUntil(data, dataoffset, ';');
                    chrs = readData[0];
                    readdata = readData[1];
                    dataoffset += chrs + 1;
                    break;
                case 'd':
                    typeconvert = (x: any): number => {
                        return parseFloat(x);
                    };
                    readData = readUntil(data, dataoffset, ';');
                    chrs = readData[0];
                    readdata = readData[1];
                    dataoffset += chrs + 1;
                    break;
                case 'n':
                    readdata = null;
                    break;
                case 's':
                    ccount = readUntil(data, dataoffset, ':');
                    chrs = ccount[0];
                    stringlength = ccount[1];
                    dataoffset += chrs + 2;

                    readData = readChrs(data, dataoffset + 1, parseInt(stringlength, 10));
                    chrs = readData[0];
                    readdata = readData[1];
                    dataoffset += chrs + 2;
                    if (chrs !== parseInt(stringlength, 10) && chrs !== readdata.length) {
                        error('SyntaxError', 'String length mismatch');
                    }
                    break;
                case 'a':
                    readdata = {};

                    keyandchrs = readUntil(data, dataoffset, ':');
                    chrs = keyandchrs[0];
                    keys = keyandchrs[1];
                    dataoffset += chrs + 2;

                    length = parseInt(keys, 10);
                    contig = true;

                    for (let i = 0; i < length; i++) {
                        kprops = _unserialize(data, dataoffset);
                        kchrs = kprops[1];
                        key = kprops[2];
                        dataoffset += kchrs;

                        vprops = _unserialize(data, dataoffset);
                        vchrs = vprops[1];
                        value = vprops[2];
                        dataoffset += vchrs;

                        if (key !== i) {
                            contig = false;
                        }

                        readdata[key] = value;
                    }

                    if (contig) {
                        array = new Array(length);
                        for (i = 0; i < length; i++) {
                            array[i] = readdata[i];
                        }
                        readdata = array;
                    }

                    dataoffset += 1;
                    break;
                default:
                    error('SyntaxError', 'Unknown / Unhandled data type(s): ' + dtype);
                    break;
            }

            return [dtype, dataoffset - offset, typeconvert(readdata)];
        };

        return _unserialize((data + ''), 0)[2];
    }
}
