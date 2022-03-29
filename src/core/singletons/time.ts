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

import moment from 'moment';

/**
 * Singleton with helper functions for time operations.
 */
export class CoreTime {

    /**
     * Returns years, months, days, hours, minutes and seconds in a human readable format.
     *
     * @param seconds A number of seconds
     * @param precision Number of elements to have in precision.
     * @return Seconds in a human readable format.
     */
    static formatTime(seconds: number, precision = 2): string {
        precision = precision || 6; // Use max precision if 0 is passed.

        const eventDuration = moment.duration(Math.abs(seconds), 'seconds');
        let durationString = '';

        if (precision && eventDuration.years() > 0) {
            durationString += ' ' + moment.duration(eventDuration.years(), 'years').humanize();
            precision--;
        }
        if (precision && eventDuration.months() > 0) {
            durationString += ' ' + moment.duration(eventDuration.months(), 'months').humanize();
            precision--;
        }
        if (precision && eventDuration.days() > 0) {
            durationString += ' ' + moment.duration(eventDuration.days(), 'days').humanize();
            precision--;
        }
        if (precision && eventDuration.hours() > 0) {
            durationString += ' ' + moment.duration(eventDuration.hours(), 'hours').humanize();
            precision--;
        }
        if (precision && eventDuration.minutes() > 0) {
            durationString += ' ' + moment.duration(eventDuration.minutes(), 'minutes').humanize();
            precision--;
        }
        if (precision && (eventDuration.seconds() > 0 || !durationString)) {
            durationString += ' ' + moment.duration(eventDuration.seconds(), 'seconds').humanize();
            precision--;
        }

        return durationString.trim();
    }

    /**
     * Converts a number of seconds into a short human readable format: minutes and seconds, in fromat: 3' 27''.
     *
     * @param seconds Seconds
     * @return Short human readable text.
     */
    static formatTimeShort(duration: number): string {
        const minutes = Math.floor(duration / 60);
        const seconds = duration - minutes * 60;
        const durations = <string[]>[];

        if (minutes > 0) {
            durations.push(minutes + '\'');
        }

        if (seconds > 0 || minutes === 0) {
            durations.push(seconds + '\'\'');
        }

        return durations.join(' ');
    }

    /**
     * Wrap a function so that it is called only once.
     *
     * @param fn Function.
     * @return Wrapper that will call the underlying function only once.
     */
    static once<T extends unknown[]>(fn: (...args: T) => unknown): (...args: T) => void {
        let called = false;

        return (...args: T) => {
            if (called) {
                return;
            }

            called = true;
            fn.apply(null, args);
        };
    }

}
