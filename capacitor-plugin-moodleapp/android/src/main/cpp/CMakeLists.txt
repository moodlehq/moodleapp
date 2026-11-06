cmake_minimum_required(VERSION 3.22.1)
project(moodle_sqlite_migration C)
add_library(moodle_sqlite_migration SHARED sqlite-migration.c)
target_compile_options(moodle_sqlite_migration PRIVATE -Wall -Wextra -Werror)
