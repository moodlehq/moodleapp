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

import { Directive, ElementRef, OnDestroy } from '@angular/core';
import { ScrollDetail } from '@ionic/core';
import { CoreUtils } from '@services/utils/utils';
import { Platform } from '@singletons';
import { CoreEventObserver, CoreEvents } from '@singletons/events';
import { CoreMath } from '@singletons/math';

/**
 * Directive to make ion-header collapsible.
 * Ion content should have h1 tag inside.
 *
 * Example usage:
 *
 * <ion-header collapsible>
 */
@Directive({
    selector: 'ion-header[collapsible]',
})
export class CoreCollapsibleHeaderDirective implements OnDestroy {

    protected scrollElement?: HTMLElement;
    protected loadingObserver: CoreEventObserver;
    protected content?: HTMLIonContentElement | null;
    protected header: HTMLIonHeaderElement;
    protected titleTopDifference = 1;
    protected h1StartDifference = 0;
    protected headerH1FontSize = 0;
    protected contentH1FontSize = 0;
    protected headerSubHeadingFontSize = 0;
    protected contentSubHeadingFontSize = 0;
    protected subHeadingStartDifference = 0;

    constructor(el: ElementRef) {
        this.header = el.nativeElement;

        this.loadingObserver = CoreEvents.on(CoreEvents.CORE_LOADING_CHANGED, async (data) => {
            if (!data.loaded) {
                return;
            }

            const loadingId = await this.getLoadingId();
            if (loadingId && data.uniqueId == loadingId) {
                // Remove event when loading is done.
                this.loadingObserver.off();

                // Wait to render.
                await CoreUtils.nextTick();
                this.setupRealTitle();
            }
        });
    }

    /**
     * Gets the loading content id to wait for the loading to finish.
     *
     * @TODO: If no core-loading is present, load directly. Take into account content needs to be initialized.
     *
     * @return Promise resolved with Loading Id, if any.
     */
    protected async getLoadingId(): Promise<string | undefined> {
        if (!this.content) {
            this.content = this.header.parentElement?.querySelector('ion-content:not(.disable-scroll-y)');

            if (!this.content) {
                this.cannotCollapse();

                return;
            }
        }

        return this.content.querySelector('core-loading.core-loading-loaded:not(.core-loading-inline) .core-loading-content')?.id;
    }

    /**
     * Call this function when header is not collapsible.
     */
    protected cannotCollapse(): void {
        this.loadingObserver.off();
        this.header.classList.add('core-header-collapsed');
    }

    /**
     * Gets the real title on ion content to watch scroll.
     *
     * @return Promise resolved when done.
     */
    protected async setupRealTitle(): Promise<void> {

        if (!this.content) {
            this.cannotCollapse();

            return;
        }

        // Wait animations to finish.
        const animations = this.content.getAnimations();
        await Promise.all(animations.map(async (animation) => {
            await animation.finished;
        }));

        const title = this.content.querySelector<HTMLElement>('.collapsible-title, h1');
        const contentH1 = this.content.querySelector<HTMLElement>('h1');
        const headerH1 = this.header.querySelector<HTMLElement>('h1');
        if (!title || !contentH1 || !headerH1) {
            this.cannotCollapse();

            return;
        }

        this.titleTopDifference = contentH1.getBoundingClientRect().top - headerH1.getBoundingClientRect().top;

        // Split view part.
        const contentAux = this.header.parentElement?.querySelector<HTMLElement>('ion-content.disable-scroll-y');
        if (contentAux) {
            if (contentAux.querySelector('core-split-view.menu-and-content')) {
                this.cannotCollapse();
                title.remove();

                return;
            }
            contentAux.style.setProperty('--offset-top', this.header.clientHeight + 'px');
        }

        const headerH1Styles = getComputedStyle(headerH1);
        const contentH1Styles = getComputedStyle(contentH1);

        if (Platform.isRTL) {
            // Checking position over parent because transition may not be finished.
            const contentH1Position = contentH1.getBoundingClientRect().right - this.content.getBoundingClientRect().right;
            const headerH1Position = headerH1.getBoundingClientRect().right - this.header.getBoundingClientRect().right;

            this.h1StartDifference = Math.round(contentH1Position - (headerH1Position - parseFloat(headerH1Styles.paddingRight)));
        } else {
            // Checking position over parent because transition may not be finished.
            const contentH1Position = contentH1.getBoundingClientRect().left - this.content.getBoundingClientRect().left;
            const headerH1Position = headerH1.getBoundingClientRect().left - this.header.getBoundingClientRect().left;

            this.h1StartDifference = Math.round(contentH1Position - (headerH1Position + parseFloat(headerH1Styles.paddingLeft)));
        }

        this.headerH1FontSize = parseFloat(headerH1Styles.fontSize);
        this.contentH1FontSize = parseFloat(contentH1Styles.fontSize);

        // Transfer font styles.
        Array.from(headerH1Styles).forEach((styleName) => {
            if (styleName != 'font-size' &&
                styleName != 'font-family' &&
                (styleName.startsWith('font-') || styleName.startsWith('letter-'))) {
                contentH1.style.setProperty(styleName, headerH1Styles.getPropertyValue(styleName));
            }
        });
        contentH1.style.setProperty(
            '--max-width',
            (parseFloat(headerH1Styles.width)
                -parseFloat(headerH1Styles.paddingLeft)
                -parseFloat(headerH1Styles.paddingRight)
                +'px'),
        );

        contentH1.setAttribute('aria-hidden', 'true');

        // Add something under the hood to change the page background.
        let color = getComputedStyle(title).getPropertyValue('backgroundColor').trim();
        if (color == '') {
            color = getComputedStyle(title).getPropertyValue('--background').trim();
        }

        const underHeader = document.createElement('div');
        underHeader.classList.add('core-underheader');
        underHeader.style.setProperty('height', this.header.clientHeight + 'px');
        underHeader.style.setProperty('background', color);
        this.content.shadowRoot?.querySelector('#background-content')?.prepend(underHeader);

        this.content.style.setProperty('--offset-top', this.header.clientHeight + 'px');

        // Subheading.
        const headerSubHeading = this.header.querySelector<HTMLElement>('h2,.subheading');
        const contentSubHeading = title.querySelector<HTMLElement>('h2,.subheading');
        if (headerSubHeading && contentSubHeading) {
            const headerSubHeadingStyles = getComputedStyle(headerSubHeading);
            this.headerSubHeadingFontSize = parseFloat(headerSubHeadingStyles.fontSize);

            const contentSubHeadingStyles = getComputedStyle(contentSubHeading);
            this.contentSubHeadingFontSize = parseFloat(contentSubHeadingStyles.fontSize);

            if (Platform.isRTL) {
                this.subHeadingStartDifference = contentSubHeading.getBoundingClientRect().right -
                    (headerSubHeading.getBoundingClientRect().right - parseFloat(headerSubHeadingStyles.paddingRight));
            } else {
                this.subHeadingStartDifference = contentSubHeading.getBoundingClientRect().left -
                    (headerSubHeading.getBoundingClientRect().left + parseFloat(headerSubHeadingStyles.paddingLeft));
            }

            contentSubHeading.setAttribute('aria-hidden', 'true');
        }

        this.content.scrollEvents = true;
        this.content.addEventListener('ionScroll', (e: CustomEvent<ScrollDetail>): void => {
            this.onScroll(title, contentH1, contentSubHeading, e.detail);
        });
    }

    /**
     * On scroll function.
     *
     * @param title Title on ion content.
     * @param contentH1 Heading 1 of title, if found.
     * @param scrollDetail Event details.
     */
    protected onScroll(
        title: HTMLElement,
        contentH1: HTMLElement,
        contentSubheading: HTMLElement | null,
        scrollDetail: ScrollDetail,
    ): void {
        const progress = CoreMath.clamp(scrollDetail.scrollTop / this.titleTopDifference, 0, 1);
        const collapsed = progress >= 1;

        // Check total collapse.
        this.header.classList.toggle('core-header-collapsed', collapsed);
        title.classList.toggle('collapsible-title-collapsed', collapsed);
        title.classList.toggle('collapsible-title-collapse-started', scrollDetail.scrollTop > 0);

        if (collapsed) {
            contentH1.style.transform = 'translateX(-' + this.h1StartDifference + 'px)';
            contentH1.style.setProperty('font-size', this.headerH1FontSize + 'px');

            if (contentSubheading) {
                contentSubheading.style.transform = 'translateX(-' + this.subHeadingStartDifference + 'px)';
                contentSubheading.style.setProperty('font-size', this.headerSubHeadingFontSize + 'px');
            }

            return;
        }

        // Zoom font-size out.
        const newFontSize = this.contentH1FontSize - ((this.contentH1FontSize - this.headerH1FontSize) * progress);
        contentH1.style.setProperty('font-size', newFontSize + 'px');

        // Move.
        const newStart = - this.h1StartDifference * progress;
        contentH1.style.transform = 'translateX(' + newStart + 'px)';

        if (contentSubheading) {
            const newFontSize = this.contentSubHeadingFontSize -
                ((this.contentSubHeadingFontSize - this.headerSubHeadingFontSize) * progress);
            contentSubheading.style.setProperty('font-size', newFontSize + 'px');

            const newStart = - this.subHeadingStartDifference * progress;
            contentSubheading.style.transform = 'translateX(' + newStart + 'px)';
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.loadingObserver.off();
    }

}
