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

import { Component, OnInit } from '@angular/core';
import { CoreGrades } from '@features/grades/services/grades';
import { CoreGradesHelper } from '@features/grades/services/grades-helper';
import { CoreSites } from '@services/sites';
import { CoreNavigator } from '@services/navigator';
import { CoreDomUtils } from '@services/utils/dom';

/**
 * Page to debug grades data.
 */
@Component({
    selector: 'page-core-grades-debug',
    templateUrl: 'debug.html',
    styleUrls: ['debug.scss'],
})
export class CoreGradesDebugPage implements OnInit {

    courseId: number = 0;
    userId: number = 0;
    
    // Raw data
    rawTableData: any = null;
    rawGradeItems: any[] = [];
    
    // Formatted data
    formattedTable: any = null;
    
    // Processing results
    categories: any[] = [];
    gradeItems: any[] = [];
    courseTotal: any = null;
    
    loading = false;
    error = '';
    
    // Toggle states for UI
    showCourseTotalJson = false;
    showColumns = false;
    showRows = false;
    showFirstRaw = false;
    showGradeItems = false;

    constructor() {
        try {
            this.courseId = CoreNavigator.getRouteNumberParam('courseId') || 0;
            this.userId = CoreNavigator.getRouteNumberParam('userId') || CoreSites.getCurrentSiteUserId();
        } catch {
            // Default values
        }
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        if (!this.courseId) {
            this.error = 'No course ID provided. Add ?courseId=XXX to the URL.';
            return;
        }
        
        await this.loadData();
    }

    /**
     * Load all grades data.
     */
    async loadData(): Promise<void> {
        this.loading = true;
        this.error = '';
        
        try {
            // Get raw table data
            this.rawTableData = await CoreGrades.getCourseGradesTable(this.courseId, this.userId);
            
            // Get formatted table
            this.formattedTable = await CoreGradesHelper.formatGradesTable(this.rawTableData);
            
            // Get grade items
            try {
                this.rawGradeItems = await CoreGrades.getGradeItems(this.courseId, this.userId);
            } catch (e) {
                console.error('Error getting grade items:', e);
            }
            
            // Process the data
            this.processData();
            
        } catch (error) {
            this.error = 'Error loading data: ' + error;
            CoreDomUtils.showErrorModal(error);
        } finally {
            this.loading = false;
        }
    }

    /**
     * Process the grades data.
     */
    processData(): void {
        if (!this.formattedTable || !this.formattedTable.rows) {
            return;
        }
        
        this.categories = [];
        this.gradeItems = [];
        
        this.formattedTable.rows.forEach((row: any, index: number) => {
            if (row.itemtype === 'category') {
                this.categories.push({
                    ...row,
                    index: index,
                    gradeitemLower: row.gradeitem?.toLowerCase() || '',
                    isCourseTotal: this.checkIfCourseTotal(row)
                });
                
                if (this.checkIfCourseTotal(row)) {
                    this.courseTotal = row;
                }
            } else if (row.itemtype === 'mod' || row.itemtype === 'manual') {
                this.gradeItems.push({
                    ...row,
                    index: index
                });
            }
        });
    }
    
    /**
     * Check if a row is the course total.
     */
    checkIfCourseTotal(row: any): boolean {
        const gradeitem = row.gradeitem?.toLowerCase() || '';
        return gradeitem.includes('course total') || 
               gradeitem.includes('course grade') || 
               gradeitem.includes('total') ||
               gradeitem === 'total';
    }
    
    /**
     * Get JSON string for display.
     */
    getJson(obj: any): string {
        return JSON.stringify(obj, null, 2);
    }
    
    /**
     * Get keys of an object.
     */
    getKeys(obj: any): string[] {
        return obj ? Object.keys(obj) : [];
    }
    
    /**
     * Check if value is object.
     */
    isObject(val: any): boolean {
        return val && typeof val === 'object' && !Array.isArray(val);
    }
}