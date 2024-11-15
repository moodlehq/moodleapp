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

import { Injectable, ViewContainerRef } from '@angular/core';

import { CoreFilterDefaultHandler } from '@features/filter/services/handlers/default-filter';
import { CoreFilterFilter, CoreFilterFormatTextOptions } from '@features/filter/services/filter';
import { CoreLang } from '@services/lang';
import { CoreSites } from '@services/sites';
import { CoreText } from '@singletons/text';
import { CorePromiseUtils } from '@singletons/promise-utils';
import { CoreEvents } from '@singletons/events';
import { CoreSite } from '@classes/sites/site';
import { makeSingleton } from '@singletons';
import { CoreWait } from '@singletons/wait';
import { CoreDom } from '@singletons/dom';

/**
 * Handler to support the MathJax filter.
 */
@Injectable({ providedIn: 'root' })
export class AddonFilterMathJaxLoaderHandlerService extends CoreFilterDefaultHandler {

    name = 'AddonFilterMathJaxLoaderHandler';
    filterName = 'mathjaxloader';

    // Default values for MathJax config for sites where we cannot retrieve it.
    protected readonly DEFAULT_URL = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.2/MathJax.js';
    protected readonly DEFAULT_CONFIG = `
        MathJax.Hub.Config({
            extensions: [
                "Safe.js",
                "tex2jax.js",
                "mml2jax.js",
                "MathEvents.js",
                "MathZoom.js",
                "MathMenu.js",
                "toMathML.js",
                "TeX/noErrors.js",
                "TeX/noUndefined.js",
                "TeX/AMSmath.js",
                "TeX/AMSsymbols.js",
                "fast-preview.js",
                "AssistiveMML.js",
                "[a11y]/accessibility-menu.js"
            ],
            jax: ["input/TeX","input/MathML","output/SVG"],
            showMathMenu: false,
            errorSettings: { message: ["!"] },
            skipStartupTypeset: true,
            messageStyle: "none"
        });
    `;

    // List of language codes found in the MathJax/localization/ directory.
    protected readonly MATHJAX_LANG_CODES = [
        'ar', 'ast', 'bcc', 'bg', 'br', 'ca', 'cdo', 'ce', 'cs', 'cy', 'da', 'de', 'diq', 'en', 'eo', 'es', 'fa',
        'fi', 'fr', 'gl', 'he', 'ia', 'it', 'ja', 'kn', 'ko', 'lb', 'lki', 'lt', 'mk', 'nl', 'oc', 'pl', 'pt',
        'pt-br', 'qqq', 'ru', 'scn', 'sco', 'sk', 'sl', 'sv', 'th', 'tr', 'uk', 'vi', 'zh-hans', 'zh-hant',
    ];

    // List of explicit mappings and known exceptions (moodle => mathjax).
    protected readonly EXPLICIT_MAPPING = {
        'zh-tw': 'zh-hant',
        'zh-cn': 'zh-hans',
    };

    protected window: MathJaxWindow = window;

    /**
     * Initialize MathJax.
     *
     * @returns Promise resolved when done.
     */
    async initialize(): Promise<void> {
        this.loadJS();

        // Update MathJax locale if app language changes.
        CoreEvents.on(CoreEvents.LANGUAGE_CHANGED, (lang: string) => {
            if (this.window.MathJax === undefined) {
                return;
            }

            this.window.MathJax.Hub.Queue(() => {
                this.window.MathJax.Localization.setLocale(this.mapLanguageCode(lang));
            });
        });

        // Get the current language.
        const lang = await CoreLang.getCurrentLanguage();

        // Now call the configure function.
        this.window.M!.filter_mathjaxloader!.configure({
            mathjaxconfig: this.DEFAULT_CONFIG,
            lang: this.mapLanguageCode(lang),
        });
    }

    /**
     * Filter some text.
     *
     * @param text The text to filter.
     * @param filter The filter.
     * @param options Options passed to the filters.
     * @param siteId Site ID. If not defined, current site.
     * @returns Filtered text (or promise resolved with the filtered text).
     */
    async filter(
        text: string,
        filter: CoreFilterFilter,
        options: CoreFilterFormatTextOptions,
        siteId?: string,
    ): Promise<string> {

        const site = await CoreSites.getSite(siteId);

        // Don't apply this filter if Moodle is 3.7 or higher and the WS already filtered the content.
        if (!options.wsNotFiltered && site.isVersionGreaterEqualThan('3.7')) {
            return text;
        }

        if (text.indexOf('class="filter_mathjaxloader_equation"') != -1) {
            // The content seems to have treated mathjax already, don't do it.
            return text;
        }

        // We cannot get the filter settings, so we cannot know if it can be used as a replacement for the TeX filter.
        // Assume it cannot (default value).
        let hasDisplayOrInline = false;
        if (text.match(/\\[[(]/) || text.match(/\$\$/)) {
            // Only parse the text if there are mathjax symbols in it.
            // The recognized math environments are \[ \] and $$ $$ for display mathematics and \( \) for inline mathematics.
            // Wrap display and inline math environments in nolink spans.
            const result = this.wrapMathInNoLink(text);
            text = result.text;
            hasDisplayOrInline = result.changed;
        }

        if (hasDisplayOrInline) {
            return '<span class="filter_mathjaxloader_equation">' + text + '</span>';
        }

        return text;
    }

    /**
     * Handle HTML. This function is called after "filter", and it will receive an HTMLElement containing the text that was
     * filtered.
     *
     * @param container The HTML container to handle.
     * @param filter The filter.
     * @param options Options passed to the filters.
     * @param viewContainerRef The ViewContainerRef where the container is.
     * @param component Component.
     * @param componentId Component ID.
     * @param siteId Site ID. If not defined, current site.
     * @returns If async, promise resolved when done.
     */
    async handleHtml(
        container: HTMLElement,
        filter: CoreFilterFilter, // eslint-disable-line @typescript-eslint/no-unused-vars
        options: CoreFilterFormatTextOptions, // eslint-disable-line @typescript-eslint/no-unused-vars
        viewContainerRef: ViewContainerRef, // eslint-disable-line @typescript-eslint/no-unused-vars
        component?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
        componentId?: string | number, // eslint-disable-line @typescript-eslint/no-unused-vars
        siteId?: string, // eslint-disable-line @typescript-eslint/no-unused-vars
    ): Promise<void> {
        await this.waitForReady();

        // Make sure the element is in DOM, otherwise some equations don't work.
        // Automatically timeout the promise after a certain time, we don't want to wait forever.
        await CorePromiseUtils.ignoreErrors(CorePromiseUtils.timeoutPromise(CoreDom.waitToBeInDOM(container), 15000));

        await this.window.M!.filter_mathjaxloader!.typeset(container);
    }

    /**
     * Wrap a portion of the $text inside a no link span. The whole text is then returned.
     *
     * @param text The text to modify.
     * @param start The start index of the substring in text that should be wrapped in the span.
     * @param end The end index of the substring in text that should be wrapped in the span.
     * @returns The whole text with the span inserted around the defined substring.
     */
    protected insertSpan(text: string, start: number, end: number): string {
        return CoreText.substrReplace(
            text,
            '<span class="nolink">' + text.substring(start, end + 1) + '</span>',
            start,
            end - start + 1,
        );
    }

    /**
     * Load the JS to make MathJax work in the app. The JS loaded is extracted from Moodle filter's loader JS file.
     */
    protected loadJS(): void {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const that = this;

        this.window.M = this.window.M || {};
        this.window.M.filter_mathjaxloader = this.window.M.filter_mathjaxloader || {
            _lang: '', // eslint-disable-line @typescript-eslint/naming-convention
            _configured: false, // eslint-disable-line @typescript-eslint/naming-convention
            // Add the configuration to the head and set the lang.
            configure: function (params: Record<string, unknown>): void {
                // Add a js configuration object to the head.
                const script = document.createElement('script');
                script.type = 'text/x-mathjax-config';
                script.text = <string> params.mathjaxconfig;
                document.head.appendChild(script);

                // Save the lang config until MathJax is actually loaded.
                this._lang = <string> params.lang;
            },
            // Set the correct language for the MathJax menus.
            _setLocale: function (): void {
                if (!this._configured) {
                    const lang = this._lang;

                    if (that.window.MathJax !== undefined) {
                        that.window.MathJax.Hub.Queue(() => {
                            that.window.MathJax.Localization.setLocale(lang);
                        });
                        that.window.MathJax.Hub.Configured();
                        this._configured = true;
                    }
                }
            },
            // Called by the filter when an equation is found while rendering the page.
            typeset: async function (container: HTMLElement): Promise<void> {
                if (!this._configured) {
                    this._setLocale();
                }

                if (that.window.MathJax === undefined) {
                    return;
                }

                const processDelay = that.window.MathJax.Hub.processSectionDelay;
                // Set the process section delay to 0 when updating the formula.
                that.window.MathJax.Hub.processSectionDelay = 0;

                const equations = Array.from(container.querySelectorAll('.filter_mathjaxloader_equation'));
                const promises = equations.map((node) => new Promise<void>((resolve) => {
                    that.window.MathJax.Hub.Queue(
                        ['Typeset', that.window.MathJax.Hub, node],
                        [that.fixUseUrls, node],
                        [resolve],
                    );
                }));

                // Set the delay back to normal after processing.
                that.window.MathJax.Hub.processSectionDelay = processDelay;

                await Promise.all(promises);
            },
        };
    }

    /**
     * Fix URLs in <use> elements.
     * This is needed because MathJax stores the location.href when it's loaded, and then sets that URL to all the <use>
     * elements href. Since the app URL changes when navigating, the SVGs can use a URL that isn't the current page.
     * When that happens, the request returns a 404 error and the SVG isn't displayed.
     *
     * @param node Element that can contain equations.
     */
    protected fixUseUrls(node: Element): void {
        Array.from(node.querySelectorAll('use')).forEach((useElem) => {
            useElem.setAttribute('href', useElem.href.baseVal.substring(useElem.href.baseVal.indexOf('#')));
        });
    }

    /**
     * Perform a mapping of the app language code to the equivalent for MathJax.
     *
     * @param langCode The app language code.
     * @returns The MathJax language code.
     */
    protected mapLanguageCode(langCode: string): string {

        // If defined, explicit mapping takes the highest precedence.
        if (this.EXPLICIT_MAPPING[langCode]) {
            return this.EXPLICIT_MAPPING[langCode];
        }

        // If there is exact match, it will be probably right.
        if (this.MATHJAX_LANG_CODES.indexOf(langCode) != -1) {
            return langCode;
        }

        // Finally try to find the best matching mathjax pack.
        const parts = langCode.split('-');
        if (this.MATHJAX_LANG_CODES.indexOf(parts[0]) != -1) {
            return parts[0];
        }

        // No more guessing, use default language.
        return CoreLang.getDefaultLanguage();
    }

    /**
     * Check if the filter should be applied in a certain site based on some filter options.
     *
     * @param options Options.
     * @param site Site.
     * @returns Whether filter should be applied.
     */
    shouldBeApplied(options: CoreFilterFormatTextOptions, site?: CoreSite): boolean {
        // Only apply the filter if logged in and we're filtering current site.
        return !!(site && site.getId() == CoreSites.getCurrentSiteId());
    }

    /**
     * Wait for the MathJax library and our JS object to be loaded.
     *
     * @param retries Number of times this has been retried.
     * @returns Promise resolved when ready or if it took too long to load.
     */
    protected async waitForReady(retries: number = 0): Promise<void> {
        if (this.window.MathJax || retries >= 20) {
            // Loaded or too many retries, stop.
            return;
        }

        await CoreWait.wait(250);
        await CorePromiseUtils.ignoreErrors(this.waitForReady(retries + 1));
    }

    /**
     * Find math environments in the $text and wrap them in no link spans
     * (<span class="nolink"></span>). If math environments are nested, only
     * the outer environment is wrapped in the span.
     *
     * The recognized math environments are \[ \] and $$ $$ for display
     * mathematics and \( \) for inline mathematics.
     *
     * @param text The text to filter.
     * @returns Object containing the potentially modified text and a boolean that is true if any changes were made to the text.
     */
    protected wrapMathInNoLink(text: string): {text: string; changed: boolean} {
        let len = text.length;
        let i = 1;
        let displayStart = -1;
        let displayBracket = false;
        let displayDollar = false;
        let inlineStart = -1;
        let changesDone = false;

        // Loop over the $text once.
        while (i < len) {
            if (displayStart === -1) {
                // No display math has started yet.
                if (text[i - 1] === '\\') {

                    if (text[i] === '[') {
                        // Display mode \[ begins.
                        displayStart = i - 1;
                        displayBracket = true;
                    } else if (text[i] === '(') {
                        // Inline math \( begins, not nested inside display math.
                        inlineStart = i - 1;
                    } else if (text[i] === ')' && inlineStart > -1) {
                        // Inline math ends, not nested inside display math. Wrap the span around it.
                        text = this.insertSpan(text, inlineStart, i);

                        inlineStart = -1; // Reset.
                        i += 28; // The text length changed due to the <span>.
                        len += 28;
                        changesDone = true;
                    }

                } else if (text[i - 1] === '$' && text[i] === '$') {
                    // Display mode $$ begins.
                    displayStart = i - 1;
                    displayDollar = true;
                }

            } else {
                // Display math open.
                if ((text[i - 1] === '\\' && text[i] === ']' && displayBracket) ||
                        (text[i - 1] === '$' && text[i] === '$' && displayDollar)) {
                    // Display math ends, wrap the span around it.
                    text = this.insertSpan(text, displayStart, i);

                    displayStart = -1; // Reset.
                    displayBracket = false;
                    displayDollar = false;
                    i += 28; // The text length changed due to the <span>.
                    len += 28;
                    changesDone = true;
                }
            }

            i++;
        }

        return {
            text: text,
            changed: changesDone,
        };
    }

}

export const AddonFilterMathJaxLoaderHandler = makeSingleton(AddonFilterMathJaxLoaderHandlerService);

type MathJaxWindow = Window & {
    MathJax?: any; // eslint-disable-line @typescript-eslint/naming-convention, @typescript-eslint/no-explicit-any
    M?: { // eslint-disable-line @typescript-eslint/naming-convention
        filter_mathjaxloader?: { // eslint-disable-line @typescript-eslint/naming-convention
            _lang: string; // eslint-disable-line @typescript-eslint/naming-convention
            _configured: boolean; // eslint-disable-line @typescript-eslint/naming-convention
            // Add the configuration to the head and set the lang.
            configure: (params: Record<string, unknown>) => void;
            _setLocale: () => void;
            typeset: (container: HTMLElement) => void;
        };
    };
};
