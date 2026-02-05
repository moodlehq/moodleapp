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

import { CoreTime } from '@static/time';
import { CoreTimeAgoPipe } from '../time-ago';
import { useTranslations } from '@/testing/utils';

describe('CoreTimeAgoPipe', () => {
    beforeEach(async () => {
        await CoreTime.initialize();
        await useTranslations('en');
    });

    it('should return correct time ago in default language', () => {
        const pipe = new CoreTimeAgoPipe();
        const now = Math.floor(Date.now() / 1000);
        expect(pipe.transform(now - 10)).toEqual('a few seconds ago');
        expect(pipe.transform(now - 60)).toEqual('a minute ago');
        expect(pipe.transform(now - 120)).toEqual('2 minutes ago');
        expect(pipe.transform(now - 3600)).toEqual('an hour ago');
        expect(pipe.transform(now - 10800)).toEqual('3 hours ago');
        expect(pipe.transform(now - 86400)).toEqual('a day ago');
        expect(pipe.transform(now - 345600)).toEqual('4 days ago');
    });

    it('should update value when language changes', async () => {
        const pipe = new CoreTimeAgoPipe();
        const now = Math.floor(Date.now() / 1000);
        expect(pipe.transform(now - 10)).toEqual('a few seconds ago');

        await useTranslations('es');
        expect(pipe.transform(now - 10)).toEqual('hace unos segundos');
    });
});
