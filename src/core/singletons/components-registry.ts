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

/**
 * Registry to keep track of component instances.
 */
export class CoreComponentsRegistry {

    private static instances: WeakMap<Element, unknown> = new WeakMap();

    /**
     * Register a component instance.
     *
     * @param element Root element.
     * @param instance Component instance.
     */
    static register(element: Element, instance: unknown): void {
        this.instances.set(element, instance);
    }

    /**
     * Resolve a component instance.
     *
     * @param element Root element.
     * @param componentClass Component class.
     * @returns Component instance.
     */
    static resolve<T>(element?: Element | null, componentClass?: ComponentConstructor<T>): T | null {
        const instance = (element && this.instances.get(element) as T) ?? null;

        return instance && (!componentClass || instance instanceof componentClass)
            ? instance
            : null;
    }

}

/**
 * Component constructor.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentConstructor<T> = { new(...args: any[]): T };
