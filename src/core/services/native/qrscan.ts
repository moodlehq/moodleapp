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
import { CoreCustomURLSchemes } from './urlschemes';
import { CoreLinkSource } from '@/core/constants';
import { CapacitorBarcodeScanner, CapacitorBarcodeScannerTypeHint } from '@capacitor/barcode-scanner';
import { CoreCanceledError } from '@classes/errors/cancelederror';

/**
 * Handles qr scan services.
 */
@Injectable({ providedIn: 'root' })
export class CoreQRScanService {

    /**
     * Check whether the app can scan QR codes.
     *
     * @returns True if the app can scan QR codes, false otherwise.
     */
    canScanQR(): boolean {
        return true;
    }

    /**
     * Open a modal to scan a QR code.
     *
     * @returns Promise resolved with the captured text, rejected if error or cancelled.
     */
    async scanQR(): Promise<string> {
        try {
            const result = await CapacitorBarcodeScanner.scanBarcode({
                hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
            });

            if (!result.ScanResult) {
                throw new Error('No QR code detected');
            }

            return result.ScanResult.trim();
        } catch (error) {
            if (this.isCancellationError(error)) {
                throw new CoreCanceledError('User cancelled scan');
            }

            throw error;
        }
    }

    /**
     * Check if an error is a user cancellation or permission denial.
     *
     * @param error The error thrown by the barcode scanner.
     * @returns True if the error is a cancellation, false otherwise.
     */
    protected isCancellationError(error: unknown): boolean {
        // Extract the error message from various error formats.
        const errorMessage = this.extractErrorMessage(error).toLowerCase();

        // Check if the message indicates user cancellation.
        return errorMessage.includes('cancelled') || errorMessage.includes('canceled');
    }

    /**
     * Extract error message from various error formats.
     *
     * The native barcode scanner can return errors as:
     * - Error instances with .message property
     * - Objects with .errorMessage or .message properties (native plugin format)
     * - Plain strings
     *
     * @param error The error thrown by the native plugin.
     * @returns The error message as a string.
     */
    protected extractErrorMessage(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        if (typeof error === 'object' && error !== null) {
            const errorObj = error as Record<string, unknown>;
            // Native plugin error format with errorMessage field.
            if (typeof errorObj.errorMessage === 'string') {
                return errorObj.errorMessage;
            }
            // Fallback to message field.
            if (typeof errorObj.message === 'string') {
                return errorObj.message;
            }
        }

        return String(error);
    }

    /**
     * Scan a QR code and handle the URL if it's a custom URL scheme.
     *
     * @returns Promise resolved with the captured text or undefined if cancelled, error or URL handled.
     */
    async scanQRWithUrlHandling(): Promise<string | undefined> {
        const text = await this.scanQR();

        if (!text) {
            return;
        }

        if (CoreCustomURLSchemes.isCustomURL(text)) {
            // Is a custom URL scheme, handle it.
            try {
                await CoreCustomURLSchemes.handleCustomURL(text, { source: CoreLinkSource.QR_CODE });
            } catch (error) {
                CoreCustomURLSchemes.treatHandleCustomURLError(error, text, 'CoreQRScanService');
            }

            return;
        }

        return text;
    }

    /**
     * Start scanning for a QR code.
     *
     * @returns Promise resolved with the QR string, rejected if error or cancelled.
     * @deprecated since 6.0. Use scanQR() instead.
     */
    async startScanQR(): Promise<string | undefined> {
        return this.scanQR();
    }

    /**
     * Stop scanning for QR code.
     *
     * @deprecated since 6.0. Use scanQR() instead.
     */
    stopScanQR(): void {
        return;
    }

    /**
     * Check if the QR scanner camera light can be enabled.
     *
     * @returns Whether the QR scanner camera light can be enabled.
     * @deprecated since 6.0. Not supported anymore.
     */
    async canEnableLight(): Promise<boolean> {
        return false;
    }

    /**
     * Check if the QR scanner can switch camera.
     *
     * @returns Whether the QR scanner can switch camera.
     * @deprecated since 6.0. Not supported anymore.
     */
    async canSwitchCamera(): Promise<boolean> {
        return false;
    }

    /**
     * Toggle the light of the camera.
     *
     * @returns Whether the light is enabled or not after toggling.
     * @deprecated since 6.0. Not supported anymore.
     */
    async toggleLight(): Promise<boolean> {
        return false;
    }

    /**
     * Toggle the camera of the phone.
     *
     * @returns The current camera being used after toggling.
     * @deprecated since 6.0. Not supported anymore.
     */
    async toggleCamera(): Promise<number> {
        return 0;
    }

    /**
     * Check if the light is enabled.
     *
     * @returns Whether the light is enabled or not.
     * @deprecated since 6.0. Not supported anymore.
     */
    async isLightEnabled(): Promise<boolean> {
        return false;
    }

    /**
     * Get the current camera being used by the QR scanner.
     *
     * @returns The current camera.
     * @deprecated since 6.0. Not supported anymore.
     */
    async getCurrentCamera(): Promise<number> {
        return 0;
    }

}

export const CoreQRScan = makeSingleton(CoreQRScanService);
