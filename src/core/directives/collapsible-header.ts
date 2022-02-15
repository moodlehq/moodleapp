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

    protected loadingObserver: CoreEventObserver;
    protected content?: HTMLIonContentElement | null;
    protected contentScroll?: HTMLElement;
    protected header: HTMLIonHeaderElement;
    protected titleTopDifference = 1;
    protected h1StartDifference = 0;
    protected headerH1FontSize = 0;
    protected contentH1FontSize = 0;
    protected headerSubHeadingFontSize = 0;
    protected contentSubHeadingFontSize = 0;
    protected subHeadingStartDifference = 0;
    protected inContent = true;
    protected title?: HTMLElement | null;
    protected titleHeight = 0;
    protected contentH1?: HTMLElement | null;
    protected debouncedUpdateCollapseProgress: () => void;

    constructor(el: ElementRef<HTMLIonHeaderElement>) {
        this.header = el.nativeElement;
        this.debouncedUpdateCollapseProgress = CoreUtils.debounce(() => this.updateCollapseProgress(), 50);

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
     * Set content element.
     *
     * @param content Content element.
     */
    protected async setContent(content?: HTMLIonContentElement | null): Promise<void> {
        this.content = content;

        if (content) {
            this.contentScroll = await content.getScrollElement();
        } else {
            delete this.contentScroll;
        }
    }

    /**
     * Gets the loading content id to wait for the loading to finish.
     *
     * @return Promise resolved with Loading Id, if any.
     */
    protected async getLoadingId(): Promise<string | undefined> {
        if (!this.content) {
            this.setContent(this.header.parentElement?.querySelector('ion-content:not(.disable-scroll-y)'));

            if (!this.content) {
                this.cannotCollapse();

                return;
            }

            const title = this.header.parentElement?.querySelector('.collapsible-title') || null;

            if (title) {
                // Title already found, no need to wait for loading.
                this.loadingObserver.off();
                this.setupRealTitle();

                return;
            }

        }

        return this.content.querySelector('core-loading.core-loading-loaded:not(.core-loading-inline) .core-loading-content')?.id;
    }

    /**
     * Call this function when header is not collapsible.
     */
    protected cannotCollapse(): void {
        this.setContent();
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
        const animations = (this.content.getAnimations && this.content.getAnimations()) || [];
        await Promise.all(animations.map(async (animation) => {
            await animation.finished;
        }));

        let title = this.content.querySelector<HTMLElement>('.collapsible-title');
        if (!title) {
            // Title is outside the ion-content.
            title = this.header.parentElement?.querySelector('.collapsible-title') || null;
            this.inContent = false;
        }
        this.contentH1 = title?.querySelector<HTMLElement>('h1');
        const headerH1 = this.header.querySelector<HTMLElement>('h1');
        if (!title || !this.contentH1 || !headerH1 || !this.contentH1.parentElement) {
            this.cannotCollapse();

            return;
        }

        this.title = title;
        this.titleHeight = title.getBoundingClientRect().height;
        this.titleTopDifference = this.contentH1.getBoundingClientRect().top - headerH1.getBoundingClientRect().top;

        if (this.titleTopDifference <= 0) {
            this.cannotCollapse();

            return;
        }

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
        const contentH1Styles = getComputedStyle(this.contentH1);

        if (Platform.isRTL) {
            // Checking position over parent because transition may not be finished.
            const contentH1Position = this.contentH1.getBoundingClientRect().right - this.content.getBoundingClientRect().right;
            const headerH1Position = headerH1.getBoundingClientRect().right - this.header.getBoundingClientRect().right;

            this.h1StartDifference = Math.round(contentH1Position - (headerH1Position - parseFloat(headerH1Styles.paddingRight)));
        } else {
            // Checking position over parent because transition may not be finished.
            const contentH1Position = this.contentH1.getBoundingClientRect().left - this.content.getBoundingClientRect().left;
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
                this.contentH1?.style.setProperty(styleName, headerH1Styles.getPropertyValue(styleName));
            }
        });
        this.contentH1.style.setProperty(
            '--max-width',
            (parseFloat(headerH1Styles.width)
                -parseFloat(headerH1Styles.paddingLeft)
                -parseFloat(headerH1Styles.paddingRight)
                +'px'),
        );

        this.contentH1.setAttribute('aria-hidden', 'true');

        // Clone element to let the other elements be static.
        const contentH1Clone = this.contentH1.cloneNode(true) as HTMLElement;
        contentH1Clone.classList.add('cloned');
        this.contentH1.parentElement.insertBefore(contentH1Clone, this.contentH1);
        this.contentH1.style.setProperty(
            'top',
            (contentH1Clone.getBoundingClientRect().top -
            this.contentH1.parentElement.getBoundingClientRect().top +
            parseInt(getComputedStyle(this.contentH1.parentElement).marginTop || '0', 10)) + 'px',
        );
        this.contentH1.style.setProperty('position', 'absolute');
        this.contentH1.parentElement.style.setProperty('position', 'relative');

        this.setupContent();
    }

    /**
     * Setup content scroll.
     *
     * @param parentId Parent id to recalculate content
     * @param retries  Retries to find content in case it's loading.
     */
    async setupContent(parentId?: string, retries = 5): Promise<void> {
        if (parentId) {
            this.setContent(this.header.parentElement?.querySelector(`#${parentId} ion-content:not(.disable-scroll-y)`));
            this.inContent = false;
            if (!this.content && retries > 0) {
                await CoreUtils.nextTick();
                await this.setupContent(parentId, --retries);

                return;
            }

            this.updateCollapseProgress();
        }

        if (!this.title || !this.content) {
            return;
        }

        // Add something under the hood to change the page background.
        let color = getComputedStyle(this.title).getPropertyValue('backgroundColor').trim();
        if (color == '') {
            color = getComputedStyle(this.title).getPropertyValue('--background').trim();
        }

        const underHeader = document.createElement('div');
        underHeader.classList.add('core-underheader');
        underHeader.style.setProperty('height', this.header.clientHeight + 'px');
        underHeader.style.setProperty('background', color);
        if (this.inContent) {
            this.content.shadowRoot?.querySelector('#background-content')?.prepend(underHeader);
            this.content.style.setProperty('--offset-top', this.header.clientHeight + 'px');
        } else {
            if (!this.header.closest('.ion-page')?.querySelector('.core-underheader')) {
                this.header.closest('.ion-page')?.insertBefore(underHeader, this.header);
            }
        }

        this.content.scrollEvents = true;
        this.content.addEventListener('ionScroll', ({ target }: CustomEvent<ScrollDetail>): void => {
            if (target !== this.content) {
                return;
            }

            this.updateCollapseProgress();
            this.debouncedUpdateCollapseProgress();
        });
    }

    /**
     * Update collapse progress according to the current scroll position.
     */
    protected updateCollapseProgress(): void {
        if (!this.contentScroll || !this.title || !this.contentH1) {
            return;
        }

        const collapsibleHeaderHeight = this.title.shadowRoot?.children[0].clientHeight ?? this.title.clientHeight;
        const scrollableHeight = this.contentScroll.scrollHeight - this.contentScroll.clientHeight;
        const collapsedHeight = collapsibleHeaderHeight - this.title.clientHeight;
        const progress = CoreMath.clamp(
            scrollableHeight + collapsedHeight <= 2 * collapsibleHeaderHeight
                ? this.contentScroll.scrollTop / (this.contentScroll.scrollHeight - this.contentScroll.clientHeight)
                : this.contentScroll.scrollTop / collapsibleHeaderHeight,
            0,
            1,
        );
        const collapsed = progress === 1;

        if (!this.inContent) {
            this.title.style.transform = `translateY(-${this.titleTopDifference * progress}px)`;
            this.title.style.height = `${collapsibleHeaderHeight * (1 - progress)}px`;
        }

        // Check total collapse.
        this.header.classList.toggle('core-header-collapsed', collapsed);
        this.title.classList.toggle('collapsible-title-collapsed', collapsed);
        this.title.classList.toggle('collapsible-title-collapse-started', progress > 0);
        this.title.classList.toggle('collapsible-title-collapse-nowrap', progress > 0.5);
        this.title.style.setProperty('--collapse-opacity', `${1 - progress}`);

        if (collapsed) {
            this.contentH1.style.transform = `translateX(-${this.h1StartDifference}px)`;
            this.contentH1.style.setProperty('font-size', `${this.headerH1FontSize}px`);

            return;
        }

        // Zoom font-size out.
        const newFontSize = this.contentH1FontSize - ((this.contentH1FontSize - this.headerH1FontSize) * progress);
        this.contentH1.style.setProperty('font-size', `${newFontSize}px`);

        // Move.
        const newStart = -this.h1StartDifference * progress;
        this.contentH1.style.transform = `translateX(${newStart}px)`;
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.loadingObserver.off();
    }

}
