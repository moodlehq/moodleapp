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

export const ADDON_MOD_SURVEY_COMPONENT = 'mmaModSurvey';

// Routing.
export const ADDON_MOD_SURVEY_PAGE_NAME = 'mod_survey';

// Handlers.
export const ADDON_MOD_SURVEY_PREFETCH_NAME = 'AddonModSurvey';
export const ADDON_MOD_SURVEY_PREFETCH_MODNAME = 'survey';
export const ADDON_MOD_SURVEY_PREFETCH_COMPONENT = ADDON_MOD_SURVEY_COMPONENT;
export const ADDON_MOD_SURVEY_PREFETCH_UPDATE_NAMES = /^configuration$|^.*files$|^answers$/;

export const ADDON_MOD_SURVEY_SYNC_CRON_NAME = 'AddonModSurveySyncCronHandler';

export const ADDON_MOD_SURVEY_AUTO_SYNCED = 'addon_mod_survey_autom_synced';
