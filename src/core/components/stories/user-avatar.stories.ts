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

import { Meta, moduleMetadata, Story } from '@storybook/angular';

import { story } from '@/storybook/utils/helpers';
import { StorybookModule } from '@/storybook/storybook.module';

import { CoreUserAvatarComponent } from '@components/user-avatar/user-avatar';

export default <Meta> {
    title: 'Core/User Avatar',
    component: CoreUserAvatarComponent,
    decorators: [
        moduleMetadata({
            declarations: [CoreUserAvatarComponent],
            imports: [StorybookModule],
        }),
    ],
};

const Template: Story = () => ({
    component: CoreUserAvatarComponent,
});

export const Primary = story(Template);
