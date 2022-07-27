@mod @mod_assign @app @javascript @lms_upto3.10
Feature: Test basic usage of assignment activity in app
  In order to participate in the assignment while using the mobile app
  I need basic assignment functionality to work

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher | teacher | teacher1@example.com |
      | student1 | Student | student | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
      | student1 | C1 | student |
    And the following "activities" exist:
      | activity | course | idnumber | name         | intro                        | assignsubmission_onlinetext_enabled | duedate                       | attemptreopenmethod |
      | assign   | C1     | assign1  | assignment1  | Test assignment description1 | 1                                   | ## 20 August 2002 12:00 PM ## | manual              |

  Scenario: View assign description, due date & View list of student submissions (as teacher) & View own submission or student submission
    # Create, edit and submit as a student
    Given I entered the assign activity "assignment1" on course "Course 1" as "student1" in the app
    Then the header should be "assignment1" in the app
    And I should find "Test assignment description1" in the app
    And I should find "Due date" in the app
    And I should find "Tuesday, 20 August 2002, 12:00 PM" in the app

    When I press "Add submission" in the app
    And I set the field "Online text submissions" to "Submission test" in the app
    And I press "Save" in the app
    Then I should find "Draft (not submitted)" in the app
    And I should find "Not graded" in the app

    When I press "Edit submission" in the app
    And I set the field "Online text submissions" to "Submission test edited" in the app
    And I press "Save" in the app
    And I press "OK" in the app
    Then I should find "Submission test edited" in the app

    When I press "Submit assignment" in the app
    And I press "OK" in the app
    Then I should find "Submitted for grading" in the app
    And I should find "Not graded" in the app
    And I should find "Submission test edited" in the app

    # View as a teacher
    Given I entered the assign activity "assignment1" on course "Course 1" as "teacher1" in the app
    Then the header should be "assignment1" in the app

    When I press "Submitted" in the app
    Then I should find "Student student" in the app
    And I should find "Not graded" in the app

    When I press "Student student" near "assignment1" in the app
    Then I should find "Online text submissions" in the app
    And I should find "Submission test edited" in the app
