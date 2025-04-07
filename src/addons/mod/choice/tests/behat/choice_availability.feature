@addon_mod_choice @app @mod @mod_choice @javascript
Feature: Restrict availability of the choice module to a deadline
  In order to limit the time a student can mace a selection
  As a teacher
  I need to restrict answering to within a time period

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher | 1 | teacher1@example.com |
      | student1 | Student | 1 | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
      | student1 | C1 | student |
    And the following "activities" exist:
      | activity | name        | intro              | course | idnumber | option             | section |
      | choice   | Choice name | Choice Description | C1     | choice1  | Option 1, Option 2 | 1       |
    And I log in as "teacher1"
    And I am on "Course 1" course homepage
    And I follow "Choice name"
    And I navigate to "Settings" in current page administration

  Scenario: Enable the choice activity with a start deadline in the future
    Given I set the following fields to these values:
      | timeopen[enabled] | 1 |
      | timeopen[day] | 30 |
      | timeopen[month] | December |
      | timeopen[year] | 2037 |
      | timeopen[hour] | 00 |
      | timeopen[minute] | 00 |
    And I press "Save and display"
    When I entered the choice activity "Choice name" on course "Course 1" as "student1" in the app
    Then I should not find "Option 1" in the app
    And I should not find "Option 2" in the app
    And I should not find "Save my choice" in the app
    And I should not find "The results are not currently viewable" in the app
    And I should find "Opens:" in the app
    And I should find "30 December 2037, 12:00 AM" in the app
    And the UI should match the snapshot

  Scenario: Enable the choice activity with a start deadline in the future with show preview options
    Given I set the following fields to these values:
      | timeopen[enabled] | 1 |
      | timeopen[day] | 30 |
      | timeopen[month] | December |
      | timeopen[year] | 2037 |
      | timeopen[hour] | 00 |
      | timeopen[minute] | 00 |
      | showpreview | 1 |
    And I press "Save and display"
    When I entered the choice activity "Choice name" on course "Course 1" as "student1" in the app
    Then I should find "Option 1" in the app
    And I should find "Option 2" in the app
    And I should not find "Save my choice" in the app
    And I should find "This is just a preview of the available options for this activity" in the app
    And I should find "Opens:" in the app
    And I should find "30 December 2037, 12:00 AM" in the app
    And the UI should match the snapshot

  Scenario: Enable the choice activity with a start deadline in the past
    Given I set the following fields to these values:
      | timeopen[enabled] | 1 |
      | timeopen[day] | 30 |
      | timeopen[month] | December |
      | timeopen[year] | 2007 |
      | timeopen[hour] | 00 |
      | timeopen[minute] | 00 |
    And I press "Save and display"
    When I entered the choice activity "Choice name" on course "Course 1" as "student1" in the app
    Then I should find "Option 1" in the app
    And I should find "Option 2" in the app
    And I should find "Save my choice" in the app
    And I should find "The results are not currently viewable" in the app
    And I should find "Opened:" in the app
    And I should find "30 December 2007, 12:00 AM" in the app
    And the UI should match the snapshot
    When I press "Option 1" in the app
    And I press "Save my choice" in the app
    And I press "OK" in the app
    Then I should find "Your selection" in the app

  Scenario: Enable the choice activity with a end deadline in the future
    Given I set the following fields to these values:
      | timeclose[enabled] | 1 |
      | timeclose[day] | 30 |
      | timeclose[month] | December |
      | timeclose[year] | 2037 |
      | timeclose[hour] | 00 |
      | timeclose[minute] | 00 |
    And I press "Save and display"
    When I entered the choice activity "Choice name" on course "Course 1" as "student1" in the app
    Then I should find "Option 1" in the app
    And I should find "Option 2" in the app
    And I should find "Save my choice" in the app
    And I should find "The results are not currently viewable" in the app
    And I should find "Closes:" in the app
    And I should find "30 December 2037, 12:00 AM" in the app
    And the UI should match the snapshot
    When I press "Option 1" in the app
    And I press "Save my choice" in the app
    And I press "OK" in the app
    Then I should find "Your selection" in the app

  Scenario: Enable the choice activity with a end deadline in the past
    Given I set the following fields to these values:
      | timeclose[enabled] | 1 |
      | timeclose[day] | 30 |
      | timeclose[month] | December |
      | timeclose[year] | 2007 |
      | timeclose[hour] | 00 |
      | timeclose[minute] | 00 |
    And I press "Save and display"
    When I entered the choice activity "Choice name" on course "Course 1" as "student1" in the app
    Then I should not find "Option 1" in the app
    And I should not find "Option 2" in the app
    And I should not find "Save my choice" in the app
    And I should find "The results are not currently viewable" in the app
    And I should find "Closed:" in the app
    And I should find "30 December 2007, 12:00 AM" in the app
    And the UI should match the snapshot
