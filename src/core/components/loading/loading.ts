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

import { Component, Input, OnInit, OnChanges, SimpleChange, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

import { CoreEventLoadingChangedData, CoreEvents } from '@singletons/events';
import { CoreUtils } from '@services/utils/utils';
import { CoreAnimations } from '@components/animations';
import { Translate } from '@singletons';

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
export class CoreLoadingComponent implements OnInit, OnChanges, AfterViewInit {

    @Input() hideUntil: unknown; // Determine when should the contents be shown.
    @Input() message?: string; // Message to show while loading.
    @Input() protected fullscreen = true; // Use the whole screen.

    @ViewChild('content') content?: ElementRef;

    uniqueId: string;
    protected element: HTMLElement; // Current element.
    loaded = false; // Only comes true once.

    constructor(element: ElementRef) {
        this.element = element.nativeElement;

        // Calculate the unique ID.
        this.uniqueId = 'core-loading-content-' + CoreUtils.getUniqueId('CoreLoadingComponent');
    }

    /**
     * Component being initialized.
     */
    ngOnInit(): void {
        if (!this.message) {
            // Default loading message.
            this.message = Translate.instant('core.loading');
        }

        this.element.classList.toggle('core-loading-inline', !this.fullscreen);
    }

    /**
     * View has been initialized.
     */
    ngAfterViewInit(): void {
        // Add class if loaded on init.
        if (this.hideUntil) {
            this.element.classList.add('core-loading-loaded');
        }
        this.loaded = !!this.hideUntil;

        this.content?.nativeElement.classList.toggle('core-loading-content', !!this.hideUntil);
    }

    /**
     * Component input changed.
     *
     * @param changes Changes.
     */
    ngOnChanges(changes: { [name: string]: SimpleChange }): void {
        if (changes.hideUntil) {
            if (!this.loaded) {
                this.loaded = !!this.hideUntil; // Only comes true once.
            }

            if (this.hideUntil) {
                setTimeout(() => {
                    // Content is loaded so, center the spinner on the content itself.
                    this.element.classList.add('core-loading-loaded');
                    // Change CSS to force calculate height.
                    // Removed 500ms timeout to avoid reallocating html.
                    this.content?.nativeElement.classList.add('core-loading-content');
                });
            } else {
                this.element.classList.remove('core-loading-loaded');
                this.content?.nativeElement.classList.remove('core-loading-content');
            }

            // Trigger the event after a timeout since the elements inside ngIf haven't been added to DOM yet.
            setTimeout(() => {
                CoreEvents.trigger(CoreEvents.CORE_LOADING_CHANGED, <CoreEventLoadingChangedData> {
                    loaded: !!this.hideUntil,
                    uniqueId: this.uniqueId,
                });
            });
        }
    }

}
