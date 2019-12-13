@mod @mod_data @app @javascript
Feature: Trying options moodle mobile

  Background:
    Given the following "users" exist:
    | username | firstname | lastname | email |
    | student1 | Student | 1 | student1@example.com |
    | student2 | Student | 2 | student2@example.com |
    | teacher1 | Teacher | 1 | teacher1@example.com |
    And the following "courses" exist:
    | fullname | shortname | category |
    | Course 1 | C1 | 0 |
    And the following "course enrolments" exist:
    | user | course | role |
    | teacher1 | C1 | editingteacher |
    | student1 | C1 | student |
    | student2 | C1 | student |
    And the following "activities" exist:
    | activity | name      | intro        | course | idnumber |
    | data     | Web links | Useful links | C1     | data1    |
    
  Scenario: Teacher create an event
    When I enter the app
    And I log in as "teacher1"
    And I press "calendar" in the app
    And I press "close" in the app
    And I set the field "name" to "Holidays!"
    And I press "No selection" in the app
    And I press "Course 1" in the app
    Then I press "Show more..." in the app
    And I set the field "location" to "Moodle"
    And I press "Save" in the app

  Scenario: Student change his moodle language
    When I enter the app
    And I log in as "student1"
    And I press "more" near "Timeline" in the app
    And I press "App settings" in the app
    And I press "General" in the app
    And I press "Language" in the app
    And I press "Español" in the app
    And I pause
    And I press "Text size" in the app
    And I pause
 

