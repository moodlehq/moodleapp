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

const gulp = require('gulp');
const DevConfig = require('./dev-config');
const Git = require('./git');
const Jira = require('./jira');
const Utils = require('./utils');

/**
 * Task to push a git branch and update tracker issue.
 */
class PushTask {

    /**
     * Run the task.
     *
     * @param args Command line arguments.
     * @param done Function to call when done.
     */
    async run(args, done) {
        try {
            const remote = args.remote || DevConfig.get('upstreamRemote', 'origin');
            let branch = args.branch;
            const force = !!args.force;

            if (!branch) {
                branch = await Git.getCurrentBranch();
            }

            if (!branch) {
                throw new Error('Cannot determine the current branch. Please make sure youu aren\'t in detached HEAD state');
            } else if (branch == 'HEAD') {
                throw new Error('Cannot push HEAD branch');
            }

            // Push the branch.
            console.log(`Pushing branch ${branch} to remote ${remote}...`);
            await Git.push(remote, branch, force);

            // Update tracker info.
            console.log(`Branch pushed, update tracker info...`);
            await this.updateTrackerGitInfo(branch, remote);
        } catch (error) {
            console.error(error);
        }

        done();
    }

    /**
     * Update git info in the tracker issue.
     *
     * @param branch Branch name.
     * @param remote Remote used.
     * @return Promise resolved when done.
     */
    async updateTrackerGitInfo(branch, remote) {
        // Parse the branch to get the project and issue number.
        const branchData = Utils.parseBranch(branch);

        // Get the repository data for the project.
        let repositoryUrl = DevConfig.get(branchData.project + '.repositoryUrl');
        let diffUrlTemplate = DevConfig.get(branchData.project + '.diffUrlTemplate', '');
        let remoteUrl;

        if (!repositoryUrl) {
            // Calculate the repositoryUrl based on the remote URL.
            remoteUrl = await Git.getRemoteUrl(remote);

            repositoryUrl = remoteUrl.replace(/^https?:\/\//, 'git://');
            if (!repositoryUrl.match(/\.git$/)) {
                repositoryUrl += '.git';
            }
        }

        if (!diffUrlTemplate) {
            // Calculate the diffUrlTemplate based on the remote URL.
            if (!remoteUrl) {
                remoteUrl = await Git.getRemoteUrl(remoteUrl);
            }

            diffUrlTemplate = remoteUrl + '/compare/%headcommit%...%branch%';
        }

        // Search HEAD commit to put in the diff URL.
        console.log ('Searching for head commit...');
        let headCommit = await Git.getHeadCommit(branch, branchData);

        if (!headCommit) {
            throw new Error('Head commit not resolved, aborting update of tracker fields');
        }

        headCommit = headCommit.substr(0, 10);
        console.log(`Head commit resolved to ${headCommit}`);

        // Calculate last properties needed.
        const diffUrl = diffUrlTemplate.replace('%branch%', branch).replace('%headcommit%', headCommit);
        const fieldRepositoryUrl = DevConfig.get('tracker.fieldnames.repositoryurl', 'Pull  from Repository');
        const fieldBranch = DevConfig.get('tracker.fieldnames.branch', 'Pull Master Branch');
        const fieldDiffUrl = DevConfig.get('tracker.fieldnames.diffurl', 'Pull Master Diff URL');

        // Update tracker fields.
        const updates = {};
        updates[fieldRepositoryUrl] = repositoryUrl;
        updates[fieldBranch] = branch;
        updates[fieldDiffUrl] = diffUrl;

        console.log('Setting tracker fields...');
        await Jira.setCustomFields(branchData.issue, updates);
    }
}

module.exports = PushTask;
