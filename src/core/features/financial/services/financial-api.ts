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

import { Injectable } from "@angular/core";
import { CoreNetwork } from "@services/network";
import { Http, NativeHttp } from "@singletons";
import { CorePlatform } from "@services/platform";
import { firstValueFrom } from "rxjs";

// The API returns data directly, not wrapped in JSON-RPC
export interface ParentFinancialResponse {
    success: boolean;
    error?: string;
    parent?: {
        sequence: string;
        name: string;
        email: string;
        mobile: string;
    };
    students?: StudentFinancialData[];
}

export interface StudentFinancialResponse {
    success: boolean;
    error?: string;
    data?: StudentFinancialData;
}

// Extended interfaces for comprehensive financial data
export interface FeeLine {
    academic_year: string;
    class: string;
    amount: number;
    discount: number;
    net_fees: number;
    paid: number;
    remaining: number;
    status: string;
}

export interface Subject {
    name: string;
    variant: string;
    session: string;
    academic_year: string;
    base_amount: number;
    discount: number;
    total: number;
    paid: number;
    remaining: number;
    state: string;
}

export interface TransportRegistration {
    academic_year: string;
    passenger_type: string;
    route: string;
    trip_type: string;
    fees: number;
    discount: number;
    paid: number;
    remaining: number;
    state: string;
}

export interface BooksActivities {
    batch: string;
    academic_year: string;
    class: string;
    amount: number;
    discount: number;
    net_amount: number;
    paid: number;
    remaining: number;
}

export interface AcademicYearData {
    academic_year: string;
    total_fees: number;
    total_paid: number;
    total_remaining: number;
    fee_lines: FeeLine[];
    subjects: Subject[];
    transport_registrations: TransportRegistration[];
    books_activities: BooksActivities[];
}

export interface StudentFinancialData {
    student_info: {
        sequence_number: string;
        name: string;
        full_name: string;
        middle_name?: string;
        last_name?: string;
        academic_year: string;
        academic_year_id: number;
        class: string;
        class_id: number;
        generation: string;
        active: boolean;
    };
    parent_info: {
        father?: ParentInfo;
        mother?: ParentInfo;
    };
    financial_summary: {
        currency: string;
        total_fees: number;
        total_paid: number;
        total_remaining: number;
        payment_status: "paid" | "partial" | "unpaid" | "overdue";
        invoice_count: number;
        overdue_invoice_count: number;
    };
    educational_fees: {
        total: number;
        discount: number;
        paid: number;
        remaining: number;
        installments: {
            [key: string]: InstallmentInfo;
        };
    };
    subject_fees: {
        total: number;
        paid: number;
        remaining: number;
    };
    transport_fees: {
        total: number;
        paid: number;
        remaining: number;
    };
    books_activities_fees: {
        total: number;
        paid: number;
        remaining: number;
    };
    future_academic_years: {
        total: number;
        paid: number;
        remaining: number;
    };
    fee_lines: FeeLine[];
    future_fee_lines: FeeLine[];
    subjects: Subject[];
    transport_registrations: TransportRegistration[];
    books_activities: BooksActivities[];
    recent_payments: PaymentRecord[];
    invoices: {
        total_count: number;
        overdue_count: number;
        recent_invoices: Invoice[];
    };
    // Computed property for grouped data
    academic_years?: AcademicYearData[];
}

export interface ParentInfo {
    name: string;
    sequence: string;
    email: string;
    mobile: string;
    is_academic_contact: boolean;
    is_financial_contact: boolean;
}

export interface InstallmentInfo {
    amount: number;
    paid: number;
    due: number;
    status: "paid" | "partial" | "unpaid" | "overdue";
}

export interface PaymentRecord {
    date: string;
    payment_reference: string;
    payment_type: string;
    installment?: string | null;
    amount: number;
    description: string;
}

export interface Invoice {
    number: string;
    date: string;
    due_date: string;
    total: number;
    paid: number;
    remaining: number;
    state: "paid" | "partial" | "not_paid";
    type: string;
    installment_number?: number | null;
}

/**
 * Service to handle Odoo financial API requests.
 */
@Injectable({ providedIn: "root" })
export class CoreFinancialAPIService {
    protected readonly API_URL = "https://aspire-school.odoo.com";

    /**
     * Make an API call to the Odoo API.
     *
     * @param endpoint The API endpoint.
     * @returns Promise with the response.
     */
    protected async callAPI<T = any>(endpoint: string): Promise<T> {
        console.log("[Financial API] Making API call to:", endpoint);

        if (!CoreNetwork.isOnline()) {
            throw new Error("Network is offline");
        }

        const url = `${this.API_URL}${endpoint}`;
        console.log("[Financial API] Full URL:", url);

        try {
            let data: T;

            // Use Native HTTP on iOS to avoid CORS issues with capacitor://localhost
            if (CorePlatform.isIOS() && CorePlatform.isMobile()) {
                console.log("[Financial API] Using Native HTTP for iOS");

                // Set data serializer to json
                NativeHttp.setDataSerializer("json");

                // Make the request using Native HTTP
                const response = await NativeHttp.get(
                    url,
                    {},
                    {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                );

                // Parse the response data
                data =
                    typeof response.data === "string"
                        ? JSON.parse(response.data)
                        : response.data;

                console.log("[Financial API] Native HTTP Response:", data);
            } else {
                // Use Angular HTTP for web and Android
                console.log("[Financial API] Using Angular HTTP");

                const response = await firstValueFrom(
                    Http.get(url, {
                        responseType: "json",
                    }),
                );

                console.log("[Financial API] Response:", response);
                data = response as T;
            }

            return data;
        } catch (error) {
            console.error("[Financial API] Error:", error);

            // Handle Native HTTP specific error format
            if (error && error.status === 0 && CorePlatform.isIOS()) {
                throw new Error(
                    "Network request failed. Please check your internet connection.",
                );
            }

            throw error;
        }
    }

    /**
     * Authenticate with the Odoo API.
     * Note: This method is not currently used as the API has public auth.
     *
     * @param login The user login.
     * @param password The user password.
     * @returns Promise with the authentication result.
     */
    async authenticate(login: string, password: string): Promise<any> {
        // Not implemented as the API uses public auth
        throw new Error("Authentication not required for this API");
    }

    /**
     * Get financial data for a parent's children.
     *
     * @param parentSequence The parent's sequence number.
     * @returns Promise with financial data for all children.
     */
    async getParentFinancialData(
        parentSequence: string,
    ): Promise<StudentFinancialData[]> {
        console.log(
            "[Financial API] Getting parent financial data for sequence:",
            parentSequence,
        );

        // Remove any angle brackets from the sequence if they exist
        const cleanSequence = parentSequence.replace(/[<>]/g, "");
        const endpoint = `/api/parent/financial/${cleanSequence}`;

        console.log("[Financial API] Clean endpoint:", endpoint);

        const result = await this.callAPI<ParentFinancialResponse>(endpoint);

        console.log("[Financial API] Parent financial data result:", result);

        if (result.success && result.students) {
            return result.students;
        } else if (result.error) {
            throw new Error(result.error);
        }

        return [];
    }

    /**
     * Get financial data for a specific student.
     *
     * @param studentSequence The student's sequence number.
     * @returns Promise with the student's financial data.
     */
    async getStudentFinancialData(
        studentSequence: string,
    ): Promise<StudentFinancialData> {
        console.log(
            "[Financial API] Getting student financial data for sequence:",
            studentSequence,
        );

        const cleanSequence = studentSequence.replace(/[<>]/g, "");
        const endpoint = `/api/student/financial/${cleanSequence}`;

        const result = await this.callAPI<StudentFinancialResponse>(endpoint);

        if (result.success && result.data) {
            return result.data;
        } else if (result.error) {
            throw new Error(result.error);
        }

        throw new Error("No data returned");
    }
}
