@addon_mod_data @app @mod @mod_data @javascript
Feature: Users can manage entries in database activities
  In order to populate databases
  As a user
  I need to add and manage entries to databases

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
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
      | activity | name      | intro        | course | idnumber | comments |
      | data     | Web links | Useful links | C1     | data1    | 0        |
    And the following "mod_data > fields" exist:
      | database | type | name        | description      |
      | data1    | text | URL         | URL link         |
      | data1    | text | Description | Link description |

  Scenario: Create entry
    Given I entered the data activity "Web links" on course "Course 1" as "student1" in the app
    Then I should find "No entries yet" in the app
    When I press "Add entry" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app
    Then I should find "https://moodle.org/" in the app
    And I should find "Moodle community site" in the app

  Scenario: Browse entry
    Given the following "activities" exist:
      | activity | name               | intro | course | idnumber | comments |
      | data     | Data with comments | -     | C1     | data2    | 1        |
    And the following "mod_data > fields" exist:
      | database | type | name        | description |
      | data2    | text | Description | Description |
    And I entered the data activity "Web links" on course "Course 1" as "student1" in the app

    # TODO Create and use a generator for database entries.
    When I press "Add entry" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app
    And I entered the data activity "Web links" on course "Course 1" as "student2" in the app
    And I press "Add entry" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodlecloud.com/ |
      | Description | Moodle Cloud |
    And I press "Save" near "Web links" in the app
    And I press "Actions menu" near "Moodle community site" in the app
    And I press "Show more" in the app
    Then I should find "Moodle community site" in the app
    And I should not find "Comments" in the app
    And I should be able to press "Previous" in the app
    But I should not be able to press "Next" in the app

    When I press "Previous" in the app
    Then I should find "Moodle Cloud" in the app
    And I should be able to press "Next" in the app
    But I should not be able to press "Previous" in the app

    When I press "Next" in the app
    Then I should find "Moodle community site" in the app
    But I should not find "Moodle Cloud" in the app

    When I go back in the app
    And I should find "Moodle community site" in the app
    And I should find "Moodle Cloud" in the app

    Given I entered the data activity "Data with comments" on course "Course 1" as "student1" in the app
    When I press "Add entry" in the app
    And I set the following fields to these values in the app:
      | Description | Moodle community site |
    And I press "Save" near "Data with comments" in the app
    And I press "Actions menu" near "Moodle community site" in the app
    And I press "Show more" in the app
    Then I should find "Moodle community site" in the app
    And I should find "Comments" in the app

    Given the following config values are set as admin:
      | usecomments | 0 |
    And I entered the data activity "Data with comments" on course "Course 1" as "student1" in the app
    When I press "Actions menu" near "Moodle community site" in the app
    And I press "Show more" in the app
    Then I should not find "Comments" in the app
    But the following events should have been logged for "student1" in the app:
      | name                                 | activity | activityname       | course   |
      | \mod_data\event\course_module_viewed | data     | Data with comments | Course 1 |
      | \mod_data\event\record_created       | data     | Data with comments | Course 1 |

  Scenario: Students can not edit or delete other user's entries from list and single view in the app
    Given I entered the data activity "Web links" on course "Course 1" as "student1" in the app
    And I press "Add entry" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app
    And I entered the course "Course 1" as "student2" in the app
    When I press "Web links" near "General" in the app
    And I press "Actions menu" in the app
    Then "Edit" "link" should not exist
    And "Delete" "link" should not exist
    When I press "Show more" in the app
    And "Actions menu" "link" should not exist
    And "Edit" "link" should not exist
    And "Delete" "link" should not exist

  Scenario: Delete entry (student) & Update entry (student)
    Given I entered the data activity "Web links" on course "Course 1" as "student1" in the app
    And I press "Add entry" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app

    # Edit the entry from list view.
    When I press "Actions menu" in the app
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
    When I press "Actions menu" in the app
    And I press "Delete" in the app
    Then I should find "Are you sure you want to delete this entry?" in the app
    And I press "Cancel" in the app
    And I should find "Moodle Cloud" in the app
    When I press "Actions menu" in the app
    And I press "Delete" in the app
    Then I should find "Are you sure you want to delete this entry?" in the app
    And I press "Delete" in the app
    And I should not find "Moodle Cloud" in the app

    # Repeat again with single view.
    Given I press "Add entry" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app

    # Edit the entry from single view.
    When I press "Actions menu" in the app
    And I press "Show more" in the app
    And I press "Actions menu" in the app
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
    When I press "Actions menu" in the app
    And I press "Delete" in the app
    Then I should find "Are you sure you want to delete this entry?" in the app
    And I press "Cancel" in the app
    And I should find "Moodle Cloud" in the app
    When I press "Actions menu" in the app
    And I press "Delete" in the app
    Then I should find "Are you sure you want to delete this entry?" in the app
    And I press "Delete" in the app
    And I should not find "Moodle Cloud" in the app
    And I should find "No entries yet" in the app

  Scenario: Delete entry (teacher) & Update entry (teacher)
    Given I entered the data activity "Web links" on course "Course 1" as "student1" in the app
    And I press "Add entry" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app
    And I press "Add entry" in the app
    And I set the following fields to these values in the app:
      | URL | https://telegram.org/ |
      | Description | Telegram |
    And I press "Save" near "Web links" in the app

    And I entered the course "Course 1" as "teacher1" in the app
    When I press "Web links" near "General" in the app
    Then I should find "https://moodle.org/" in the app
    And I should find "Moodle community site" in the app

    # Edit the entry from list view.
    When I press "Actions menu" near "Moodle community site" in the app
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
    When I press "Actions menu" near "Moodle Cloud" in the app
    And I press "Delete" in the app
    Then I should find "Are you sure you want to delete this entry?" in the app
    And I press "Cancel" in the app
    And I should find "Moodle Cloud" in the app
    When I press "Actions menu" near "Moodle Cloud" in the app
    And I press "Delete" in the app
    Then I should find "Are you sure you want to delete this entry?" in the app
    And I press "Delete" in the app
    And I should not find "Moodle Cloud" in the app

    # Edit the entry from single view.
    When I press "Actions menu" in the app
    And I press "Show more" in the app
    And I should find "https://telegram.org/" in the app
    And I should find "Telegram" in the app
    And I press "Actions menu" in the app
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
    When I press "Actions menu" in the app
    And I press "Delete" in the app
    Then I should find "Are you sure you want to delete this entry?" in the app
    And I press "Cancel" in the app
    And I should find "Moodle Cloud" in the app
    When I press "Actions menu" in the app
    And I press "Delete" in the app
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
    When I press "Add entry" in the app
    And I press "Save" near "Number DB" in the app
    Then I should find "You did not fill out any fields!" in the app

    When I press "OK" in the app
    And I set the following fields to these values in the app:
      | Number | 0 |
    And I press "Save" near "Number DB" in the app
    Then I should find "0" in the app
    But I should not find "Save" in the app
