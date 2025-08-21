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
import { CoreFinancial } from '../../services/financial';
import { StudentFinancialData, AcademicYearData } from '../../services/financial-api';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreTimeUtils } from '@services/utils/time';

/**
 * Page that displays financial overview for all children.
 */
@Component({
    selector: 'page-core-financial-overview',
    templateUrl: 'overview.html',
    styleUrls: ['overview.scss'],
})
export class CoreFinancialOverviewPage implements OnInit {

    studentsFinancialData: StudentFinancialData[] = [];
    totalBalance = 0;
    totalDue = 0;
    loaded = false;
    selectedStudentId?: string;
    selectedStudent?: StudentFinancialData;
    expandedYears = new Set<string>();
    expandedStudentSections = new Map<string, Set<string>>();

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        await this.loadFinancialData();
    }

    /**
     * Load financial data for all children.
     *
     * @param refresh Whether to refresh the data.
     */
    async loadFinancialData(refresh = false): Promise<void> {
        try {
            this.studentsFinancialData = await CoreFinancial.getAllChildrenFinancialData(refresh);
            
            // Calculate totals
            this.totalBalance = CoreFinancial.calculateTotalBalance(this.studentsFinancialData);
            this.totalDue = CoreFinancial.calculateTotalDue(this.studentsFinancialData);

            // Select first student by default if none selected
            if (!this.selectedStudentId && this.studentsFinancialData.length > 0) {
                this.selectStudent(this.studentsFinancialData[0].student_info.sequence_number);
            }

            this.loaded = true;
        } catch (error) {
            CoreDomUtils.showErrorModal(error);
            this.loaded = true;
        }
    }

    /**
     * Refresh the financial data.
     *
     * @param refresher The refresher.
     */
    async refreshData(refresher?: any): Promise<void> {
        try {
            await this.loadFinancialData(true);
        } finally {
            refresher?.complete();
        }
    }

    /**
     * Select a student to view details.
     *
     * @param studentId The student ID.
     */
    selectStudent(studentId: string): void {
        this.selectedStudentId = studentId;
        this.selectedStudent = this.studentsFinancialData.find(s => s.student_info.sequence_number === studentId);
    }

    /**
     * Format currency for display.
     *
     * @param amount The amount to format.
     * @returns Formatted currency string.
     */
    formatCurrency(amount: number): string {
        return CoreFinancial.formatCurrency(amount);
    }

    /**
     * Format date for display.
     *
     * @param date The date string to format.
     * @returns Formatted date string.
     */
    formatDate(date: string): string {
        // Convert date string to timestamp and format it
        const timestamp = new Date(date).getTime();
        return CoreTimeUtils.userDate(timestamp, 'core.strftimedatefullshort');
    }


    /**
     * Format payment type for display.
     *
     * @param paymentType The payment type string.
     * @returns Formatted payment type.
     */
    formatPaymentType(paymentType: string): string {
        if (!paymentType) return '';
        
        // Replace underscores with spaces and capitalize each word
        return paymentType
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    /**
     * Toggle the expansion state of an academic year.
     *
     * @param studentId Student ID.
     * @param academicYear Academic year.
     */
    toggleYearExpansion(studentId: string, academicYear: string): void {
        const key = `${studentId}_${academicYear}`;
        if (this.expandedYears.has(key)) {
            this.expandedYears.delete(key);
        } else {
            this.expandedYears.add(key);
        }
    }

    /**
     * Check if an academic year is expanded for a student.
     *
     * @param studentId Student ID.
     * @param academicYear Academic year.
     * @returns Whether the year is expanded.
     */
    isYearExpanded(studentId: string, academicYear: string): boolean {
        const key = `${studentId}_${academicYear}`;
        return this.expandedYears.has(key);
    }

    /**
     * Toggle the expansion state of a student section.
     *
     * @param studentId Student ID.
     * @param section Section name.
     */
    toggleStudentSection(studentId: string, section: string): void {
        if (!this.expandedStudentSections.has(studentId)) {
            this.expandedStudentSections.set(studentId, new Set());
        }
        const studentSections = this.expandedStudentSections.get(studentId)!;
        
        if (studentSections.has(section)) {
            studentSections.delete(section);
        } else {
            studentSections.add(section);
        }
    }

    /**
     * Check if a student section is expanded.
     *
     * @param studentId Student ID.
     * @param section Section name.
     * @returns Whether the section is expanded.
     */
    isStudentSectionExpanded(studentId: string, section: string): boolean {
        const studentSections = this.expandedStudentSections.get(studentId);
        return studentSections ? studentSections.has(section) : false;
    }

    /**
     * Get payment status class for styling.
     *
     * @param status Payment status.
     * @returns CSS class name.
     */
    getStatusClass(status: string): string {
        return CoreFinancial.getPaymentStatusClass(status);
    }

    /**
     * Calculate payment progress.
     *
     * @param paid Amount paid.
     * @param total Total amount.
     * @returns Progress percentage (0-100).
     */
    getProgress(paid: number, total: number): number {
        return CoreFinancial.calculateProgress(paid, total) * 100;
    }

    /**
     * Get academic year display name.
     *
     * @param academicYear Academic year string.
     * @returns Formatted display name.
     */
    getAcademicYearDisplayName(academicYear: string): string {
        return academicYear || 'Current Year';
    }

    /**
     * Check if an academic year is current.
     *
     * @param academicYear Academic year string.
     * @returns Whether it's the current year.
     */
    isCurrentAcademicYear(academicYear: string): boolean {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth(); // 0-based (0 = January, 11 = December)
        
        // Parse academic year (e.g., "2024-2025")
        const years = academicYear.split('-');
        if (years.length !== 2) {
            return false;
        }
        
        const startYear = parseInt(years[0]);
        const endYear = parseInt(years[1]);
        
        // Academic year typically runs from September of start year to August of end year
        // If we're in September-December, we're in the academic year that started in the current calendar year
        // If we're in January-August, we're in the academic year that will end in the current calendar year
        if (currentMonth >= 8) { // September (8) through December (11)
            // We're in the first part of the academic year, so the start year should match current year
            return startYear === currentYear;
        } else { // January (0) through August (7)
            // We're in the second part of the academic year, so the end year should match current year
            return endYear === currentYear;
        }
    }

    /**
     * Get the count of items in a section.
     *
     * @param yearData Academic year data.
     * @param section Section name.
     * @returns Count of items.
     */
    getSectionItemCount(yearData: AcademicYearData, section: string): number {
        switch (section) {
            case 'educational':
                return yearData.fee_lines?.length || 0;
            case 'subjects':
                return yearData.subjects?.length || 0;
            case 'transport':
                return yearData.transport_registrations?.length || 0;
            case 'books':
                return yearData.books_activities?.length || 0;
            default:
                return 0;
        }
    }

    /**
     * Get section total amount.
     *
     * @param yearData Academic year data.
     * @param section Section name.
     * @returns Total amount for the section.
     */
    getSectionTotal(yearData: AcademicYearData, section: string): number {
        switch (section) {
            case 'educational':
                return yearData.fee_lines?.reduce((total, fee) => total + fee.net_fees, 0) || 0;
            case 'subjects':
                return yearData.subjects?.reduce((total, subject) => total + subject.total, 0) || 0;
            case 'transport':
                return yearData.transport_registrations?.reduce((total, transport) => total + transport.fees, 0) || 0;
            case 'books':
                return yearData.books_activities?.reduce((total, book) => total + book.net_amount, 0) || 0;
            default:
                return 0;
        }
    }

    /**
     * Get section paid amount.
     *
     * @param yearData Academic year data.
     * @param section Section name.
     * @returns Paid amount for the section.
     */
    getSectionPaid(yearData: AcademicYearData, section: string): number {
        switch (section) {
            case 'educational':
                return yearData.fee_lines?.reduce((total, fee) => total + fee.paid, 0) || 0;
            case 'subjects':
                return yearData.subjects?.reduce((total, subject) => total + subject.paid, 0) || 0;
            case 'transport':
                return yearData.transport_registrations?.reduce((total, transport) => total + transport.paid, 0) || 0;
            case 'books':
                return yearData.books_activities?.reduce((total, book) => total + book.paid, 0) || 0;
            default:
                return 0;
        }
    }

    /**
     * Track by function for academic year iteration.
     *
     * @param index Index.
     * @param yearData Academic year data.
     * @returns Tracking value.
     */
    trackByAcademicYear(index: number, yearData: AcademicYearData): string {
        return yearData.academic_year;
    }
}