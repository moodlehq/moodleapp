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
import { StudentFinancialData } from '../../services/financial-api';
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
     * Get status color class.
     *
     * @param status The status.
     * @returns CSS class for the status.
     */
    getStatusClass(status: string): string {
        switch (status.toLowerCase()) {
            case 'paid':
                return 'success';
            case 'partial':
            case 'pending':
                return 'warning';
            case 'not_paid':
            case 'unpaid':
            case 'overdue':
                return 'danger';
            default:
                return 'medium';
        }
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
}