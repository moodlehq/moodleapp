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
import { CoreFinancialAPIService, StudentFinancialData, AcademicYearData } from './financial-api';
import { CoreUserParent } from '@features/user/services/parent';
import { CoreSites } from '@services/sites';
import { CoreUser } from '@features/user/services/user';

/**
 * Service to handle financial data for parents.
 */
@Injectable({ providedIn: 'root' })
export class CoreFinancialService {

    protected financialDataCache: Map<string, { data: StudentFinancialData[]; timestamp: number; parentLoyaltyStatus?: string }> = new Map();
    protected readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    protected parentLoyaltyStatus?: string;

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
            this.parentLoyaltyStatus = cached.parentLoyaltyStatus;
            return cached.data;
        }

        try {
            // Fetch fresh data
            console.log('[Financial Service] Calling API with parent sequence:', parentSequence);
            const response = await this.financialAPI.getParentFinancialData(parentSequence);
            console.log('[Financial Service] API response:', response);

            // Store parent loyalty status
            this.parentLoyaltyStatus = response.parentLoyaltyStatus;
            console.log('[Financial Service] Parent loyalty status:', this.parentLoyaltyStatus);

            const financialData = response.students;

            // Filter out PN (Prenursery) students
            const filteredStudents = financialData.filter(student => this.shouldShowStudent(student));
            console.log('[Financial Service] Students after PN filter:', filteredStudents.length);

            // Process and group data by academic year
            const processedData = filteredStudents.map(student => this.processStudentFinancialData(student));

            // Update cache
            this.financialDataCache.set(cacheKey, {
                data: processedData,
                timestamp: Date.now(),
                parentLoyaltyStatus: this.parentLoyaltyStatus,
            });

            return processedData;
        } catch (error) {
            console.error('[Financial Service] API error:', error);
            // If API fails, return cached data if available
            if (cached) {
                console.log('[Financial Service] Returning cached data');
                this.parentLoyaltyStatus = cached.parentLoyaltyStatus;
                return cached.data;
            }
            throw error;
        }
    }

    /**
     * Check if the parent has platinum loyalty status.
     *
     * @returns Whether parent is platinum.
     */
    isParentPlatinum(): boolean {
        return this.parentLoyaltyStatus?.toLowerCase() === 'platinum';
    }

    /**
     * Get the parent's loyalty status.
     *
     * @returns Parent loyalty status.
     */
    getParentLoyaltyStatus(): string | undefined {
        return this.parentLoyaltyStatus;
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

    /**
     * Process student financial data to group by academic year.
     *
     * @param studentData Raw student financial data.
     * @returns Processed student data with academic year grouping.
     */
    processStudentFinancialData(studentData: StudentFinancialData): StudentFinancialData {
        const academicYears = this.groupDataByAcademicYear(studentData);

        // Filter out academic years before 2024-2025
        const filteredAcademicYears = academicYears.filter(year => {
            return this.isAcademicYearValid(year.academic_year);
        });

        // Calculate total net_fees from current academic year only
        const currentAcademicYear = this.getCurrentAcademicYearString();
        const calculatedNetFees = filteredAcademicYears
            .filter(year => year.academic_year === currentAcademicYear)
            .reduce((total, year) => {
                return total + (year.net_fees || year.total_fees || 0);
            }, 0);

        // Filter out recent payments with type "other_fees" or "other fees"
        const filteredRecentPayments = studentData.recent_payments?.filter(payment => {
            const paymentType = payment.payment_type?.toLowerCase().replace(/[_\s]/g, '') || '';
            // Hide payments that are "otherfees"
            return paymentType !== 'otherfees';
        }) || [];

        return {
            ...studentData,
            academic_years: filteredAcademicYears,
            recent_payments: filteredRecentPayments,
            financial_summary: {
                ...studentData.financial_summary,
                net_fees: calculatedNetFees,
            },
        };
    }

    /**
     * Check if a student should be shown in financial (not PN/Prenursery).
     *
     * @param studentData Student financial data.
     * @returns Whether the student should be shown.
     */
    shouldShowStudent(studentData: StudentFinancialData): boolean {
        const studentClass = studentData.student_info?.class?.toLowerCase() || '';
        // Hide students in PN (Prenursery)
        if (studentClass === 'pn' || studentClass === 'prenursery' || studentClass === 'pre-nursery') {
            console.log('[Financial Service] Hiding PN student:', studentData.student_info.name);
            return false;
        }
        return true;
    }

    /**
     * Check if an academic year should be shown (2024-2025 or later).
     *
     * @param academicYear Academic year string (e.g., "2024-2025").
     * @returns Whether the academic year is valid to show.
     */
    isAcademicYearValid(academicYear: string): boolean {
        if (!academicYear) return false;

        const years = academicYear.split('-');
        if (years.length !== 2) return false;

        const startYear = parseInt(years[0]);

        // Only show 2024-2025 and later
        return startYear >= 2024;
    }

    /**
     * Get the current academic year string (e.g., "2025-2026").
     *
     * @returns Current academic year string.
     */
    getCurrentAcademicYearString(): string {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth(); // 0-based

        // Academic year runs from September to August
        // If we're in September-December, current year is start year
        // If we're in January-August, previous year is start year
        if (currentMonth >= 8) { // September (8) through December (11)
            return `${currentYear}-${currentYear + 1}`;
        } else {
            return `${currentYear - 1}-${currentYear}`;
        }
    }

    /**
     * Group financial data by academic year.
     *
     * @param studentData Student financial data.
     * @returns Array of academic year data.
     */
    private groupDataByAcademicYear(studentData: StudentFinancialData): AcademicYearData[] {
        const yearMap = new Map<string, AcademicYearData>();

        // Process fee lines
        if (studentData.fee_lines) {
            studentData.fee_lines.forEach(feeLine => {
                if (!yearMap.has(feeLine.academic_year)) {
                    yearMap.set(feeLine.academic_year, {
                        academic_year: feeLine.academic_year,
                        total_fees: 0,
                        net_fees: 0,
                        total_paid: 0,
                        total_remaining: 0,
                        fee_lines: [],
                        subjects: [],
                        transport_registrations: [],
                        books_activities: []
                    });
                }
                const yearData = yearMap.get(feeLine.academic_year)!;
                yearData.fee_lines.push(feeLine);
                yearData.total_fees += feeLine.net_fees;
                yearData.net_fees = (yearData.net_fees || 0) + feeLine.net_fees;
                yearData.total_paid += feeLine.paid;
                yearData.total_remaining += feeLine.remaining;
            });
        }

        // Process future fee lines
        if (studentData.future_fee_lines) {
            studentData.future_fee_lines.forEach(feeLine => {
                if (!yearMap.has(feeLine.academic_year)) {
                    yearMap.set(feeLine.academic_year, {
                        academic_year: feeLine.academic_year,
                        total_fees: 0,
                        net_fees: 0,
                        total_paid: 0,
                        total_remaining: 0,
                        fee_lines: [],
                        subjects: [],
                        transport_registrations: [],
                        books_activities: []
                    });
                }
                const yearData = yearMap.get(feeLine.academic_year)!;
                yearData.fee_lines.push(feeLine);
                yearData.total_fees += feeLine.net_fees;
                yearData.net_fees = (yearData.net_fees || 0) + feeLine.net_fees;
                yearData.total_paid += feeLine.paid;
                yearData.total_remaining += feeLine.remaining;
            });
        }

        // Process subjects
        if (studentData.subjects) {
            studentData.subjects.forEach(subject => {
                if (!yearMap.has(subject.academic_year)) {
                    yearMap.set(subject.academic_year, {
                        academic_year: subject.academic_year,
                        total_fees: 0,
                        net_fees: 0,
                        total_paid: 0,
                        total_remaining: 0,
                        fee_lines: [],
                        subjects: [],
                        transport_registrations: [],
                        books_activities: []
                    });
                }
                const yearData = yearMap.get(subject.academic_year)!;
                yearData.subjects.push(subject);
                yearData.total_fees += subject.total;
                yearData.net_fees = (yearData.net_fees || 0) + subject.total;
                yearData.total_paid += subject.paid;
                yearData.total_remaining += subject.remaining;
            });
        }

        // Process transport registrations
        if (studentData.transport_registrations) {
            studentData.transport_registrations.forEach(transport => {
                if (!yearMap.has(transport.academic_year)) {
                    yearMap.set(transport.academic_year, {
                        academic_year: transport.academic_year,
                        total_fees: 0,
                        net_fees: 0,
                        total_paid: 0,
                        total_remaining: 0,
                        fee_lines: [],
                        subjects: [],
                        transport_registrations: [],
                        books_activities: []
                    });
                }
                const yearData = yearMap.get(transport.academic_year)!;
                yearData.transport_registrations.push(transport);
                yearData.total_fees += transport.fees;
                yearData.net_fees = (yearData.net_fees || 0) + transport.fees;
                yearData.total_paid += transport.paid;
                yearData.total_remaining += transport.remaining;
            });
        }

        // Process books and activities
        if (studentData.books_activities) {
            studentData.books_activities.forEach(bookActivity => {
                if (!yearMap.has(bookActivity.academic_year)) {
                    yearMap.set(bookActivity.academic_year, {
                        academic_year: bookActivity.academic_year,
                        total_fees: 0,
                        net_fees: 0,
                        total_paid: 0,
                        total_remaining: 0,
                        fee_lines: [],
                        subjects: [],
                        transport_registrations: [],
                        books_activities: []
                    });
                }
                const yearData = yearMap.get(bookActivity.academic_year)!;
                yearData.books_activities.push(bookActivity);
                yearData.total_fees += bookActivity.net_amount;
                yearData.net_fees = (yearData.net_fees || 0) + bookActivity.net_amount;
                yearData.total_paid += bookActivity.paid;
                yearData.total_remaining += bookActivity.remaining;
            });
        }

        // Convert map to array and sort by year
        return Array.from(yearMap.values()).sort((a, b) => {
            // Sort current year first, then chronologically
            const currentYear = new Date().getFullYear();
            const aYear = parseInt(a.academic_year.split('-')[0]);
            const bYear = parseInt(b.academic_year.split('-')[0]);
            
            if (aYear === currentYear && bYear !== currentYear) return -1;
            if (bYear === currentYear && aYear !== currentYear) return 1;
            
            return bYear - aYear; // Newest first
        });
    }

    /**
     * Get payment status class for styling.
     *
     * @param status Payment status.
     * @returns CSS class name.
     */
    getPaymentStatusClass(status: string): string {
        switch (status.toLowerCase()) {
            case 'paid':
                return 'success';
            case 'partial':
                return 'warning';
            case 'overdue':
                return 'danger';
            case 'unpaid':
            default:
                return 'medium';
        }
    }

    /**
     * Calculate payment progress percentage.
     *
     * @param paid Amount paid.
     * @param total Total amount.
     * @returns Progress percentage (0-1).
     */
    calculateProgress(paid: number, total: number): number {
        if (total === 0) return 1;
        return Math.min(paid / total, 1);
    }
}

export const CoreFinancial = makeSingleton(CoreFinancialService);