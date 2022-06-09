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

import { mockTranslate } from '@/testing/utils';
import { CoreTime } from '@singletons/time';

describe('CoreTime singleton', () => {

    it('formats time in a human readable format', () => {
        mockTranslate({
            'core.days': 'days',
            'core.day': 'day',
            'core.hours': 'hours',
            'core.hour': 'hour',
            'core.mins': 'mins',
            'core.min': 'min',
            'core.now': 'now',
            'core.secs': 'secs',
            'core.sec': 'sec',
            'core.years': 'years',
            'core.year': 'year',
        });

        expect(CoreTime.formatTime(0)).toEqual('now');
        expect(CoreTime.formatTime(-5)).toEqual('5 secs');
        expect(CoreTime.formatTime(61)).toEqual('1 min 1 sec');
        expect(CoreTime.formatTime(7321)).toEqual('2 hours 2 mins');
        expect(CoreTime.formatTime(352861)).toEqual('4 days 2 hours');
        expect(CoreTime.formatTime(31888861)).toEqual('1 year 4 days');
        expect(CoreTime.formatTime(-31888861)).toEqual('1 year 4 days');

        // Test different precisions.
        expect(CoreTime.formatTime(31888861, 1)).toEqual('1 year');
        expect(CoreTime.formatTime(31888861, 3)).toEqual('1 year 4 days 2 hours');
        expect(CoreTime.formatTime(31888861, 4)).toEqual('1 year 4 days 2 hours 1 min');
        expect(CoreTime.formatTime(31888861, 5)).toEqual('1 year 4 days 2 hours 1 min 1 sec');
    });

    it('formats time in a "short" human readable format', () => {
        expect(CoreTime.formatTimeShort(0)).toEqual('0\'\'');
        expect(CoreTime.formatTimeShort(61)).toEqual('1\' 1\'\'');
        expect(CoreTime.formatTimeShort(7321)).toEqual('122\' 1\'\'');
    });

    it('calls a function only once', () => {
        const testFunction = jest.fn();
        const onceFunction = CoreTime.once(testFunction);

        expect(testFunction).not.toHaveBeenCalled();

        onceFunction('foo', 'bar');
        expect(testFunction).toHaveBeenCalledWith('foo', 'bar');

        onceFunction('baz');
        expect(testFunction).toHaveBeenCalledTimes(1);
    });

});
