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

import { CoreCourseImageComponent } from '@components/course-image/course-image';
import { APP_INITIALIZER } from '@angular/core';
import { CoreSitesStub } from '@/storybook/stubs/services/sites';
import { CoreCourseImageListPageComponent } from '@components/stories/components/course-image-list-page/course-image-list-page';
import { CoreComponentsStorybookModule } from '@components/stories/components/components.module';
import { CoreCourseImageCardsPageComponent } from '@components/stories/components/course-image-cards-page/course-image-cards-page';

interface Args {
    type: 'image' | 'geopattern' | 'color';
    fill: boolean;
}

export default <Meta> {
    title: 'Core/Course Image',
    component: CoreCourseImageComponent,
    decorators: [
        moduleMetadata({
            imports: [CoreComponentsStorybookModule],
            providers: [
                {
                    provide: APP_INITIALIZER,
                    multi: true,
                    useValue: () => {
                        const site = CoreSitesStub.getRequiredCurrentSite();

                        site.stubWSResponse('tool_mobile_get_config', {
                            settings: [
                                { name: 'core_admin_coursecolor1', value: '#F9B000' },
                                { name: 'core_admin_coursecolor2', value: '#EF4B00' },
                                { name: 'core_admin_coursecolor3', value: '#4338FB' },
                                { name: 'core_admin_coursecolor4', value: '#E142FB' },
                                { name: 'core_admin_coursecolor5', value: '#FF0064' },
                                { name: 'core_admin_coursecolor6', value: '#FF0F18' },
                                { name: 'core_admin_coursecolor7', value: '#039B06' },
                                { name: 'core_admin_coursecolor8', value: '#039B88' },
                                { name: 'core_admin_coursecolor9', value: '#EF009B' },
                                { name: 'core_admin_coursecolor10', value: '#020B6E' },
                            ],
                            warnings: [],
                        });
                    },
                },
            ],
        }),
    ],
    argTypes: {
        type: {
            control: {
                type: 'select',
                options: ['image', 'geopattern', 'color'],
            },
        },
    },
    args: {
        type: 'image',
        fill: false,
    },
};

const Template = story<Args>(({ type, ...args }) => {
    const getImageSource = () => {
        switch (type) {
            case 'image':
                return 'https://picsum.photos/500/500';
            case 'geopattern':
                return 'assets/storybook/geopattern.svg';
            case 'color':
                return undefined;
        }
    };

    return {
        component: CoreCourseImageComponent,
        props: {
            ...args,
            course: {
                id: 1,
                courseimage: getImageSource(),
            },
        },
    };
});

export const Primary = story(Template);
export const ListPage = story(() => ({ component: CoreCourseImageListPageComponent }));
export const CardsPage = story(() => ({ component: CoreCourseImageCardsPageComponent }));
