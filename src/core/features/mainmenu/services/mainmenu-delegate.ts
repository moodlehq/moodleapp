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

import { Injectable } from '@angular/core';
import { Params } from '@angular/router';

import { CoreDelegateDisplayHandler, CoreDelegateToDisplay } from '@classes/delegate';
import { CoreSortedDelegate } from '@classes/delegate-sorted';
import { makeSingleton } from '@singletons';

/**
 * Interface that all main menu handlers must implement.
 */
export type CoreMainMenuHandler = CoreDelegateDisplayHandler<CoreMainMenuHandlerToDisplay>;

/**
 * Data needed to render a main menu handler. It's returned by the handler.
 */
export interface CoreMainMenuHandlerData {
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
}

/**
 * Data returned by the delegate for each handler.
 */
export interface CoreMainMenuHandlerToDisplay extends CoreDelegateToDisplay, CoreMainMenuHandlerData {
    /**
     * Hide tab. Used then resizing.
     */
    hide?: boolean;

    /**
     * Used to control tabs.
     */
    id?: string;
}

/**
 * Service to interact with plugins to be shown in the main menu. Provides functions to register a plugin
 * and notify an update in the data.
 */
@Injectable({ providedIn: 'root' })
export class CoreMainMenuDelegateService extends CoreSortedDelegate<CoreMainMenuHandlerToDisplay, CoreMainMenuHandler> {

    protected featurePrefix = 'CoreMainMenuDelegate_';

}

export const CoreMainMenuDelegate = makeSingleton(CoreMainMenuDelegateService);
