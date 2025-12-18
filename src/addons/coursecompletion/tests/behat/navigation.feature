@app_parallel_run_completion @addon_coursecompletion @app @block @block_completionstatus @block_selfcompletion @javascript @lms_from5.1
Feature: Course completion navigation

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | email | idnumber |
      | teacher1 | Teacher | 1 | teacher1@example.com | T1 |
      | student1 | Student | 1 | student1@example.com | S1 |
    And the following "courses" exist:
      | fullname | shortname | category | enablecompletion | showcompletionconditions |
      | Course 1 | C1        | 0        | 1                | 1                        |
      | Course 2 | C2        | 0        |                  |                          |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | teacher1 | C2     | editingteacher |
      | student1 | C1     | student        |
      | student1 | C2     | student        |
    And the following "activity" exists:
      | activity                            | assign                  |
      | course                              | C1                      |
      | name                                | Test assignment name    |
      | assignsubmission_onlinetext_enabled | 1                       |
      | grade[modgrade_type]                | Point                   |
      | grade[modgrade_point]               | 100                     |
      | gradepass                           | 70                      |
      | completion                          | 2                       |
      | completionusegrade                  | 1                       |
      | completionpassgrade                 | 1                       |
    And the following "activity" exists:
      | activity | page |
      | course   | C2   |
      | name     | P1   |
    And I enable "selfcompletion" "block" plugin
    And the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | completionstatus | Course       | C1        | course-view-*   | side-pre      |                                                                                                              |
      | selfcompletion   | Course       | C1        | course-view-*   | side-pre      |                                                                                                              |
      | html             | Course       | C1        | course-view-*   | side-pre      | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
      | completionstatus | Course       | C2        | course-view-*   | side-pre      |                                                                                                              |
      | selfcompletion   | Course       | C2        | course-view-*   | side-pre      |                                                                                                              |
      | html             | Course       | C2        | course-view-*   | side-pre      | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And the following config values are set as admin:
      | enablecompletion  | 1 |
    And I am on the "Course 1" course page logged in as teacher1
    And I navigate to "Course completion" in current page administration
    And I click on "Condition: Activity completion" "link"
    And I set the field "Assignment - Test assignment name" to "1"
    And I expand all fieldsets
    And I set the following fields to these values:
      | id_criteria_self | 1 |
    And I press "Save changes"

  Scenario: Completion is available only when enabled for the course
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Open block drawer" in the app
    Then I should find "Course completion status" in the app
    And I should find "Self completion" in the app
    When I press "Close" in the app
    And I press "Next" within "Course" "ion-tab-bar" in the app
    And I press "Completion" in the app
    Then I should find "Status" in the app

    Given I entered the course "Course 2" as "student1" in the app
    When I press "Open block drawer" in the app
    Then I should not find "Course completion status" in the app
    And I should not find "Self completion" in the app
    When I press "Close" in the app
    And I press "Next" within "Course" "ion-tab-bar" in the app
    Then I should not find "Completion" in the app

    Given the following config values are set as admin:
      | enablecompletion  | 0 |
    Then I entered the course "Course 1" as "student1" in the app
    And I pull to refresh in the app
    When I press "Open block drawer" in the app
    Then I should not find "Course completion status" in the app
    And I should not find "Self completion" in the app
    When I press "Close" in the app
    And I press "Next" within "Course" "ion-tab-bar" in the app
    Then I should not find "Completion" in the app
