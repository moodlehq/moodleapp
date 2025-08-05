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

export enum CoreBlocksRegion {
    CONTENT = 'content',
    MAIN = 'main',
    SIDE = 'side', // Used as a prefix for side blocks. (side-pre, side-post).
    FORCED = 'forced', // Special region for blocks that are always shown. See usage in app.
}

export const CORE_BLOCKS_DASHBOARD_FALLBACK_MYOVERVIEW_BLOCK = 'myoverview';

export const CORE_BLOCKS_DASHBOARD_FALLBACK_BLOCKS = [
    CORE_BLOCKS_DASHBOARD_FALLBACK_MYOVERVIEW_BLOCK,
    'timeline',
];
