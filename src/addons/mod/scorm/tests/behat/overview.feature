@app_parallel_run_scorm @addon_mod_scorm @app @mod @mod_scorm @javascript @lms_from5.1
Feature: Activities overview for SCORM activity

  Background:
    Given the Moodle site is compatible with this feature
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
      | Course 2 | C2        |
    And the following "course enrolments" exist:
      | user            | course | role           |
      | student1        | C1     | student        |
      | student2        | C1     | student        |
      | student3        | C1     | student        |
      | teacher1        | C1     | teacher        |
      | editingteacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity | course | name    | packagefilepath                             | forcenewattempt | idnumber | timeclose      | grademethod |
      | scorm    | C1     | Scorm 1 | mod/scorm/tests/packages/singlescobasic.zip | 0               | scorm1   | 1 January 2040 | 3           |
      | scorm    | C1     | Scorm 2 | mod/scorm/tests/packages/singlescobasic.zip | 0               | scorm2   |                | 3           |
      | scorm    | C2     | Scorm 3 | mod/scorm/tests/packages/singlescobasic.zip | 0               | scorm3   |                | 3           |
    And the following "mod_scorm > attempts" exist:
      | scorm  | user     | attempt | element               | value     | scoidentifier |
      | scorm1 | student1 | 1       | cmi.core.score.raw    | 50        | item_1        |
      | scorm1 | student1 | 1       | cmi.completion_status | completed | item_1        |
      | scorm1 | student2 | 1       | cmi.core.score.raw    | 100       | item_1        |
      | scorm1 | student2 | 1       | cmi.completion_status | completed | item_1        |

  Scenario: The scorm overview report should generate log events
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Activities" in the app
    And I press "SCORM packages" in the app
    Then the following events should have been logged for "student1" in the app:
      | name                                                | course   |
      | \core\event\course_overview_viewed                  | Course 1 |
      | \mod_scorm\event\course_module_instance_list_viewed | Course 1 |

  Scenario: Teachers can see relevant columns in the scorm overview
    Given I entered the course "Course 1" as "teacher1" in the app
    When I press "Activities" in the app
    And I press "SCORM packages" in the app
    And I press "Scorm 1" "ion-item" in the app
    Then I should find "Sunday, 1 January 2040, 12:00 AM" within "Due date" "ion-item" in the app
    And I should find "2 of 5" within "Student who attempted" "ion-item" in the app
    And I should find "2" within "Total attempts" "ion-item" in the app
    And I should find "View" within "Actions" "ion-item" in the app

    When I press "View" within "Actions" "ion-item" in the app
    And I press "OK" in the app
    Then the app should have opened a browser tab

    When I close the browser tab opened by the app
    And I press "Scorm 2" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should find "0 of 5" within "Student who attempted" "ion-item" in the app
    And I should find "0" within "Total attempts" "ion-item" in the app
    And I should find "View" within "Actions" "ion-item" in the app

  Scenario: Teachers can see relevant columns when there are no participants in the course
    Given I entered the course "Course 2" as "admin" in the app
    And I press "OK" in the app
    When I press "Activities" in the app
    And I press "SCORM packages" in the app
    And I press "Scorm 3" "ion-item" in the app
    Then I should find "0 of 0" within "Student who attempted" "ion-item" in the app
    And I should find "0" within "Total attempts" "ion-item" in the app
    And I should find "View" within "Actions" "ion-item" in the app
    But I should not find "Due date" in the app

  Scenario Template: Students can see relevant columns in the scorm overview
    Given I entered the course "Course 1" as "<student>" in the app
    When I press "Activities" in the app
    And I press "SCORM packages" in the app
    And I press "Scorm 1" "ion-item" in the app
    Then I should find "1 January 2040" within "Due date" "ion-item" in the app
    And I should find "<grade>" within "Grade" "ion-item" in the app

    When I press "Scorm 2" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should find "-" within "Grade" "ion-item" in the app

    Examples:
      | student  | grade  |
      | student1 | 50.00  |
      | student2 | 100.00 |
