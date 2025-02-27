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

import { ContextLevel } from '@/core/constants';
import { toBoolean } from '@/core/transforms/boolean';
import { Component, Input, OnDestroy, OnInit, ElementRef, OnChanges, ViewChild, SimpleChange } from '@angular/core';
import { CoreFilter } from '@features/filter/services/filter';
import { CoreFilterHelper } from '@features/filter/services/filter-helper';
import { LegendOptions, ChartTypeRegistry, ChartType, type Chart, LegendItem } from 'chart.js';
import { CoreBaseModule } from '@/core/base.module';
import { CoreFaIconDirective } from '@directives/fa-icon';

/**
 * This component shows a chart using chart.js.
 * Documentation can be found at http://www.chartjs.org/docs/.
 * It only supports changes on these properties: data and labels.
 *
 * Example usage:
 * <core-chart [data]="data" [labels]="labels" [type]="type" [legend]="legend"></core-chart>
 */
@Component({
    selector: 'core-chart',
    templateUrl: 'core-chart.html',
    styleUrl: 'chart.scss',
    standalone: true,
    imports: [
        CoreBaseModule,
        CoreFaIconDirective,
    ],
})
export class CoreChartComponent implements OnDestroy, OnInit, OnChanges {

    // The first 6 colors will be the app colors, the following will be randomly generated.
    // It will use the same colors in the whole session.
    protected static backgroundColors = [
        'rgba(0,100,210, 0.6)',
        'rgba(203,61,77, 0.6)',
        'rgba(0,121,130, 0.6)',
        'rgba(249,128,18, 0.6)',
        'rgba(94,129,0, 0.6)',
        'rgba(251,173,26, 0.6)',
    ];

    @Input() data: number[] = []; // Chart data.
    @Input() labels: string[] = []; // Labels of the data.
    @Input({ required: true }) type!: keyof ChartTypeRegistry; // Type of chart.
    @Input() legend?: LegendOptions<ChartType>; // Legend options.
    @Input() height = 300; // Height of the chart element.
    @Input({ transform: toBoolean }) filter?: boolean; // Whether to filter labels.
                                                       // If not defined, true if contextLevel and instanceId are set.
    @Input() contextLevel?: ContextLevel; // The context level of the text.
    @Input() contextInstanceId?: number; // The instance ID related to the context.
    @Input() courseId?: number; // Course ID the text belongs to. It can be used to improve performance with filters.
    @Input({ transform: toBoolean }) wsNotFiltered = false; // If true it means the WS didn't filter the labels for some reason.
    @ViewChild('canvas') canvas?: ElementRef<HTMLCanvasElement>;

    chart?: ChartWithLegend;
    legendItems: LegendItem[] = [];

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        const legend = this.legend === undefined
            ? {
                display: false,
                labels: {
                    generateLabels: (chart: Chart): LegendItem[] => {
                        const data = chart.data;
                        if (data.labels?.length) {
                            const datasets = data.datasets?.[0];

                            return data.labels.map<LegendItem>((label, i) => ({
                                text: label + ': ' + datasets?.data?.[i],
                                fillStyle: datasets?.backgroundColor?.[i],
                            }));
                        }

                        return [];
                    },
                },
            }
            : Object.assign({}, this.legend);

        const indexAxis = this.type === 'bar'
            ?  this.data.length < 5 ? 'x' : 'y'
            : undefined;

        // Format labels if needed.
        await this.formatLabels();

        const context = this.canvas?.nativeElement.getContext('2d');
        if (!context) {
            return;
        }

        const { Chart, registerables } = await import('chart.js');

        Chart.register(...registerables);

        this.chart = new Chart(context, {
            type: this.type,
            data: {
                labels: this.labels,
                datasets: [{
                    data: this.data,
                    backgroundColor: this.getRandomColors(this.data.length),
                }],
            },
            options: {
                indexAxis,
                plugins: {
                    legend,
                },
            },
        });

        this.updateLegendItems();
    }

    /**
     * @inheritdoc
     */
    async ngOnChanges(changes: Record<string, SimpleChange>): Promise<void> {
        if (!this.chart || !changes.labels || !changes.data) {
            return;
        }

        if (changes.labels) {
            // Format labels if needed.
            await this.formatLabels();
        }

        if (!this.chart.data.datasets) {
            this.chart.data.datasets = [];
        }

        this.chart.data.datasets[0] = {
            data: this.data,
            backgroundColor: this.getRandomColors(this.data.length),
        };
        this.chart.data.labels = this.labels;
        this.chart.update();

        this.updateLegendItems();
    }

    /**
     * Format labels if needed.
     *
     * @returns Promise resolved when done.
     */
    protected async formatLabels(): Promise<void> {
        if (!this.contextLevel || !this.contextInstanceId || this.filter === false) {
            return;
        }

        const options = {
            clean: true,
            singleLine: true,
            courseId: this.courseId,
            wsNotFiltered: this.wsNotFiltered,
        };

        const filters = await CoreFilterHelper.getFilters(this.contextLevel, this.contextInstanceId, options);

        await Promise.all(this.labels.map(async (label, i) => {
            this.labels[i] = await CoreFilter.formatText(label, options, filters);
        }));
    }

    /**
     * Generate random colors if needed.
     *
     * @param n Number of colors needed.
     * @returns Array with the number of background colors requested.
     */
    protected getRandomColors(n: number): string[] {
        while (CoreChartComponent.backgroundColors.length < n) {
            const red = Math.floor(Math.random() * 255);
            const green = Math.floor(Math.random() * 255);
            const blue = Math.floor(Math.random() * 255);
            CoreChartComponent.backgroundColors.push('rgba(' + red + ', ' + green + ', ' + blue + ', 0.6)');
        }

        return CoreChartComponent.backgroundColors.slice(0, n);
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        if (this.chart) {
            this.chart.destroy();
            this.chart = undefined;
        }
    }

    /**
     * Recompute legendItems property.
     */
    protected updateLegendItems(): void {
        this.legendItems = (this.chart?.legend?.legendItems ?? []).filter(item => !!item);
    }

}

// For some reason the legend property isn't defined in TS, define it ourselves.
type ChartWithLegend = Chart & {
    legend?: {
        legendItems?: LegendItem[];
    };
};
