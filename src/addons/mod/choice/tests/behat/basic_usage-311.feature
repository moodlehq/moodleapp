@mod @mod_choice @app @javascript @lms_upto3.11
Feature: Test basic usage of choice activity in app
  In order to participate in the choice while using the mobile app
  As a student
  I need basic choice functionality to work

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

  Scenario: Download students choice in text format
    # Submit answer as student
    Given the following "activities" exist:
      | activity | name        | intro                   | course | idnumber | option |
      | choice   | Choice name | Test choice description | C1     | choice1  | Option 1, Option 2, Option 3 |
    And I entered the choice activity "Choice name" on course "Course 1" as "student1" in the app
    Then I select "Option 2" in the app
    And I press "Save my choice" in the app
    And I press "OK" in the app

    # Download answers as teacher
    Given I entered the choice activity "Choice name" on course "Course 1" as "teacher1" in the app
    Then I should find "Test choice description" in the app

    When I press "Information" in the app
    And I press "Open in browser" in the app
    And I switch to the browser tab opened by the app
    And I log in as "teacher1"
    And I press "Actions menu"
    And I follow "View 1 responses"
    And I press "Download in text format"
    # TODO Then I should find "..." in the downloads folder
