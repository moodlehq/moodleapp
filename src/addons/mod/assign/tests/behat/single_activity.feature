@addon_mod_assign @app @mod @mod_assign @javascript @singleactivity
Feature: Test single activity of assign type in app
  In order to view a assign while using the mobile app
  As a student
  I need single activity of assign type functionality to work

  Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | student1 | First     | Student  |
    And the following "courses" exist:
      | fullname | shortname | category | format         | activitytype |
      | Course 1 | C1        | 0        | singleactivity | assign       |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
    And the following "activity" exist:
      | activity   | name                   | intro                   | course | idnumber | assignsubmission_onlinetext_enabled | assignfeedback_comments_enabled | duedate                       | attemptreopenmethod | maxattempts |
      | assign     | Single activity assign | Test assign description | C1     | 1        | 1                                   | 1                               | ## 20 August 2002 12:00 PM ## | manual              | -1          |

  Scenario: Single activity assign
    Given I entered the course "Course 1" as "student1" in the app
    Then I should find "Attempt 1" in the app

    When I set "page-core-course-index .core-course-thumb" styles to "background" "lightblue"
    And I set "page-core-course-index .core-course-thumb img" styles to "display" "none"
    Then the UI should match the snapshot

    And I press "Add submission" in the app
    And I set the field "Online text submissions" to "Submission test" in the app
    And I press "Save" in the app
    And I should find "Draft (not submitted)" in the app
    And I should find "Not graded" in the app
