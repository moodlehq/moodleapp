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

import { Injectable, Type } from '@angular/core';
import { Params } from '@angular/router';

import { CoreDelegateDisplayHandler, CoreDelegateToDisplay } from '@classes/delegate';
import { CoreSortedDelegate } from '@classes/delegate-sorted';
import { ReloadableComponent } from '@coretypes/reloadable-component';
import { makeSingleton } from '@singletons';
import { MAIN_MENU_FEATURE_PREFIX } from '../constants';
import { CoreConstants } from '@/core/constants';
import { CoreEvents } from '@static/events';
import { CoreConfigProvider } from '@services/config';
import { CoreMainMenuOverrideItem } from './mainmenu';

/**
 * Interface that all main menu handlers must implement.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CoreMainMenuHandler extends CoreDelegateDisplayHandler<CoreMainMenuHandlerToDisplay> {}

/**
 * Data needed to render a main menu handler that navigates to a new page.
 */
export type CoreMainMenuPageNavHandlerData = {
    /**
     * Name of the page to load for the handler.
     */
    page: string;

    /**
     * Title to display for the handler.
     */
    title: string;

    /**
     * Name of the icon to display for the handler.
     */
    icon: string; // Name of the icon to display in the tab.

    /**
     * Class to add to the displayed handler.
     */
    class?: string;

    /**
     * If the handler has badge to show or not.
     */
    showBadge?: boolean;

    /**
     * Text to display on the badge. Only used if showBadge is true.
     */
    badge?: string;

    /**
     * Accessibility text to add on the badge. Only used if showBadge is true.
     */
    badgeA11yText?: string;

    /**
     * If true, the badge number is being loaded. Only used if showBadge is true.
     */
    loading?: boolean;

    /**
     * Params to pass to the page.
     */
    pageParams?: Params;

    /**
     * Whether the handler should only appear in More menu.
     */
    onlyInMore?: boolean;

    /**
     * Priority of the handler. If set, overrides the priority defined in CoreMainMenuHandler.
     */
    priority?: number;
};

/**
 * Data needed to render a component in the more menu.
 */
export type CoreMainMenuComponentHandlerData =  {
    /**
     * Component to render.
     */
    component: Type<ReloadableComponent>;

    /**
     * Data to pass to the component.
     */
    componentData?: Record<string, unknown>;
};

/**
 * Data needed to render a "component" main menu handler.
 */
export type CoreMainMenuPageNavHandlerToDisplay = CoreDelegateToDisplay & CoreMainMenuPageNavHandlerData;

/**
 * Data needed to render a "page nav" main menu handler.
 */
export type CoreMainMenuComponentHandlerToDisplay = CoreDelegateToDisplay & CoreMainMenuComponentHandlerData;

/**
 * Data returned by the delegate for each handler.
 */
export type CoreMainMenuHandlerToDisplay = CoreMainMenuPageNavHandlerToDisplay | CoreMainMenuComponentHandlerToDisplay;

/**
 * Service to interact with plugins to be shown in the main menu. Provides functions to register a plugin
 * and notify an update in the data.
 */
@Injectable({ providedIn: 'root' })
export class CoreMainMenuDelegateService extends CoreSortedDelegate<CoreMainMenuHandlerToDisplay, CoreMainMenuHandler> {

    protected featurePrefix = MAIN_MENU_FEATURE_PREFIX;
    protected currentOverrides: CoreMainMenuOverrideItem[];

    constructor() {
        super();

        this.currentOverrides = CoreConstants.CONFIG.overrideMainMenuButtons ?? [];

        CoreEvents.on(CoreConfigProvider.ENVIRONMENT_UPDATED, (config) => {
            const newConfig = config.overrideMainMenuButtons ?? [];
            if (JSON.stringify(this.currentOverrides) === JSON.stringify(newConfig)) {
                return;
            }

            this.currentOverrides = newConfig;

            this.updateData();
        });
    }

    /**
     * @inheritdoc
     */
    protected getHandlerDisplayData(name: string): CoreMainMenuHandlerToDisplay {
        const data = super.getHandlerDisplayData(name);

        // Override priority and icon if needed.
        const config = this.currentOverrides;

        const override = config.find((entry) => entry.handler === name);
        if (override) {
            if (override.priority !== undefined) {
                data.priority = override.priority;
            }
            if ('icon' in data && override.icon !== undefined) {
                data.icon = override.icon;
            }
        }

        return data;
    }

    /**
     * Check if a handler needs to be displayed only in the More menu.
     *
     * @param handler Handler to check.
     * @returns Whether the handler should be displayed only in the More menu.
     */
    displayOnlyInMore(handler: CoreMainMenuHandlerToDisplay): boolean {
        return 'component' in handler || !!handler.onlyInMore;
    }

    /**
     * Given a list of handlers, return the ones that can be displayed outside of the More menu.
     *
     * @param handlers Handlers to filter.
     * @returns Handlers that can be displayed outside of the More menu.
     */
    skipOnlyMoreHandlers(handlers: CoreMainMenuHandlerToDisplay[]): CoreMainMenuPageNavHandlerToDisplay[] {
        return handlers.filter((handler): handler is CoreMainMenuPageNavHandlerToDisplay => !this.displayOnlyInMore(handler));
    }

}

export const CoreMainMenuDelegate = makeSingleton(CoreMainMenuDelegateService);
