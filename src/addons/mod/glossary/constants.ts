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

export const ADDON_MOD_GLOSSARY_COMPONENT = 'AddonModGlossary';
export const ADDON_MOD_GLOSSARY_COMPONENT_LEGACY = 'mmaModGlossary';
export const ADDON_MOD_GLOSSARY_PAGE_NAME = 'mod_glossary';
export const ADDON_MOD_GLOSSARY_MODNAME = 'glossary';

export const ADDON_MOD_GLOSSARY_FEATURE_NAME = CORE_COURSE_MODULE_FEATURE_PREFIX + ADDON_MOD_GLOSSARY_COMPONENT;

// Events.
export const GLOSSARY_AUTO_SYNCED = 'addon_mod_glossary_auto_synced';
export const ADDON_MOD_GLOSSARY_ENTRY_ADDED = 'addon_mod_glossary_entry_added';
export const ADDON_MOD_GLOSSARY_ENTRY_UPDATED = 'addon_mod_glossary_entry_updated';
export const ADDON_MOD_GLOSSARY_ENTRY_DELETED = 'addon_mod_glossary_entry_deleted';

export const ADDON_MOD_GLOSSARY_LIMIT_ENTRIES = 25;
export const ADDON_MOD_GLOSSARY_LIMIT_CATEGORIES = 10;
