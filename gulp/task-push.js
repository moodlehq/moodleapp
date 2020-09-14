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
const inquirer = require('inquirer');
const DevConfig = require('./dev-config');
const Git = require('./git');
const Jira = require('./jira');
const Utils = require('./utils');

/**
 * Task to push a git branch and update tracker issue.
 */
class PushTask {

    /**
     * Ask the user whether he wants to continue.
     *
     * @return Promise resolved with boolean: true if he wants to continue.
     */
    async askConfirmContinue() {
        const answer = await inquirer.prompt([
            {
                type: 'input',
                name: 'confirm',
                message: 'Are you sure you want to continue?',
                default: 'n',
            },
        ]);

        return answer.confirm == 'y';
    }

    /**
     * Push a patch to the tracker and remove the previous one.
     *
     * @param branch Branch name.
     * @param branchData Parsed branch data.
     * @param remote Remote used.
     * @return Promise resolved when done.
     */
    async pushPatch(branch, branchData, remote) {
        const headCommit = await Git.getHeadCommit(branch, branchData);

        if (!headCommit) {
            throw new Error('Head commit not resolved, abort pushing patch.');
        }

        // Create the patch file.
        const fileName = branch + '.patch';
        const tmpPatchPath = `./tmp/${fileName}`;

        await Git.createPatch(`${headCommit}...${branch}`, tmpPatchPath);
        console.log('Git patch created');

        // Check if there is an attachment with same name in the issue.
        const issue = await Jira.getIssue(branchData.issue, 'attachment');

        let existingAttachmentId;
        const attachments = (issue.fields && issue.fields.attachment) || [];
        for (const i in attachments) {
            if (attachments[i].filename == fileName) {
                // Found an existing attachment with the same name, we keep track of it.
                existingAttachmentId = attachments[i].id;
                break
            }
        }

        // Push the patch to the tracker.
        console.log(`Uploading patch ${fileName} to the tracker...`);
        await Jira.upload(branchData.issue, tmpPatchPath);

        if (existingAttachmentId) {
            // On success, deleting file that was there before.
            try {
                console.log('Deleting older patch...')
                await Jira.deleteAttachment(existingAttachmentId);
            } catch (error) {
                console.log('Could not delete older attachment.');
            }
        }
    }

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

            // Parse the branch to get the project and issue number.
            const branchData = Utils.parseBranch(branch);
            const keepRunning = await this.validateCommitMessages(branchData);

            if (!keepRunning) {
                // Last commit not valid, stop.
                console.log('Exiting...');
                done();
                return;
            }

            if (!args.patch) {
                // Check if it's a security issue to force patch mode.
                try {
                    args.patch = await Jira.isSecurityIssue(branchData.issue);

                    if (args.patch) {
                        console.log(`${branchData.issue} appears to be a security issue, switching to patch mode...`);
                    }
                } catch (error) {
                    console.log(`Could not check if ${branchData.issue} is a security issue.`);
                }
            }

            if (args.patch) {
                // Create and upload a patch file.
                await this.pushPatch(branch, branchData, remote);
            } else {
                // Push the branch.
                console.log(`Pushing branch ${branch} to remote ${remote}...`);
                await Git.push(remote, branch, force);

                // Update tracker info.
                console.log(`Branch pushed, update tracker info...`);
                await this.updateTrackerGitInfo(branch, branchData, remote);
            }
        } catch (error) {
            console.error(error);
        }

        done();
    }

    /**
     * Update git info in the tracker issue.
     *
     * @param branch Branch name.
     * @param branchData Parsed branch data.
     * @param remote Remote used.
     * @return Promise resolved when done.
     */
    async updateTrackerGitInfo(branch, branchData, remote) {
        // Get the repository data for the project.
        let repositoryUrl = DevConfig.get(branchData.project + '.repositoryUrl');
        let diffUrlTemplate = DevConfig.get(branchData.project + '.diffUrlTemplate', '');

        if (!repositoryUrl) {
            // Calculate the repositoryUrl based on the remote URL.
            repositoryUrl = await Git.getRemoteUrl(remote);
        }

        // Make sure the repository URL uses the regular format.
        repositoryUrl = repositoryUrl.replace(/^(git@|git:\/\/)/, 'https://')
                                     .replace(/\.git$/, '')
                                     .replace('github.com:', 'github.com/');

        if (!diffUrlTemplate) {
            diffUrlTemplate = Utils.concatenatePaths([repositoryUrl, 'compare/%headcommit%...%branch%']);
        }

        // Now create the git URL for the repository.
        const repositoryGitUrl = repositoryUrl.replace(/^https?:\/\//, 'git://') + '.git';

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
        updates[fieldRepositoryUrl] = repositoryGitUrl;
        updates[fieldBranch] = branch;
        updates[fieldDiffUrl] = diffUrl;

        console.log('Setting tracker fields...');
        await Jira.setCustomFields(branchData.issue, updates);
    }

    /**
     * Validate commit messages comparing them with the branch name.
     *
     * @param branchData Parsed branch data.
     * @return True if value is ok or the user wants to continue anyway, false to stop.
     */
    async validateCommitMessages(branchData) {
        const messages = await Git.messages(30);

        let numConsecutive = 0;
        let wrongCommitCandidate = null;

        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            const issue = Utils.getIssueFromCommitMessage(message);

            if (!issue || issue != branchData.issue) {
                if (i === 0) {
                    // Last commit is wrong, it shouldn't happen. Ask the user if he wants to continue.
                    if (!issue) {
                        console.log('The issue number could not be found in the last commit message.');
                        console.log(`Commit: ${message}`);
                    } else if (issue != branchData.issue) {
                        console.log('The issue number in the last commit does not match the branch being pushed to.');
                        console.log(`Branch: ${branchData.issue} vs. commit: ${issue}`);
                    }

                    return this.askConfirmContinue();
                }

                numConsecutive++;
                if (numConsecutive > 2) {
                    // 3 consecutive commits with different branch, probably the branch commits are over. Everything OK.
                    return true;

                // Don't treat a merge pull request commit as a wrong commit between right commits.
                // The current push could be a quick fix after a merge.
                } else if (!wrongCommitCandidate && message.indexOf('Merge pull request') == -1) {
                    wrongCommitCandidate = {
                        message: message,
                        issue: issue,
                        index: i,
                    };
                }
            } else if (wrongCommitCandidate) {
                // We've found a commit with the branch name after a commit with a different branch. Probably wrong commit.
                if (!wrongCommitCandidate.issue) {
                    console.log('The issue number could not be found in one of the commit messages.');
                    console.log(`Commit: ${wrongCommitCandidate.message}`);
                } else {
                    console.log('The issue number in a certain commit does not match the branch being pushed to.');
                    console.log(`Branch: ${branchData.issue} vs. commit: ${wrongCommitCandidate.issue}`);
                    console.log(`Commit message: ${wrongCommitCandidate.message}`);
                }

                return this.askConfirmContinue();
            }
        }

        return true;
    }
}

module.exports = PushTask;
