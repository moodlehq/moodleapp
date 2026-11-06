// (C) Copyright 2026 Moodle Pty Ltd.
// Licensed under the Apache License, Version 2.0.

#include <jni.h>
#include <errno.h>
#include <fcntl.h>
#include <linux/fs.h>
#include <stdio.h>
#include <sys/stat.h>
#include <sys/syscall.h>
#include <unistd.h>

// This primitive is used only by the inactive SQLite migration bridge, with every DB connection closed.
// A missing kernel/filesystem capability is an error: never fall back to overwriting rename().
JNIEXPORT void JNICALL
Java_com_moodle_moodlemobile_plugins_SQLiteMigrationPlugin_renameExclusive(
    JNIEnv *env, jclass clazz, jstring directory, jstring source, jstring destination
) {
    (void) clazz;
    const char *path = (*env)->GetStringUTFChars(env, directory, NULL);
    if (path == NULL) return;
    const char *from = (*env)->GetStringUTFChars(env, source, NULL);
    if (from == NULL) {
        (*env)->ReleaseStringUTFChars(env, directory, path);
        return;
    }
    const char *to = (*env)->GetStringUTFChars(env, destination, NULL);
    if (to == NULL) {
        (*env)->ReleaseStringUTFChars(env, source, from);
        (*env)->ReleaseStringUTFChars(env, directory, path);
        return;
    }
    int error = 0;
    int fd = open(path, O_RDONLY | O_DIRECTORY | O_CLOEXEC | O_NOFOLLOW);
    if (fd < 0) {
        error = errno;
    } else {
        struct stat info;
        if (fstatat(fd, from, &info, AT_SYMLINK_NOFOLLOW) != 0) {
            error = errno;
        } else if (!S_ISREG(info.st_mode)) {
            error = EINVAL;
        } else if (syscall(SYS_renameat2, fd, from, fd, to, RENAME_NOREPLACE) != 0) {
            error = errno;
        } else if (fsync(fd) != 0) {
            // The rename may already have happened. The recorded protocol checks both paths on retry.
            error = errno;
        }
        close(fd);
    }
    (*env)->ReleaseStringUTFChars(env, destination, to);
    (*env)->ReleaseStringUTFChars(env, source, from);
    (*env)->ReleaseStringUTFChars(env, directory, path);
    if (error != 0) {
        char message[96];
        snprintf(message, sizeof(message), "Exclusive SQLite rename failed (errno %d)", error);
        jclass exception = (*env)->FindClass(env, "java/io/IOException");
        if (exception != NULL) (*env)->ThrowNew(env, exception, message);
    }
}
