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

import { Component } from '@angular/core';
import { CoreCourseListItem } from '@features/courses/services/courses';
import { CoreUserWithAvatar } from '@components/user-avatar/user-avatar';
import { CoreSearchGlobalSearchResult } from '@features/search/services/global-search';
import courses from '@/assets/storybook/courses.json';

@Component({
    selector: 'core-search-global-search-results-page',
    templateUrl: 'global-search-results-page.html',
})
export class CoreSearchGlobalSearchResultsPageComponent {

    results: CoreSearchGlobalSearchResult[] = [
        {
            id: 1,
            url: '',
            title: 'Activity forum test',
            content: 'this is a content test for a forum to see in the search result.',
            context: {
                courseName: 'Course 102',
                userName: 'Stephania Krovalenko',
            },
            module: {
                name: 'forum',
                iconurl: 'assets/img/mod/forum.svg',
                area: 'activity',
            },
        },
        {
            id: 2,
            url: '',
            title: 'Activity assignment test',
            content: 'this is a content test for a forum to see in the search result.',
            context: {
                courseName: 'Course 102',
            },
            module: {
                name: 'assign',
                iconurl: 'assets/img/mod/assign.svg',
                area: '',
            },
        },
        {
            id: 3,
            url: '',
            title: 'Course 101',
            course: courses[0] as CoreCourseListItem,
        },
        {
            id: 4,
            url: '',
            title: 'John the Tester',
            user: {
                fullname: 'John Doe',
                profileimageurl: 'https://placekitten.com/300/300',
            } as CoreUserWithAvatar,
        },
        {
            id: 5,
            url: '',
            title: 'Search result title',
            content: 'this is a content test for a forum to see in the search result.',
            context: {
                userName: 'Stephania Krovalenko',
            },
            module: {
                name: 'forum',
                iconurl: 'assets/img/mod/forum.svg',
                area: 'post',
            },
        },
    ];

    /**
     * Result clicked.
     *
     * @param title Result title.
     */
    resultClicked(title: string): void {
        alert(`clicked on ${title}`);
    }

}
