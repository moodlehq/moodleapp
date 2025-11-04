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

export const MAIN_MENU_NUM_MAIN_HANDLERS = 4;
export const MAIN_MENU_ITEM_MIN_WIDTH = 72; // Min with of every item, based on 5 items on a 360 pixel wide screen.
export const MAIN_MENU_HOME_PAGE_NAME = 'home';
export const MAIN_MENU_MORE_PAGE_NAME = 'more';

export const MAIN_MENU_HANDLER_BADGE_UPDATED_EVENT = 'main_menu_handler_badge_updated';
export const MAIN_MENU_VISIBILITY_UPDATED_EVENT = 'main_menu_visbility_updated';

/**
 * Pacement of the main menu in the app.
 */
export enum CoreMainMenuPlacement {
    SIDE = 'side',
    BOTTOM = 'bottom',
}
