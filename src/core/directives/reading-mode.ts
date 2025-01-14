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

import {
    AfterViewInit,
    Directive,
    ElementRef,
    OnDestroy,
} from '@angular/core';

import { Translate } from '@singletons';
import { CoreIcons } from '@singletons/icons';
import { CoreDom } from '@singletons/dom';
import { CoreWait } from '@singletons/wait';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CoreModals } from '@services/overlays/modals';
import { CoreViewer } from '@features/viewer/services/viewer';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreCollapsibleHeaderDirective } from './collapsible-header';
import { CoreLogger } from '@singletons/logger';

/**
 * Directive to add the reading mode to the selected html tag.
 *
 * Example usage:
 * <div core-reading-mode>
 */
@Directive({
    selector: '[core-reading-mode]',
})
export class CoreReadingModeDirective implements AfterViewInit, OnDestroy {

    protected element: HTMLElement;
    protected viewportPromise?: CoreCancellablePromise<void>;
    protected disabledStyles: HTMLStyleElement[] = [];
    protected hiddenElements: HTMLElement[] = [];
    protected renamedStyles: HTMLElement[] = [];
    protected enabled = false;
    protected header?: CoreCollapsibleHeaderDirective;
    protected logger = CoreLogger.getInstance('CoreReadingModeDirective');

    constructor(
        element: ElementRef,
    ) {
        this.element = element.nativeElement;
        this.viewportPromise = CoreDom.waitToBeInViewport(this.element);
    }

    /**
     * @inheritdoc
     */
    async ngAfterViewInit(): Promise<void> {
        await this.viewportPromise;
        await CoreWait.nextTick();
        await this.addTextViewerButton();

        this.enabled = document.body.classList.contains('core-reading-mode-enabled');
        if (this.enabled) {
            await this.enterReadingMode();
        }
    }

    /**
     * Add text viewer button to enable the reading mode.
     */
    protected async addTextViewerButton(): Promise<void> {
        const page = CoreDom.closest(this.element, '.ion-page');
        const contentEl = page?.querySelector('ion-content') ?? undefined;

        const header = await CoreDom.findIonHeaderFromElement(this.element);
        const buttonsContainer = header?.querySelector<HTMLIonButtonsElement>('ion-toolbar ion-buttons[slot="end"]');
        if (!buttonsContainer || !contentEl) {
            this.logger.warn('The header was not found, or it didn\'t have any ion-buttons on slot end.');

            return;
        }

        contentEl.classList.add('core-reading-mode-content');

        if (buttonsContainer.querySelector('.core-text-viewer-button')) {

            return;
        }

        const collapsibleHeader = CoreDirectivesRegistry.resolve(header, CoreCollapsibleHeaderDirective);
        if (collapsibleHeader) {
            this.header = collapsibleHeader;
        }

        const label = Translate.instant('core.viewer.enterreadingmode');
        const button = document.createElement('ion-button');

        button.classList.add('core-text-viewer-button');
        button.setAttribute('aria-label', label);
        button.setAttribute('fill', 'clear');

        const iconName = 'book-open-reader';
        const src = CoreIcons.getIconSrc('font-awesome', 'solid', iconName);
        // Add an ion-icon item to apply the right styles, but the ion-icon component won't be executed.
        button.innerHTML = `<ion-icon name="fas-${iconName}" aria-hidden="true" src="${src}"></ion-icon>`;
        buttonsContainer.appendChild(button);

        button.addEventListener('click', (e: Event) => {
            if (!this.element.innerHTML) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            if (!this.enabled) {
                this.enterReadingMode();
            } else {
                this.showReadingSettings();
            }
        });
    }

    /**
     * Enters the reading mode.
     */
    protected async enterReadingMode(): Promise<void> {
        this.enabled = true;
        CoreViewer.loadReadingModeSettings();

        this.header?.setEnabled(false);

        document.body.classList.add('core-reading-mode-enabled');

        // Disable all styles in element.
        this.disabledStyles = Array.from(this.element.querySelectorAll('style:not(disabled)'));
        this.disabledStyles.forEach((style) => {
            style.disabled = true;
        });

        // Rename style attributes on DOM elements.
        this.renamedStyles = Array.from(this.element.querySelectorAll('*[style]'));
        this.renamedStyles.forEach((element: HTMLElement) => {
            this.renamedStyles.push(element);
            element.setAttribute('data-original-style', element.getAttribute('style') || '');
            element.removeAttribute('style');
        });

        // Navigate to parent hidding all other elements.
        let currentChild = this.element;
        let parent = currentChild.parentElement;
        while (parent && parent.tagName.toLowerCase() !== 'ion-content') {
            Array.from(parent.children).forEach((child: HTMLElement) => {
                if (child !== currentChild && child.tagName.toLowerCase() !== 'swiper-slide') {
                    this.hiddenElements.push(child);
                    child.classList.add('hide-on-reading-mode');
                }
            });

            currentChild = parent;
            parent = currentChild.parentElement;
        }
    }

    /**
     * Disable the reading mode.
     */
    protected async disableReadingMode(): Promise<void> {
        this.enabled = false;
        document.body.classList.remove('core-reading-mode-enabled');

        this.header?.setEnabled(true);

        // Enable all styles in element.
        this.disabledStyles.forEach((style) => {
            style.disabled = false;
        });
        this.disabledStyles = [];

        // Rename style attributes on DOM elements.
        this.renamedStyles.forEach((element) => {
            element.setAttribute('style', element.getAttribute('data-original-style') || '');
            element.removeAttribute('data-original-style');
        });
        this.renamedStyles = [];

        this.hiddenElements.forEach((element) => {
            element.classList.remove('hide-on-reading-mode');
        });
        this.hiddenElements = [];
    }

    /**
     * Show the reading settings.
     */
    protected async showReadingSettings(): Promise<void> {
        const { CoreReadingModeSettingsModalComponent } =
            await import('@features/viewer/components/reading-mode-settings/reading-mode-settings');

        const exit = await CoreModals.openModal({
            component: CoreReadingModeSettingsModalComponent,
            initialBreakpoint: 1,
            breakpoints: [0, 1],
            cssClass: 'core-modal-auto-height',
        });

        if (exit) {
            this.disableReadingMode();
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.viewportPromise?.cancel();

        if (this.enabled && document.body.querySelectorAll('[core-reading-mode]')) {
            // Do not disable if there are more instances of the directive in the DOM.

            return;
        }
        this.disableReadingMode();
    }

}
