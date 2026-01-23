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
import { CoreUserParent } from '@features/user/services/parent';
import { CoreCourses } from '@features/courses/services/courses';
import { CoreSharedModule } from '@/core/shared.module';

/**
 * Page to debug course grades overview.
 */
@Component({
    selector: 'page-core-grades-courses-debug',
    templateUrl: 'courses-debug.html',
    styleUrls: ['courses-debug.scss'],
    imports: [
        CoreSharedModule,
    ],
})
export class CoreGradesCoursesDebugPage implements OnInit {

    loading = false;
    
    // User info
    currentUserId = 0;
    isParent = false;
    mentees: any[] = [];
    selectedMenteeId: number | null = null;
    
    // Raw data
    rawGrades: any[] = [];
    rawCoursesGrades: any[] = [];
    processedGrades: any[] = [];
    
    // Web service info
    wsAvailable = {
        menteeGrades: false,
        menteeUserReportGrades: false,
        allGrades: false,
        menteeCourses: false
    };
    
    // Debug info
    debugInfo: any = {
        webServicesCalled: [],
        errors: [],
        cacheKeys: []
    };
    
    // UI toggles
    showRawGrades = false;
    showProcessedGrades = false;
    showMenteeData = false;
    showWebServices = false;
    showDebugInfo = false;

    constructor() {}

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        await this.loadData();
    }

    /**
     * Load all data.
     */
    async loadData(): Promise<void> {
        this.loading = true;
        
        try {
            const site = CoreSites.getCurrentSite();
            if (!site) {
                this.debugInfo.errors.push('No site available');
                return;
            }
            
            this.currentUserId = site.getUserId();
            
            // Check if parent
            this.isParent = await CoreUserParent.isParentUser();
            
            if (this.isParent) {
                // Get mentees
                this.mentees = await CoreUserParent.getMentees();
                this.selectedMenteeId = await CoreUserParent.getSelectedMentee();
                
                // Check web services
                this.wsAvailable.menteeGrades = await site.wsAvailable('local_aspireparent_get_mentee_course_grades');
                this.wsAvailable.menteeUserReportGrades = await site.wsAvailable('local_aspireparent_get_mentee_user_report_grades');
                this.wsAvailable.menteeCourses = await site.wsAvailable('local_aspireparent_get_mentee_courses');
            }
            
            this.wsAvailable.allGrades = await site.wsAvailable('local_aspireparent_get_all_course_grades');
            
            // Get course grades
            try {
                this.debugInfo.webServicesCalled.push('CoreGrades.getCoursesGrades()');
                this.rawGrades = await CoreGrades.getCoursesGrades();
                
                // Process grades
                if (this.rawGrades.length > 0) {
                    this.debugInfo.webServicesCalled.push('CoreGradesHelper.getGradesCourseData()');
                    this.processedGrades = await CoreGradesHelper.getGradesCourseData(this.rawGrades);
                }
            } catch (error) {
                this.debugInfo.errors.push(`Error getting grades: ${error}`);
            }
            
            // If parent with selected mentee, try to get mentee grades directly
            if (this.isParent && this.selectedMenteeId && this.wsAvailable.menteeGrades) {
                try {
                    this.debugInfo.webServicesCalled.push('local_aspireparent_get_mentee_course_grades');
                    const response = await site.read<{ grades: any[] }>('local_aspireparent_get_mentee_course_grades', {
                        menteeid: this.selectedMenteeId
                    });
                    this.rawCoursesGrades = response.grades || [];
                } catch (error) {
                    this.debugInfo.errors.push(`Error getting mentee grades: ${error}`);
                }
            }
            
            // Get cache keys
            const cacheKey = 'mmGrades:coursesgrades';
            this.debugInfo.cacheKeys.push(cacheKey);
            
            if (this.selectedMenteeId) {
                this.debugInfo.cacheKeys.push(`${cacheKey}:mentee:${this.selectedMenteeId}`);
            }
            
        } catch (error) {
            this.debugInfo.errors.push(`General error: ${error}`);
        } finally {
            this.loading = false;
        }
    }

    /**
     * Refresh data.
     */
    async refresh(): Promise<void> {
        // Clear cache
        await CoreGrades.invalidateCoursesGradesData();
        
        // Reload
        await this.loadData();
    }
    
    /**
     * Get JSON string for display.
     */
    getJson(obj: any): string {
        return JSON.stringify(obj, null, 2);
    }
    
    /**
     * Test direct web service call for mentee.
     */
    async testMenteeWebService(menteeId: number): Promise<void> {
        const site = CoreSites.getCurrentSite();
        if (!site) return;
        
        try {
            console.log(`Testing web service for mentee ${menteeId}`);
            const response = await site.read<{ grades: any[] }>('local_aspireparent_get_mentee_course_grades', {
                menteeid: menteeId
            });
            console.log('Web service response:', response);
            alert(`Success! Got ${response.grades?.length || 0} grades`);
        } catch (error) {
            console.error('Web service error:', error);
            alert(`Error: ${error}`);
        }
    }
}