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

import { Injectable } from '@angular/core';
import { makeSingleton } from '@singletons';
import { CoreFinancialAPIService, StudentFinancialData } from './financial-api';
import { CoreUserParent } from '@features/user/services/parent';
import { CoreSites } from '@services/sites';
import { CoreUser } from '@features/user/services/user';

/**
 * Service to handle financial data for parents.
 */
@Injectable({ providedIn: 'root' })
export class CoreFinancialService {

    protected financialDataCache: Map<string, { data: StudentFinancialData[]; timestamp: number }> = new Map();
    protected readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    constructor(
        protected financialAPI: CoreFinancialAPIService,
    ) {}

    /**
     * Get financial data for all children of the current parent user.
     *
     * @param refresh Force refresh the data.
     * @returns Promise with financial data for all children.
     */
    async getAllChildrenFinancialData(refresh = false): Promise<StudentFinancialData[]> {
        console.log('[Financial Service] Getting financial data...');
        
        const site = CoreSites.getCurrentSite();
        if (!site) {
            throw new Error('No site available');
        }

        // Check if user has children/mentees
        console.log('[Financial Service] Checking for mentees...');
        const mentees = await CoreUserParent.getMentees(site.getId());
        console.log('[Financial Service] Mentees found:', mentees?.length || 0);
        
        if (!mentees || mentees.length === 0) {
            throw new Error('No children found for this user');
        }

        // Get parent user data with custom fields
        // Use courseId = 0 to get site profile which includes custom fields
        console.log('[Financial Service] Getting user profile...');
        const user = await CoreUser.getProfile(site.getUserId(), 0, false);
        console.log('[Financial Service] User profile:', user);
        
        if (!user) {
            throw new Error('User profile not found');
        }

        // Get parent sequence from custom fields (same way as user menu)
        let parentSequence: string | undefined;
        
        // First try to get from custom fields if they exist
        console.log('[Financial Service] Checking custom fields:', user.customfields);
        if (user.customfields) {
            const sequenceField = user.customfields.find(field => 
                field.shortname === 'ID' || 
                field.shortname === 'id' || 
                field.shortname === 'sequence' ||
                field.shortname === 'Sequence'
            );
            console.log('[Financial Service] Found sequence field:', sequenceField);
            if (sequenceField) {
                parentSequence = sequenceField.displayvalue || sequenceField.value || undefined;
            }
        }
        
        // Check if it might be in preferences
        if (!parentSequence && user.preferences) {
            console.log('[Financial Service] Checking preferences:', user.preferences);
            const sequencePref = user.preferences.find(pref => 
                pref.name === 'profile_field_ID' || 
                pref.name === 'profile_field_sequence' ||
                pref.name === 'profile_field_Sequence'
            );
            console.log('[Financial Service] Found sequence preference:', sequencePref);
            if (sequencePref) {
                parentSequence = sequencePref.value || undefined;
            }
        }

        console.log('[Financial Service] Parent sequence found:', parentSequence);
        
        if (!parentSequence) {
            throw new Error('Parent sequence not found. Please ensure your profile has a sequence ID.');
        }

        // Check cache
        const cacheKey = `${site.getId()}_${parentSequence}`;
        const cached = this.financialDataCache.get(cacheKey);
        
        if (!refresh && cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }

        try {
            // Fetch fresh data
            console.log('[Financial Service] Calling API with parent sequence:', parentSequence);
            const financialData = await this.financialAPI.getParentFinancialData(parentSequence);
            console.log('[Financial Service] API response:', financialData);
            
            // Update cache
            this.financialDataCache.set(cacheKey, {
                data: financialData,
                timestamp: Date.now(),
            });

            return financialData;
        } catch (error) {
            console.error('[Financial Service] API error:', error);
            // If API fails, return cached data if available
            if (cached) {
                console.log('[Financial Service] Returning cached data');
                return cached.data;
            }
            throw error;
        }
    }

    /**
     * Get financial data for a specific child.
     *
     * @param studentId The student's ID.
     * @returns Promise with the student's financial data.
     */
    async getChildFinancialData(studentId: string): Promise<StudentFinancialData | undefined> {
        const allData = await this.getAllChildrenFinancialData();
        return allData.find(student => student.student_info.sequence_number === studentId);
    }

    /**
     * Clear the financial data cache.
     */
    clearCache(): void {
        this.financialDataCache.clear();
    }

    /**
     * Format currency amount.
     *
     * @param amount The amount to format.
     * @returns Formatted currency string.
     */
    formatCurrency(amount: number): string {
        // Format with 2 decimal places and EGP currency
        return `EGP ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }

    /**
     * Calculate total balance for all children.
     *
     * @param financialData Array of student financial data.
     * @returns Total balance.
     */
    calculateTotalBalance(financialData: StudentFinancialData[]): number {
        return financialData.reduce((total, student) => {
            const remaining = student.financial_summary?.total_remaining || 0;
            return total + remaining;
        }, 0);
    }

    /**
     * Calculate total due for all children.
     *
     * @param financialData Array of student financial data.
     * @returns Total due amount.
     */
    calculateTotalDue(financialData: StudentFinancialData[]): number {
        return financialData.reduce((total, student) => {
            const due = student.financial_summary?.total_remaining || 0;
            return total + due;
        }, 0);
    }
}

export const CoreFinancial = makeSingleton(CoreFinancialService);