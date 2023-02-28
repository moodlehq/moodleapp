@mod @mod_data @app @javascript
Feature: Users can manage entries in database activities
  In order to populate databases
  As a user
  I need to add and manage entries to databases

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
    And the following "mod_data > fields" exist:
    | database | type | name        | description      |
    | data1    | text | URL         | URL link         |
    | data1    | text | Description | Link description |

  Scenario: Create entry
    Given I entered the data activity "Web links" on course "Course 1" as "student1" in the app
    Then I should find "No entries yet" in the app
    When I press "Add entries" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app
    Then I should find "https://moodle.org/" in the app
    And I should find "Moodle community site" in the app

  Scenario: Browse entry
    Given I entered the data activity "Web links" on course "Course 1" as "student1" in the app

    # TODO Create and use a generator for database entries.
    When I press "Add entries" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app
    And I entered the data activity "Web links" on course "Course 1" as "student2" in the app
    And I press "Add entries" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodlecloud.com/ |
      | Description | Moodle Cloud |
    And I press "Save" near "Web links" in the app
    And I press "More" near "Moodle community site" in the app
    Then I should find "Moodle community site" in the app
    And I should be able to press "Previous" in the app
    But I should not be able to press "Next" in the app

    When I press "Previous" in the app
    Then I should find "Moodle Cloud" in the app
    And I should be able to press "Next" in the app
    But I should not be able to press "Previous" in the app

    When I press "Next" in the app
    Then I should find "Moodle community site" in the app
    But I should not find "Moodle Cloud" in the app

    When I press the back button in the app
    And I should find "Moodle community site" in the app
    And I should find "Moodle Cloud" in the app

  Scenario: Students can not edit or delete other user's entries from list and single view in the app
    Given I entered the data activity "Web links" on course "Course 1" as "student1" in the app
    And I press "Add entries" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app
    And I entered the course "Course 1" as "student2" in the app
    When I press "Web links" near "General" in the app
    Then "Edit" "link" should not exist
    And "Delete" "link" should not exist
    And I press "More" in the app
    And "Edit" "link" should not exist
    And "Delete" "link" should not exist

  Scenario: Delete entry (student) & Update entry (student)
    Given I entered the data activity "Web links" on course "Course 1" as "student1" in the app
    And I press "Add entries" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app

    # Edit the entry from list view.
    When I press "Edit" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodlecloud.com/ |
      | Description | Moodle Cloud |
    And I press "Save" near "Web links" in the app
    Then I should not find "https://moodle.org/" in the app
    And I should not find "Moodle community site" in the app
    And I should find "https://moodlecloud.com/" in the app
    And I should find "Moodle Cloud" in the app

    # Delete the entry from list view.
    When I press "Delete" in the app
    Then I should find "Are you sure you want to delete this entry?" in the app
    And I press "Cancel" in the app
    And I should find "Moodle Cloud" in the app
    When I press "Delete" in the app
    Then I should find "Are you sure you want to delete this entry?" in the app
    And I press "Delete" in the app
    And I should not find "Moodle Cloud" in the app

    # Repeat again with single view.
    Given I press "Add entries" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app

    # Edit the entry from single view.
    When I press "More" in the app
    And I press "Edit" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodlecloud.com/ |
      | Description | Moodle Cloud |
    And I press "Save" near "Web links" in the app
    Then I should not find "https://moodle.org/" in the app
    And I should not find "Moodle community site" in the app
    And I should find "https://moodlecloud.com/" in the app
    And I should find "Moodle Cloud" in the app

    # Delete the entry from list view.
    When I press "Delete" in the app
    Then I should find "Are you sure you want to delete this entry?" in the app
    And I press "Cancel" in the app
    And I should find "Moodle Cloud" in the app
    When I press "Delete" in the app
    Then I should find "Are you sure you want to delete this entry?" in the app
    And I press "Delete" in the app
    And I should not find "Moodle Cloud" in the app
    And I should find "No entries yet" in the app

  Scenario: Delete entry (teacher) & Update entry (teacher)
    Given I entered the data activity "Web links" on course "Course 1" as "student1" in the app
    And I press "Add entries" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app
    And I press "Add entries" in the app
    And I set the following fields to these values in the app:
      | URL | https://telegram.org/ |
      | Description | Telegram |
    And I press "Save" near "Web links" in the app

    And I entered the course "Course 1" as "teacher1" in the app
    When I press "Web links" near "General" in the app
    Then I should find "https://moodle.org/" in the app
    And I should find "Moodle community site" in the app

    # Edit the entry from list view.
    When I press "Edit" near "Moodle community site" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodlecloud.com/ |
      | Description | Moodle Cloud |
    And I press "Save" near "Web links" in the app
    Then I should not find "https://moodle.org/" in the app
    And I should not find "Moodle community site" in the app
    And I should find "https://moodlecloud.com/" in the app
    And I should find "Moodle Cloud" in the app

    # Delete the entry from list view.
    When I press "Delete" near "Moodle Cloud" in the app
    Then I should find "Are you sure you want to delete this entry?" in the app
    And I press "Cancel" in the app
    And I should find "Moodle Cloud" in the app
    When I press "Delete" near "Moodle Cloud" in the app
    Then I should find "Are you sure you want to delete this entry?" in the app
    And I press "Delete" in the app
    And I should not find "Moodle Cloud" in the app

    # Edit the entry from single view.
    When I press "More" in the app
    And I should find "https://telegram.org/" in the app
    And I should find "Telegram" in the app
    And I press "Edit" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodlecloud.com/ |
      | Description | Moodle Cloud |
    And I press "Save" near "Web links" in the app
    Then I should not find "https://telegram.org/" in the app
    And I should not find "Telegram" in the app
    And I should find "https://moodlecloud.com/" in the app
    And I should find "Moodle Cloud" in the app

    # Delete the entry from single view.
    When I press "Delete" in the app
    Then I should find "Are you sure you want to delete this entry?" in the app
    And I press "Cancel" in the app
    And I should find "Moodle Cloud" in the app
    When I press "Delete" in the app
    Then I should find "Are you sure you want to delete this entry?" in the app
    And I press "Delete" in the app
    And I should not find "Moodle Cloud" in the app

  Scenario: Handle number 0 correctly when creating entries
    Given the following "activities" exist:
      | activity | name      | intro     | course | idnumber |
      | data     | Number DB | Number DB | C1     | data2    |
    And the following "mod_data > fields" exist:
      | database | type   | name   | description  |
      | data2    | number | Number | Number value |
    And I entered the data activity "Number DB" on course "Course 1" as "student1" in the app
    When I press "Add entries" in the app
    And I press "Save" near "Number DB" in the app
    Then I should find "You did not fill out any fields!" in the app

    When I press "OK" in the app
    And I set the following fields to these values in the app:
      | Number | 0 |
    And I press "Save" near "Number DB" in the app
    Then I should find "0" near "Number:" in the app
    But I should not find "Save" in the app
