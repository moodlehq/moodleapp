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

export const ADDON_MOD_WIKI_COMPONENT = 'AddonModWiki';
export const ADDON_MOD_WIKI_COMPONENT_LEGACY = 'mmaModWiki';
export const ADDON_MOD_WIKI_PAGE_NAME = 'mod_wiki';
export const ADDON_MOD_WIKI_MODNAME = 'wiki';

export const ADDON_MOD_WIKI_FEATURE_NAME = CORE_COURSE_MODULE_FEATURE_PREFIX + ADDON_MOD_WIKI_COMPONENT;

// Events.
export const ADDON_MOD_WIKI_AUTO_SYNCED = 'addon_mod_wiki_autom_synced';
export const ADDON_MOD_WIKI_MANUAL_SYNCED = 'addon_mod_wiki_manual_synced';
export const ADDON_MOD_WIKI_PAGE_CREATED_EVENT = 'addon_mod_wiki_page_created';

export const ADDON_MOD_WIKI_RENEW_LOCK_TIME = 30000; // Milliseconds.
