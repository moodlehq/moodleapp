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

import { CoreDateDayOrTimePipe } from '../date-day-or-time';
import { fakeTime, useTranslations } from '@/testing/utils';
import { CoreTime } from '@static/time';

describe('CoreDateDayOrTimePipe', () => {
    beforeEach(async () => {
        await CoreTime.initialize();
        await useTranslations('en');
        fakeTime();
    });

    it('should return correct day or time in default language', () => {
        const pipe = new CoreDateDayOrTimePipe();

        const now = Math.floor(Date.now() / 1000);
        expect(pipe.transform(now)).toEqual('09:02 AM');

        const lastDay = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
        expect(pipe.transform(lastDay)).toEqual('Fri');

        const lastWeek = Math.floor(Date.now() / 1000) - 6 * 24 * 60 * 60;
        expect(pipe.transform(lastWeek)).toEqual('Sun');

        const lastMonth = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
        expect(pipe.transform(lastMonth)).toEqual('02/01/14');
    });

    it('should update value when language changes', async () => {
        const pipe = new CoreDateDayOrTimePipe();
        const now = Math.floor(Date.now() / 1000);

        expect(pipe.transform(now)).toEqual('09:02 AM');

        await useTranslations('es');

        expect(pipe.transform(now)).toEqual('09:02');
    });
});
