@app_parallel_run_bbb @addon_mod_bigbluebuttonbn @app @mod @mod_bigbluebuttonbn @javascript @lms_from5.1
Feature: Activities overview for bigbluebuttonbn activity

  Background:
    Given the Moodle site is compatible with this feature
    And a BigBlueButton mock server is configured
    And I enable "bigbluebuttonbn" "mod" plugin
    And the following "users" exist:
      | username        | firstname      | lastname |
      | student1        | Username       | 1        |
      | student2        | Username       | 2        |
      | student3        | Username       | 3        |
      | student4        | Username       | 4        |
      | student5        | Username       | 5        |
      | student6        | Username       | 6        |
      | student7        | Username       | 7        |
      | student8        | Username       | 8        |
      | teacher1        | Teacher        | T        |
      | editingteacher1 | EditingTeacher | T        |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user            | course | role           | firstname | lastname |
      | student1        | C1     | student        | Username  | 1        |
      | student2        | C1     | student        | Username  | 2        |
      | student3        | C1     | student        | Username  | 3        |
      | teacher1        | C1     | teacher        | Username  | T        |
      | editingteacher1 | C1     | editingteacher | Username  | ET       |
    And the following "activities" exist:
      | activity        | name                      | intro                                   | course | idnumber         | type | recordings_imported | openingtime    | closingtime    | grade | moderators          |
      | bigbluebuttonbn | RoomRecordings            | Test Room Recording description         | C1     | bigbluebuttonbn1 | 0    | 0                   | 1 January 2024 |                | 100   | role:editingteacher |
      | bigbluebuttonbn | RoomOnly                  | Test Room Recording with visible groups | C1     | bigbluebuttonbn2 | 1    | 0                   |                | 1 January 2040 | 100   | role:editingteacher |
      | bigbluebuttonbn | RecordingOnly             | Test Room Recording with visible groups | C1     | bigbluebuttonbn3 | 2    | 0                   |                |                | 0     | role:editingteacher |
      | bigbluebuttonbn | RoomRecordingsNoUser      | Test Room Recording with visible groups | C1     | bigbluebuttonbn4 | 0    | 0                   | 1 January 2024 | 1 January 2040 | 0     | role:editingteacher |
      | bigbluebuttonbn | RoomRecordingsNoModerator | Test Room Recording with visible groups | C1     | bigbluebuttonbn5 | 0    | 0                   | 1 January 2024 | 1 January 2040 | 0     |                     |
    And the following "mod_bigbluebuttonbn > meeting" exists:
      | activity | RoomRecordings |
    And the following "mod_bigbluebuttonbn > recordings" exist:
      | bigbluebuttonbn | name        | description   | status |
      | RoomRecordings  | Recording 1 | Description 1 | 2      |
      | RoomRecordings  | Recording 2 | Description 2 | 2      |
      | RoomRecordings  | Recording 3 | Description 3 | 2      |
      | RoomRecordings  | Recording 4 | Description 4 | 0      |
    And I am on the "Course 1" "grades > Grader report > View" page logged in as "editingteacher1"
    And I turn editing mode on
    And I give the grade "90.00" to the user "Username 1" for the grade item "RoomRecordings"
    And I give the grade "100.00" to the user "Username 2" for the grade item "RoomOnly"
    And I click on "Save changes" "button"
    And I log out

  Scenario: The bigbluebuttonbn overview report should generate log events
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Activities" in the app
    And I press "BigBlueButton" in the app
    Then the following events should have been logged for "student1" in the app:
      | name                                                          | course   |
      | \core\event\course_overview_viewed                            | Course 1 |
      | \mod_bigbluebuttonbn\event\course_module_instance_list_viewed | Course 1 |

  Scenario: Teachers can see relevant columns in the bigbluebuttonbn overview
    Given I entered the course "Course 1" as "editingteacher1" in the app
    When I press "Activities" in the app
    And I press "BigBlueButton" in the app
    And I press "RoomRecordings" "ion-item" in the app
    Then I should find "Monday, 1 January 2024, 12:00 AM" within "Opens" "ion-item" in the app
    And I should find "-" within "Closes" "ion-item" in the app
    And I should find "Room with recordings" within "Instance type" "ion-item" in the app
    And I should find "3" within "Recordings" "ion-item.core-course-overview-item-recordings" in the app
    And I should find "View" within "Actions" "ion-item" in the app
    But I should not find "Grade" within "BigBlueButton" "ion-accordion" in the app

    When I press "View" within "Actions" "ion-item" in the app
    Then the header should be "RoomRecordings" in the app

    When I go back in the app
    And I press "RoomOnly" "ion-item" in the app
    Then I should find "-" within "Opens" "ion-item" in the app
    And I should find "Sunday, 1 January 2040, 12:00 AM" within "Closes" "ion-item" in the app
    And I should find "Room only" within "Instance type" "ion-item" in the app
    And I should find "-" within "Recordings" "ion-item.core-course-overview-item-recordings" in the app
    And I should find "View" within "Actions" "ion-item" in the app

    When I press "RecordingOnly" "ion-item" in the app
    Then I should find "-" within "Opens" "ion-item" in the app
    And I should find "-" within "Closes" "ion-item" in the app
    And I should find "Recordings only" within "Instance type" "ion-item" in the app
    And I should find "0" within "Recordings" "ion-item.core-course-overview-item-recordings" in the app
    And I should find "View" within "Actions" "ion-item" in the app

    When I press "RoomRecordingsNoUser" "ion-item" in the app
    Then I should find "Monday, 1 January 2024, 12:00 AM" within "Opens" "ion-item" in the app
    And I should find "Sunday, 1 January 2040, 12:00 AM" within "Closes" "ion-item" in the app
    And I should find "Room with recordings" within "Instance type" "ion-item" in the app
    And I should find "0" within "Recordings" "ion-item.core-course-overview-item-recordings" in the app
    And I should find "View" within "Actions" "ion-item" in the app

    When I press "RoomRecordingsNoModerator" "ion-item" in the app
    Then I should find "Monday, 1 January 2024, 12:00 AM" within "Opens" "ion-item" in the app
    And I should find "Sunday, 1 January 2040, 12:00 AM" within "Closes" "ion-item" in the app
    And I should find "-" within "Instance type" "ion-item" in the app
    And I should find "-" within "Recordings" "ion-item.core-course-overview-item-recordings" in the app
    And I should find "-" within "Actions" "ion-item" in the app

  Scenario: Students can see relevant columns in the bigbluebuttonbn overview
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Activities" in the app
    And I press "BigBlueButton" in the app
    And I press "RoomRecordings" "ion-item" in the app
    Then I should find "Monday, 1 January 2024, 12:00 AM" within "Opens" "ion-item" in the app
    And I should find "-" within "Closes" "ion-item" in the app
    And I should find "90.00" within "Grade" "ion-item" in the app
    But I should not find "Instance type" in the app
    And I should not find "Actions" in the app

    When I press "RoomOnly" "ion-item" in the app
    Then I should find "-" within "Opens" "ion-item" in the app
    And I should find "Sunday, 1 January 2040, 12:00 AM" within "Closes" "ion-item" in the app
    And I should find "-" within "Grade" "ion-item" in the app

    When I press "RecordingOnly" "ion-item" in the app
    Then I should find "-" within "Opens" "ion-item" in the app
    And I should find "-" within "Closes" "ion-item" in the app
    And I should find "-" within "Grade" "ion-item" in the app

    When I press "RoomRecordingsNoUser" "ion-item" in the app
    Then I should find "Monday, 1 January 2024, 12:00 AM" within "Opens" "ion-item" in the app
    And I should find "Sunday, 1 January 2040, 12:00 AM" within "Closes" "ion-item" in the app
    And I should find "-" within "Grade" "ion-item" in the app

    When I press "RoomRecordingsNoModerator" "ion-item" in the app
    Then I should find "Monday, 1 January 2024, 12:00 AM" within "Opens" "ion-item" in the app
    And I should find "Sunday, 1 January 2040, 12:00 AM" within "Closes" "ion-item" in the app
    And I should find "-" within "Grade" "ion-item" in the app
