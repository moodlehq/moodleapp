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

import { Component } from '@angular/core';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreUtils } from '@services/utils/utils';
import { CoreText } from '@singletons/text';

interface ContactItem {
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    description?: string;
}

interface ContactSection {
    title: string;
    icon: string;
    items: ContactItem[];
}

/**
 * Page that displays contact information for the school.
 */
@Component({
    selector: 'page-core-contactus',
    templateUrl: 'contact.html',
    styleUrls: ['contact.scss'],
})
export class CoreContactUsPage {

    sections: ContactSection[] = [
        {
            title: 'Academic Departments',
            icon: 'school',
            items: [
                {
                    name: 'EYFS Department',
                    email: 'EYFSplo@aspireschool.org',
                    description: 'Early Years Foundation Stage',
                },
                {
                    name: 'Key Stage Department',
                    email: 'KSplo@aspireschool.org',
                    description: 'Years 1-8',
                },
                {
                    name: 'IG Department',
                    email: 'IGplo@aspireschool.org',
                    description: 'Years 9-12',
                },
            ],
        },
        {
            title: 'Administrative',
            icon: 'business',
            items: [
                {
                    name: 'IT Support',
                    email: 'IT@aspireschool.org',
                    description: 'Account & technical issues',
                },
                {
                    name: 'Transportation',
                    email: 'Transportation@aspireschool.org',
                    description: 'Bus services & routes',
                },
                {
                    name: 'Student Affairs',
                    email: 'Studentsaffairs@aspireschool.org',
                    description: 'Student services & support',
                },
                {
                    name: 'Clinic',
                    email: 'Clinic@aspireschool.org',
                    description: 'Health & medical services',
                },
                {
                    name: 'Accounting',
                    email: 'Accounting@aspireschool.org',
                    description: 'Sun-Thu: 8:00 AM - 2:30 PM',
                },
            ],
        },
    ];

    receptionPhone = '+201211000057';
    bookingLink = 'https://outlook.office.com/book/KeyStageParentBookingCalendar@aspireschool.org/?ismsaljsauthenabled';

    /**
     * Call a phone number.
     *
     * @param phone Phone number to call.
     */
    callPhone(phone: string): void {
        CoreUtils.openInBrowser(`tel:${phone}`, { showBrowserWarning: false });
    }

    /**
     * Send an email.
     *
     * @param email Email address.
     */
    sendEmail(email: string): void {
        CoreUtils.openInBrowser(`mailto:${email}`, { showBrowserWarning: false });
    }

    /**
     * Open WhatsApp chat.
     *
     * @param phone Phone number for WhatsApp.
     */
    openWhatsApp(phone: string): void {
        // Remove any non-numeric characters for WhatsApp URL
        const cleanPhone = phone.replace(/\D/g, '');
        CoreUtils.openInBrowser(`https://wa.me/${cleanPhone}`, { showBrowserWarning: false });
    }

    /**
     * Copy text to clipboard.
     *
     * @param text Text to copy.
     * @param label Label for the toast message.
     */
    async copyToClipboard(text: string, label: string): Promise<void> {
        try {
            await CoreText.copyToClipboard(text);
            CoreDomUtils.showToast(`${label} copied to clipboard`, true, 2000);
        } catch (error) {
            CoreDomUtils.showErrorModal('Failed to copy to clipboard');
        }
    }

    /**
     * Open the booking link in embedded browser.
     */
    openBookingLink(): void {
        CoreUtils.openInApp(this.bookingLink);
    }

}
