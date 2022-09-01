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

const exec = require('child_process').exec;
const fs = require('fs');
const DevConfig = require('./dev-config');
const Utils = require('./utils');

/**
 * Class to run git commands.
 */
class Git {

    /**
     * Create a patch.
     *
     * @param range Show only commits in the specified revision range.
     * @param saveTo Path to the file to save the patch to. If not defined, the patch contents will be returned.
     * @return Promise resolved when done. If saveTo not provided, it will return the patch contents.
     */
    createPatch(range, saveTo) {
        return new Promise((resolve, reject) => {
            exec(`git format-patch ${range} --stdout`, (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!saveTo) {
                    resolve(result);
                    return;
                }

                // Save it to a file.
                const directory = saveTo.substring(0, saveTo.lastIndexOf('/'));
                if (directory && directory != '.' && directory != '..' && !fs.existsSync(directory)) {
                    fs.mkdirSync(directory);
                }
                fs.writeFileSync(saveTo, result);

                resolve();
            });
        });
    }

    /**
     * Get current branch.
     *
     * @return Promise resolved with the branch name.
     */
    getCurrentBranch() {
        return new Promise((resolve, reject) => {
            exec('git branch --show-current', (err, branch) => {
                if (branch) {
                    resolve(branch.replace('\n', ''));
                } else {
                    reject (err || 'Current branch not found.');
                }
            });
        });
    }

    /**
     * Get the HEAD commit for a certain branch.
     *
     * @param branch Name of the branch.
     * @param branchData Parsed branch data. If not provided it will be calculated.
     * @return HEAD commit.
     */
    async getHeadCommit(branch, branchData) {
        if (!branchData) {
            // Parse the branch to get the project and issue number.
            branchData = Utils.parseBranch(branch);
        }

        // Loop over the last commits to find the first commit messages that doesn't belong to the issue.
        const commitsString = await this.log(50, branch, '%s_____%H');
        const commits = commitsString.split('\n');
        commits.pop(); // Remove last element, it's an empty string.

        for (let i = 0; i < commits.length; i++) {
            const commit = commits[i];
            const match = Utils.getIssueFromCommitMessage(commit) == branchData.issue;

            if (i === 0 && !match) {
                // Most recent commit doesn't belong to the issue. Stop looking.
                break;
            }

            if (!match) {
                // The commit does not match any more, we found it!
                return commit.split('_____')[1];
            }
        }

        // Couldn't find the commit using the commit names, get the last commit in the integration branch.
        const remote = DevConfig.get('upstreamRemote', 'origin');
        console.log(`Head commit not found using commit messages. Get last commit from ${remote}/integration`);
        const hashes = await this.hashes(1, `${remote}/integration`);

        return hashes[0];
    }

    /**
     * Get the URL of a certain remote.
     *
     * @param remote Remote name.
     * @return Promise resolved with the remote URL.
     */
    getRemoteUrl(remote) {
        return new Promise((resolve, reject) => {
            exec(`git remote get-url ${remote}`, (err, url) => {
                if (url) {
                    resolve(url.replace('\n', ''));
                } else {
                    reject (err || 'Remote not found.');
                }
            });
        });
    }

    /**
     * Return the latest hashes from git log.
     *
     * @param count Number of commits to display.
     * @param range Show only commits in the specified revision range.
     * @param format Pretty-print the contents of the commit logs in a given format.
     * @return Promise resolved with the list of hashes.
     */
    async hashes(count, range, format) {
        format = format || '%H';

        const hashList = await this.log(count, range, format);

        const hashes = hashList.split('\n');
        hashes.pop(); // Remove last element, it's an empty string.

        return hashes;
    }

    /**
     * Calls the log command and returns the raw output.
     *
     * @param count Number of commits to display.
     * @param range Show only commits in the specified revision range.
     * @param format Pretty-print the contents of the commit logs in a given format.
     * @param path Show only commits that are enough to explain how the files that match the specified paths came to be.
     * @return Promise resolved with the result.
     */
    log(count, range, format, path) {
        if (typeof count == 'undefined') {
            count = 10;
        }

        let command = 'git log';

        if (count > 0) {
            command += ` -n ${count} `;
        }
        if (format) {
            command += ` --format=${format} `;
        }
        if (range){
            command += ` ${range} `;
        }
        if (path) {
            command += ` -- ${path}`;
        }

        return new Promise((resolve, reject) => {
            exec(command, (err, result, stderr) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }

    /**
     * Return the latest titles of the commit messages.
     *
     * @param count Number of commits to display.
     * @param range Show only commits in the specified revision range.
     * @param path Show only commits that are enough to explain how the files that match the specified paths came to be.
     * @return Promise resolved with the list of titles.
     */
    async messages(count, range, path) {
        count = typeof count != 'undefined' ? count : 10;

        const messageList = await this.log(count, range, '%s', path);

        const messages = messageList.split('\n');
        messages.pop(); // Remove last element, it's an empty string.

        return messages;
    }

    /**
     * Push a branch.
     *
     * @param remote Remote to use.
     * @param branch Branch to push.
     * @param force Whether to force the push.
     * @return Promise resolved when done.
     */
    push(remote, branch, force) {
        return new Promise((resolve, reject) => {
            let command = `git push ${remote} ${branch}`;
            if (force) {
                command += ' -f';
            }

            exec(command, (err, result, stderr) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }
}

module.exports = new Git();
