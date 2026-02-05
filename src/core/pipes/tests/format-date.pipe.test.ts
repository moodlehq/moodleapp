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

import { CoreFormatDatePipe } from '../format-date';
import { useTranslations, fakeTime } from '@/testing/utils';
import { CoreTime } from '@static/time';

describe('CoreFormatDatePipe', () => {
    beforeEach(async () => {
        await CoreTime.initialize();
        await useTranslations('en');
        fakeTime();
    });

    it('should return correct formatted date in default language', () => {
        const pipe = new CoreFormatDatePipe();
        const now = Date.now();
        expect(pipe.transform(now, 'strftimedaydatetime')).toContain('Saturday, 1 February 2014, 9:02 AM');
        expect(pipe.transform(now, 'strftimetime')).toContain('9:02 AM');
    });

    it('should update value when language changes', async () => {
        const pipe = new CoreFormatDatePipe();
        const now = Date.now();
        expect(pipe.transform(now, 'strftimedaydatetime')).toContain('Saturday, 1 February 2014, 9:02 AM');

        await useTranslations('es');

        expect(pipe.transform(now, 'strftimedaydatetime')).toContain('sábado, 1 de febrero de 2014, 09:02');
    });
});
