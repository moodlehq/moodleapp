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

import { Meta, moduleMetadata } from '@storybook/angular';

import { story } from '@/storybook/utils/helpers';

import { CoreSearchGlobalSearchResultComponent } from '@features/search/components/global-search-result/global-search-result';
import { CoreSearchComponentsStorybookModule } from '@features/search/stories/components/components.module';
import {
    CoreSearchGlobalSearchResultsPageComponent,
} from '@features/search/stories/components/global-search-results-page/global-search-results-page';
import { APP_INITIALIZER } from '@angular/core';
import { CoreCourseModuleDelegate } from '@features/course/services/module-delegate';
import { AddonModForumModuleHandler } from '@addons/mod/forum/services/handlers/module';
import { AddonModAssignModuleHandler } from '@addons/mod/assign/services/handlers/module';
import { CoreSearchGlobalSearchResult } from '@features/search/services/global-search';
import { CoreUserWithAvatar } from '@components/user-avatar/user-avatar';
import { CoreCourseListItem } from '@features/courses/services/courses';
import courses from '@/assets/storybook/courses.json';

interface Args {
    title: string;
    content: string;
    image: 'course' | 'user' | 'none';
    module: 'forum-activity' | 'forum-post' | 'assign' | 'none';
    courseContext: boolean;
    userContext: boolean;
    showCourse: boolean;
}

export default <Meta<Args>> {
    title: 'Core/Search/Global Search Result',
    component: CoreSearchGlobalSearchResultComponent,
    decorators: [
        moduleMetadata({
            imports: [CoreSearchComponentsStorybookModule],
            providers: [
                {
                    provide: APP_INITIALIZER,
                    multi: true,
                    useValue() {
                        CoreCourseModuleDelegate.registerHandler(AddonModForumModuleHandler.instance);
                        CoreCourseModuleDelegate.registerHandler(AddonModAssignModuleHandler.instance);
                        CoreCourseModuleDelegate.updateHandlers();
                    },
                },
            ],
        }),
    ],
    argTypes: {
        image: {
            control: {
                type: 'select',
                options: ['course', 'user', 'none'],
            },
        },
        module: {
            control: {
                type: 'select',
                options: ['forum-activity', 'forum-post', 'assign', 'none'],
            },
        },
    },
    args: {
        title: 'Result #1',
        content: 'This item seems really interesting, maybe you should click through',
        image: 'none',
        module: 'none',
        courseContext: false,
        userContext: false,
        showCourse: true,
    },
    parameters: {
        design: {
            type: 'figma',
            url: 'https://www.figma.com/file/h3E7pkfgyImJPaYmTfnwuF/Global-Search?node-id=118%3A4610',
        },
    },
};

const Template = story<Args>(({ image, courseContext, userContext, module, showCourse, ...args }) => {
    const result: CoreSearchGlobalSearchResult = {
        ...args,
        id: 1,
        url: '',
    };

    if (courseContext || userContext) {
        result.context = {
            courseName: courseContext ? 'Course 101' : undefined,
            userName: userContext ? 'John Doe' : undefined,
        };
    }

    if (module !== 'none') {
        const name = module.startsWith('forum') ? 'forum' : module;

        result.module = {
            name,
            iconurl: `assets/img/mod/${name}.svg`,
            area: module.startsWith('forum') ? module.substring(6) : '',
        };
    }

    switch (image) {
        case 'course':
            result.course = courses[0] as CoreCourseListItem;
            break;
        case 'user':
            result.user = {
                fullname: 'John Doe',
                profileimageurl: 'https://placekitten.com/300/300',
            } as CoreUserWithAvatar;
            break;
    }

    return {
        component: CoreSearchGlobalSearchResultComponent,
        props: { result, showCourse },
    };
});

export const Primary = story<Args>(Template);
export const ResultsPage = story<Args>(() => ({ component: CoreSearchGlobalSearchResultsPageComponent }));
