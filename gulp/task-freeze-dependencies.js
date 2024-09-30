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

const { readFileSync, writeFile } = require('fs');

/**
 * Freeze all dependencies versions in package.json using the version declared in package-lock.
 */
class FreezeDependenciesTask {

    /**
     * Run the task.
     *
     * @param done Function to call when done.
     */
    run(done) {
        const packageData = JSON.parse(readFileSync('package.json'));
        const packageLockData = JSON.parse(readFileSync('package-lock.json'));

        this.freezeDependencies(packageLockData, packageData.dependencies);
        this.freezeDependencies(packageLockData, packageData.devDependencies);

        writeFile('package.json', JSON.stringify(packageData, null, 4), done);
    }

    /**
     * Get the version declared in package-lock for a certain dependency.
     *
     * @param packageLockData Package-lock data.
     * @param name Name of the dependency.
     */
    getDependencyVersion(packageLockData, name) {
        const dependency = packageLockData.packages['node_modules/' + name];
        if (!dependency) {
            console.error('Dependency not found in package-lock: ' + name);
            return;
        }
        if (!dependency.version) {
            console.error('Dependency found but version is empty in package-lock: ' + name);
            return;
        }

        return dependency.version;
    }

    /**
     * Freeze versions of dependencies.
     *
     * @param packageLockData Package-lock data.
     * @param dependencies Object with the dependencies to freeze.
     */
    freezeDependencies(packageLockData, dependencies) {
        for (const name in dependencies) {
            if (dependencies[name].match(/^[0-9A-Za-z]/)) {
                // Already fixed, don't change it;
                continue;
            }

            const version = this.getDependencyVersion(packageLockData, name);
            if (version) {
                dependencies[name] = version;
            }
        }
    }
}

module.exports = FreezeDependenciesTask;
