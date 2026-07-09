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

import { toBoolean } from '@/core/transforms/boolean';
import { Component, computed, input, output } from '@angular/core';
import { CoreReportBuilder } from '@features/reportbuilder/services/reportbuilder';
import { CoreSharedModule } from '@/core/shared.module';
import { ContextLevel } from '@/core/constants';

@Component({
    selector: 'core-report-builder-report-column',
    templateUrl: './report-column.html',
    styleUrl: './report-column.scss',
    imports: [
        CoreSharedModule,
    ],
})
export class CoreReportBuilderReportColumnComponent {

    readonly isExpanded = input(false, { transform: toBoolean });
    readonly isExpandable = input(false, { transform: toBoolean });
    readonly showFirstTitle = input(false, { transform: toBoolean });
    readonly columnIndex = input.required<number>();
    readonly rowIndex = input.required<number>();
    readonly column = input.required<string | number>();
    readonly header = input.required<string>();
    readonly contextLevel = input.required<ContextLevel>();
    readonly contextInstanceId = input.required<number>();
    readonly onToggleRow = output<number>();

    readonly columnIsString = computed(() => CoreReportBuilder.isString(this.column()));

    /**
     * Emits row click
     */
    toggleRow(): void {
        this.onToggleRow.emit(this.rowIndex());
    }

}
