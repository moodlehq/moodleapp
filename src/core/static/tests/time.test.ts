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

import { mockSingleton, mockTranslate } from '@/testing/utils';
import { CoreTime } from '@static/time';
import { dayjs } from '@/core/utils/dayjs';
import { CorePlatform } from '@services/platform';

describe('CoreTime', () => {

    beforeEach(async () => {
        mockSingleton(CorePlatform, { isAutomated: () => true });

        await CoreTime.initialize();
    });

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

    it('should convert PHP format to DayJS format', () => {
        expect(CoreTime.convertPHPToJSDateFormat('%Y-%m-%d')).toEqual('YYYY[-]MM[-]DD');
        expect(CoreTime.convertPHPToJSDateFormat('%H:%M:%S')).toEqual('HH[:]mm[:]ss');
        expect(CoreTime.convertPHPToJSDateFormat('%A, %B %d, %Y')).toEqual('dddd[, ]MMMM[ ]DD[, ]YYYY');
        expect(CoreTime.convertPHPToJSDateFormat('%I:%M %p')).toEqual('hh[:]mm[ ]A');
        expect(CoreTime.convertPHPToJSDateFormat('%d/%m/%Y')).toEqual('DD[/]MM[/]YYYY');
        expect(CoreTime.convertPHPToJSDateFormat('%m-%d-%Y')).toEqual('MM[-]DD[-]YYYY');
        expect(CoreTime.convertPHPToJSDateFormat('%Y/%m/%d %H:%M:%S')).toEqual('YYYY[/]MM[/]DD[ ]HH[:]mm[:]ss');
        expect(CoreTime.convertPHPToJSDateFormat('%a, %I %p')).toEqual('ddd[, ]hh[ ]A');
        expect(CoreTime.convertPHPToJSDateFormat(123 as any)).toEqual(''); // eslint-disable-line @typescript-eslint/no-explicit-any
    });

    it('should fix format for ion-datetime', () => {
        expect(CoreTime.fixFormatForDatetime('[YYYY-MM-DD]')).toEqual('YYYY-MM-DD');
        expect(CoreTime.fixFormatForDatetime('hh:mm A')).toEqual('HH:mm');
        expect(CoreTime.fixFormatForDatetime('')).toEqual('');
        expect(CoreTime.fixFormatForDatetime('DD/MM/YYYY')).toEqual('DD/MM/YYYY');
        expect(CoreTime.fixFormatForDatetime('MM-DD-YYYY')).toEqual('MM-DD-YYYY');
        expect(CoreTime.fixFormatForDatetime('YYYY/MM/DD HH:mm:ss')).toEqual('YYYY/MM/DD HH:mm:ss');
        expect(CoreTime.fixFormatForDatetime('ddd, hA')).toEqual('ddd, H');
    });

    it('should return readable timestamp', () => {
        expect(Number(CoreTime.readableTimestamp())).not.toBeNaN();
    });

    it('should return current timestamp in seconds', () => {
        expect(CoreTime.timestamp()).toBeLessThan(10000000000);
        expect(CoreTime.timestamp()).toBeLessThan(10000000000);
    });

    it('should convert timestamp to readable date', () => {
        mockTranslate({
            'core.strftimedaydatetime': '%Y-%m-%d %H:%M:%S',
            'core.strftimemonthyear': '%B %Y',
        });
        expect(CoreTime.userDate(1641027600000)).toEqual('2022-01-1 17:00:00');
        expect(CoreTime.userDate(1641027600000, 'core.strftimemonthyear')).toEqual('January 2022');

        expect(CoreTime.userDate(0)).toEqual('1970-01-1 08:00:00');
        expect(CoreTime.userDate(0, 'core.strftimemonthyear')).toEqual('January 1970');
        expect(CoreTime.userDate(946684800000)).toEqual('2000-01-1 08:00:00');
        expect(CoreTime.userDate(946684800000, 'core.strftimemonthyear')).toEqual('January 2000');
        expect(CoreTime.userDate(1672531199000, undefined, true, false)).toEqual('2023-01-01 07:59:59');
        expect(CoreTime.userDate(1672531199000, 'core.strftimemonthyear')).toEqual('January 2023');
    });

    it('should convert timestamp to datetime format', () => {
        expect(CoreTime.toDatetimeFormat(1641027600000)).toEqual('2022-01-01T17:00');
        expect(CoreTime.toDatetimeFormat()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

    });

    it('should return localized date format', () => {
        expect(CoreTime.getLocalizedDateFormat('L')).toEqual(dayjs.localeData().longDateFormat('L'));
    });

    it('should return midnight for given timestamp', () => {
        expect(CoreTime.getMidnightForTimestamp(1641027600)).toEqual(1640966400);
        expect(CoreTime.getMidnightForTimestamp(1640966400)).toEqual(1640966400);
        expect(CoreTime.getMidnightForTimestamp(0)).toEqual(-28800);
        expect(CoreTime.getMidnightForTimestamp(946656000)).toEqual(946656000);
    });

    it('should return default max year for datetime inputs', () => {
        const currentYear = new Date().getFullYear();
        expect(CoreTime.getDatetimeDefaultMax()).toEqual(String(currentYear + 20));
    });

    it('should return default min year for datetime inputs', () => {
        const currentYear = new Date().getFullYear();
        expect(CoreTime.getDatetimeDefaultMin()).toEqual(String(currentYear - 20));
    });

    it('should translate legacy timezone names', () => {
        expect(CoreTime.translateLegacyTimezone('-13.0')).toEqual('Australia/Perth');
        expect(CoreTime.translateLegacyTimezone('5.5')).toEqual('Asia/Kolkata');
        expect(CoreTime.translateLegacyTimezone('unknown')).toEqual('unknown');
    });

    it('should ensure timestamp is in milliseconds', () => {
        expect(CoreTime.ensureMilliseconds(1641027600)).toEqual(1641027600000);
        expect(CoreTime.ensureMilliseconds(1641027600000)).toEqual(1641027600000);
    });

    it('should ensure timestamp is in seconds', () => {
        expect(CoreTime.ensureSeconds(1641027600000)).toEqual(1641027600);
        expect(CoreTime.ensureSeconds(1641027600)).toEqual(1641027600);
    });
});
