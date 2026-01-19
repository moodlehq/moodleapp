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

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreDebugConsole, DebugLogEntry } from '@services/debug-console';
import { CorePlatform } from '@services/platform';
import { CoreSites } from '@services/sites';
import { CoreDomUtils } from '@services/utils/dom';
import { CoreConstants } from '@/core/constants';
import { CoreFile } from '@services/file';
import { CoreUserParent } from '@features/user/services/parent';

type LogFilter = 'all' | 'error' | 'warn' | 'info' | 'log' | 'debug';

@Component({
    selector: 'page-core-debug',
    templateUrl: 'debug.html',
    styleUrl: 'debug.scss',
    standalone: true,
    imports: [CoreSharedModule],
})
export class CoreDebugPage implements OnInit, OnDestroy {

    logs: DebugLogEntry[] = [];
    filteredLogs: DebugLogEntry[] = [];
    activeFilter: LogFilter = 'all';
    autoScroll = true;
    searchQuery = '';

    // Stats
    totalLogs = 0;
    errorCount = 0;
    warnCount = 0;

    // System info
    platform = '';
    appVersion = CoreConstants.CONFIG.versionname;
    siteUrl = '';
    userId = 0;
    isParent = false;

    private refreshInterval?: ReturnType<typeof setInterval>;

    constructor(private cdr: ChangeDetectorRef) {}

    async ngOnInit(): Promise<void> {
        // Collect system info
        this.platform = CorePlatform.isIOS() ? 'iOS' : CorePlatform.isAndroid() ? 'Android' : 'Web';

        try {
            const site = CoreSites.getCurrentSite();
            if (site) {
                this.siteUrl = site.getURL();
                this.userId = site.getUserId();
            }
            this.isParent = await CoreUserParent.isParentUser();
        } catch {
            // Ignore errors
        }

        // Initial load
        this.refreshLogs();

        // Auto-refresh every second
        this.refreshInterval = setInterval(() => {
            this.refreshLogs();
        }, 1000);
    }

    ngOnDestroy(): void {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    }

    /**
     * Refresh logs from the debug console service.
     */
    refreshLogs(): void {
        this.logs = CoreDebugConsole.getLogs();
        this.totalLogs = this.logs.length;
        this.errorCount = CoreDebugConsole.getErrorCount();
        this.warnCount = CoreDebugConsole.getWarnCount();
        this.applyFilter();
        this.cdr.detectChanges();
    }

    /**
     * Apply current filter to logs.
     */
    applyFilter(): void {
        let filtered = this.logs;

        // Apply level filter
        if (this.activeFilter !== 'all') {
            filtered = filtered.filter(log => log.level === this.activeFilter);
        }

        // Apply search filter
        if (this.searchQuery.trim()) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(log =>
                log.message.toLowerCase().includes(query) ||
                log.args.toLowerCase().includes(query)
            );
        }

        this.filteredLogs = filtered;
    }

    /**
     * Set active filter.
     */
    setFilter(filter: LogFilter): void {
        this.activeFilter = filter;
        this.applyFilter();
    }

    /**
     * Handle search input.
     */
    onSearchChange(): void {
        this.applyFilter();
    }

    /**
     * Clear all logs.
     */
    clearLogs(): void {
        CoreDebugConsole.clear();
        this.refreshLogs();
        CoreDomUtils.showToast('Logs cleared', true);
    }

    /**
     * Copy all logs to clipboard.
     */
    async copyLogs(): Promise<void> {
        const text = this.getExportText();
        try {
            await navigator.clipboard.writeText(text);
            CoreDomUtils.showToast('Copied to clipboard', true);
        } catch {
            // Fallback: show in alert
            CoreDomUtils.showAlert('Debug Logs', `<textarea style="width:100%;height:200px;font-size:10px;">${text}</textarea>`);
        }
    }

    /**
     * Export logs to file.
     */
    async exportLogs(): Promise<void> {
        const text = this.getExportText();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `aspire-debug-${timestamp}.txt`;

        if (CorePlatform.isMobile()) {
            try {
                await CoreFile.writeFile(filename, text);
                CoreDomUtils.showToast(`Saved: ${filename}`, true);

                // Try to share
                if (navigator.share) {
                    const file = new File([text], filename, { type: 'text/plain' });
                    await navigator.share({ files: [file], title: 'Aspire Debug Log' });
                }
            } catch (error) {
                console.error('Export error:', error);
                CoreDomUtils.showAlert('Export', `<textarea style="width:100%;height:200px;font-size:10px;">${text}</textarea>`);
            }
        } else {
            // Web download
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            CoreDomUtils.showToast('Downloaded', true);
        }
    }

    /**
     * Get export text with system info and logs.
     */
    private getExportText(): string {
        const lines: string[] = [];

        lines.push('='.repeat(50));
        lines.push('ASPIRE DEBUG LOG');
        lines.push('='.repeat(50));
        lines.push('');
        lines.push(`Exported: ${new Date().toISOString()}`);
        lines.push(`Platform: ${this.platform}`);
        lines.push(`App Version: ${this.appVersion}`);
        lines.push(`Site URL: ${this.siteUrl}`);
        lines.push(`User ID: ${this.userId}`);
        lines.push(`Is Parent: ${this.isParent}`);
        lines.push(`User Agent: ${navigator.userAgent}`);
        lines.push('');
        lines.push(`Total Logs: ${this.totalLogs}`);
        lines.push(`Errors: ${this.errorCount}`);
        lines.push(`Warnings: ${this.warnCount}`);
        lines.push('');
        lines.push('='.repeat(50));
        lines.push('CONSOLE OUTPUT');
        lines.push('='.repeat(50));
        lines.push('');
        lines.push(CoreDebugConsole.getLogsAsText());

        return lines.join('\n');
    }

    /**
     * Test YouTube playback.
     */
    testYouTube(): void {
        const testVideoId = 'dQw4w9WgXcQ';
        const isIOS = CorePlatform.isIOS();
        const testUrl = isIOS
            ? `assets/youtube-proxy.html?v=${testVideoId}`
            : `https://www.youtube-nocookie.com/embed/${testVideoId}`;

        CoreDomUtils.showAlert(
            'YouTube Test',
            `<p><strong>Platform:</strong> ${isIOS ? 'iOS (proxy)' : 'Other (direct)'}</p>
            <p><strong>URL:</strong> <code style="font-size:10px;word-break:break-all;">${testUrl}</code></p>
            <iframe src="${testUrl}" width="100%" height="180" frameborder="0" allowfullscreen ${!isIOS ? 'credentialless' : ''}></iframe>
            <p style="font-size:11px;color:#666;margin-top:8px;">Error 153 = Check iOS Settings > Safari > Prevent Cross-Site Tracking</p>`
        );
    }

    /**
     * Format timestamp for display.
     */
    formatTime(date: Date): string {
        return date.toISOString().substring(11, 23);
    }

    /**
     * Track logs by index for ngFor.
     */
    trackByIndex(index: number): number {
        return index;
    }

    /**
     * Get CSS class for log level.
     */
    getLevelClass(level: string): string {
        return `log-${level}`;
    }

}
