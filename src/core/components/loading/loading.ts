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

import { Component, Input, OnInit, OnChanges, SimpleChange, ElementRef, AfterViewInit } from '@angular/core';

import { CoreEventLoadingChangedData, CoreEvents } from '@singletons/events';
import { CoreUtils } from '@services/utils/utils';
import { CoreAnimations } from '@components/animations';
import { Translate } from '@singletons';
import { CoreComponentsRegistry } from '@singletons/components-registry';
import { CorePromisedValue } from '@classes/promised-value';
import { AsyncComponent } from '@classes/async-component';

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
    styleUrls: ['loading.scss'],
    animations: [CoreAnimations.SHOW_HIDE],
})
export class CoreLoadingComponent implements OnInit, OnChanges, AfterViewInit, AsyncComponent {

    @Input() hideUntil = false; // Determine when should the contents be shown.
    @Input() message?: string; // Message to show while loading.
    @Input() fullscreen = true; // Use the whole screen.

    uniqueId: string;
    loaded = false;

    protected scroll = 0;
    protected element: HTMLElement; // Current element.
    protected onReadyPromise = new CorePromisedValue<void>();

    constructor(element: ElementRef) {
        this.element = element.nativeElement;
        CoreComponentsRegistry.register(this.element, this);

        // Calculate the unique ID.
        this.uniqueId = 'core-loading-content-' + CoreUtils.getUniqueId('CoreLoadingComponent');
        this.element.setAttribute('id', this.uniqueId);
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
     * Change loaded state.
     *
     * @param loaded True to load, false otherwise.
     * @return Promise resolved when done.
     */
    async changeState(loaded: boolean): Promise<void> {
        this.element.classList.toggle('core-loading-loaded', loaded);
        this.element.setAttribute('aria-busy', loaded ?  'false' : 'true');

        if (this.loaded === loaded) {
            return;
        }

        if (!loaded) {
            await this.saveScrollPosition();
        }
        this.loaded = loaded;

        if (loaded) {
            this.onReadyPromise.resolve();

            // Recover last scroll.
            await this.recoverScrollPosition();
        }

        // Event has been deprecated since app 4.0.
        CoreEvents.trigger(CoreEvents.CORE_LOADING_CHANGED, <CoreEventLoadingChangedData> {
            loaded,
            uniqueId: this.uniqueId,
        });
    }

    /**
     * Saves current scroll position.
     */
    protected async saveScrollPosition(): Promise<void> {
        const content = this.element.closest('ion-content');
        if (!content) {
            return;
        }

        const scrollElement = await content.getScrollElement();
        this.scroll = scrollElement.scrollTop;
    }

    /**
     * Recovers last set scroll position.
     */
    protected async recoverScrollPosition(): Promise<void> {
        if (this.scroll <= 0) {
            return;
        }

        const content = this.element.closest('ion-content');
        if (!content) {
            return;
        }

        const scrollElement = await content.getScrollElement();

        scrollElement.scrollTo(0, this.scroll);
    }

    /**
     * @inheritdoc
     */
    async ready(): Promise<void> {
        return await this.onReadyPromise;
    }

}
