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

import { useTranslations } from '@/testing/utils';
import { CoreDurationPipe } from '../duration';
import { CoreTime } from '@static/time';

describe('CoreDurationPipe', () => {
    beforeEach(async () => {
        await CoreTime.initialize();
        await useTranslations('en');
    });

    it('should return correct duration in default language', () => {
        const pipe = new CoreDurationPipe();
        expect(pipe.transform(10)).toEqual('10 secs');
        expect(pipe.transform(60)).toEqual('1 min');
        expect(pipe.transform(90)).toEqual('1 min 30 secs');
        expect(pipe.transform(3600)).toEqual('1 hour');
        expect(pipe.transform(3665, 3)).toEqual('1 hour 1 min 5 secs');
        expect(pipe.transform(3665)).toEqual('1 hour 1 min');
        expect(pipe.transform(86400)).toEqual('1 day');
        expect(pipe.transform(86450)).toEqual('1 day 50 secs');
    });

    it('should update value when language changes', async () => {
        const pipe = new CoreDurationPipe();
        expect(pipe.transform(10)).toContain('secs');

        await useTranslations('es');

        expect(pipe.transform(10)).toContain('segundos');
    });
});
