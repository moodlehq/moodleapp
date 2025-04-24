@addon_mod_page @app @mod @mod_page @javascript
Feature: Configure page appearance
  In order to change the appearance of the page resource
  As an admin
  I need to configure the page appearance settings

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | student  | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
    And the following "activities" exist:
      | activity | name       | intro      | course | idnumber |
      | page     | PageName1  | PageDesc1  | C1     | PAGE1    |

  Scenario Outline: Hide and display page features
    Given I am on the "PageName1" "page activity editing" page logged in as admin
    And I expand all fieldsets
    And I set the field "<feature>" to "<value>"
    And I press "Save and display"
    And I entered the course "Course 1" as "student1" in the app
    When I press "PageName1" in the app
    Then I <shouldornot> find "<lookfor>" in the app

    Examples:
      | feature                    | lookfor        | value | shouldornot |
      | Display page description   | PageDesc1      | 1     | should      |
      | Display page description   | PageDesc1      | 0     | should not  |
      | Display last modified date | Last modified: | 1     | should      |
      | Display last modified date | Last modified: | 0     | should not  |
