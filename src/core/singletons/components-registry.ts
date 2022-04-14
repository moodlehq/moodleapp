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

import { ActivatedRoute } from '@angular/router';
import { AsyncComponent } from '@classes/async-component';
import { CoreUtils } from '@services/utils/utils';
import { CoreLogger } from './logger';

/**
 * Registry to keep track of component instances.
 */
export class CoreComponentsRegistry {

    protected static instances: WeakMap<Element | ActivatedRoute, unknown> = new WeakMap();
    protected static logger = CoreLogger.getInstance('CoreComponentsRegistry');

    /**
     * Register a component instance.
     *
     * @param key Root element or Activated route to associate with the component.
     * @param instance Component instance.
     */
    static register(key: Element | ActivatedRoute, instance: unknown): void {
        this.instances.set(key, instance);
    }

    /**
     * Resolve a component instance.
     *
     * @param key Root element or Activated route associated with the component.
     * @param componentClass Component class.
     * @returns Component instance.
     */
    static resolve<T>(key?: Element | ActivatedRoute | null, componentClass?: ComponentConstructor<T>): T | null {
        const instance = (key && this.instances.get(key) as T) ?? null;

        return instance && (!componentClass || instance instanceof componentClass)
            ? instance
            : null;
    }

    /**
     * Get a component instances and fail if it cannot be resolved.
     *
     * @param key Root element or Activated route associated with the component.
     * @param componentClass Component class.
     * @returns Component instance.
     */
    static require<T>(key: Element | ActivatedRoute, componentClass?: ComponentConstructor<T>): T {
        const instance = this.resolve(key, componentClass);

        if (!instance) {
            throw new Error('Couldn\'t resolve component instance');
        }

        return instance;
    }

    /**
     * Get a component instances and wait to be ready.
     *
     * @param key Root element or Activated route associated with the component.
     * @param componentClass Component class.
     * @return Promise resolved when done.
     */
    static async waitComponentReady<T extends AsyncComponent>(
        key: Element | ActivatedRoute | null,
        componentClass?: ComponentConstructor<T>,
    ): Promise<void> {
        const instance = this.resolve<T>(key, componentClass);
        if (!instance) {
            this.logger.error('No instance registered for element ' + componentClass, key);

            return;
        }

        await instance.ready();
    }

    /**
     * Waits all elements matching to be ready.
     *
     * @param element Element where to search.
     * @param selector Selector to search on parent.
     * @param componentClass Component class.
     * @return Promise resolved when done.
     */
    static async waitComponentsReady<T extends AsyncComponent>(
        element: Element,
        selector: string,
        componentClass?: ComponentConstructor<T>,
    ): Promise<void> {
        let elements: Element[] = [];

        if (element.matches(selector)) {
            // Element to wait is myself.
            elements = [element];
        } else {
            elements = Array.from(element.querySelectorAll(selector));
        }

        if (!elements.length) {
            return;
        }

        await Promise.all(elements.map(element => CoreComponentsRegistry.waitComponentReady<T>(element, componentClass)));

        // Wait for next tick to ensure components are completely rendered.
        await CoreUtils.nextTick();
    }

}

/**
 * Component constructor.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentConstructor<T = unknown> = { new(...args: any[]): T };
