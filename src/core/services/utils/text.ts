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
import { SafeUrl } from '@angular/platform-browser';

import { CoreAnyError, CoreError } from '@classes/errors/error';
import { DomSanitizer, makeSingleton } from '@singletons';
import { CoreWSFile } from '@services/ws';
import { CoreFileHelper } from '@services/file-helper';
import { CoreUrl } from '@singletons/url';
import { CoreDom } from '@singletons/dom';
import { CoreText } from '@singletons/text';
import { CoreViewer, CoreViewerTextOptions } from '@features/viewer/services/viewer';
import { CoreErrorHelper, CoreErrorObject } from '@services/error-helper';

/**
 * "Utils" service with helper functions for text.
 *
 * @deprecated since 4.5. Some of the functions have been moved to CoreText but not all of them, check function deprecation message.
 */
@Injectable({ providedIn: 'root' })
export class CoreTextUtilsProvider {

    /**
     * Add ending slash from a path or URL.
     *
     * @param text Text to treat.
     * @returns Treated text.
     *
     * @deprecated since 4.5. Use CoreText.addEndingSlash instead.
     */
    addEndingSlash(text: string): string {
        return CoreText.addEndingSlash(text);
    }

    /**
     * Add some text to an error message.
     *
     * @param error Error message or object.
     * @param text Text to add.
     * @returns Modified error.
     *
     * @deprecated since 4.5. Use CoreErrorHelper.addTextToError instead.
     */
    addTextToError(
        error: string | CoreError | CoreErrorObject | undefined | null,
        text: string,
    ): string | CoreErrorObject {
        return CoreErrorHelper.addTextToError(error, text);
    }

    /**
     * Add some title to an error message.
     *
     * @param error Error message or object.
     * @param title Title to add.
     * @returns Modified error.
     *
     * @deprecated since 4.5. Use CoreErrorHelper.addTitleToError instead.
     */
    addTitleToError(error: string | CoreError | CoreErrorObject | undefined | null, title: string): CoreErrorObject {
        return CoreErrorHelper.addTitleToError(error, title);
    }

    /**
     * Given an address as a string, return a URL to open the address in maps.
     *
     * @param address The address.
     * @returns URL to view the address.
     *
     * @deprecated since 4.5. Use CoreUrl.buildMapsURL instead, and then use DomSanitizer.bypassSecurityTrustUrl to sanitize
     * the URL if needed.
     */
    buildAddressURL(address: string): SafeUrl {
        return DomSanitizer.bypassSecurityTrustUrl(CoreUrl.buildMapsURL({ query: address }));
    }

    /**
     * Given a list of sentences, build a message with all of them wrapped in <p>.
     *
     * @param messages Messages to show.
     * @returns Message with all the messages.
     *
     * @deprecated since 4.5. Use CoreText.buildMessage instead.
     */
    buildMessage(messages: string[]): string {
        return CoreText.buildMessage(messages);
    }

    /**
     * Build a message with several paragraphs.
     *
     * @param paragraphs List of paragraphs.
     * @returns Built message.
     *
     * @deprecated since 4.5. Use CoreErrorHelper.buildSeveralParagraphsMessage instead.
     */
    buildSeveralParagraphsMessage(paragraphs: (string | CoreErrorObject)[]): string {
        return CoreErrorHelper.buildSeveralParagraphsMessage(paragraphs);
    }

    /**
     * Convert size in bytes into human readable format
     *
     * @param bytes Number of bytes to convert.
     * @param precision Number of digits after the decimal separator.
     * @returns Size in human readable format.
     *
     * @deprecated since 4.5. Use CoreText.bytesToSize instead.
     */
    bytesToSize(bytes: number, precision: number = 2): string {
       return CoreText.bytesToSize(bytes, precision);
    }

    /**
     * Process HTML string.
     *
     * @param text HTML string.
     * @param process Method to process the HTML.
     * @returns Processed HTML string.
     *
     * @deprecated since 4.5. Use CoreText.processHTML instead.
     */
    processHTML(text: string, process: (element: HTMLElement) => unknown): string {
        return CoreText.processHTML(text, process);
    }

    /**
     * Clean HTML tags.
     *
     * @param text The text to be cleaned.
     * @param options Processing options.
     * @param options.singleLine True if new lines should be removed (all the text in a single line).
     * @param options.trim True if text should be trimmed.
     * @returns Clean text.
     *
     * @deprecated since 4.5. Use CoreText.cleanTags instead.
     */
    cleanTags(text: string | undefined, options: { singleLine?: boolean; trim?: boolean } = {}): string {
        return CoreText.cleanTags(text, options);
    }

    /**
     * Count words in a text.
     * This function is based on Moodle's count_words.
     *
     * @param text Text to count.
     * @returns Number of words.
     *
     * @deprecated since 4.5. Use CoreText.countWords instead.
     */
    countWords(text?: string | null): number {
        return CoreText.countWords(text);
    }

    /**
     * Decode an escaped HTML text. This implementation is based on PHP's htmlspecialchars_decode.
     *
     * @param text Text to decode.
     * @returns Decoded text.
     *
     * @deprecated since 4.5. Use CoreText.decodeHTML instead.
     */
    decodeHTML(text: string | number): string {
        return CoreText.decodeHTML(text);
    }

    /**
     * Decode HTML entities in a text. Equivalent to PHP html_entity_decode.
     *
     * @param text Text to decode.
     * @returns Decoded text.
     *
     * @deprecated since 4.5. Use CoreText.decodeHTMLEntities instead.
     */
    decodeHTMLEntities(text: string): string {
        return CoreText.decodeHTMLEntities(text);
    }

    /**
     * Same as Javascript's decodeURI, but if an exception is thrown it will return the original URI.
     *
     * @param uri URI to decode.
     * @returns Decoded URI, or original URI if an exception is thrown.
     *
     * @deprecated since 4.5. Use CoreUrl.decodeURI instead.
     */
    decodeURI(uri: string): string {
        return CoreUrl.decodeURI(uri);
    }

    /**
     * Same as Javascript's decodeURIComponent, but if an exception is thrown it will return the original URI.
     *
     * @param uri URI to decode.
     * @returns Decoded URI, or original URI if an exception is thrown.
     *
     * @deprecated since 4.5. Use CoreUrl.decodeURIComponent instead.
     */
    decodeURIComponent(uri: string): string {
        return CoreUrl.decodeURIComponent(uri);
    }

    /**
     * Escapes some characters in a string to be used as a regular expression.
     *
     * @param text Text to escape.
     * @returns Escaped text.
     *
     * @deprecated since 4.5. Use CoreText.escapeForRegex instead.
     */
    escapeForRegex(text: string): string {
        return CoreText.escapeForRegex(text);
    }

    /**
     * Escape an HTML text. This implementation is based on PHP's htmlspecialchars.
     *
     * @param text Text to escape.
     * @param doubleEncode If false, it will not convert existing html entities. Defaults to true.
     * @returns Escaped text.
     *
     * @deprecated since 4.5. Use CoreText.escapeHTML instead.
     */
    escapeHTML(text?: string | number | null, doubleEncode = true): string {
        return CoreText.escapeHTML(text, doubleEncode);
    }

    /**
     * Formats a text, in HTML replacing new lines by correct html new lines.
     *
     * @param text Text to format.
     * @returns Formatted text.
     *
     * @deprecated since 4.5. Use CoreText.formatHtmlLines instead.
     */
    formatHtmlLines(text: string): string {
        return CoreText.formatHtmlLines(text);
    }

    /**
     * Get the error message from an error object.
     *
     * @param error Error.
     * @returns Error message, undefined if not found.
     *
     * @deprecated since 4.5. Use CoreErrorHelper.getErrorMessageFromError instead.
     */
    getErrorMessageFromError(error?: CoreAnyError): string | undefined {
        return CoreErrorHelper.getErrorMessageFromError(error);
    }

    /**
     * Given some HTML code, return the HTML code inside <body> tags. If there are no body tags, return the whole HTML.
     *
     * @param html HTML text.
     * @returns Body HTML.
     *
     * @deprecated since 4.5. Use CoreDom.getHTMLBodyContent instead.
     */
    getHTMLBodyContent(html: string): string {
        return CoreDom.getHTMLBodyContent(html);
    }

    /**
     * Get the pluginfile URL to replace @@PLUGINFILE@@ wildcards.
     *
     * @param files Files to extract the URL from. They need to have the URL in a 'url' or 'fileurl' attribute.
     * @returns Pluginfile URL, undefined if no files found.
     *
     * @deprecated since 4.5. Use CoreFileHelper.getTextPluginfileUrl instead.
     */
    getTextPluginfileUrl(files: CoreWSFile[]): string | undefined {
       return CoreFileHelper.getTextPluginfileUrl(files);
    }

    /**
     * Check if a text contains HTML tags.
     *
     * @param text Text to check.
     * @returns Whether it has HTML tags.
     *
     * @deprecated since 4.5. Use CoreText.hasHTMLTags instead.
     */
    hasHTMLTags(text: string): boolean {
        return CoreText.hasHTMLTags(text);
    }

    /**
     * Highlight all occurrences of a certain text inside another text. It will add some HTML code to highlight it.
     *
     * @param text Full text.
     * @param searchText Text to search and highlight.
     * @returns Highlighted text.
     *
     * @deprecated since 4.5. Use CoreText.highlightText instead.
     */
    highlightText(text: string, searchText: string): string {
        return CoreText.highlightText(text, searchText);
    }

    /**
     * Check if HTML content is blank.
     *
     * @param content HTML content.
     * @returns True if the string does not contain actual content: text, images, etc.
     *
     * @deprecated since 4.5. Use CoreDom.htmlIsBlank instead.
     */
    htmlIsBlank(content: string): boolean {
        return CoreDom.htmlIsBlank(content);
    }

    /**
     * Check if a text contains Unicode long chars.
     * Using as threshold Hex value D800
     *
     * @param text Text to check.
     * @returns True if has Unicode chars, false otherwise.
     *
     * @deprecated since 4.5. Use CoreText.hasUnicode instead.
     */
    hasUnicode(text: string): boolean {
        return CoreText.hasUnicode(text);
    }

    /**
     * Check if an object has any long Unicode char.
     *
     * @param data Object to be checked.
     * @returns If the data has any long Unicode char on it.
     *
     * @deprecated since 4.5. Use CoreText.hasUnicodeData instead.
     */
    hasUnicodeData(data: Record<string, unknown>): boolean {
        return CoreText.hasUnicodeData(data);
    }

    /**
     * Check whether the given text matches a glob pattern.
     *
     * @param text Text to match against.
     * @param pattern Glob pattern.
     * @returns Whether the pattern matches.
     *
     * @deprecated since 4.5. Use CoreText.matchesGlob instead.
     */
    matchesGlob(text: string, pattern: string): boolean {
        return CoreText.matchesGlob(text, pattern);
    }

    /**
     * Same as Javascript's JSON.parse, but it will handle errors.
     *
     * @param json JSON text.
     * @param defaultValue Default value to return if the parse fails. Defaults to the original value.
     * @param logErrorFn An error to call with the exception to log the error. If not supplied, no error.
     * @returns JSON parsed as object or what it gets.
     *
     * @deprecated since 4.5. Use CoreText.parseJSON instead.
     */
    parseJSON<T>(json: string, defaultValue?: T, logErrorFn?: (error?: Error) => void): T {
        return CoreText.parseJSON(json, defaultValue, logErrorFn);
    }

    /**
     * Replace all characters that cause problems with files in Android and iOS.
     *
     * @param text Text to treat.
     * @returns Treated text.
     *
     * @deprecated since 4.5. Use CoreText.removeSpecialCharactersForFiles instead.
     */
    removeSpecialCharactersForFiles(text: string): string {
        return CoreText.removeSpecialCharactersForFiles(text);
    }

    /**
     * Replace {{ARGUMENT}} arguments in the text.
     *
     * @param text Text to treat.
     * @param replacements Argument values.
     * @param encoding Encoding to use in values.
     * @returns Treated text.
     *
     * @deprecated since 4.5. Use CoreText.replaceArguments instead.
     */
    replaceArguments(text: string, replacements: Record<string, string> = {}, encoding?: 'uri'): string {
        return CoreText.replaceArguments(text, replacements, encoding);
    }

    /**
     * Replace all the new lines on a certain text.
     *
     * @param text The text to be treated.
     * @param newValue Text to use instead of new lines.
     * @returns Treated text.
     *
     * @deprecated since 4.5. Use CoreText.replaceNewLines instead.
     */
    replaceNewLines(text: string, newValue: string): string {
        return CoreText.replaceNewLines(text, newValue);
    }

    /**
     * Replace draftfile URLs with the equivalent pluginfile URL.
     *
     * @param siteUrl URL of the site.
     * @param text Text to treat, including draftfile URLs.
     * @param files List of files of the area, using pluginfile URLs.
     * @returns Treated text and map with the replacements.
     *
     * @deprecated since 4.5. Use CoreFileHelper.replaceDraftfileUrls instead.
     */
    replaceDraftfileUrls(
        siteUrl: string,
        text: string,
        files: CoreWSFile[],
    ): { text: string; replaceMap?: {[url: string]: string} } {
        return CoreFileHelper.replaceDraftfileUrls(siteUrl, text, files);
    }

    /**
     * Replace @@PLUGINFILE@@ wildcards with the real URL in a text.
     *
     * @param text to treat.
     * @param files Files to extract the pluginfile URL from. They need to have the URL in a url or fileurl attribute.
     * @returns Treated text.
     *
     * @deprecated since 4.5. Use CoreFileHelper.replacePluginfileUrls instead.
     */
    replacePluginfileUrls(text: string, files: CoreWSFile[]): string {
        return CoreFileHelper.replacePluginfileUrls(text, files);
    }

    /**
     * Restore original draftfile URLs.
     *
     * @param siteUrl Site URL.
     * @param treatedText Treated text with replacements.
     * @param originalText Original text.
     * @param files List of files to search and replace.
     * @returns Treated text.
     *
     * @deprecated since 4.5. Use CoreFileHelper.restoreDraftfileUrls instead.
     */
    restoreDraftfileUrls(siteUrl: string, treatedText: string, originalText: string, files: CoreWSFile[]): string {
       return CoreFileHelper.restoreDraftfileUrls(siteUrl, treatedText, originalText, files);
    }

    /**
     * Replace pluginfile URLs with @@PLUGINFILE@@ wildcards.
     *
     * @param text Text to treat.
     * @param files Files to extract the pluginfile URL from. They need to have the URL in a url or fileurl attribute.
     * @returns Treated text.
     *
     * @deprecated since 4.5. Use CoreFileHelper.restorePluginfileUrls instead.
     */
    restorePluginfileUrls(text: string, files: CoreWSFile[]): string {
        return CoreFileHelper.restorePluginfileUrls(text, files);
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
     *
     * @deprecated since 4.5. Use CoreText.roundToDecimals instead.
     */
    roundToDecimals(num: number, decimals: number = 2): number {
        return CoreText.roundToDecimals(num, decimals);
    }

    /**
     * Add quotes to HTML characters.
     *
     * Returns text with HTML characters (like "<", ">", etc.) properly quoted.
     * Based on Moodle's s() function.
     *
     * @param text Text to treat.
     * @returns Treated text.
     *
     * @deprecated since 4.5. Use CoreText.s instead.
     */
    s(text: string): string {
        return CoreText.s(text);
    }

    /**
     * Shortens a text to length and adds an ellipsis.
     *
     * @param text The text to be shortened.
     * @param length The desired length.
     * @returns Shortened text.
     *
     * @deprecated since 4.5. Use CoreText.shortenText instead.
     */
    shortenText(text: string, length: number): string {
        return CoreText.shortenText(text, length);
    }

    /**
     * Strip Unicode long char of a given text.
     * Using as threshold Hex value D800
     *
     * @param text Text to check.
     * @returns Without the Unicode chars.
     *
     * @deprecated since 4.5. Use CoreText.stripUnicode instead.
     */
    stripUnicode(text: string): string {
        return CoreText.stripUnicode(text);
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
     *
     * @deprecated since 4.5. Use CoreText.substrReplace instead.
     */
    substrReplace(str: string, replace: string, start: number, length?: number): string {
        return CoreText.substrReplace(str, replace, start, length);
    }

    /**
     * Treat the list of disabled features, replacing old nomenclature with the new one.
     *
     * @param features List of disabled features.
     * @returns Treated list.
     *
     * @deprecated since 4.5. Shoudn't be used since disabled features are not treated by this function anymore.
     */
    treatDisabledFeatures(features: string): string {
        return features;
    }

    /**
     * Remove all ocurrences of a certain character from the start and end of a string.
     *
     * @param text Text to treat.
     * @param character Character to remove.
     * @returns Treated text.
     *
     * @deprecated since 4.5. Use CoreText.trimCharacter instead.
     */
    trimCharacter(text: string, character: string): string {
        return CoreText.trimCharacter(text, character);
    }

    /**
     * If a number has only 1 digit, add a leading zero to it.
     *
     * @param num Number to convert.
     * @returns Number with leading zeros.
     *
     * @deprecated since 4.5. Use CoreText.twoDigits instead.
     */
    twoDigits(num: string | number): string {
        return CoreText.twoDigits(num);
    }

    /**
     * Make a string's first character uppercase.
     *
     * @param text Text to treat.
     * @returns Treated text.
     * @deprecated since 4.5. Use CoreText.capitalize instead.
     */
    ucFirst(text: string): string {
        return CoreText.capitalize(text);
    }

    /**
     * Unserialize Array from PHP.
     *
     * @param data String to unserialize.
     * @returns Unserialized data.
     *
     * @deprecated since 4.5. Use CoreText.unserialize instead.
     */
    unserialize<T = unknown>(data: string): T {
        return CoreText.unserialize<T>(data);
    }

    /**
     * Shows a text on a new page.
     *
     * @param title Title of the new state.
     * @param content Content of the text to be expanded.
     * @param options Options.
     *
     * @deprecated since 4.5. Use CoreViewer.viewText instead.
     */
    async viewText(title: string, content: string, options?: CoreViewerTextOptions): Promise<void> {
        await CoreViewer.viewText(title, content, options);
    }

}
/**
 * @deprecated since 4.5. Use CoreText instead.
 */
// eslint-disable-next-line deprecation/deprecation
export const CoreTextUtils = makeSingleton(CoreTextUtilsProvider);
