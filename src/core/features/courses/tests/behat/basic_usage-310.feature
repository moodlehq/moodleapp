@core @core_course @app @javascript @lms_upto3.10
Feature: Test basic usage of courses in app
  In order to participate in the courses while using the mobile app
  As a student
  I need basic courses functionality to work

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher | teacher | teacher1@example.com |
      | student1 | Student | student | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |
      | Course 2 | C2 | 0 |
      | Course 3 | C3 | 0 |
      | Course 4 | C4 | 0 |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
      | teacher1 | C2 | editingteacher |
      | teacher1 | C3 | editingteacher |
      | teacher1 | C4 | editingteacher |
      | student1 | C1 | student |
      | student1 | C2 | student |
      | student1 | C3 | student |
    And the following "activities" exist:
      | activity | name            | intro                   | course | idnumber | option                       |
      | choice   | Choice course 1 | Test choice description | C1     | choice1  | Option 1, Option 2, Option 3 |
      | choice   | Choice course 2 | Test choice description | C2     | choice1  | Option 1, Option 2, Option 3 |
      | choice   | Choice course 3 | Test choice description | C3     | choice1  | Option 1, Option 2, Option 3 |
      | choice   | Choice course 4 | Test choice description | C4     | choice1  | Option 1, Option 2, Option 3 |
    And the following "activities" exist:
      | activity | course | idnumber | name                | intro                       | assignsubmission_onlinetext_enabled | duedate      | gradingduedate |
      | assign   | C1     | assign1  | assignment          | Test assignment description | 1                                   | ##tomorrow## | ##tomorrow##   |

  Scenario: Links to actions in Timeline work for teachers/students
    # Submit assignment as student
    Given I entered the app as "student1"
    When I press "Open block drawer" in the app
    And I press "Add submission" in the app
    Then the header should be "assignment" in the app
    And I should find "Test assignment description" in the app
    And I should find "No attempt" in the app
    And I should find "Due date" in the app

    When I press "Add submission" in the app
    And I set the field "Online text submissions" to "test" in the app
    And I press "Save" in the app
    And I press "Submit assignment" in the app
    And I press "OK" in the app
    Then the header should be "assignment" in the app
    And I should find "Test assignment description" in the app
    And I should find "Submitted for grading" in the app
    And I should find "Due date" in the app

    # Grade assignment as teacher
    Given I entered the app as "teacher1"
    When I press "Open block drawer" in the app
    And I press "Grade" in the app
    Then the header should be "assignment" in the app

    When I pull to refresh in the app
    Then I should find "Test assignment description" in the app
    And I should find "Time remaining" in the app

    When I press "Needs grading" in the app
    Then I should find "Student student" in the app
    And I should find "Not graded" in the app
