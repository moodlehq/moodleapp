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
import { marked } from 'marked';

import { story } from '@/storybook/utils/helpers';

import { CoreEmptyBoxComponent } from '@components/empty-box/empty-box';
import { CoreEmptyBoxWrapperComponent } from './components/empty-box-wrapper/empty-box-wrapper';
import { CoreEmptyBoxPageComponent } from './components/empty-box-page/empty-box-page';
import { CoreComponentsStorybookModule } from './components/components.module';

interface Args {
    icon: string;
    content: string;
    dimmed: boolean;
}

export default <Meta<Args>> {
    title: 'Core/Empty Box',
    component: CoreEmptyBoxComponent,
    decorators: [
        moduleMetadata({ imports: [CoreComponentsStorybookModule] }),
    ],
    argTypes: {
        icon: {
            control: {
                type: 'select',
                options: ['fas-magnifying-glass', 'fas-user', 'fas-check'],
            },
        },
    },
    args: {
        icon: 'fas-user',
        content: 'No users',
        dimmed: false,
    },
};

const WrapperTemplate = story<Args>((args) => ({
    component: CoreEmptyBoxWrapperComponent,
    props: {
        ...args,
        content: marked(args.content),
    },
}));

const PageTemplate = story<Args>((args) => ({
    component: CoreEmptyBoxPageComponent,
    props: {
        ...args,
        content: marked(args.content),
    },
}));

export const Primary = story<Args>(WrapperTemplate);

export const Example = story<Args>(PageTemplate, {
    icon: 'fas-magnifying-glass',
    content: '**No results for "Test Search"**\n\n<small>Check for typos or try using different keywords</small>',
});

export const DimmedExample = story<Args>(PageTemplate, {
    icon: 'fas-magnifying-glass',
    content: 'What are you searching for?',
    dimmed: true,
});
