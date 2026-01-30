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
import { CoreUnauthenticatedSite } from '@classes/sites/unauthenticated-site';
import { CoreUserProfileFieldHandlerData } from '@features/user/services/user-profile-field-delegate';
import { CoreWSExternalWarning } from '@services/ws';
import { makeSingleton } from '@singletons';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreText, CoreTextFormat } from '@static/text';

/**
 * Service to handle signup functionalities.
 */
@Injectable({ providedIn: 'root' })
export class CoreLoginSignUpService {

    /**
     * Sign up a user using email signup.
     *
     * @param userInfo User information.
     * @param site Unauthenticated site.
     * @param signupOptions Optional options like custom profile fields, redirect URL. and recaptcha response.
     * @returns Promise resolved with the WS result.
     */
    async emailSignup(
        userInfo: CoreAuthSignupUserInfo,
        site: CoreUnauthenticatedSite,
        signupOptions?: {
            recaptchaResponse?: string;
            customProfileFields?: CoreUserProfileFieldHandlerData[];
            redirect?: string;
        },
    ): Promise<CoreAuthSignupUserWSResponse> {
        const params: CoreAuthSignupUserWSParams = {
            ...userInfo,
            recaptcharesponse: signupOptions?.recaptchaResponse,
            customprofilefields: signupOptions?.customProfileFields,
            redirect: signupOptions?.redirect,
        };

        params.username = params.username.trim().toLowerCase();
        params.firstname = CoreText.cleanTags(params.firstname);
        params.lastname = CoreText.cleanTags(params.lastname);
        params.email = params.email.trim();
        params.city = CoreText.cleanTags(params.city);

        return await site.callAjax<CoreAuthSignupUserWSResponse>(
            'auth_email_signup_user',
            params,
        );
    }

    /**
     * Check if age verification is enabled.
     *
     * @param site Unauthenticated site.
     * @returns Promise resolved with true if enabled, false otherwise.
     */
    async isAgeVerificationEnabled(site: CoreUnauthenticatedSite): Promise<boolean> {
        const result = await CorePromiseUtils.ignoreErrors(
            site.callAjax<CoreAuthIsAgeDigitalConsentVerificationEnabledWSResponse>(
                'core_auth_is_age_digital_consent_verification_enabled',
            ),
        );

        return !!result?.status;
    }

    /**
     * Check if the user is a minor.
     *
     * @param age User age.
     * @param country User country.
     * @param site Unauthenticated site.
     * @returns Promise resolved with true if the user is a minor, false otherwise.
     */
    async isMinor(age: number, country: string, site: CoreUnauthenticatedSite): Promise<boolean> {
        const params: CoreAuthIsMinorWSParams = {
            age,
            country,
        };

        const result = await site.callAjax<CoreAuthIsMinorWSResponse>('core_auth_is_minor', params);

        return !!result.status;
    }

    /**
     * Format profile fields, filtering the ones that shouldn't be shown on signup and classifying them in categories.
     *
     * @param profileFields Profile fields to format.
     * @returns Categories with the fields to show in each one.
     */
    formatProfileFieldsForSignup(profileFields?: AuthEmailSignupProfileField[]): AuthEmailSignupProfileFieldsCategory[] {
        if (!profileFields) {
            return [];
        }

        const categories: Record<number, AuthEmailSignupProfileFieldsCategory> = {};

        profileFields.forEach((field) => {
            if (!field.signup || !field.categoryid) {
                // Not a signup field, ignore it.
                return;
            }

            if (!categories[field.categoryid]) {
                categories[field.categoryid] = {
                    id: field.categoryid,
                    name: field.categoryname || '',
                    fields: [],
                };
            }

            categories[field.categoryid].fields.push(field);
        });

        return Object.keys(categories).map((index) => categories[Number(index)]);
    }

    /**
     * Get email signup settings.
     *
     * @param site Unauthenticated site.
     * @returns Signup settings.
     */
    async getEmailSignupSettings(site: CoreUnauthenticatedSite): Promise<AuthEmailSignupSettings> {
        return await site.callAjax('auth_email_get_signup_settings');
    }

}
export const CoreLoginSignUp = makeSingleton(CoreLoginSignUpService);

/**
 * Params for WS auth_email_signup_user.
 */
export type CoreAuthSignupUserWSParams = CoreAuthSignupUserInfo & {
    recaptchachallengehash?: string; // Recaptcha challenge hash.
    recaptcharesponse?: string; // Recaptcha response.
    customprofilefields?: CoreUserProfileFieldHandlerData[]; // User custom fields (also known as user profile fields).
    redirect?: string; // Redirect the user to this site url after confirmation.
};

export type CoreAuthSignupUserInfo =  {
    username: string; // Username.
    password: string; // Plain text password.
    firstname: string; // The first name(s) of the user.
    lastname: string; // The family name of the user.
    email: string; // A valid and unique email address.
    city?: string; // Home city of the user.
    country?: string; // Home country code.
};

export type CoreAuthCustomProfileField = {
    type: string; // The type of the custom field.
    name: string; // The name of the custom field.
    value: unknown; // Custom field value, can be an encoded json if required.
};

/**
 * Result of WS auth_email_signup_user.
 */
export type CoreAuthSignupUserWSResponse = {
    success: boolean; // True if the user was created false otherwise.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Result of WS core_auth_is_age_digital_consent_verification_enabled.
 */
type CoreAuthIsAgeDigitalConsentVerificationEnabledWSResponse = {
    status: boolean; // True if digital consent verification is enabled, false otherwise.
};

/**
 * Params for WS core_auth_is_minor.
 */
type CoreAuthIsMinorWSParams = {
    age: number;
    country: string;
};

/**
 * Result of WS core_auth_is_minor.
 */
type CoreAuthIsMinorWSResponse = {
    status: boolean; // True if the user is considered to be a digital minor, false if not.
};

/**
 * Result of WS auth_email_get_signup_settings.
 */
export type AuthEmailSignupSettings = {
    namefields: string[];
    passwordpolicy?: string; // Password policy.
    sitepolicy?: string; // Site policy.
    sitepolicyhandler?: string; // Site policy handler.
    defaultcity?: string; // Default city.
    country?: string; // Default country.
    extendedusernamechars?: boolean; // @since 4.4. Extended characters in usernames or no.
    profilefields?: AuthEmailSignupProfileField[]; // Required profile fields.
    recaptchapublickey?: string; // Recaptcha public key.
    recaptchachallengehash?: string; // Recaptcha challenge hash.
    recaptchachallengeimage?: string; // Recaptcha challenge noscript image.
    recaptchachallengejs?: string; // Recaptcha challenge js url.
    warnings?: CoreWSExternalWarning[];
};

/**
 * Profile field for signup.
 */
export type AuthEmailSignupProfileField = {
    id?: number; // Profile field id.
    shortname?: string; // Profile field shortname.
    name?: string; // Profield field name.
    datatype?: string; // Profield field datatype.
    description?: string; // Profield field description.
    descriptionformat: CoreTextFormat; // Description format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    categoryid?: number; // Profield field category id.
    categoryname?: string; // Profield field category name.
    sortorder?: number; // Profield field sort order.
    required?: number; // Profield field required.
    locked?: number; // Profield field locked.
    visible?: number; // Profield field visible.
    forceunique?: number; // Profield field unique.
    signup?: number; // Profield field in signup form.
    defaultdata?: string; // Profield field default data.
    defaultdataformat: CoreTextFormat; // Defaultdata format (1 = HTML, 0 = MOODLE, 2 = PLAIN or 4 = MARKDOWN).
    param1?: string; // Profield field settings.
    param2?: string; // Profield field settings.
    param3?: string; // Profield field settings.
    param4?: string; // Profield field settings.
    param5?: string; // Profield field settings.
};

/**
 * Category of profile fields for signup.
 */
export type AuthEmailSignupProfileFieldsCategory = {
    id: number; // Category ID.
    name: string; // Category name.
    fields: AuthEmailSignupProfileField[]; // Field in the category.
};
