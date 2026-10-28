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

import { registerPlugin } from '@capacitor/core';

const DiskSpacePlugin = registerPlugin<DiskSpacePlugin>('MoodleAppDiskSpace');

/**
 * Allows retrieving the free space of the storage volume where the app stores its files.
 */
export class DiskSpace {

    /**
     * Get the free space of the whole storage volume where the app stores its files, not only the app folder.
     *
     * @returns Free space in bytes.
     */
    async getFreeSpace(): Promise<number> {
        const { free } = await DiskSpacePlugin.getFreeSpace();

        return free;
    }

}

type DiskSpacePlugin = {
    getFreeSpace(): Promise<{ free: number }>;
};
