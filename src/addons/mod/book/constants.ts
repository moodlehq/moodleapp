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

export const ADDON_MOD_BOOK_COMPONENT = 'AddonModBook';
export const ADDON_MOD_BOOK_COMPONENT_LEGACY = 'mmaModBook';
export const ADDON_MOD_BOOK_PAGE_NAME = 'mod_book';
export const ADDON_MOD_BOOK_MODNAME = 'book';

export const ADDON_MOD_BOOK_FEATURE_NAME = CORE_COURSE_MODULE_FEATURE_PREFIX + ADDON_MOD_BOOK_COMPONENT;

/**
 * Constants to define how the chapters and subchapters of a book should be displayed in that table of contents.
 */
export const enum AddonModBookNumbering {
    NONE = 0,
    NUMBERS = 1,
    BULLETS = 2,
    INDENTED = 3,
}

/**
 * Constants to define the navigation style used within a book.
 */
export const enum AddonModBookNavStyle {
    TOC_ONLY = 0,
    IMAGE = 1,
    TEXT = 2,
}
