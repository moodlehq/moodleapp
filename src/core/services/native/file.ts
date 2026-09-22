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

import { Injectable } from '@angular/core';
import { Directory } from '@capacitor/filesystem';
import {
	type DirectoryEntry,
	type Entry,
	type FileEntry,
} from '@classes/native/filesystem';
import { CoreFile, CoreFileFormat } from '@services/file';
import { CorePath } from '@static/path';
import { CorePromiseUtils } from '@static/promise-utils';
import { Filesystem } from '@singletons';

type Flags = {
	create?: boolean;
	exclusive?: boolean;
};

type IWriteOptions = {
	replace?: boolean;
	append?: boolean;
	truncate?: number;
};

type RemoveResult = {
	success: boolean;
	fileRemoved: Entry;
};

/**
 * Service to keep backwards compatibility with Cordova File service for plugins. Will be removed in the future.
 *
 * @deprecated since 6.0. Use CoreFile instead.
 */
@Injectable({ providedIn: 'root' })
export class File {

	applicationDirectory = CoreFile.getWWWAbsolutePath();
	applicationStorageDirectory = '';
	dataDirectory = '';
	cacheDirectory = '';
	externalApplicationStorageDirectory = '';
	externalDataDirectory = '';
	externalCacheDirectory = '';
	externalRootDirectory = '';
	tempDirectory = '';
	syncedDataDirectory = '';
	documentsDirectory = '';
	sharedDirectory = '';

	cordovaFileError = window.FileError;

	/**
	 * Create FileMock service.
	 */
	constructor() {
		this.hydrateBaseDirectories();
	}

	/**
	 * Get free disk space in bytes.
	 *
	 * @returns Remaining free disk space in bytes.
	 */
	async getFreeDiskSpace(): Promise<number> {
		// @todo Capacitor: Once calculateFreeSpace is properly implemented, evaluate if we should convert the
		// units to keep backwards compatibility with Cordova. Cordova returned bytes in iOS and KB in Android.
		return CoreFile.calculateFreeSpace();
	}

	/**
	 * Check if a directory exists.
	 *
	 * @param path Base path.
	 * @param dir Directory name.
	 * @returns True if directory exists.
	 */
	async checkDir(path: string, dir: string): Promise<boolean> {
		await CoreFile.getDir(this.joinPath(path, dir));

		return true;
	}

	/**
	 * Create a directory.
	 *
	 * @param path Base path.
	 * @param dirName Directory name.
	 * @param replace Whether to replace an existing directory.
	 * @returns Created directory entry.
	 */
	async createDir(path: string, dirName: string, replace: boolean): Promise<DirectoryEntry> {
		const fullPath = this.joinPath(path, dirName);

		if (replace) {
			await CorePromiseUtils.ignoreErrors(CoreFile.removeDir(fullPath));

			return CoreFile.createDir(fullPath);
		}

		return CoreFile.createDir(fullPath, true);
	}

	/**
	 * Remove a directory.
	 *
	 * @param path Base path.
	 * @param dirName Directory name.
	 * @returns Removal result.
	 */
	async removeDir(path: string, dirName: string): Promise<RemoveResult> {
		const fullPath = this.joinPath(path, dirName);
		const removedEntry = await CoreFile.getDir(fullPath);

		await Filesystem.rmdir({ path: removedEntry.toURL(), recursive: false });

		return {
			success: true,
			fileRemoved: removedEntry,
		};
	}

	/**
	 * Move a directory.
	 *
	 * @param path Source base path.
	 * @param dirName Source directory name.
	 * @param newPath Destination base path.
	 * @param newDirName Destination directory name.
	 * @returns Moved entry.
	 */
	async moveDir(path: string, dirName: string, newPath: string, newDirName: string): Promise<DirectoryEntry | Entry> {
		const source = this.joinPath(path, dirName);
		const destination = this.joinPath(newPath, newDirName || dirName);

		return CoreFile.moveDir(source, destination);
	}

	/**
	 * Copy a directory.
	 *
	 * @param path Source base path.
	 * @param dirName Source directory name.
	 * @param newPath Destination base path.
	 * @param newDirName Destination directory name.
	 * @returns Copied entry.
	 */
	async copyDir(path: string, dirName: string, newPath: string, newDirName: string): Promise<Entry> {
		const source = this.joinPath(path, dirName);
		const destination = this.joinPath(newPath, newDirName || dirName);

		return CoreFile.copyDir(source, destination);
	}

	/**
	 * List directory entries.
	 *
	 * @param path Base path.
	 * @param dirName Directory name.
	 * @returns Entries in the directory.
	 */
	async listDir(path: string, dirName: string): Promise<Entry[]> {
		return CoreFile.getDirectoryContents(this.joinPath(path, dirName));
	}

	/**
	 * Remove a directory recursively.
	 *
	 * @param path Base path.
	 * @param dirName Directory name.
	 * @returns Removal result.
	 */
	async removeRecursively(path: string, dirName: string): Promise<RemoveResult> {
		const fullPath = this.joinPath(path, dirName);
		const removedEntry = await CoreFile.getDir(fullPath);

		await CoreFile.removeDir(fullPath);

		return {
			success: true,
			fileRemoved: removedEntry,
		};
	}

	/**
	 * Check if a file exists.
	 *
	 * @param path Base path.
	 * @param file File name.
	 * @returns True if file exists.
	 */
	async checkFile(path: string, file: string): Promise<boolean> {
		await CoreFile.getFile(this.joinPath(path, file));

		return true;
	}

	/**
	 * Create a file.
	 *
	 * @param path Base path.
	 * @param fileName File name.
	 * @param replace Whether to replace an existing file.
	 * @returns Created file entry.
	 */
	async createFile(path: string, fileName: string, replace: boolean): Promise<FileEntry> {
		const fullPath = this.joinPath(path, fileName);

		if (replace) {
			await CorePromiseUtils.ignoreErrors(CoreFile.removeFile(fullPath));

			return CoreFile.createFile(fullPath);
		}

		return CoreFile.createFile(fullPath, true);
	}

	/**
	 * Remove a file.
	 *
	 * @param path Base path.
	 * @param fileName File name.
	 * @returns Removal result.
	 */
	async removeFile(path: string, fileName: string): Promise<RemoveResult> {
		const fullPath = this.joinPath(path, fileName);
		const removedEntry = await CoreFile.getFile(fullPath);

		await CoreFile.removeFile(fullPath);

		return {
			success: true,
			fileRemoved: removedEntry,
		};
	}

	/**
	 * Write content into a file.
	 *
	 * @param path Base path.
	 * @param fileName File name.
	 * @param text Data to write.
	 * @param options Write options.
	 * @returns Updated file entry.
	 */
	async writeFile(
		path: string,
		fileName: string,
		text: string | Blob | ArrayBuffer,
		options?: IWriteOptions,
	): Promise<FileEntry> {
		const fullPath = this.joinPath(path, fileName);

		if (options?.replace === false) {
			await CoreFile.createFile(fullPath, true);
		}

		if (typeof options?.truncate === 'number') {
			await this.truncateFile(fullPath, options.truncate);
		}

		const data = this.normalizeWriteData(text);

		return CoreFile.writeFile(fullPath, data, options?.append);
	}

	/**
	 * Write content into an existing file.
	 *
	 * @param path Base path.
	 * @param fileName File name.
	 * @param text Data to write.
	 * @returns Promise resolved when written.
	 */
	async writeExistingFile(path: string, fileName: string, text: string | Blob): Promise<void> {
		const fullPath = this.joinPath(path, fileName);

		await CoreFile.getFile(fullPath);
		await CoreFile.writeFile(fullPath, text, false);
	}

	/**
	 * Read a file as UTF-8 text.
	 *
	 * @param path Base path.
	 * @param file File name.
	 * @returns File contents.
	 */
	async readAsText(path: string, file: string): Promise<string> {
		return CoreFile.readFile(this.joinPath(path, file), CoreFileFormat.FORMATTEXT);
	}

	/**
	 * Read a file as data URL.
	 *
	 * @param path Base path.
	 * @param file File name.
	 * @returns File contents in data URL format.
	 */
	async readAsDataURL(path: string, file: string): Promise<string> {
		return CoreFile.readFile(this.joinPath(path, file), CoreFileFormat.FORMATDATAURL);
	}

	/**
	 * Read a file as binary string.
	 *
	 * @param path Base path.
	 * @param file File name.
	 * @returns Binary string representation.
	 */
	async readAsBinaryString(path: string, file: string): Promise<string> {
		const buffer = await this.readAsArrayBuffer(path, file);
		const bytes = new Uint8Array(buffer);
		let binary = '';

		for (let i = 0; i < bytes.length; i++) {
			binary += String.fromCharCode(bytes[i]);
		}

		return binary;
	}

	/**
	 * Read a file as ArrayBuffer.
	 *
	 * @param path Base path.
	 * @param file File name.
	 * @returns ArrayBuffer contents.
	 */
	async readAsArrayBuffer(path: string, file: string): Promise<ArrayBuffer> {
		return CoreFile.readFile(this.joinPath(path, file), CoreFileFormat.FORMATARRAYBUFFER);
	}

	/**
	 * Move a file.
	 *
	 * @param path Source base path.
	 * @param fileName Source file name.
	 * @param newPath Destination base path.
	 * @param newFileName Destination file name.
	 * @returns Moved entry.
	 */
	async moveFile(path: string, fileName: string, newPath: string, newFileName: string): Promise<Entry> {
		const source = this.joinPath(path, fileName);
		const destination = this.joinPath(newPath, newFileName || fileName);

		return CoreFile.moveFile(source, destination);
	}

	/**
	 * Copy a file.
	 *
	 * @param path Source base path.
	 * @param fileName Source file name.
	 * @param newPath Destination base path.
	 * @param newFileName Destination file name.
	 * @returns Copied entry.
	 */
	async copyFile(path: string, fileName: string, newPath: string, newFileName: string): Promise<Entry> {
		const source = this.joinPath(path, fileName);
		const destination = this.joinPath(newPath, newFileName || fileName);

		return CoreFile.copyFile(source, destination);
	}

	/**
	 * Resolve a local filesystem URL.
	 *
	 * @param fileUrl URL to resolve.
	 * @returns Resolved file or directory entry.
	 */
	async resolveLocalFilesystemUrl(fileUrl: string): Promise<Entry> {
		const normalizedPath = this.normalizeIncomingPath(fileUrl);

		try {
			return await CoreFile.getFile(normalizedPath);
		} catch {
			return CoreFile.getDir(normalizedPath);
		}
	}

	/**
	 * Resolve a local directory URL.
	 *
	 * @param directoryUrl URL to resolve.
	 * @returns Resolved directory entry.
	 */
	async resolveDirectoryUrl(directoryUrl: string): Promise<DirectoryEntry> {
		return CoreFile.getDir(this.normalizeIncomingPath(directoryUrl));
	}

	/**
	 * Get or create a child directory from a parent directory entry.
	 *
	 * @param directoryEntry Parent directory entry.
	 * @param directoryName Child directory name.
	 * @param flags Lookup flags.
	 * @returns Directory entry.
	 */
	async getDirectory(directoryEntry: DirectoryEntry, directoryName: string, flags: Flags): Promise<DirectoryEntry> {
		const childPath = this.joinPath(directoryEntry.toURL(), directoryName);

		if (flags.create) {
			return CoreFile.createDir(childPath, !!flags.exclusive);
		}

		return CoreFile.getDir(childPath);
	}

	/**
	 * Get or create a child file from a parent directory entry.
	 *
	 * @param directoryEntry Parent directory entry.
	 * @param fileName Child file name.
	 * @param flags Lookup flags.
	 * @returns File entry.
	 */
	async getFile(directoryEntry: DirectoryEntry, fileName: string, flags: Flags): Promise<FileEntry> {
		const childPath = this.joinPath(directoryEntry.toURL(), fileName);

		if (flags.create) {
			return CoreFile.createFile(childPath, !!flags.exclusive);
		}

		return CoreFile.getFile(childPath);
	}

	/**
	 * Fill base folder properties from CoreFile since Cordova values are not available.
	 */
	protected async hydrateBaseDirectories(): Promise<void> {
		const dataUri = await this.getDirectoryUri(Directory.Data);
		const cacheUri = await this.getDirectoryUri(Directory.Cache);
		const externalUri = await this.getDirectoryUri(Directory.External);
		const externalStorageUri = await this.getDirectoryUri(Directory.ExternalStorage);
		const documentsUri = await this.getDirectoryUri(Directory.Documents);
		const temporaryUri = await this.getDirectoryUri(Directory.Temporary);
		const externalCacheUri = await this.getDirectoryUri(Directory.ExternalCache);

		const basePath = await CoreFile.getBasePath();
		const defaultDataDirectory = dataUri || basePath;
		const defaultCacheDirectory = cacheUri || CorePath.concatenatePaths(basePath, 'cache');
		const defaultDocumentsDirectory = documentsUri || defaultDataDirectory;
		const defaultExternalDirectory = externalUri || externalStorageUri || defaultDataDirectory;

		this.applicationStorageDirectory = this.applicationStorageDirectory || defaultDataDirectory;
		this.dataDirectory = this.dataDirectory || defaultDataDirectory;
		this.cacheDirectory = this.cacheDirectory || defaultCacheDirectory;
		this.externalApplicationStorageDirectory = this.externalApplicationStorageDirectory || defaultExternalDirectory;
		this.externalDataDirectory = this.externalDataDirectory || defaultExternalDirectory;
		this.externalCacheDirectory = this.externalCacheDirectory || externalCacheUri || defaultCacheDirectory;
		this.externalRootDirectory = this.externalRootDirectory || externalStorageUri || defaultExternalDirectory;
		this.tempDirectory = this.tempDirectory || temporaryUri || CorePath.concatenatePaths(basePath, 'tmp');
		this.syncedDataDirectory = this.syncedDataDirectory || defaultDocumentsDirectory;
		this.documentsDirectory = this.documentsDirectory || defaultDocumentsDirectory;
		this.sharedDirectory = this.sharedDirectory || defaultDocumentsDirectory;
	}

	/**
	 * Join a base path with a child file or directory name.
	 *
	 * @param path Base path.
	 * @param child Child name.
	 * @returns Joined path.
	 */
	protected joinPath(path: string, child: string): string {
		return this.normalizeIncomingPath(CorePath.concatenatePaths(path, child));
	}

	/**
	 * Normalize input paths to avoid mixed Capacitor and file:// URL formats.
	 *
	 * @param path Path to normalize.
	 * @returns Normalized path.
	 */
	protected normalizeIncomingPath(path: string): string {
		return CoreFile.unconvertFileSrc(path);
	}

	/**
	 * Resolve a Capacitor directory to an absolute URI.
	 *
	 * @param directory Directory to resolve.
	 * @returns Absolute URI, or empty string if unavailable.
	 */
	protected async getDirectoryUri(directory: Directory): Promise<string> {
		const result = await CorePromiseUtils.ignoreErrors(Filesystem.getUri({
			directory,
			path: '',
		}));

		return result?.uri || '';
	}

	/**
	 * Convert write input into a CoreFile-compatible value.
	 *
	 * @param text Data to write.
	 * @returns Normalized data.
	 */
	protected normalizeWriteData(text: string | Blob | ArrayBuffer): string | Blob {
		if (text instanceof ArrayBuffer) {
			return new Blob([text]);
		}

		return text;
	}

	/**
	 * Truncate a file to a specific size.
	 *
	 * @param path File path.
	 * @param size Target size in bytes.
	 */
	protected async truncateFile(path: string, size: number): Promise<void> {
		const current = await CoreFile.readFile(path, CoreFileFormat.FORMATARRAYBUFFER);
		const truncated = current.slice(0, Math.max(size, 0));

		await CoreFile.writeFile(path, new Blob([truncated]), false);
	}

}
