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

import { CoreMath } from '@static/math';

describe('CoreMath', () => {

    it('clamps values', () => {
        expect(CoreMath.clamp(150, 100, 200)).toEqual(150);
        expect(CoreMath.clamp(25, 100, 200)).toEqual(100);
        expect(CoreMath.clamp(-100, 100, 200)).toEqual(100);
        expect(CoreMath.clamp(500, 100, 200)).toEqual(200);
        expect(CoreMath.clamp(50.55, 100.11, 200.22)).toEqual(100.11);
        expect(CoreMath.clamp(100, -200.22, -100.11)).toEqual(-100.11);
        expect(CoreMath.clamp(-500, -200.22, -100.11)).toEqual(-200.22);
    });

});
