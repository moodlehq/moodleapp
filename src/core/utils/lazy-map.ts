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
 * Lazy map.
 *
 * Lazy maps are empty by default, but entries are generated lazily when accessed.
 */
export type LazyMap<T> = Record<string, T>;

/**
 * Create a map that will initialize entries lazily with the given constructor.
 *
 * @param lazyConstructor Constructor to use the first time an entry is accessed.
 * @returns Lazy map.
 */
export function lazyMap<T>(lazyConstructor: (key: string) => T): LazyMap<T> {
    const instances = {};

    return new Proxy(instances, {
        get(target, property, receiver) {
            if (!(property in instances)) {
                target[property] = lazyConstructor(property.toString());
            }

            return Reflect.get(target, property, receiver);
        },
    });
}
