@mod @mod_courses @app @javascript
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
      | activity | course | idnumber | name                | intro                       | assignsubmission_onlinetext_enabled |
      | assign   | C1     | assign1  | assignment          | Test assignment description | 1                                   |

  Scenario: "Dashboard" tab displayed
    When I enter the app
    And I log in as "student1"
    Then I should see "Dashboard"
    And the header should be "Acceptance test site" in the app
    And I should see "Timeline"
    And I press "Site home" in the app
    Then I should find "Dashboard" in the app
    And the header should be "Acceptance test site" in the app

    When I press "My courses" in the app
    Then I should find "Course 1" in the app
    And I should find "Course 2" in the app
    And I should find "Course 3" in the app

  Scenario: See my courses
    When I enter the app
    And I log in as "student1"
    Then the header should be "Acceptance test site" in the app
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

    When I press the back button in the app
    And I press the back button in the app
    And I press "Course 2" in the app
    Then I should find "Choice course 2" in the app
    And the header should be "Course 2" in the app

    When I press the back button in the app
    And I press "Course 3" in the app
    Then I should find "Choice course 3" in the app
    And the header should be "Course 3" in the app

  Scenario: Search for a course
    When I enter the app
    And I log in as "student1"
    And I press "Search courses" in the app
    And I set the field "Search" to "Course 4" in the app
    And I press "Search" "button" in the app
    Then I should find "Course 4" in the app
    And the header should be "Available courses" in the app

    When I press "Course 4" in the app
    Then I should find "Course 4" in the app
    And I should find "Course summary" in the app

    When I press the back button in the app
    And I set the field "Search" to "Course" in the app
    And I press "Search" "button" in the app
    Then I should find "Course 1" in the app
    And I should find "Course 2" in the app
    And I should find "Course 3" in the app
    And I should find "Course 4" in the app

  # TODO remove LMS UI steps in app tests
  Scenario: Links to actions in Timeline work for teachers/students
    # Configure assignment as teacher
    When I enter the course "Course 1" as "teacher1" in the app
    And I press "assignment" in the app
    And I press "Information" in the app
    And I press "Open in browser" in the app
    And I switch to the browser tab opened by the app
    And I log in as "teacher1"
    And I navigate to "Settings" in current page administration
    And I click on "Expand all" "link"
    And I click on "duedate[enabled]" "checkbox"
    And I click on "gradingduedate[enabled]" "checkbox"
    And I press "Save and return to course"
    And I close the browser tab opened by the app

    # Submit assignment as student
    When I enter the app
    And I log in as "student1"
    And I press "Add submission" in the app
    Then the header should be "assignment" in the app
    And I should find "Test assignment description" in the app
    And I should find "No attempt" in the app
    And I should find "Due:" in the app

    When I press "Add submission" in the app
    And I set the field "Online text submissions" to "test" in the app
    And I press "Save" in the app
    And I press "Submit assignment" in the app
    And I press "OK" in the app
    Then the header should be "assignment" in the app
    And I should find "Test assignment description" in the app
    And I should find "Submitted for grading" in the app
    And I should find "Due:" in the app

    # Grade assignment as teacher
    When I enter the app
    And I log in as "teacher1"
    And I press "Grade" in the app
    Then the header should be "assignment" in the app
    And I should find "Test assignment description" in the app
    And I should find "Time remaining" in the app

    When I press "Needs grading" in the app
    Then I should find "Student student" in the app
    And I should find "Not graded" in the app
