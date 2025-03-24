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

export const PARTICIPANTS_PAGE_NAME = 'participants';

// Events.
export const CORE_USER_AUTO_SYNCED = 'core_user_autom_synced';

/**
 * Profile picture updated event.
 */
export const CORE_USER_PROFILE_REFRESHED = 'CoreUserProfileRefreshed';

/**
 * Profile picture updated event.
 */
export const CORE_USER_PROFILE_PICTURE_UPDATED = 'CoreUserProfilePictureUpdated';

/**
 * Value set in timezone when using the server's timezone.
 */
export const CORE_USER_PROFILE_SERVER_TIMEZONE = '99';

/**
 * Fake ID for a "no reply" user.
 */
export const CORE_USER_NOREPLY_USER = -10;

/**
 * Max of participants to retrieve in each WS call.
 */
export const CORE_USER_PARTICIPANTS_LIST_LIMIT = 50;
