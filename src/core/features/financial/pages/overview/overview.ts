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
import { CoreUserParent } from '@features/user/services/parent';
import { CoreSites } from '@services/sites';
import { AlertController } from '@ionic/angular';

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
    totalInvoicesDue = 0;
    totalInvoicesDueAmount = 0;
    totalOverdueInvoices = 0;
    totalOverdueAmount = 0;
    loaded = false;
    selectedStudentId?: string;
    selectedStudent?: StudentFinancialData;
    expandedYears = new Set<string>();
    expandedStudentSections = new Map<string, Set<string>>();

    constructor(private alertController: AlertController) {}

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        // Always revert to parent view when accessing financial section
        await this.ensureParentView();
        await this.loadFinancialData();
    }

    /**
     * Ensure the user is in parent view (not viewing as a child).
     */
    private async ensureParentView(): Promise<void> {
        const site = CoreSites.getCurrentSite();
        if (!site) {
            return;
        }

        try {
            // Check if we're currently using a mentee token
            const originalToken = await site.getLocalSiteConfig<string>(`CoreUserParent:originalToken:${site.getId()}`);
            
            if (originalToken && originalToken !== '') {
                console.log('[Financial] Currently viewing as child, reverting to parent view');
                
                // Clear the selected mentee to revert to parent view
                await CoreUserParent.clearSelectedMentee(site.getId());
                
                console.log('[Financial] Reverted to parent view');
            }
        } catch (error) {
            console.error('[Financial] Error checking/reverting parent view:', error);
        }
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

            // Calculate invoice statistics
            this.calculateInvoiceStats();

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
     * Calculate invoice statistics across all students.
     */
    private calculateInvoiceStats(): void {
        this.totalInvoicesDue = 0;
        this.totalInvoicesDueAmount = 0;
        this.totalOverdueInvoices = 0;
        this.totalOverdueAmount = 0;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        this.studentsFinancialData.forEach(student => {
            student.invoices?.recent_invoices?.forEach(invoice => {
                if (invoice.state !== 'paid' && invoice.remaining > 0) {
                    const dueDate = new Date(invoice.due_date);
                    dueDate.setHours(0, 0, 0, 0);

                    if (dueDate < now) {
                        // Overdue
                        this.totalOverdueInvoices++;
                        this.totalOverdueAmount += invoice.remaining;
                    } else {
                        // Due but not overdue yet
                        this.totalInvoicesDue++;
                        this.totalInvoicesDueAmount += invoice.remaining;
                    }
                }
            });
        });
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
     * Get the academic year tag (Past, Current, or Future).
     *
     * @param academicYear Academic year string (e.g., "2024-2025").
     * @returns 'past', 'current', or 'future'.
     */
    getAcademicYearTag(academicYear: string): 'past' | 'current' | 'future' {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth(); // 0-based (0 = January, 11 = December)
        
        // Parse academic year (e.g., "2024-2025")
        const years = academicYear.split('-');
        if (years.length !== 2) {
            return 'future'; // Default to future if format is unexpected
        }
        
        const startYear = parseInt(years[0]);
        const endYear = parseInt(years[1]);
        
        // Academic year typically runs from September of start year to August of end year
        // If we're in September-December, we're in the academic year that started in the current calendar year
        // If we're in January-August, we're in the academic year that will end in the current calendar year
        if (currentMonth >= 8) { // September (8) through December (11)
            // We're in the first part of the academic year
            if (startYear === currentYear) {
                return 'current';
            } else if (startYear < currentYear) {
                return 'past';
            } else {
                return 'future';
            }
        } else { // January (0) through August (7)
            // We're in the second part of the academic year
            if (endYear === currentYear) {
                return 'current';
            } else if (endYear < currentYear) {
                return 'past';
            } else {
                return 'future';
            }
        }
    }

    /**
     * Check if an academic year is past.
     *
     * @param academicYear Academic year string.
     * @returns Whether it's a past year.
     */
    isPastAcademicYear(academicYear: string): boolean {
        return this.getAcademicYearTag(academicYear) === 'past';
    }

    /**
     * Check if an academic year is future.
     *
     * @param academicYear Academic year string.
     * @returns Whether it's a future year.
     */
    isFutureAcademicYear(academicYear: string): boolean {
        return this.getAcademicYearTag(academicYear) === 'future';
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
     * Get recent unpaid invoices across all students.
     *
     * @returns Array of unpaid invoices with details.
     */
    getRecentUnpaidInvoices(): Array<{
        studentName: string;
        number: string;
        dueText: string;
        remaining: number;
        isOverdue: boolean
    }> {
        const invoices: Array<{
            studentName: string;
            number: string;
            dueText: string;
            remaining: number;
            isOverdue: boolean;
            dueDate: Date;
        }> = [];
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        this.studentsFinancialData.forEach(student => {
            student.invoices?.recent_invoices?.forEach(invoice => {
                if (invoice.state !== 'paid' && invoice.remaining > 0) {
                    const dueDate = new Date(invoice.due_date);
                    dueDate.setHours(0, 0, 0, 0);
                    const isOverdue = dueDate < now;

                    invoices.push({
                        studentName: student.student_info.name,
                        number: invoice.number,
                        dueText: this.getDueDateText(invoice.due_date),
                        remaining: invoice.remaining,
                        isOverdue: isOverdue,
                        dueDate: dueDate,
                    });
                }
            });
        });

        // Sort by due date (overdue first, then by date)
        invoices.sort((a, b) => {
            if (a.isOverdue && !b.isOverdue) return -1;
            if (!a.isOverdue && b.isOverdue) return 1;
            return a.dueDate.getTime() - b.dueDate.getTime();
        });

        // Return top 5
        return invoices.slice(0, 5);
    }

    /**
     * Get upcoming installment due dates across all students.
     *
     * @returns Array of upcoming due dates with student info.
     */
    getUpcomingDueDates(): Array<{ studentName: string; dueDate: string; amount: number; invoiceNumber?: string }> {
        const upcomingDates: Array<{ studentName: string; dueDate: string; amount: number; invoiceNumber?: string }> = [];
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        this.studentsFinancialData.forEach(student => {
            // Check invoices for upcoming due dates
            student.invoices?.recent_invoices?.forEach(invoice => {
                if (invoice.state !== 'paid' && invoice.due_date) {
                    const dueDate = new Date(invoice.due_date);
                    // Show invoices due within the next 30 days
                    if (dueDate >= now && dueDate <= thirtyDaysFromNow) {
                        upcomingDates.push({
                            studentName: student.student_info.name,
                            dueDate: invoice.due_date,
                            amount: invoice.remaining,
                            invoiceNumber: invoice.number,
                        });
                    }
                }
            });
        });

        // Sort by due date (earliest first)
        upcomingDates.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        return upcomingDates;
    }

    /**
     * Get formatted due date text with days remaining.
     *
     * @param dueDate Due date string.
     * @returns Formatted string like "Due in 5 days" or "Due tomorrow".
     */
    getDueDateText(dueDate: string): string {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);

        const diffTime = due.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return 'Due today';
        } else if (diffDays === 1) {
            return 'Due tomorrow';
        } else if (diffDays < 0) {
            return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''}`;
        } else {
            return `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
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

    /**
     * Show Platinum Parent Program information.
     */
    async showPlatinumProgram(): Promise<void> {
        const alert = await this.alertController.create({
            header: 'Platinum Parents Program',
            cssClass: 'platinum-program-alert',
            message: `
                <div class="platinum-content">
                    <p>The Platinum Parents Program is a unique initiative to acknowledge parents who consistently meet fee payment deadlines and adhere to our school's policies.</p>

                    <p>Our goal with this program is to recognize your invaluable contribution towards building a successful and thriving learning community. Thank you for your unwavering support and commitment to Aspire International School.</p>

                    <p>Beginning May of the current year and running through June of next year, parents who make timely payments starting from the reservation payment and each following instalment will automatically be eligible for an array of benefits.</p>

                    <h3>Platinum Parents Benefits:</h3>
                    <ul>
                        <li>Special Pricing for Resources, Activities Fees, and Bus Fees</li>
                        <li>10% Discount on Trips</li>
                        <li>10% Discount at the In-House Sports Academy</li>
                        <li>A One-Time Payment Postponement Starting from the Third Instalment, for 5 Business Days without being removed from the program</li>
                    </ul>

                    <p>We eagerly look forward to your participation in the Platinum Parents Program!</p>
                </div>
            `,
            buttons: ['Close'],
        });

        await alert.present();
    }
}