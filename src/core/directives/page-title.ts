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

import { Directive, ElementRef, OnDestroy, afterRenderEffect, inject, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CorePageTitle } from '@services/page-title';
import { CorePlatform } from '@services/platform';

/**
 * Directive to use an explicit title or a heading's visible text as the current page title.
 */
@Directive({
    selector: 'h1[core-page-title]',
    host: {
        '[attr.aria-label]': 'ariaLabel',
    },
})
export class CorePageTitleDirective implements OnDestroy {

    readonly pageTitle = input('', { alias: 'core-page-title' });

    protected element: HTMLHeadingElement = inject(ElementRef).nativeElement;
    protected route = inject(ActivatedRoute);
    protected isIOS = CorePlatform.isIOS() || document.documentElement.classList.contains('ios');
    protected mutationObserver?: MutationObserver;
    protected title?: string;

    /**
     * Accessible page title on iOS.
     *
     * @returns Page title on iOS, or null when no label is needed.
     */
    protected get ariaLabel(): string | null {
        return this.isIOS ? CorePageTitle.getFullTitle(this.route) : null;
    }

    /**
     * Constructor.
     */
    constructor() {
        afterRenderEffect(() => this.updateTitle());
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.mutationObserver?.disconnect();
        CorePageTitle.clearTitle(this.route);
    }

    /**
     * Publish the explicit title or current heading text as the page title.
     */
    protected updateTitle(): void {
        const pageTitle = this.pageTitle();

        if (pageTitle) {
            this.mutationObserver?.disconnect();
            this.mutationObserver = undefined;
        } else if (!this.mutationObserver) {
            this.mutationObserver = new MutationObserver(() => this.updateTitle());
            this.mutationObserver.observe(this.element, {
                characterData: true,
                childList: true,
                subtree: true,
            });
        }

        const title = (pageTitle || this.element.textContent)?.trim() ?? '';

        if (title === this.title) {
            return;
        }

        this.title = title;

        CorePageTitle.setTitle(this.route, title);
    }

}
