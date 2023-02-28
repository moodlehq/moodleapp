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

import { Directive } from '@angular/core';
import { AsyncDirective } from '@classes/async-directive';
import { CoreUtils } from '@services/utils/utils';
import { CoreLogger } from './logger';

/**
 * Registry to keep track of directive instances.
 */
export class CoreDirectivesRegistry {

    private static instances: WeakMap<Element, unknown[]> = new WeakMap();
    protected static logger = CoreLogger.getInstance('CoreDirectivesRegistry');

    /**
     * Register a directive instance.
     *
     * @param element Root element.
     * @param instance Directive instance.
     */
    static register(element: Element, instance: unknown): void {
        const list = this.instances.get(element) ?? [];
        list.push(instance);
        this.instances.set(element, list);
    }

    /**
     * Resolve a directive instance.
     *
     * @param element Root element.
     * @param directiveClass Directive class.
     * @returns Directive instance.
     */
    static resolve<T>(element?: Element | null, directiveClass?: DirectiveConstructor<T>): T | null {
        const list = (element && this.instances.get(element) as T[]) ?? [];

        return list.find(instance => !directiveClass || instance instanceof directiveClass) ?? null;
    }

    /**
     * Resolve all directive instances.
     *
     * @param element Root element.
     * @param directiveClass Directive class.
     * @returns Directive instances.
     */
    static resolveAll<T>(element?: Element | null, directiveClass?: DirectiveConstructor<T>): T[] {
        const list = (element && this.instances.get(element) as T[]) ?? [];

        return list.filter(instance => !directiveClass || instance instanceof directiveClass) ?? [];
    }

    /**
     * Get a directive instance and fail if it cannot be resolved.
     *
     * @param element Root element.
     * @param directiveClass Directive class.
     * @returns Directive instance.
     */
    static require<T>(element: Element, directiveClass?: DirectiveConstructor<T>): T {
        const instance = this.resolve(element, directiveClass);

        if (!instance) {
            throw new Error('Couldn\'t resolve directive instance');
        }

        return instance;
    }

    /**
     * Get a directive instance and wait to be ready.
     *
     * @param element Root element.
     * @param directiveClass Directive class.
     * @returns Promise resolved when done.
     */
    static async waitDirectiveReady<T extends AsyncDirective>(
        element: Element | null,
        directiveClass?: DirectiveConstructor<T>,
    ): Promise<void> {
        const instance = this.resolve(element, directiveClass);
        if (!instance) {
            this.logger.error('No instance registered for element ' + directiveClass, element);

            return;
        }

        await instance.ready();
    }

    /**
     * Get all directive instances and wait to be ready.
     *
     * @param element Root element.
     * @param directiveClass Directive class.
     * @returns Promise resolved when done.
     */
    static async waitDirectivesReady<T extends AsyncDirective>(
        element: Element,
        selector?: string,
        directiveClass?: DirectiveConstructor<T>,
    ): Promise<void> {
        let elements: Element[] = [];

        if (!selector || element.matches(selector)) {
            // Element to wait is myself.
            elements = [element];
        } else {
            elements = Array.from(element.querySelectorAll(selector));
        }

        if (!elements.length) {
            return;
        }

        await Promise.all(elements.map(async element => {
            const instances = this.resolveAll<T>(element, directiveClass);

            await Promise.all(instances.map(instance => instance.ready()));
        }));

        // Wait for next tick to ensure directives are completely rendered.
        await CoreUtils.nextTick();
    }

}

/**
 * Directive constructor.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DirectiveConstructor<T = Directive> = { new(...args: any[]): T };
