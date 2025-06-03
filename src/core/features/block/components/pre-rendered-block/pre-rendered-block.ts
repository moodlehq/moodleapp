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

import { OnInit, Component, HostBinding } from '@angular/core';
import { CoreBlockBaseComponent } from '../../classes/base-block-component';
import { ContextLevel } from '@/core/constants';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Component to render blocks with pre-rendered HTML.
 */
@Component({
    selector: 'core-block-pre-rendered',
    templateUrl: 'core-block-pre-rendered.html',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreBlockPreRenderedComponent extends CoreBlockBaseComponent implements OnInit {

    courseId?: number;

    @HostBinding('attr.id') id?: string;

    constructor() {
        super('CoreBlockPreRenderedComponent');
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        this.courseId = this.contextLevel === ContextLevel.COURSE ? this.instanceId : undefined;
        this.fetchContentDefaultError = `Error getting ${this.block.contents?.title} data.`;
        this.id = `block-${this.block.instanceid}`;

        await super.ngOnInit();
    }

}
