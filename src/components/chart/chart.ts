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

import { Component, Input, OnDestroy, OnInit, ElementRef, OnChanges, ViewChild } from '@angular/core';
import { Chart } from 'chart.js';
import { CoreFilterProvider } from '@core/filter/providers/filter';
import { CoreFilterHelperProvider } from '@core/filter/providers/helper';
import { CoreUtilsProvider } from '@providers/utils/utils';

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
    templateUrl: 'core-chart.html'
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
        'rgba(251,173,26, 0.6)'
    ];

    @Input() data: any[]; // Chart data.
    @Input() labels = []; // Labels of the data.
    @Input() type: string; // Type of chart.
    @Input() legend: any; // Legend options.
    @Input() height = 300; // Height of the chart element.
    @Input() filter?: boolean | string; // Whether to filter labels. If not defined, true if contextLevel and instanceId are set.
    @Input() contextLevel?: string; // The context level of the text.
    @Input() contextInstanceId?: number; // The instance ID related to the context.
    @Input() courseId?: number; // Course ID the text belongs to. It can be used to improve performance with filters.
    @Input() wsNotFiltered?: boolean | string; // If true it means the WS didn't filter the labels for some reason.
    @ViewChild('canvas') canvas: ElementRef;

    chart: any;

    constructor(protected filterProvider: CoreFilterProvider, private utils: CoreUtilsProvider,
            private filterHelper: CoreFilterHelperProvider) { }

    /**
     * Component being initialized.
     */
    ngOnInit(): any {
        let legend = {};
        if (typeof this.legend == 'undefined') {
            legend = {
                display: false,
                labels: {
                    generateLabels: (chart): any => {
                        const  data = chart.data;
                        if (data.labels.length && data.labels.length) {
                            const datasets = data.datasets[0];

                            return data.labels.map((label, i): any => {
                                return {
                                    text: label + ': ' + datasets.data[i],
                                    fillStyle: datasets.backgroundColor[i]
                                };
                            });
                        }

                        return [];
                    }
                }
            };
        } else {
            legend = Object.assign({}, this.legend);
        }

        if (this.type == 'bar' && this.data.length >= 5) {
            this.type = 'horizontalBar';
        }

        // Format labels if needed.
        this.formatLabels().then(() => {

            const context = this.canvas.nativeElement.getContext('2d');
            this.chart = new Chart(context, {
                type: this.type,
                data: {
                    labels: this.labels,
                    datasets: [{
                        data:  this.data,
                        backgroundColor: this.getRandomColors(this.data.length)
                    }]
                },
                options: {legend: legend}
            });
        });
    }

    /**
     * Listen to chart changes.
     */
    ngOnChanges(): void {
        if (this.chart) {
            // Format labels if needed.
            this.formatLabels().then(() => {
                this.chart.data.datasets[0] = {
                    data: this.data,
                    backgroundColor: this.getRandomColors(this.data.length)
                };
                this.chart.data.labels = this.labels;
                this.chart.update();
            });
        }
    }

    /**
     * Format labels if needed.
     *
     * @return Promise resolved when done.
     */
    protected formatLabels(): Promise<any> {
        this.filter = typeof this.filter == 'undefined' ? !!(this.contextLevel && this.contextInstanceId) : !!this.filter;

        if (!this.filter) {
            return Promise.resolve();
        }

        const options = {
            clean: true,
            singleLine: true,
            courseId: this.courseId,
            wsNotFiltered: this.utils.isTrueOrOne(this.wsNotFiltered)
        };

        return this.filterHelper.getFilters(this.contextLevel, this.contextInstanceId, options).then((filters) => {
            const promises = [];

            this.labels.forEach((label, i) => {
                promises.push(this.filterProvider.formatText(label, options, filters).then((text) => {
                    this.labels[i] = text;
                }));
            });

            return Promise.all(promises);
        });
    }

    /**
     * Generate random colors if needed.
     *
     * @param n Number of colors needed.
     * @return Array with the number of background colors requested.
     */
    protected getRandomColors(n: number): any[] {
        while (CoreChartComponent.backgroundColors.length < n) {
            const red = Math.floor(Math.random() * 255),
                green = Math.floor(Math.random() * 255),
                blue = Math.floor(Math.random() * 255);
            CoreChartComponent.backgroundColors.push('rgba(' + red + ', ' + green + ', ' + blue + ', 0.6)');
        }

        return CoreChartComponent.backgroundColors.slice(0, n);
    }

    /**
     * Component being destroyed.
     */
    ngOnDestroy(): any {
        if (this.chart) {
            this.chart.destroy();
            this.chart = false;
        }
    }
}
