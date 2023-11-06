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

import { CoreSiteFixture } from '@/storybook/stubs/classes/site';

export const companyLisaSite: CoreSiteFixture = {
    id: 'companylisasite',
    info: {
        version: '2022041900',
        sitename: 'Company',
        username: 'lisa',
        firstname: 'Lisa',
        lastname: 'Díaz',
        fullname: 'Lisa Díaz',
        lang: 'en',
        userid: 1,
        siteurl: 'https://company.example.edu',
        userpictureurl: 'https://i.pravatar.cc/300?user=companylisa',
        functions: [],
    },
};
