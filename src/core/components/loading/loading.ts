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

import { Component, Input, OnInit, OnChanges, SimpleChange, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';

import { CoreUtils } from '@singletons/utils';
import { CoreAnimations } from '@components/animations';
import { Translate } from '@singletons';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CorePromisedValue } from '@classes/promised-value';
import { AsyncDirective } from '@classes/async-directive';
import { CorePlatform } from '@services/platform';
import { CoreWait } from '@singletons/wait';
import { toBoolean } from '@/core/transforms/boolean';
import { CoreBaseModule } from '@/core/base.module';

/**
 * Component to show a loading spinner and message while data is being loaded.
 *
 * It will show a spinner with a message and hide all the content until 'hideUntil' variable is set to a truthy value (!!hideUntil).
 * If 'message' isn't set, default message "Loading" is shown.
 * 'message' attribute accepts hardcoded strings, variables, filters, etc. E.g. [message]="'core.loading' | translate".
 *
 * Usage:
 * <core-loading [message]="loadingMessage" [hideUntil]="dataLoaded">
 *     <!-- CONTENT TO HIDE UNTIL LOADED -->
 * </core-loading>
 *
 * IMPORTANT: Due to how ng-content works in Angular, the content of core-loading will be executed as soon as your view
 * is loaded, even if the content hidden. So if you have the following code:
 * <core-loading [hideUntil]="dataLoaded"><my-component></my-component></core-loading>
 *
 * The component "my-component" will be initialized immediately, even if dataLoaded is false, but it will be hidden. If you want
 * your component to be initialized only if dataLoaded is true, then you should use ngIf:
 * <core-loading [hideUntil]="dataLoaded"><my-component *ngIf="dataLoaded"></my-component></core-loading>
 */
@Component({
    selector: 'core-loading',
    templateUrl: 'core-loading.html',
    styleUrl: 'loading.scss',
    animations: [CoreAnimations.SHOW_HIDE],
    standalone: true,
    imports: [CoreBaseModule],
})
export class CoreLoadingComponent implements OnInit, OnChanges, AfterViewInit, AsyncDirective, OnDestroy {

    @Input({ transform: toBoolean }) hideUntil = false; // Determine when should the contents be shown.
    @Input() message?: string; // Message to show while loading.
    @Input({ transform: toBoolean }) fullscreen = true; // Use the whole screen.

    uniqueId: string;
    loaded = false;

    protected element: HTMLElement; // Current element.
    protected lastScrollPosition = Promise.resolve<number | undefined>(undefined);
    protected onReadyPromise = new CorePromisedValue<void>();
    protected mutationObserver: MutationObserver;

    constructor(element: ElementRef) {
        this.element = element.nativeElement;
        CoreDirectivesRegistry.register(this.element, this);

        // Calculate the unique ID.
        this.uniqueId = `core-loading-content-${CoreUtils.getUniqueId('CoreLoadingComponent')}`;
        this.element.setAttribute('id', this.uniqueId);

        // Throttle 20ms to let mutations resolve.
        const throttleMutation = CoreUtils.throttle(async () => {
            await CoreWait.nextTick();
            if (!this.loaded) {
                return;
            }

            this.element.style.display = 'inline';
            await CoreWait.nextTick();
            this.element.style.removeProperty('display');
        }, 20);

        // This will solve the iOS sorting problem on new elements appearing on a display contents element.
        this.mutationObserver = new MutationObserver(async (mutationRecords) => {
            const count = mutationRecords.reduce((previous, mutation) => previous + mutation.addedNodes.length, 0);

            if (count > 0) {
                throttleMutation();
            }
        });
    }

    /**
     * @inheritdoc
     */
    ngOnInit(): void {
        if (!this.message) {
            // Default loading message.
            this.message = Translate.instant('core.loading');
        }
        this.element.classList.toggle('core-loading-inline', !this.fullscreen);
    }

    /**
     * @inheritdoc
     */
    ngAfterViewInit(): void {
        this.changeState(this.hideUntil);
    }

    /**
     * @inheritdoc
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (changes.hideUntil) {
            this.changeState(this.hideUntil);
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.mutationObserver.disconnect();
    }

    /**
     * Change loaded state.
     *
     * @param loaded True to load, false otherwise.
     * @returns Promise resolved when done.
     */
    async changeState(loaded: boolean): Promise<void> {
        this.element.classList.toggle('core-loading-loaded', loaded);
        this.element.setAttribute('aria-busy', loaded ?  'false' : 'true');

        if (this.loaded === loaded) {
            return;
        }

        this.loaded = loaded;

        if (loaded) {
            this.onReadyPromise.resolve();
            this.restoreScrollPosition();
            if (CorePlatform.isIOS()) {
                this.mutationObserver.observe(this.element, { childList: true });
            }
        } else {
            this.lastScrollPosition = this.getScrollPosition();
            this.mutationObserver.disconnect();
        }
    }

    /**
     * Gets current scroll position.
     *
     * @returns the scroll position or undefined if scroll not found.
     */
    protected async getScrollPosition(): Promise<number | undefined> {
        const content = this.element.closest('ion-content');
        const scrollElement = await content?.getScrollElement();

        return scrollElement?.scrollTop;
    }

    /**
     * Restores last known scroll position.
     */
    protected async restoreScrollPosition(): Promise<void> {
        const scrollPosition = await this.lastScrollPosition;

        if (scrollPosition === undefined) {
            return;
        }

        const content = this.element.closest('ion-content');
        const scrollElement = await content?.getScrollElement();

        scrollElement?.scrollTo({ top: scrollPosition });
    }

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        await this.onReadyPromise;
    }

}
