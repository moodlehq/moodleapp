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

import { Clipboard, Translate } from '@singletons';
import { CoreToasts } from '@services/toasts';
import { Locutus } from './locutus';
import { CoreError } from '@classes/errors/error';
import { convertTextToHTMLElement } from '../utils/create-html-element';

/**
 * Singleton with helper functions for text manipulation.
 */
export class CoreText {

    // Avoid creating singleton instances.
    private constructor() {
        // Nothing to do.
    }

    /**
     * Add ending slash from a path or URL.
     *
     * @param text Text to treat.
     * @returns Treated text.
     */
    static addEndingSlash(text: string): string {
        if (!text) {
            return '';
        }

        if (text.slice(-1) != '/') {
            return text + '/';
        }

        return text;
    }

    /**
     * Add starting slash to a string if needed.
     *
     * @param text Text to treat.
     * @returns Treated text.
     */
    static addStartingSlash(text = ''): string {
        if (text[0] === '/') {
            return text;
        }

        return '/' + text;
    }

    /**
     * Given a list of sentences, build a message with all of them wrapped in <p>.
     *
     * @param messages Messages to show.
     * @returns Message with all the messages.
     */
    static buildMessage(messages: string[]): string {
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
     * @param bytes Number of bytes to convert.
     * @param precision Number of digits after the decimal separator.
     * @returns Size in human readable format.
     */
    static bytesToSize(bytes: number, precision: number = 2): string {
        if (bytes === undefined || bytes === null || bytes < 0) {
            return Translate.instant('core.notapplicable');
        }

        if (precision < 0) {
            precision = 2;
        }

        const keys = ['core.sizeb', 'core.sizekb', 'core.sizemb', 'core.sizegb', 'core.sizetb'];
        const units = Translate.instant(keys);
        let pos = 0;

        if (bytes >= 1024) {
            while (bytes >= 1024) {
                pos++;
                bytes = bytes / 1024;
            }
            // Round to "precision" decimals if needed.
            bytes = Number(Math.round(parseFloat(bytes + 'e+' + precision)) + 'e-' + precision);
        }

        return Translate.instant('core.humanreadablesize', { size: bytes, unit: units[keys[pos]] });
    }

    /**
     * Copies a text to clipboard and shows a toast message.
     *
     * @param text Text to be copied
     */
    static async copyToClipboard(text: string): Promise<void> {
        try {
            await Clipboard.copy(text);
        } catch {
            // Use HTML Copy command.
            const virtualInput = document.createElement('textarea');
            virtualInput.innerHTML = text;
            virtualInput.select();
            virtualInput.setSelectionRange(0, 99999);
            document.execCommand('copy'); // eslint-disable-line deprecation/deprecation
        }

        // Show toast using ionicLoading.
        CoreToasts.show({
                message: 'core.copiedtoclipboard',
                translateMessage: true,
        });
    }

    /**
     * Count words in a text.
     * This function is based on Moodle's count_words.
     *
     * @param text Text to count.
     * @returns Number of words.
     */
    static countWords(text?: string | null): number {
        if (!text || typeof text != 'string') {
            return 0;
        }

        // Before stripping tags, add a space after the close tag of anything that is not obviously inline.
        // Also, br is a special case because it definitely delimits a word, but has no close tag.
        text = text.replace(/(<\/(?!a>|b>|del>|em>|i>|ins>|s>|small>|span>|strong>|sub>|sup>|u>)\w+>|<br>|<br\s*\/>)/ig, '$1 ');

        // Now remove HTML tags.
        text = text.replace(/(<([^>]+)>)/ig, '');
        // Decode HTML entities.
        text = CoreText.decodeHTMLEntities(text);

        // Now, the word count is the number of blocks of characters separated
        // by any sort of space. That seems to be the definition used by all other systems.
        // To be precise about what is considered to separate words:
        // * Anything that Unicode considers a 'Separator'
        // * Anything that Unicode considers a 'Control character'
        // * An em- or en- dash.
        let words: string[];
        try {
            words = text.split(/[\p{Z}\p{Cc}—–]+/u);
        } catch {
            // Unicode-aware flag not supported.
            words = text.split(/\s+/);
        }

        // Filter empty words.
        return words.filter(word => word).length;
    }

    /**
     * Clean HTML tags.
     *
     * @param text The text to be cleaned.
     * @param options Processing options.
     * @param options.singleLine True if new lines should be removed (all the text in a single line).
     * @param options.trim True if text should be trimmed.
     * @returns Clean text.
     */
    static cleanTags(text: string | undefined, options: { singleLine?: boolean; trim?: boolean } = {}): string {
        if (!text) {
            return '';
        }

        // First, we use a regexpr.
        text = text.replace(/(<([^>]+)>)/ig, '');
        // Then, we rely on the browser. We need to wrap the text to be sure is HTML.
        text = convertTextToHTMLElement(text).textContent || '';
        // Trim text
        text = options.trim ? text.trim() : text;
        // Recover or remove new lines.
        text = CoreText.replaceNewLines(text, options.singleLine ? ' ' : '<br>');

        return text;
    }

    /**
     * Decode an escaped HTML text. This implementation is based on PHP's htmlspecialchars_decode.
     *
     * @param text Text to decode.
     * @returns Decoded text.
     */
    static decodeHTML(text: string | number): string {
        if (text === undefined || text === null || (typeof text === 'number' && isNaN(text))) {
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
     * @param text Text to decode.
     * @returns Decoded text.
     */
    static decodeHTMLEntities(text: string): string {
        if (text) {
            text = convertTextToHTMLElement(text).textContent || '';
        }

        return text;
    }

    /**
     * Escapes some characters in a string to be used as a regular expression.
     *
     * @param text Text to escape.
     * @returns Escaped text.
     */
    static escapeForRegex(text: string): string {
        if (!text || typeof text !== 'string') {
            return '';
        }

        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }

    /**
     * Escape an HTML text. This implementation is based on PHP's htmlspecialchars.
     *
     * @param text Text to escape.
     * @param doubleEncode If false, it will not convert existing html entities. Defaults to true.
     * @returns Escaped text.
     */
    static escapeHTML(text?: string | number | null, doubleEncode = true): string {
        if (text === undefined || text === null || (typeof text === 'number' && isNaN(text))) {
            return '';
        } else if (typeof text !== 'string') {
            return '' + text;
        }

        if (doubleEncode) {
            text = text.replace(/&/g, '&amp;');
        } else {
            text = text.replace(/&(?!amp;)(?!lt;)(?!gt;)(?!quot;)(?!#039;)/g, '&amp;');
        }

        return text
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Formats a text, in HTML replacing new lines by correct html new lines.
     *
     * @param text Text to format.
     * @returns Formatted text.
     */
    static formatHtmlLines(text: string): string {
        const hasHTMLTags = CoreText.hasHTMLTags(text);
        if (text.indexOf('<p>') == -1) {
            // Wrap the text in <p> tags.
            text = '<p>' + text + '</p>';
        }

        if (!hasHTMLTags) {
            // The text doesn't have HTML, replace new lines for <br>.
            return CoreText.replaceNewLines(text, '<br>');
        }

        return text;
    }

    /**
     * Check if a text contains HTML tags.
     *
     * @param text Text to check.
     * @returns Whether it has HTML tags.
     */
    static hasHTMLTags(text: string): boolean {
        return /<[a-z][\s\S]*>/i.test(text);
    }

    /**
     * Check if a text contains Unicode long chars.
     * Using as threshold Hex value D800
     *
     * @param text Text to check.
     * @returns True if has Unicode chars, false otherwise.
     */
    static hasUnicode(text: string): boolean {
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
     * @param data Object to be checked.
     * @returns If the data has any long Unicode char on it.
     */
    static hasUnicodeData(data: Record<string, unknown>): boolean {
        for (const el in data) {
            if (typeof data[el] === 'object') {
                if (CoreText.hasUnicodeData(data[el] as Record<string, unknown>)) {
                    return true;
                }

                continue;
            }

            if (typeof data[el] === 'string' && CoreText.hasUnicode(data[el] as string)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Highlight all occurrences of a certain text inside another text. It will add some HTML code to highlight it.
     *
     * @param text Full text.
     * @param searchText Text to search and highlight.
     * @returns Highlighted text.
     */
    static highlightText(text: string, searchText: string): string {
        if (!text || typeof text !== 'string') {
            return '';
        } else if (!searchText) {
            return text;
        }

        const regex = new RegExp('(' + searchText + ')', 'gi');

        return text.replace(regex, '<mark class="matchtext">$1</mark>');
    }

    /**
     * Check whether the given text matches a glob pattern.
     *
     * @param text Text to match against.
     * @param pattern Glob pattern.
     * @returns Whether the pattern matches.
     */
    static matchesGlob(text: string, pattern: string): boolean {
        pattern = pattern
            .replace(/\*\*/g, '%RECURSIVE_MATCH%')
            .replace(/\*/g, '%LOCAL_MATCH%')
            .replace(/\?/g, '%CHARACTER_MATCH%');

        pattern = CoreText.escapeForRegex(pattern);

        pattern = pattern
            .replace(/%RECURSIVE_MATCH%/g, '.*')
            .replace(/%LOCAL_MATCH%/g, '[^/]*')
            .replace(/%CHARACTER_MATCH%/g, '[^/]');

        return new RegExp(`^${pattern}$`).test(text);
    }

    /**
     * Same as Javascript's JSON.parse, but it will handle errors.
     *
     * @param json JSON text.
     * @param defaultValue Default value to return if the parse fails. Defaults to the original value.
     * @param logErrorFn An error to call with the exception to log the error. If not supplied, no error.
     * @returns JSON parsed as object or what it gets.
     */
    static parseJSON<T>(json: string, defaultValue?: T, logErrorFn?: (error?: Error) => void): T {
        try {
            return JSON.parse(json);
        } catch (error) {
            // Error, log the error if needed.
            if (logErrorFn) {
                logErrorFn(error);
            }
        }

        // Error parsing, return the default value or the original value.
        if (defaultValue !== undefined) {
            return defaultValue;
        }

        throw new CoreError('JSON cannot be parsed and not default value has been provided');
    }

    /**
     * Process HTML string.
     *
     * @param text HTML string.
     * @param process Method to process the HTML.
     * @returns Processed HTML string.
     */
    static processHTML(text: string, process: (element: HTMLElement) => unknown): string {
        const element = convertTextToHTMLElement(text);

        process(element);

        return element.innerHTML;
    }

    /**
     * Replace all characters that cause problems with files in Android and iOS.
     *
     * @param text Text to treat.
     * @returns Treated text.
     */
    static removeSpecialCharactersForFiles(text: string): string {
        if (!text || typeof text !== 'string') {
            return '';
        }

        return text.replace(/[#:/?\\]+/g, '_');
    }

    /**
     * Remove ending slash from a path or URL.
     *
     * @param text Text to treat.
     * @returns Treated text.
     */
    static removeEndingSlash(text?: string): string {
        if (!text) {
            return '';
        }

        if (text.slice(-1) == '/') {
            return text.substring(0, text.length - 1);
        }

        return text;
    }

    /**
     * Remove starting slash from a string if needed.
     *
     * @param text Text to treat.
     * @returns Treated text.
     */
    static removeStartingSlash(text = ''): string {
        if (text[0] !== '/') {
            return text;
        }

        return text.substring(1);
    }

    /**
     * Replace {{ARGUMENT}} arguments in the text.
     *
     * @param text Text to treat.
     * @param replacements Argument values.
     * @param encoding Encoding to use in values.
     * @returns Treated text.
     */
    static replaceArguments(text: string, replacements: Record<string, string> = {}, encoding?: 'uri'): string {
        let match: RegExpMatchArray | null = null;

        while ((match = text.match(/\{\{([^}]+)\}\}/))) {
            const argument = match[1].trim();
            const value = replacements[argument] ?? '';
            const encodedValue = encoding ? encodeURIComponent(value) : value;

            text = text.replace(`{{${argument}}}`, encodedValue);
        }

        return text;
    }

    /**
     * Replace all the new lines on a certain text.
     *
     * @param text The text to be treated.
     * @param newValue Text to use instead of new lines.
     * @returns Treated text.
     */
    static replaceNewLines(text: string, newValue: string): string {
        if (!text || typeof text !== 'string') {
            return '';
        }

        return text.replace(/(?:\r\n|\r|\n)/g, newValue);
    }

    /**
     * Rounds a number to use a certain amout of decimals or less.
     * Difference between this function and float's toFixed:
     * 7.toFixed(2) -> 7.00
     * roundToDecimals(7, 2) -> 7
     *
     * @param num Number to round.
     * @param decimals Number of decimals. By default, 2.
     * @returns Rounded number.
     */
    static roundToDecimals(num: number, decimals: number = 2): number {
        const multiplier = Math.pow(10, decimals);

        return Math.round(num * multiplier) / multiplier;
    }

    /**
     * Add quotes to HTML characters.
     *
     * Returns text with HTML characters (like "<", ">", etc.) properly quoted.
     * Based on Moodle's s() function.
     *
     * @param text Text to treat.
     * @returns Treated text.
     */
    static s(text: string): string {
        if (!text) {
            return '';
        }

        return CoreText.escapeHTML(text).replace(/&amp;#(\d+|x[0-9a-f]+);/i, '&#$1;');
    }

    /**
     * Shortens a text to length and adds an ellipsis.
     *
     * @param text The text to be shortened.
     * @param length The desired length.
     * @returns Shortened text.
     */
    static shortenText(text: string, length: number): string {
        if (text.length > length) {
            text = text.substring(0, length);

            // Now, truncate at the last word boundary (if exists).
            const lastWordPos = text.lastIndexOf(' ');
            if (lastWordPos > 0) {
                text = text.substring(0, lastWordPos);
            }
            text += '&hellip;';
        }

        return text;
    }

    /**
     * Strip Unicode long char of a given text.
     * Using as threshold Hex value D800
     *
     * @param text Text to check.
     * @returns Without the Unicode chars.
     */
    static stripUnicode(text: string): string {
        let stripped = '';
        for (let x = 0; x < text.length; x++) {
            if (text.charCodeAt(x) <= 55295) {
                stripped += text.charAt(x);
            }
        }

        return stripped;
    }

    /**
     * Replace text within a portion of a string. Equivalent to PHP's substr_replace.
     *
     * @param str The string to treat.
     * @param replace The value to put inside the string.
     * @param start The index where to start putting the new string. If negative, it will count from the end of the string.
     * @param length Length of the portion of string which is to be replaced. If negative, it represents the number of characters
     *               from the end of string at which to stop replacing. If not provided, replace until the end of the string.
     * @returns Treated string.
     */
    static substrReplace(str: string, replace: string, start: number, length?: number): string {
        return Locutus.substrReplace(str, replace, start, length);
    }

    /**
     * Remove all ocurrences of a certain character from the start and end of a string.
     *
     * @param text Text to treat.
     * @param character Character to remove.
     * @returns Treated text.
     */
    static trimCharacter(text: string, character: string): string {
        const escaped = CoreText.escapeForRegex(character);
        const regExp = new RegExp(`^${escaped}+|${escaped}+$`, 'g');

        return text.replace(regExp, '');
    }

    /**
     * If a number has only 1 digit, add a leading zero to it.
     *
     * @param num Number to convert.
     * @returns Number with leading zeros.
     */
    static twoDigits(num: string | number): string {
        if (Number(num) < 10) {
            return '0' + num;
        } else {
            return '' + num; // Convert to string for coherence.
        }
    }

    /**
     * Make a string's first character uppercase.
     *
     * @param text Text to treat.
     * @returns Treated text.
     */
    static capitalize(text: string): string {
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    /**
     * Unserialize Array from PHP.
     *
     * @param data String to unserialize.
     * @returns Unserialized data.
     */
    static unserialize<T = unknown>(data: string): T {
        return Locutus.unserialize<T>(data);
    }

}

/**
 * Define text formatting types.
 */
export enum CoreTextFormat {
    FORMAT_MOODLE = 0, // Does all sorts of transformations and filtering.
    FORMAT_HTML = 1, // Plain HTML (with some tags stripped). Use it by default.
    FORMAT_PLAIN = 2, // Plain text (even tags are printed in full).
    // FORMAT_WIKI is deprecated since 2005...
    FORMAT_MARKDOWN = 4, // Markdown-formatted text http://daringfireball.net/projects/markdown/
}

export const defaultTextFormat = CoreTextFormat.FORMAT_HTML;
