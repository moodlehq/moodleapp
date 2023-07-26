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

export const ADDON_MOD_WORKSHOP_COMPONENT = 'mmaModWorkshop';

// Routing.
export const ADDON_MOD_WORKSHOP_PAGE_NAME = 'mod_workshop';

// Handlers.
export const ADDON_MOD_WORKSHOP_PREFETCH_NAME = 'AddonModWorkshop';
export const ADDON_MOD_WORKSHOP_PREFETCH_MODNAME = 'workshop';
export const ADDON_MOD_WORKSHOP_PREFETCH_COMPONENT = ADDON_MOD_WORKSHOP_COMPONENT;
export const ADDON_MOD_WORKSHOP_PREFETCH_UPDATE_NAMES = new RegExp(
    [
        '^configuration$',
        '^.*files$',
        '^completion',
        '^gradeitems$',
        '^outcomes$',
        '^submissions$',
        '^assessments$' +
        '^assessmentgrades$',
        '^usersubmissions$',
        '^userassessments$',
        '^userassessmentgrades$',
        '^userassessmentgrades$',
    ].join('|'),
);

export const ADDON_MOD_WORKSHOP_SYNC_CRON_NAME = 'AddonModWorkshopSyncCronHandler';
