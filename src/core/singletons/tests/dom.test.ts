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

import { CoreDom } from '@singletons/dom';

describe('CoreDom singleton', () => {

    it('should return valid size with usual units', () => {
        expect(CoreDom.formatSizeUnits(500)).toBe('500px');
        expect(CoreDom.formatSizeUnits('500')).toBe('500px');
        expect(CoreDom.formatSizeUnits('500px')).toBe('500px');
        expect(CoreDom.formatSizeUnits('50%')).toBe('50%');
    });

    it('should return valid size with units', () => {
        expect(CoreDom.formatSizeUnits('2 em')).toBe('2em');
        expect(CoreDom.formatSizeUnits('1.5rem ')).toBe('1.5rem');
    });

    it('should return valid size with other values', () => {
        expect(CoreDom.formatSizeUnits('auto')).toBe('auto');
        expect(CoreDom.formatSizeUnits('initial')).toBe('initial');
        expect(CoreDom.formatSizeUnits('inherit')).toBe('inherit');
    });

    it('should return empty string for invalid sizes', () => {
        expect(CoreDom.formatSizeUnits('invalid')).toBe('');
        expect(CoreDom.formatSizeUnits('em')).toBe('');
        expect(CoreDom.formatSizeUnits(NaN)).toBe('');
    });

});
