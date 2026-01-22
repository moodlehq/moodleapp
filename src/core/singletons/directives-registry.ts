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
import type { AsyncDirective } from '@coretypes/async-directive';
import { CoreWait } from './wait';
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
        const list = CoreDirectivesRegistry.instances.get(element) ?? [];
        list.push(instance);
        CoreDirectivesRegistry.instances.set(element, list);
    }

    /**
     * Resolve a directive instance.
     *
     * @param element Root element.
     * @param directiveClass Directive class.
     * @returns Directive instance.
     */
    static resolve<T>(element?: Element | null, directiveClass?: DirectiveConstructor<T>): T | null {
        const list = (element && CoreDirectivesRegistry.instances.get(element) as T[]) ?? [];

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
        const list = (element && CoreDirectivesRegistry.instances.get(element) as T[]) ?? [];

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
        const instance = CoreDirectivesRegistry.resolve(element, directiveClass);

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
        const instance = CoreDirectivesRegistry.resolve(element, directiveClass);
        if (!instance) {
            CoreDirectivesRegistry.logger.error(`No instance registered for element ${directiveClass}`, element);

            return;
        }

        await instance.ready();
    }

    /**
     * Get all directive instances and wait to be ready.
     *
     * @param element Root element.
     * @param selector If defined, CSS Selector to wait for.
     * @param directiveClass Directive class.
     * @returns Promise resolved when done.
     */
    static async waitDirectivesReady<T extends AsyncDirective>(
        element: Element,
        selector?: string,
        directiveClass?: DirectiveConstructor<T>,
    ): Promise<void> {
        const findElements = (): Element[] => {
            if (!selector || element.matches(selector)) {
                // Element to wait is myself.
                return [element];
            } else {
                return Array.from(element.querySelectorAll(selector));
            }
        };

        const elements = findElements();
        if (!elements.length) {
            return;
        }

        await Promise.all(elements.map(async element => {
            const instances = CoreDirectivesRegistry.resolveAll<T>(element, directiveClass);

            await Promise.all(instances.map(instance => instance.ready()));
        }));

        // Wait for next tick to ensure directives are completely rendered.
        await CoreWait.nextTick();

        // Check if there are new elements now that the found elements are ready (there could be nested elements).
        if (elements.length !== findElements().length) {
            await CoreDirectivesRegistry.waitDirectivesReady(element, selector, directiveClass);
        }
    }

    /**
     * Get all directive instances (with multiple types) and wait for them to be ready.
     *
     * @param element Root element.
     * @param directives Directives to wait.
     * @returns Promise resolved when done.
     */
    static async waitMultipleDirectivesReady(
        element: Element,
        directives: DirectiveData<AsyncDirective>[],
    ): Promise<void> {
        const findElements = (selector?: string): Element[] => {
            if (!selector || element.matches(selector)) {
                // Element to wait is myself.
                return [element];
            } else {
                return Array.from(element.querySelectorAll(selector));
            }
        };

        let allElements: Element[] = [];

        await Promise.all(directives.map(async directive => {
            const elements = findElements(directive.selector);
            if (!elements.length) {
                return;
            }

            allElements = allElements.concat(elements);

            await Promise.all(elements.map(async element => {
                const instances = CoreDirectivesRegistry.resolveAll<AsyncDirective>(element, directive.class);

                await Promise.all(instances.map(instance => instance.ready()));
            }));
        }));

        // Wait for next tick to ensure directives are completely rendered.
        await CoreWait.nextTick();

        // Check if there are new elements now that the found elements are ready (there could be nested elements).
        const elementsAfterReady = directives.reduce((elements, directive) => {
            elements = elements.concat(findElements(directive.selector));

            return elements;
        }, <Element[]> []);

        if (allElements.length !== elementsAfterReady.length) {
            await CoreDirectivesRegistry.waitMultipleDirectivesReady(element, directives);
        }
    }

}

/**
 * Directive constructor.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DirectiveConstructor<T = Directive> = { new(...args: any[]): T };

/**
 * Data to identify a directive when waiting for ready.
 */
type DirectiveData<T extends AsyncDirective> = {
    selector?: string; // If defined, CSS Selector to wait for.
    class?: DirectiveConstructor<T>; // Directive class.
};
