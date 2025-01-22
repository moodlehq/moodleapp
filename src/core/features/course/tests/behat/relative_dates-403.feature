@core_course @app @core @javascript @lms_upto4.3
Feature: Check relative dates feature.

  Background:
    Given the Moodle site is compatible with this feature
    And the following config values are set as admin:
      | enablecourserelativedates | 1 |
    And the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | 1        | student1@example.com |
      | teacher1 | Student   | 1        | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category | startdate            | enddate              | relativedatesmode | showactivitydates |
      | Course 1 | C1        | 0        | ## 1 January 2022 ## | ## 1 January 2023 ## | 1                 | 1                 |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity | course | idnumber | name         | allowsubmissionsfromdate | duedate                        | section |
      | assign   | C1     | assign1  | Assignment 1 | ## 20 January 2022 ##    | ## 31 July 2022 ##             | 1       |
      | assign   | C1     | assign2  | Assignment 2 | ## 1 December 2021 ##    | ## 31 January 2023 10:00 AM ## | 2       |

  Scenario: Relative dates (student)
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Course index" in the app
    And I press "Topic 1" in the app
    Then I should find "20 January 2022, 12:00 AM" near "Opened:" in the app
    And I should find "31 July 2022, 12:00 AM" near "Due:" in the app

    When I press "Course index" in the app
    And I press "Topic 2" in the app
    And I should find "1 December 2021, 12:00 AM" near "Opened:" in the app
    And I should find "31 January 2023, 10:00 AM" near "Due:" in the app

  Scenario: Relative dates (teacher)
    Given I entered the course "Course 1" as "teacher1" in the app
    When I press "Course index" in the app
    And I press "Topic 1" in the app
    Then I should find "19 days after course start" near "Opened:" in the app
    And I should find "211 days after course start" near "Due:" in the app

    When I press "Course index" in the app
    And I press "Topic 2" in the app
    And I should find "31 days before course start" near "Opened:" in the app
    And I should find "1 year 30 days 10 hours after course start" near "Due:" in the app
