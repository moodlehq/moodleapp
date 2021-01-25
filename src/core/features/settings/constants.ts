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

/**
 * Settings section.
 */
export type CoreSettingsSection = {
    name: string;
    path: string;
    icon: string;
};

/**
 * Settings constants.
 */
export class CoreSettingsConstants {

    static readonly SECTIONS: CoreSettingsSection[] = [
        {
            name: 'general',
            path: 'general',
            icon: 'fas-wrench',
        },
        {
            name: 'spaceusage',
            path: 'spaceusage',
            icon: 'fas-tasks',
        },
        {
            name: 'synchronization',
            path: 'sync',
            icon: 'fas-sync-alt',
        },
        // @TODO sharedfiles
        {
            name: 'about',
            path: 'about',
            icon: 'fas-id-card',
        },
    ];

}
