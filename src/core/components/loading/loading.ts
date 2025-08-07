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
    Component,
    ElementRef,
    OnDestroy,
    inject,
    input,
    effect,
} from '@angular/core';
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
import { CoreTimesPipe } from '@pipes/times';

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
    imports: [
        CoreBaseModule,
        CoreTimesPipe,
    ],
    host: {
        '[class.core-loading-inline]': '!fullscreen()',
        '[class.core-loading-loaded]': 'hideUntil()',
        '[attr.aria-busy]': '!hideUntil()',
        '[attr.id]': 'uniqueId',
        '[style.--loading-inline-min-height]': 'placeholderHeight()',
    },
})
export class CoreLoadingComponent implements AsyncDirective, OnDestroy {

    readonly hideUntil = input(false, { transform: toBoolean }); // Determine when should the contents be shown.
    readonly message = input<string>(Translate.instant('core.loading')); // Message to show while loading.
    readonly fullscreen = input(true, { transform: toBoolean }); // Use the whole screen.

    readonly placeholderType = input<CoreLoadingPlaceholderTypes>();
    readonly placeholderWidth = input<string>();
    readonly placeholderHeight = input<string>();
    readonly placeholderLimit = input(20);

    protected element: HTMLElement = inject(ElementRef).nativeElement;
    protected lastScrollPosition = Promise.resolve<number | undefined>(undefined);
    protected onReadyPromise = new CorePromisedValue<void>();
    protected mutationObserver: MutationObserver;

    protected uniqueId: string;

    constructor() {
        CoreDirectivesRegistry.register(this.element, this);

        // Calculate the unique ID.
        this.uniqueId = `core-loading-content-${CoreUtils.getUniqueId('CoreLoadingComponent')}`;

        // Throttle 20ms to let mutations resolve.
        const throttleMutation = CoreUtils.throttle(async () => {
            await CoreWait.nextTick();
            if (!this.hideUntil()) {
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

        effect(() => {
            if (this.hideUntil()) {
                this.onReadyPromise.resolve();
                this.restoreScrollPosition();
                if (CorePlatform.isIOS()) {
                    this.mutationObserver.observe(this.element, { childList: true });
                }
            } else {
                this.lastScrollPosition = this.getScrollPosition();
                this.mutationObserver.disconnect();
            }
        });
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.mutationObserver.disconnect();
    }

    /**
     * Gets current scroll position.
     *
     * @returns the scroll position or undefined if scroll not found.
     */
    protected async getScrollPosition(): Promise<number | undefined> {
        const scrollElement = await this.getScrollElement();

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

        const scrollElement = await this.getScrollElement();

        scrollElement?.scrollTo({ top: scrollPosition });
    }

    /**
     * Gets the scroll element to use.
     *
     * @returns The scroll element or undefined if not found.
     */
    protected async getScrollElement(): Promise<HTMLElement | undefined> {
        const content = this.element.closest('ion-content');

        if (!content || 'getScrollElement' in content === false) {
            return undefined;
        }

        return await content.getScrollElement();
    }

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        await this.onReadyPromise;
    }

}

type CoreLoadingPlaceholderTypes =
    'row' | 'column' | 'rowwrap' | 'columnwrap' | 'listwithicon' | 'listwithavatar' | 'imageandboxes' | 'free';
