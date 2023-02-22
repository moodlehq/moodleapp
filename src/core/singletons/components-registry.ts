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
import { AsyncDirective } from '@classes/async-directive';
import { CoreDirectivesRegistry } from '@singletons/directives-registry';

/**
 * Registry to keep track of component instances.
 *
 * @deprecated since 4.1.1. Use CoreDirectivesRegistry instead.
 */
export class CoreComponentsRegistry {

    /**
     * Register a component instance.
     *
     * @param element Root element.
     * @param instance Component instance.
     */
    static register(element: Element, instance: unknown): void {
        CoreDirectivesRegistry.register(element, instance);
    }

    /**
     * Resolve a component instance.
     *
     * @param element Root element.
     * @param componentClass Component class.
     * @returns Component instance.
     */
    static resolve<T>(element?: Element | null, componentClass?: ComponentConstructor<T>): T | null {
        return CoreDirectivesRegistry.resolve(element, componentClass);
    }

    /**
     * Get a component instances and fail if it cannot be resolved.
     *
     * @param element Root element.
     * @param componentClass Component class.
     * @returns Component instance.
     */
    static require<T>(element: Element, componentClass?: ComponentConstructor<T>): T {
        return CoreDirectivesRegistry.require(element, componentClass);
    }

    /**
     * Get a component instances and wait to be ready.
     *
     * @param element Root element.
     * @param componentClass Component class.
     * @returns Promise resolved when done.
     */
    static async waitComponentReady<T extends AsyncDirective>(
        element: Element | null,
        componentClass?: ComponentConstructor<T>,
    ): Promise<void> {
        return CoreDirectivesRegistry.waitDirectiveReady(element, componentClass);
    }

    /**
     * Waits all elements matching to be ready.
     *
     * @param element Element where to search.
     * @param selector Selector to search on parent.
     * @param componentClass Component class.
     * @returns Promise resolved when done.
     */
    static async waitComponentsReady<T extends AsyncDirective>(
        element: Element,
        selector: string,
        componentClass?: ComponentConstructor<T>,
    ): Promise<void> {
        return CoreDirectivesRegistry.waitDirectivesReady(element, selector, componentClass);
    }

}

/**
 * Component constructor.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentConstructor<T = Component> = { new(...args: any[]): T };
