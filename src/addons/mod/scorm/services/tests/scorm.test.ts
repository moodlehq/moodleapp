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

import { AddonModScormProvider, AddonModScormDataValue } from '@addons/mod/scorm/services/scorm';

describe('AddonModScormProvider', () => {

    let scormProvider: AddonModScormProvider;

    beforeEach(() => {
        scormProvider = new AddonModScormProvider();
    });

    describe('evalPrerequisites', () => {

        /**
         * Helper to build track data for a set of SCOs, given only their status.
         *
         * @param statuses Map of SCO identifier to status.
         * @returns Track data as expected by evalPrerequisites.
         */
        function trackDataFor(statuses: Record<string, string>): Record<string, Record<string, AddonModScormDataValue>> {
            const trackData: Record<string, Record<string, AddonModScormDataValue>> = {};

            for (const identifier in statuses) {
                trackData[identifier] = { status: statuses[identifier] };
            }

            return trackData;
        }

        it('evaluates a simple AND expression', () => {
            const prerequisites = 'sco1 & sco2';

            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'completed',
                sco2: 'passed',
            }))).toBe(true);

            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'completed',
                sco2: 'incomplete',
            }))).toBe(false);
        });

        it('evaluates a simple OR expression', () => {
            const prerequisites = 'sco1|sco2';

            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'notattempted',
                sco2: 'passed',
            }))).toBe(true);

            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'notattempted',
                sco2: 'notattempted',
            }))).toBe(false);
        });

        it('evaluates negation using ~', () => {
            expect(scormProvider.evalPrerequisites('~sco1', trackDataFor({ sco1: 'incomplete' }))).toBe(true);
            expect(scormProvider.evalPrerequisites('~sco1', trackDataFor({ sco1: 'completed' }))).toBe(false);
        });

        it('evaluates set expressions (N*{...})', () => {
            const prerequisites = '2*{sco1,sco2,sco3}';

            // Exactly 2 out of 3 completed/passed, threshold met.
            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'completed',
                sco2: 'incomplete',
                sco3: 'passed',
            }))).toBe(true);

            // Only 1 out of 3 completed/passed, threshold not met.
            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'completed',
                sco2: 'incomplete',
                sco3: 'incomplete',
            }))).toBe(false);
        });

        it('evaluates equality and inequality comparisons (=, <>)', () => {
            expect(scormProvider.evalPrerequisites('cmi.core.exit=logout', trackDataFor({
                'cmi.core.exit': 'logout',
            }))).toBe(true);

            expect(scormProvider.evalPrerequisites('cmi.core.exit=logout2', trackDataFor({
                'cmi.core.exit': 'logout',
            }))).toBe(false);

            expect(scormProvider.evalPrerequisites('cmi.core.exit<>logout', trackDataFor({
                'cmi.core.exit': 'logout',
            }))).toBe(false);

            expect(scormProvider.evalPrerequisites('cmi.core.exit<>logout2', trackDataFor({
                'cmi.core.exit': 'logout',
            }))).toBe(true);
        });

        it('maps shorthand status codes (p, c, f, i, b, n) in comparisons', () => {
            expect(scormProvider.evalPrerequisites('sco1=p', trackDataFor({ sco1: 'passed' }))).toBe(true);
            expect(scormProvider.evalPrerequisites('sco1=c', trackDataFor({ sco1: 'completed' }))).toBe(true);
            expect(scormProvider.evalPrerequisites('sco1=f', trackDataFor({ sco1: 'failed' }))).toBe(true);
            expect(scormProvider.evalPrerequisites('sco1=i', trackDataFor({ sco1: 'incomplete' }))).toBe(true);
            expect(scormProvider.evalPrerequisites('sco1=b', trackDataFor({ sco1: 'browsed' }))).toBe(true);
            expect(scormProvider.evalPrerequisites('sco1=n', trackDataFor({ sco1: 'notattempted' }))).toBe(true);
        });

        it('expands &amp; entities before evaluating', () => {
            const prerequisites = 'sco1&amp;sco2';

            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'completed',
                sco2: 'passed',
            }))).toBe(true);

            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'completed',
                sco2: 'incomplete',
            }))).toBe(false);
        });

        it('treats SCOs missing from track data as not fulfilling the prerequisite', () => {
            expect(scormProvider.evalPrerequisites('sco99', {})).toBe(false);
        });

        it('respects operator precedence, evaluating && before ||', () => {
            // sco1 is false, but sco3 is true, so the || branch should make the whole expression true.
            expect(scormProvider.evalPrerequisites('sco1&sco2|sco3', trackDataFor({
                sco1: 'notattempted',
                sco2: 'notattempted',
                sco3: 'passed',
            }))).toBe(true);

            // sco1 is true, short-circuiting the || regardless of sco2 and sco3.
            expect(scormProvider.evalPrerequisites('sco1|sco2&sco3', trackDataFor({
                sco1: 'passed',
                sco2: 'notattempted',
                sco3: 'notattempted',
            }))).toBe(true);

            // Neither branch is fulfilled.
            expect(scormProvider.evalPrerequisites('sco1&sco2|sco3', trackDataFor({
                sco1: 'passed',
                sco2: 'notattempted',
                sco3: 'notattempted',
            }))).toBe(false);
        });

        it('evaluates parentheses to override operator precedence', () => {
            // With no parentheses, result would be true because of the || branch with sco3.
            let prerequisites = 'sco1&(sco2|sco3)';
            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'notattempted',
                sco2: 'notattempted',
                sco3: 'passed',
            }))).toBe(false);

            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'passed',
                sco2: 'notattempted',
                sco3: 'passed',
            }))).toBe(true);

            // Nested parentheses now.
            prerequisites = 'sco1&((sco2|sco3)&sco4)';
            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'notattempted',
                sco2: 'passed',
                sco3: 'passed',
                sco4: 'passed',
            }))).toBe(false);

            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'passed',
                sco2: 'notattempted',
                sco3: 'notattempted',
                sco4: 'passed',
            }))).toBe(false);

            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'passed',
                sco2: 'passed',
                sco3: 'notattempted',
                sco4: 'notattempted',
            }))).toBe(false);

            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'passed',
                sco2: 'passed',
                sco3: 'notattempted',
                sco4: 'passed',
            }))).toBe(true);
        });

        it('evaluates complex expressions combining parentheses, negation, sets and comparisons', () => {
            const prerequisites = '(sco1&sco2)|(sco3&~sco4)';

            // First branch fulfilled: sco1 completed and sco2 passed.
            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'completed',
                sco2: 'passed',
                sco3: 'incomplete',
                sco4: 'incomplete',
            }))).toBe(true);

            // Second branch fulfilled: sco3 completed and sco4 not completed (negated).
            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'notattempted',
                sco2: 'passed',
                sco3: 'completed',
                sco4: 'incomplete',
            }))).toBe(true);

            // Neither branch fulfilled.
            expect(scormProvider.evalPrerequisites(prerequisites, trackDataFor({
                sco1: 'notattempted',
                sco2: 'passed',
                sco3: 'completed',
                sco4: 'completed',
            }))).toBe(false);

            const complexPrerequisites = '2*{sco1,sco2,sco3}&(sco4=logout|~sco5)';

            expect(scormProvider.evalPrerequisites(complexPrerequisites, trackDataFor({
                sco1: 'completed',
                sco2: 'passed',
                sco3: 'incomplete',
                sco4: 'logout',
                sco5: 'completed',
            }))).toBe(true);

            expect(scormProvider.evalPrerequisites(complexPrerequisites, trackDataFor({
                sco1: 'completed',
                sco2: 'incomplete',
                sco3: 'incomplete',
                sco4: 'logout',
                sco5: 'completed',
            }))).toBe(false);
        });
    });

});
