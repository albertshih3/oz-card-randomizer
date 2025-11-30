import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHANGELOG_PATH = path.join(__dirname, '../src/data/changelog.json');

function getGitInfo() {
    try {
        // Get staged files
        const stagedFilesOutput = execSync('git diff --cached --name-only').toString().trim();
        const stagedFiles = stagedFilesOutput ? stagedFilesOutput.split('\n') : [];

        // Get last commit message
        const lastCommitMessage = execSync('git log -1 --pretty=%B').toString().trim();

        return { stagedFiles, lastCommitMessage };
    } catch (error) {
        console.warn('Failed to get git info:', error.message);
        return { stagedFiles: [], lastCommitMessage: 'Update' };
    }
}

function updateChangelog() {
    try {
        const { stagedFiles, lastCommitMessage } = getGitInfo();

        if (stagedFiles.length === 0 && !lastCommitMessage) {
            console.log('No staged files or commit message found. Skipping changelog update.');
            return;
        }

        const rawData = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
        const changelog = JSON.parse(rawData);

        const today = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Create a new entry
        // We'll try to infer the type from the commit message (conventional commits)
        let type = 'chore';
        let title = 'Updates';

        if (lastCommitMessage.startsWith('feat:')) {
            type = 'feat';
            title = 'New Features';
        } else if (lastCommitMessage.startsWith('fix:')) {
            type = 'fix';
            title = 'Bug Fixes';
        }

        const newEntry = {
            version: "Next", // Placeholder, user can update
            date: today,
            isCurrent: true, // Mark as current
            sections: [
                {
                    title: title,
                    type: type,
                    items: [
                        lastCommitMessage,
                        ...(stagedFiles.length > 0 ? [`Modified files: ${stagedFiles.join(', ')}`] : [])
                    ]
                }
            ]
        };

        // Mark previous current as false
        if (changelog.length > 0) {
            changelog[0].isCurrent = false;
        }

        // Prepend new entry
        changelog.unshift(newEntry);

        fs.writeFileSync(CHANGELOG_PATH, JSON.stringify(changelog, null, 2));
        console.log('Changelog updated successfully!');

    } catch (error) {
        console.error('Error updating changelog:', error);
        process.exit(1);
    }
}

updateChangelog();
