@core_courses @app @javascript
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
      | fullname | shortname | category | visible |
      | Course 1 | C1 | 0 | 1 |
      | Course 2 | C2 | 0 | 1 |
      | Course 3 | C3 | 0 | 1 |
      | Course 4 | C4 | 0 | 1 |
      | Hidden course | CH | 0 | 0 |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
      | teacher1 | C2 | editingteacher |
      | teacher1 | C3 | editingteacher |
      | teacher1 | C4 | editingteacher |
      | teacher1 | CH | editingteacher |
      | student1 | C1 | student |
      | student1 | C2 | student |
      | student1 | C3 | student |
      | student1 | CH | student |
    And the following "activities" exist:
      | activity | name            | intro                   | course | idnumber | option                       |
      | choice   | Choice course 1 | Test choice description | C1     | choice1  | Option 1, Option 2, Option 3 |
      | choice   | Choice course 2 | Test choice description | C2     | choice1  | Option 1, Option 2, Option 3 |
      | choice   | Choice course 3 | Test choice description | C3     | choice1  | Option 1, Option 2, Option 3 |
      | choice   | Choice course 4 | Test choice description | C4     | choice1  | Option 1, Option 2, Option 3 |
    And the following "activities" exist:
      | activity | course | idnumber | name                | intro                       | assignsubmission_onlinetext_enabled | duedate      | gradingduedate |
      | assign   | C1     | assign1  | assignment          | Test assignment description | 1                                   | ##tomorrow## | ##tomorrow##   |

  Scenario: "Dashboard" tab displayed
    Given I entered the app as "student1"
    When I should see "Dashboard"
    And the header should be "Acceptance test site" in the app
    And I should see "Timeline"
    And I press "Site home" in the app
    Then I should find "Dashboard" in the app
    And the header should be "Acceptance test site" in the app

    When I press "My courses" in the app
    Then I should find "Course 1" in the app
    And I should find "Course 2" in the app
    And I should find "Course 3" in the app

  Scenario: Hidden course is only accessible for teachers
    Given I entered the app as "teacher1"
    And I press "My courses" in the app
    Then I should find "Hidden from students" within "Hidden course" "ion-item" in the app

    When I press "Hidden course" in the app
    Then the header should be "Hidden course" in the app

    Given I entered the app as "student1"
    And I press "My courses" in the app
    Then I should not find "Hidden course" in the app
    And I should not find "Hidden from students" in the app

  @lms_from4.3
  Scenario: See my courses
    Given I entered the app as "student1"
    When the header should be "Acceptance test site" in the app
    And I press "My courses" in the app
    And I should find "Course 1" in the app
    And I should find "Course 2" in the app
    And I should find "Course 3" in the app

    When I press "Course 1" in the app
    Then I should find "Choice course 1" in the app
    And the header should be "Course 1" in the app

    When I press "Choice course 1" in the app
    Then I should find "Test choice description" in the app
    And the header should be "Choice course 1" in the app

    When I go back to the root page in the app
    And I press "Course 2" in the app
    Then I should find "Choice course 2" in the app
    And the header should be "Course 2" in the app

    When I go back in the app
    And I press "Course 3" in the app
    Then I should find "Choice course 3" in the app
    And the header should be "Course 3" in the app
    And the following events should have been logged for "student1" in the app:
      | name                         |
      | \core\event\dashboard_viewed |
      | \core\event\mycourses_viewed |

  Scenario: Search for a course
    Given I entered the app as "student1"
    When I press "Search courses" in the app
    And I set the field "Search" to "Course 4" in the app
    And I press "Search" "button" in the app
    Then I should find "Course 4" in the app
    And the header should be "Available courses" in the app

    When I press "Course 4" in the app
    Then I should find "Course 4" in the app
    And I should find "Course summary" in the app

    When I go back in the app
    And I set the field "Search" to "Course" in the app
    And I press "Search" "button" in the app
    Then I should find "Course 1" in the app
    And I should find "Course 2" in the app
    And I should find "Course 3" in the app
    And I should find "Course 4" in the app

  Scenario: Links to actions in Timeline work for teachers/students
    # Submit assignment as student
    Given I entered the app as "student1"
    When I press "assignment" in the app
    Then the header should be "assignment" in the app
    And I should find "Test assignment description" in the app
    And I should find "No attempt" in the app
    And I should find "Due:" in the app

    When I press "Add submission" in the app
    Then I should find "Online text submissions" in the app

    When I go back 2 times in the app
    And I press "Add submission" in the app
    Then I should find "Online text submissions" in the app

    When I set the field "Online text submissions" to "test" in the app
    And I press "Save" in the app
    And I press "Submit assignment" in the app
    And I press "OK" in the app
    Then the header should be "assignment" in the app
    And I should find "Test assignment description" in the app
    And I should find "Submitted for grading" in the app
    And I should find "Due:" in the app

    # Grade assignment as teacher
    Given I entered the app as "teacher1"
    When I pull to refresh in the app
    And I press "Grade" in the app
    Then the header should be "assignment" in the app

    When I pull to refresh in the app
    Then I should find "Test assignment description" in the app
    And I should find "Time remaining" in the app

    When I press "Needs grading" in the app
    Then I should find "Student student" in the app
    And I should find "Not graded" in the app
