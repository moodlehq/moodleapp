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

import { CoreFilterDefaultHandler } from '@features/filter/services/handlers/default-filter';
import { CoreFilterFilter, CoreFilterFormatTextOptions } from '@features/filter/services/filter';
import { CoreSites } from '@services/sites';
import { CoreText } from '@static/text';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreSite } from '@classes/sites/site';
import { makeSingleton } from '@singletons';
import { CoreDom } from '@static/dom';
import { CoreLogger } from '@static/logger';

/**
 * Handler to support the MathJax filter.
 */
@Injectable({ providedIn: 'root' })
export class AddonFilterMathJaxLoaderHandlerService extends CoreFilterDefaultHandler {

    name = 'AddonFilterMathJaxLoaderHandler';
    filterName = 'mathjaxloader';

    protected window: MathJaxWindow = window;
    protected logger = CoreLogger.getInstance('AddonFilterMathJaxLoaderHandler');

    /**
     * Initialize MathJax.
     */
    async initialize(): Promise<void> {
        if (document.head.querySelector('#core-filter-mathjax-script')) {
            // Script already added, don't add it again.
            await this.window.MathJax?.startup.promise;

            return;
        }

        // The MathJax configuration needs to be created before loading the MathJax script. Changing the options
        // after MathJax is initialized doesn't work (e.g. chaning window.MathJax.options or window.MathJax.config.options).
        // @todo: Obtain mathjaxconfig from the site.
        this.window.MathJax = {
            options: {
                enableMenu: false, // Disable right-click menu on equations.
            },
            startup: {
                typeset: false, // Don't run typeset automatically on the whole page when MathJax is loaded.
            },
            loader: {
                load: ['ui/safe'], // Prevent XSS.
            },
        };

        // Add the script to the header.
        await this.loadMathJax();

        await this.window.MathJax?.startup.promise;

        // @todo: Once MathJax supports locale, set current language and listen for CoreEvents.LANGUAGE_CHANGED events.
    }

    /**
     * Load the MathJax script.
     */
    protected loadMathJax(): Promise<void> {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.onload = () => resolve();
            script.onerror = (error) => reject(error);
            script.id = 'core-filter-mathjax-script';
            script.src = 'assets/lib/mathjax/tex-mml-chtml.js';
            script.type = 'text/javascript';
            document.head.appendChild(script);
        });
    }

    /**
     * @inheritdoc
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

        if (text.includes('class="filter_mathjaxloader_equation"')) {
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
            return `<span class="filter_mathjaxloader_equation">${text}</span>`;
        }

        return text;
    }

    /**
     * @inheritdoc
     */
    async handleHtml(container: HTMLElement): Promise<void> {
        // Make sure the element is in DOM, otherwise some equations don't work.
        // Automatically timeout the promise after a certain time, we don't want to wait forever.
        await CorePromiseUtils.ignoreErrors(CorePromiseUtils.timeoutPromise(CoreDom.waitToBeInDOM(container), 15000));

        await this.typeset(container);
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
            `<span class="nolink">${text.substring(start, end + 1)}</span>`,
            start,
            end - start + 1,
        );
    }

    /**
     * @inheritdoc
     */
    shouldBeApplied(options: CoreFilterFormatTextOptions, site?: CoreSite): boolean {
        // Only apply the filter if logged in and we're filtering current site.
        return !!(site && site.getId() == CoreSites.getCurrentSiteId());
    }

    /**
     * Called by the filter when an equation is found while rendering the content.
     */
    protected async typeset(container: HTMLElement): Promise<void> {
        const equations = Array.from(container.getElementsByClassName('filter_mathjaxloader_equation'));
        if (!equations.length) {
            return;
        }

        await this.initialize();

        await Promise.all(equations.map((node) => this.typesetNode(node)));
    }

    /**
     * Add the node to the typeset queue.
     *
     * @param node The Node to be processed by MathJax.
     */
    protected async typesetNode(node: Element): Promise<void> {
        if (!(node instanceof HTMLElement)) {
            // We may have been passed a #text node.
            // These cannot be formatted.
            return;
        }

        if (!this.window.MathJax?.typesetPromise) {
            return;
        }

        try {
            await this.window.MathJax.typesetPromise([node]);
        } catch (error) {
            // When the content includes a \require with an extension that doesn't exist, the MathJax equations aren't rendered in
            // the app, but they work in LMS. Please see the comments in MOBILE-4769 for more details.
            this.logger.error(error);
        }
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
    protected wrapMathInNoLink(text: string): { text: string; changed: boolean } {
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
};
