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

import { CoreConstants } from '@/core/constants';
import { asyncInstance } from '@/core/utils/async-instance';
import { Injectable } from '@angular/core';
import { CoreCancellablePromise } from '@classes/cancellable-promise';
import { CoreDatabaseTable } from '@classes/database/database-table';
import { CoreDatabaseCachingStrategy, CoreDatabaseTableProxy } from '@classes/database/database-table-proxy';
import { CoreAppDB } from '@services/app-db';
import { AngularFrameworkDelegate, makeSingleton } from '@singletons';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';
import { CoreDom } from '@singletons/dom';
import { CoreSubscriptions } from '@singletons/subscriptions';
import type { CoreUserToursUserTourComponent } from '../components/user-tour/user-tour';
import { APP_SCHEMA, CoreUserToursDBEntry, USER_TOURS_TABLE_NAME } from './database/user-tours';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreWait } from '@singletons/wait';
import { LazyDefaultStandaloneComponent } from '@/app/app-routing.module';

/**
 * Service to manage User Tours.
 */
@Injectable({ providedIn: 'root' })
export class CoreUserToursService {

    protected table = asyncInstance<CoreDatabaseTable<CoreUserToursDBEntry>>();
    protected tours: { component: CoreUserToursUserTourComponent; visible: boolean }[] = [];
    protected toursListeners: Partial<Record<string, CorePromisedValue<void>[]>> = {};

    /**
     * Initialize database.
     */
    async initializeDatabase(): Promise<void> {
        await CoreAppDB.createTablesFromSchema(APP_SCHEMA);

        this.table.setLazyConstructor(async () => {
            const table = new CoreDatabaseTableProxy<CoreUserToursDBEntry>(
                { cachingStrategy: CoreDatabaseCachingStrategy.Eager },
                CoreAppDB.getDB(),
                USER_TOURS_TABLE_NAME,
            );

            await table.initialize();

            return table;
        });
    }

    /**
     * Check whether a User Tour is pending or not.
     *
     * @param id User Tour id.
     * @returns Whether the User Tour is pending or not.
     */
    async isPending(id: string): Promise<boolean> {
        if (this.isDisabled(id)) {
            return false;
        }

        const isAcknowledged = await this.table.hasAnyByPrimaryKey({ id });

        return !isAcknowledged;
    }

    /**
     * Confirm that a User Tour has been seen by the user.
     *
     * @param id User Tour id.
     */
    async acknowledge(id: string): Promise<void> {
        await this.table.insert({ id, acknowledgedTime: Date.now() });
    }

    /**
     * Show a User Tour if it's pending.
     *
     * @param options User Tour options.
     * @returns User tour controller, if any.
     */
    async showIfPending(options: CoreUserToursBasicOptions): Promise<CoreUserToursUserTour | null>;
    async showIfPending(options: CoreUserToursFocusedOptions): Promise<CoreUserToursUserTour | null>;
    async showIfPending(
        options: CoreUserToursBasicOptions | CoreUserToursFocusedOptions,
    ): Promise<CoreUserToursUserTour | null> {
        const isPending = await CoreUserTours.isPending(options.id);

        if (!isPending) {
            return null;
        }

        return this.show(options);
    }

    /**
     * Show a User Tour.
     *
     * @param options User Tour options.
     * @returns User tour controller.
     */
    protected async show(options: CoreUserToursBasicOptions): Promise<CoreUserToursUserTour>;
    protected async show(options: CoreUserToursFocusedOptions): Promise<CoreUserToursUserTour>;
    protected async show(options: CoreUserToursBasicOptions | CoreUserToursFocusedOptions): Promise<CoreUserToursUserTour> {
        const { CoreUserToursUserTourComponent } = await import('../components/user-tour/user-tour');

        const { delay, loadComponent, watch, ...componentOptions } = options;

        await CoreWait.wait(delay ?? 200);

        options.after && await this.waitForUserTour(options.after, options.afterTimeout);

        const container = document.querySelector('ion-app') ?? document.body;
        const viewContainer = container.querySelector('ion-router-outlet, ion-nav, #ion-view-container-root');

        componentOptions.component = componentOptions.component ?? (await loadComponent?.())?.default;

        const element = await AngularFrameworkDelegate.attachViewToDom(
            container,
            CoreUserToursUserTourComponent,
            { ...componentOptions, container },
        );
        const tour = CoreDirectivesRegistry.require(element, CoreUserToursUserTourComponent);

        viewContainer?.setAttribute('aria-hidden', 'true');
        viewContainer?.setAttribute('tabindex', '-1');

        this.toursListeners[options.id]?.forEach(listener => listener.resolve());

        return this.startTour(tour, watch ?? (options as CoreUserToursFocusedOptions).focus);
    }

    /**
     * Dismiss the active User Tour, if any.
     *
     * @param acknowledge Whether to acknowledge that the user has seen this User Tour or not.
     */
    async dismiss(acknowledge: boolean = true): Promise<void> {
        await this.getForegroundTour()?.dismiss(acknowledge);

        if (this.hasVisibleTour()) {
            return;
        }

        const container = document.querySelector('ion-app') ?? document.body;
        const viewContainer = container.querySelector('ion-router-outlet, ion-nav, #ion-view-container-root');

        viewContainer?.removeAttribute('aria-hidden');
        viewContainer?.removeAttribute('tabindex');

    }

    /**
     * Activate a tour component and bind its lifecycle to an element if provided.
     *
     * @param tour User tour.
     * @param watchElement Element to watch in order to update tour lifecycle.
     * @returns User tour controller.
     */
    protected startTour(tour: CoreUserToursUserTourComponent, watchElement?: HTMLElement | false): CoreUserToursUserTour {
        if (!watchElement) {
            this.activateTour(tour);

            return {
                cancel: () => tour.dismiss(false),
            };
        }

        let unsubscribeVisible: (() => void) | undefined;
        let visiblePromise: CoreCancellablePromise | undefined = CoreDom.waitToBeInViewport(watchElement);

        // eslint-disable-next-line promise/catch-or-return, promise/always-return
        visiblePromise.then(() => {
            visiblePromise = undefined;

            this.activateTour(tour);

            unsubscribeVisible = CoreDom.watchElementInViewport(
                watchElement,
                visible => visible ? this.activateTour(tour) : this.deactivateTour(tour),
            );

            CoreSubscriptions.once(tour.beforeDismiss, () => {
                unsubscribeVisible?.();

                visiblePromise = undefined;
                unsubscribeVisible = undefined;
            });
        });

        return {
            cancel: async () => {
                visiblePromise?.cancel();

                if (!unsubscribeVisible) {
                    return;
                }

                unsubscribeVisible();

                await tour.dismiss(false);
            },
        };
    }

    /**
     * Activate the given user tour.
     *
     * @param tour User tour.
     */
    protected activateTour(tour: CoreUserToursUserTourComponent): void {
        // Handle show/dismiss lifecycle.
        CoreSubscriptions.once(tour.beforeDismiss, () => {
            const index = this.getTourIndex(tour);

            if (index === -1) {
                return;
            }

            this.tours.splice(index, 1);

            this.getForegroundTour()?.show();
        });

        // Add to existing tours and show it if it's on top.
        const index = this.getTourIndex(tour);
        const previousForegroundTour = this.getForegroundTour();

        const id = tour.id();
        if (previousForegroundTour?.id() === id) {
            // Already activated.
            return;
        }

        if (index !== -1) {
            this.tours[index].visible = true;
        } else {
            this.tours.push({
                visible: true,
                component: tour,
            });
        }

        if (this.getForegroundTour()?.id() !== id) {
            // Another tour is in use.
            return;
        }

        tour.show();
    }

    /**
     * Returns the first visible tour in the stack.
     *
     * @returns foreground tour if found or undefined.
     */
    protected getForegroundTour(): CoreUserToursUserTourComponent | undefined {
        return this.tours.find(({ visible }) => visible)?.component;
    }

    /**
     * Check whether any tour is visible.
     *
     * @returns Whether any tour is visible.
     */
    protected hasVisibleTour(): boolean {
        return this.tours.some(({ visible }) => visible);
    }

    /**
     * Returns the tour index in the stack.
     *
     * @returns Tour index if found or -1 otherwise.
     */
    protected getTourIndex(tour: CoreUserToursUserTourComponent): number {
        return this.tours.findIndex(({ component }) => component === tour);
    }

    /**
     * Hide User Tour if visible.
     *
     * @param tour User tour.
     */
    protected deactivateTour(tour: CoreUserToursUserTourComponent): void {
        const index = this.getTourIndex(tour);
        if (index === -1) {
            return;
        }

        const foregroundTour = this.getForegroundTour();

        this.tours[index].visible = false;

        if (foregroundTour?.id() !== tour.id()) {
            // Another tour is in use.
            return;
        }

        tour.hide();
    }

    /**
     * Is user Tour disabled?
     *
     * @param tourId Tour Id or undefined to check all user tours.
     * @returns Whether a particular or all user tours are disabled.
     */
    isDisabled(tourId?: string): boolean {
        if (CoreConstants.CONFIG.disableUserTours) {
            return true;
        }

        return !!tourId && !!CoreConstants.CONFIG.disabledUserTours?.includes(tourId);
    }

    /**
     * It will reset all user tours.
     */
    async resetTours(): Promise<void> {
        if (this.isDisabled()) {
            return;
        }

        await this.table.delete();
    }

    /**
     * Wait for another user tour to be shown.
     *
     * @param id Id of the user tour to wait for.
     * @param timeout Timeout after which the waiting will end regardless of the user tour having been shown or not.
     */
    async waitForUserTour(id: string, timeout?: number): Promise<void> {
        const listener = new CorePromisedValue<void>();
        const listeners = this.toursListeners[id] = this.toursListeners[id] ?? [];
        const removeListener = () => {
            const index = listeners.indexOf(listener);

            if (index !== -1) {
                listeners.splice(index, 1);
            }
        };

        listeners.push(listener);
        listener.then(removeListener).catch(removeListener);
        timeout && setTimeout(() => listener.resolve(), timeout);

        await listener;
    }

}

export const CoreUserTours = makeSingleton(CoreUserToursService);

/**
 * User Tour controller.
 */
export interface CoreUserToursUserTour {

    /**
     * Cancelling a User Tour removes it from the queue if it was pending or dismisses it without
     * acknowledging.
     */
    cancel(): Promise<void>;

}

/**
 * User Tour side.
 */
export const enum CoreUserToursSide {
    Top = 'top',
    Bottom = 'bottom',
    Right = 'right',
    Left = 'left',
    Start = 'start',
    End = 'end',
}

/**
 * User Tour alignment.
 */
export const enum CoreUserToursAlignment {
    Start = 'start',
    Center = 'center',
    End = 'end',
}

/**
 * Basic options to create a User Tour.
 */
export interface CoreUserToursBasicOptions {

    /**
     * Unique identifier.
     */
    id: string;

    /**
     * User Tour component.
     */
    component?: unknown;

    /**
     * User Tour component to load when needed.
     * Used if component is not provided.
     */
    loadComponent?: () => LazyDefaultStandaloneComponent;

    /**
     * Properties to pass to the User Tour component.
     */
    componentProps?: Record<string, unknown>;

    /**
     * Milliseconds to wait until the User Tour is shown.
     *
     * Defaults to 200ms.
     */
    delay?: number;

    /**
     * Whether to watch an element to bind the User Tour lifecycle. Whenever this element appears or
     * leaves the screen, the user tour will do it as well. Focused user tours do it by default with
     * the focused element, but it can be disabled by explicitly using `false` here.
     */
    watch?: HTMLElement | false;

    /**
     * Whether to show this user tour only after another user tour with the given id has been shown.
     */
    after?: string;

    /**
     * Whether to show this user tour after the given timeout (in milliseconds) if the other user-tour hasn't been shown.
     */
    afterTimeout?: number;

}

/**
 * Options to create a focused User Tour.
 */
export interface CoreUserToursFocusedOptions extends CoreUserToursBasicOptions {

    /**
     * Element to focus.
     */
    focus: HTMLElement;

    /**
     * Position relative to the focused element.
     */
    side: CoreUserToursSide;

    /**
     * Alignment relative to the focused element.
     */
    alignment: CoreUserToursAlignment;

}
