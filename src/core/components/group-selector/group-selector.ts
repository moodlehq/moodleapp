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

import {
    Component,
    Input,
    Output,
    EventEmitter,
    ChangeDetectionStrategy,
    OnChanges,
    SimpleChanges,
    ChangeDetectorRef,
} from '@angular/core';
import { CoreGroupInfo } from '@services/groups';
import { CoreLang } from '@services/lang';

/**
 * Component to display a group selector.
 */
@Component({
    selector: 'core-group-selector',
    templateUrl: 'group-selector.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoreGroupSelectorComponent implements OnChanges {

    @Input() groupInfo?: CoreGroupInfo;
    @Input() multipleGroupsMessage?: string;
    @Input() selected!: number;
    @Output() selectedChange = new EventEmitter<number>();

    options: GroupOption[] = [];

    constructor(protected changeDetectorRef: ChangeDetectorRef) {}

    /**
     * @inheritdoc
     */
    async ngOnChanges(changes: SimpleChanges): Promise<void> {
        if ('groupInfo' in changes) {
            this.options = await this.getOptions();

            this.changeDetectorRef.markForCheck();
        }
    }

    /**
     * Get options array.
     *
     * @returns Options.
     */
    protected async getOptions(): Promise<GroupOption[]> {
        const options = await Promise.all(
            (this.groupInfo?.groups ?? []).map(async group => {
                const text = await CoreLang.filterMultilang(group.name);

                return { value: group.id, text };
            }),
        );

        return options;
    }

}

/**
 * Group display info.
 */
interface GroupOption {
    value: number;
    text: string;
}
