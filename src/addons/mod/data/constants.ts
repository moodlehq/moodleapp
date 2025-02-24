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

import { CORE_COURSE_MODULE_FEATURE_PREFIX } from '@features/course/constants';

export const ADDON_MOD_DATA_COMPONENT = 'AddonModData';
export const ADDON_MOD_DATA_COMPONENT_LEGACY = 'mmaModData';
export const ADDON_MOD_DATA_PAGE_NAME = 'mod_data';
export const ADDON_MOD_DATA_MODNAME = 'data';

export const ADDON_MOD_DATA_FEATURE_NAME = CORE_COURSE_MODULE_FEATURE_PREFIX + ADDON_MOD_DATA_COMPONENT;

// Events.
export const ADDON_MOD_DATA_ENTRY_CHANGED = 'addon_mod_data_entry_changed';
export const ADDON_MOD_DATA_AUTO_SYNCED = 'addon_mod_data_autom_synced';

export const ADDON_MOD_DATA_ENTRIES_PER_PAGE = 25;

export enum AddonModDataAction {
    ADD = 'add',
    EDIT = 'edit',
    DELETE = 'delete',
    APPROVE = 'approve',
    DISAPPROVE = 'disapprove',
    USER = 'user',
    USERPICTURE = 'userpicture',
    MORE = 'more',
    MOREURL = 'moreurl',
    COMMENTS = 'comments',
    TIMEADDED = 'timeadded',
    TIMEMODIFIED = 'timemodified',
    TAGS = 'tags',
    APPROVALSTATUS = 'approvalstatus',
    APPROVALSTATUSCLASS = 'approvalstatusclass',
    DELCHECK = 'delcheck', // Unused.
    EXPORT = 'export', // Unused.
    ACTIONSMENU = 'actionsmenu',
    ID = 'id',
}

export enum AddonModDataTemplateType {
    LIST_HEADER = 'listtemplateheader',
    LIST = 'listtemplate',
    LIST_FOOTER = 'listtemplatefooter',
    ADD = 'addtemplate',
    SEARCH = 'asearchtemplate',
    SINGLE = 'singletemplate',
}

export enum AddonModDataTemplateMode {
    LIST = 'list',
    EDIT = 'edit',
    SHOW = 'show',
    SEARCH = 'search',
}
