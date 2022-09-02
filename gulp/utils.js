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

const DevConfig = require('./dev-config');
const DEFAULT_ISSUE_REGEX = '^(MOBILE)[-_]([0-9]+)';

/**
 * Class with some utility functions.
 */
class Utils {
    /**
     * Concatenate several paths, adding a slash between them if needed.
     *
     * @param paths List of paths.
     * @return Concatenated path.
     */
    static concatenatePaths(paths) {
        if (!paths.length) {
            return '';
        }

        // Remove all slashes between paths.
        for (let i = 0; i < paths.length; i++) {
            if (!paths[i]) {
                continue;
            }

            if (i === 0) {
                paths[i] = String(paths[i]).replace(/\/+$/g, '');
            } else if (i === paths.length - 1) {
                paths[i] = String(paths[i]).replace(/^\/+/g, '');
            } else {
                paths[i] = String(paths[i]).replace(/^\/+|\/+$/g, '');
            }
        }

        // Remove empty paths.
        paths = paths.filter(path => !!path);

        return paths.join('/');
    }

    /**
     * Get command line arguments.
     *
     * @return Object with command line arguments.
     */
    static getCommandLineArguments() {

        let args = {};
        let curOpt;

        for (const argument of process.argv) {
            const thisOpt = argument.trim();
            const option = thisOpt.replace(/^\-+/, '');

            if (option === thisOpt) {
                // argument value
                if (curOpt) {
                    args[curOpt] = option;
                }
                curOpt = null;
            }
            else {
                // Argument name.
                curOpt = option;
                args[curOpt] = true;
            }
        }

        return args;
    }

    /**
     * Given a commit message, return the issue name (e.g. MOBILE-1234).
     *
     * @param commit Commit message.
     * @return Issue name.
     */
    static getIssueFromCommitMessage(commit) {
        const regex = new RegExp(DevConfig.get('wording.branchRegex', DEFAULT_ISSUE_REGEX), 'i');
        const matches = commit.match(regex);

        return matches && matches[0];
    }

    /**
     * Parse a branch name to extract some data.
     *
     * @param branch Branch name to parse.
     * @return Data.
     */
    static parseBranch(branch) {
        const regex = new RegExp(DevConfig.get('wording.branchRegex', DEFAULT_ISSUE_REGEX), 'i');

        const matches = branch.match(regex);
        if (!matches || matches.length < 3) {
            throw new Error(`Error parsing branch ${branch}`);
        }

        return {
            issue: matches[0],
            project: matches[1],
            issueNumber: matches[2],
        };
    }
}

module.exports = Utils;
