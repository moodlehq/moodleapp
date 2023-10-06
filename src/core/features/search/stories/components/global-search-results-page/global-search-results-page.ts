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
        {
            id: 6,
            url: '',
            title: 'Side block',
            context: {
                courseName: 'Moodle Site',
            },
            component: {
                name: 'block_html',
                iconurl: 'https://master.mm.moodledemo.net/theme/image.php?theme=boost&component=core&image=e%2Fanchor',
            },
        },
        {
            id: 7,
            url: '',
            title: 'Course section',
            context: {
                courseName: 'Course 101',
            },
            component: {
                name: 'core_course',
                iconurl: 'https://master.mm.moodledemo.net/theme/image.php?theme=boost&component=core&image=i%2Fsection',
            },
        },
        {
            id: 8,
            url: '',
            title: 'This item has long text everywhere, so make sure that it looks good anyways. ' +
                'Even if the screen you\'re using is also big, this should still be a problem because this text is *really* long.',
            content: 'You would normally see lorem ipsum here, but we decided to just write some gibberish here to make it more ' +
                'real. We all know that lorem ipsum is fabricated text, and even though it serves its purpose, it isn\'t as ' +
                'engaging as some real, hand-crafted text (not sure why this should be engaging, anyways).',
            context: {
                courseName: 'And it\'s not just the title, either. Other things like the Course title also take more than ' +
                    'you would expect in a normal site (or even not so normal).',
                userName: 'To top it off, it has a user name as well! What is this madness? Well, at some point you just have to ' +
                    'get creative. Honestly, I\'m surprised if you\'re even reading this. Kudos to you for being thorough.',
            },
            module: {
                name: 'book',
                iconurl: 'assets/img/mod/book.svg',
                area: '',
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
