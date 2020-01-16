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
      | activity | name            | intro                   | course | idnumber | option |
      | choice   | Choice course 1 | Test choice description | C1     | choice1  | Option 1, Option 2, Option 3 |
      | choice   | Choice course 2 | Test choice description | C2     | choice1  | Option 1, Option 2, Option 3 |
      | choice   | Choice course 3 | Test choice description | C3     | choice1  | Option 1, Option 2, Option 3 |
      | choice   | Choice course 4 | Test choice description | C4     | choice1  | Option 1, Option 2, Option 3 |

  @app @3.8.0 @OK
  Scenario: Dashboard tab displayed in >= 3.3 sites
  When I enter the app
  And I log in as "student1"
  Then I should see "Dashboard"
  And the header should be "Acceptance test site" in the app
  And I should see "Course 1"
  And I should see "Course 2"
  And I should see "Course 3"
  And I press "Site home" in the app
  Then I should see "Dashboard"
  And the header should be "Acceptance test site" in the app
  And I press "Dashboard" in the app
  Then I should see "Course 1"
  And I should see "Course 2"
  And I should see "Course 3"

  @app @3.8.0 @OK
  Scenario: See my courses
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app
  And I should see "Course 1"
  And I should see "Course 2"
  And I should see "Course 3"
  And I press "Course 1" near "Recently accessed courses" in the app
  Then I should see "Choice course 1"
  And the header should be "Course 1" in the app
  And I press "Choice course 1" in the app
  Then I should see "Test choice description"
  And the header should be "Choice course 1" in the app
  And I press the back button in the app
  And I press the back button in the app
  And I press "Course 2" near "Recently accessed courses" in the app
  Then I should see "Choice course 2"
  And the header should be "Course 2" in the app
  And I press the back button in the app
  And I press "Course 3" near "Recently accessed courses" in the app
  Then I should see "Choice course 3"
  And the header should be "Course 3" in the app

  @app @3.8.0 
  Scenario: Search for a course
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app
  And I should see "Course 1"
  And I should see "Course 2"
  And I should see "Course 3"
  And I press "Search courses" in the app
  And I set the field "Search" to "Course 4" in the app
  And I press "Search" in the app 
  Then I should see "Course 4"
  And the header should be "Search courses" in the app
  And I press "Course 4" in the app
  Then I should see "Course 4"
  And the header should be "Course 4" in the app
  And I press the back button in the app
  And I set the field "Search" to "Course" in the app
  And I press "Search" in the app
  Then I should see "Course 1"
  And I should see "Course 2"
  And I should see "Course 3"
  And I should see "Course 4"
