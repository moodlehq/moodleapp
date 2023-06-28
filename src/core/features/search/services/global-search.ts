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

import { CoreCourseListItem } from '@features/courses/services/courses';
import { CoreUserWithAvatar } from '@components/user-avatar/user-avatar';

export type CoreSearchGlobalSearchResult = {
    id: number;
    title: string;
    url: string;
    content?: string;
    context?: CoreSearchGlobalSearchResultContext;
    module?: CoreSearchGlobalSearchResultModule;
    course?: CoreCourseListItem;
    user?: CoreUserWithAvatar;
};

export type CoreSearchGlobalSearchResultContext = {
    userName?: string;
    courseName?: string;
};

export type CoreSearchGlobalSearchResultModule = {
    name: string;
    iconurl: string;
    area: string;
};
