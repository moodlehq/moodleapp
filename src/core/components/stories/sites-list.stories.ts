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
import { CoreSitesListComponent } from '@components/sites-list/sites-list';
import { CoreSitesListWrapperComponent } from './components/sites-list-wrapper/sites-list-wrapper';
import { CoreComponentsStorybookModule } from './components/components.module';

interface Args {
    sitesClickable: boolean;
    currentSiteClickable: 'true' | 'false' | 'undefined';
    extraText: 'text' | 'badge' | 'none';
    extraDetails: 'delete-button' | 'badge' | 'none';
}

export default <Meta<Args>> {
    title: 'Core/Sites List',
    component: CoreSitesListComponent,
    decorators: [
        moduleMetadata({ imports: [CoreComponentsStorybookModule] }),
    ],
    argTypes: {
        sitesClickable: {
            control: {
                type: 'boolean',
            },
        },
        currentSiteClickable: {
            control: {
                type: 'select',
                options: ['true', 'false', 'undefined'],
            },
        },
        extraText: {
            control: {
                type: 'select',
                options: ['text', 'badge', 'none'],
            },
        },
        extraDetails: {
            control: {
                type: 'select',
                options: ['delete-button', 'badge', 'none'],
            },
        },
    },
    args: {
        sitesClickable: false,
        currentSiteClickable: 'undefined',
        extraText: 'none',
        extraDetails: 'none',
    },
};

const Template = story<Args>(({ sitesClickable, currentSiteClickable, extraText, extraDetails }) => ({
    component: CoreSitesListWrapperComponent,
    props: {
        sitesClickable,
        currentSiteClickableSelect: currentSiteClickable,
        extraText,
        extraDetails,
    },
}));

export const Primary = story<Args>(Template);
