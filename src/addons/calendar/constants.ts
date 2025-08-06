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

import { CORE_USER_TF_12, CORE_USER_TF_24 } from '@features/user/constants';

export const ADDON_CALENDAR_COMPONENT = 'AddonCalendarEvents';

export const ADDON_CALENDAR_PAGE_NAME = 'calendar';

export const ADDON_CALENDAR_EVENTS_TABLE = 'addon_calendar_events_3';

export const ADDON_CALENDAR_AUTO_SYNCED = 'addon_calendar_autom_synced';
export const ADDON_CALENDAR_MANUAL_SYNCED = 'addon_calendar_manual_synced';
export const ADDON_CALENDAR_SYNC_ID = 'calendar';

export const ADDON_CALENDAR_DAYS_INTERVAL = 30;

export const ADDON_CALENDAR_STARTING_WEEK_DAY = 'addon_calendar_starting_week_day';

/**
 * @deprecated since 5.1. Use CORE_USER_TF_24.
 */
export const ADDON_CALENDAR_TF_24 = CORE_USER_TF_24;

/**
 * @deprecated since 5.1. Use CORE_USER_TF_24.
 */
export const ADDON_CALENDAR_TF_12 = CORE_USER_TF_12;

export const ADDON_CALENDAR_NEW_EVENT_EVENT = 'addon_calendar_new_event';
export const ADDON_CALENDAR_NEW_EVENT_DISCARDED_EVENT = 'addon_calendar_new_event_discarded';
export const ADDON_CALENDAR_EDIT_EVENT_EVENT = 'addon_calendar_edit_event';
export const ADDON_CALENDAR_DELETED_EVENT_EVENT = 'addon_calendar_deleted_event';
export const ADDON_CALENDAR_UNDELETED_EVENT_EVENT = 'addon_calendar_undeleted_event';
export const ADDON_CALENDAR_FILTER_CHANGED_EVENT = 'addon_calendar_filter_changed_event';

/**
 * Context levels enumeration.
 */
export enum AddonCalendarEventIcons {
    SITE = 'fas-globe',
    CATEGORY = 'fas-cubes',
    COURSE = 'fas-graduation-cap',
    GROUP = 'fas-users',
    USER = 'fas-user',
}

/**
 * Main calendar Event types enumeration.
 */
export enum AddonCalendarEventType {
    SITE = 'site',
    CATEGORY = 'category',
    COURSE = 'course',
    GROUP = 'group',
    USER = 'user',
}
