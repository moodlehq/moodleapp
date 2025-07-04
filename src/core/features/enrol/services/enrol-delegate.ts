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
import { CoreDelegate, CoreDelegateHandler } from '@classes/delegate';
import { makeSingleton } from '@singletons';
import { CoreEnrolEnrolmentMethod } from './enrol';

/**
 * Enrolment actions.
 */
export enum CoreEnrolAction {
    BROWSER = 'browser', // User should use the browser to enrol. Ie. paypal
    SELF = 'self', // User can enrol himself or herself.
    GUEST = 'guest', // User can view the course without enrolling, like guest enrolment.
    NOT_SUPPORTED = 'not_supported', // Enrolment method is not supported by the app.
}

/**
 * Interface that all enrolment plugins must implement.
 */
export interface CoreEnrolHandler extends CoreDelegateHandler {
    /**
     * Name of the enrol the handler supports. E.g. 'self'.
     */
    type: string;

    /**
     * Action to take when enroling.
     */
    enrolmentAction: CoreEnrolAction;

    /**
     * Returns the data needed to render the icon.
     *
     * @param courseId Course Id.
     * @returns Icons data.
     */
    getInfoIcons?(courseId: number): Promise<CoreEnrolInfoIcon[]>;

    /**
     * Invalidates the enrolment info.
     *
     * @param method Course enrolment method.
     * @returns Promise resolved when done
     */
    invalidate?(method: CoreEnrolEnrolmentMethod): Promise<void>;
}

/**
 * Interface that all self enrolment plugins must implement.
 */
export interface CoreEnrolSelfHandler extends CoreEnrolHandler {
    /**
     * @inheritdoc
     */
    enrolmentAction: CoreEnrolAction.SELF;

    /**
     * Enrols the user and returns if it has been enrolled or not.
     *
     * @param method Course enrolment method.
     * @returns If the user has been enrolled.
     */
    enrol(method: CoreEnrolEnrolmentMethod): Promise<boolean>;
}

/**
 * Interface that all guest enrolment plugins must implement.
 */
export interface CoreEnrolGuestHandler extends CoreEnrolHandler {
    /**
     * @inheritdoc
     */
    enrolmentAction: CoreEnrolAction.GUEST;

    /**
     * Check if the user can access to the course.
     *
     * @param method Course enrolment method.
     * @returns Access info.
     */
    canAccess(method: CoreEnrolEnrolmentMethod): Promise<CoreEnrolCanAccessData>;

    /**
     * Validates the access to a course
     *
     * @param method Course enrolment method.
     * @returns Whether the user has validated the access to the course.
     */
    validateAccess(method: CoreEnrolEnrolmentMethod): Promise<boolean>;
}

/**
 * Data needed to render a enrolment icons. It's returned by the handler.
 */
export interface CoreEnrolInfoIcon {
    label: string;
    icon: string;
    className?: string;
}

/**
 * Data about course access using a GUEST enrolment method.
 */
export interface CoreEnrolCanAccessData {
    canAccess: boolean; // Whether the user can access the course using this enrolment method.
    requiresUserInput?: boolean; // Whether the user needs to input some data to access the course using this enrolment method.
}

/**
 * Delegate to register enrol handlers.
 */
@Injectable({ providedIn: 'root' })
export class CoreEnrolDelegateService extends CoreDelegate<CoreEnrolHandler> {

    protected handlerNameProperty = 'type';
    protected featurePrefix = 'CoreEnrolDelegate_';

    constructor() {
        super();
    }

    /**
     * Check if an enrolment plugin is supported.
     *
     * @param methodType Enrol method type.
     * @returns Whether it's supported.
     */
    isEnrolSupported(methodType: string): boolean {
        return this.hasHandler(methodType, true);
    }

    /**
     * Get enrolment action.
     *
     * @param methodType Enrol method type.
     * @returns The enrolment action to take.
     */
    getEnrolmentAction(methodType: string): CoreEnrolAction {
        const handler = this.getHandler(methodType, false);
        if (!handler) {
            return CoreEnrolAction.NOT_SUPPORTED;
        }

        return handler.enrolmentAction;
    }

    /**
     * Get the enrol icon for a certain enrolment method.
     *
     * @param methodType The methodType to get the icon.
     * @param courseId Course Id.
     * @returns Promise resolved with the display data.
     */
    async getInfoIcons(methodType: string, courseId: number): Promise<CoreEnrolInfoIcon[]> {
        const icons = await this.executeFunctionOnEnabled<CoreEnrolInfoIcon[]>(
            methodType,
            'getInfoIcons',
            [courseId],
        );

        icons?.forEach((icon) => {
            if (!icon.className) {
                icon.className = `addon-enrol-${methodType}`;
            }
        });

        return icons || [];
    }

    /**
     * Enrols the user and returns if it has been enrolled or not.
     *
     * @param method Course enrolment method.
     * @returns If the user has been enrolled.
     */
    async enrol(method: CoreEnrolEnrolmentMethod): Promise<boolean> {
        const enrolled = await this.executeFunctionOnEnabled<boolean>(
            method.type,
            'enrol',
            [method],
        );

        return !!enrolled;
    }

    /**
     * Check if the user can access to the course.
     *
     * @param method Course enrolment method.
     * @returns Access data.
     */
    async canAccess(method: CoreEnrolEnrolmentMethod): Promise<CoreEnrolCanAccessData> {
        const canAccess = await this.executeFunctionOnEnabled<CoreEnrolCanAccessData>(
            method.type,
            'canAccess',
            [method],
        );

        return canAccess ?? { canAccess: false };
    }

    /**
     * Validates the access to a course.
     *
     * @param method Course enrolment method.
     * @returns Whether the user has validated the access to the course.
     */
    async validateAccess(method: CoreEnrolEnrolmentMethod): Promise<boolean> {
        const validated = await this.executeFunctionOnEnabled<boolean>(
            method.type,
            'validateAccess',
            [method],
        );

        return !!validated;
    }

    /**
     * Invalidates the enrolment info.
     *
     * @param method Course enrolment method.
     * @returns Promise resolved when done
     */
    async invalidate(method: CoreEnrolEnrolmentMethod): Promise<void> {
        await this.executeFunctionOnEnabled<boolean>(
            method.type,
            'invalidate',
            [method],
        );
    }

}

export const CoreEnrolDelegate = makeSingleton(CoreEnrolDelegateService);
