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

import { CoreIconComponent } from '@components/icon/icon';

import { renderWrapperComponent } from '@/testing/utils';

describe('CoreIconComponent', () => {

    it('should render', async () => {
        // Act
        const fixture = await renderWrapperComponent(CoreIconComponent, 'core-icon', { name: 'fa-thumbs-up' });

        // Assert
        expect(fixture.nativeElement.innerHTML.trim()).not.toHaveLength(0);

        const icon = fixture.nativeElement.querySelector('ion-icon');
        const name = icon.getAttribute('name') || icon.getAttribute('ng-reflect-name') || '';

        expect(icon).not.toBeNull();
        expect(name).toEqual('fa-thumbs-up');
        expect(icon.getAttribute('role')).toEqual('presentation');
    });

});
