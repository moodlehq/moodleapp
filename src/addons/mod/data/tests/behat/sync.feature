@addon_mod_data @app @javascript
Feature: Users can store entries in database activities when offline and sync when online
  In order to populate databases while offline
  As a user
  I need to add and manage entries to databases and sync then when online

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
      | activity | name      | intro        | course | idnumber |
      | data     | Web links | Useful links | C1     | data1    |
    And the following "mod_data > fields" exist:
      | database | type | name        | description      |
      | data1    | text | URL         | URL link         |
      | data1    | text | Description | Link description |

  Scenario: Create entry (offline)
    Given I entered the data activity "Web links" on course "Course 1" as "student1" in the app
    And I switch network connection to offline
    And I should find "No entries yet" in the app
    When I press "Add entry" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app
    Then I should find "https://moodle.org/" in the app
    And I should find "Moodle community site" in the app
    And I should find "This Database has offline data to be synchronised" in the app
    And I press the back button in the app
    And I switch network connection to wifi
    And I press "Web links" near "General" in the app
    And I should find "https://moodle.org/" in the app
    And I should find "Moodle community site" in the app
    And I should not find "This Database has offline data to be synchronised" in the app

  Scenario: Update entry (offline) & Delete entry (offline)
    Given I entered the data activity "Web links" on course "Course 1" as "student1" in the app
    And I should find "No entries yet" in the app
    And I press "Add entry" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app
    And I should find "https://moodle.org/" in the app
    And I should find "Moodle community site" in the app
    And I press "Information" in the app
    And I press "Download" in the app
    And I wait until the page is ready
    And I close the popup in the app
    And I switch network connection to offline
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
    And I should find "This Database has offline data to be synchronised" in the app
    And I press the back button in the app
    And I switch network connection to wifi
    And I press "Web links" near "General" in the app
    And I should not find "https://moodle.org/" in the app
    And I should not find "Moodle community site" in the app
    And I should find "https://moodlecloud.com/" in the app
    And I should find "Moodle Cloud" in the app
    And I should not find "This Database has offline data to be synchronised" in the app
    And I press "Information" in the app
    And I press "Refresh" in the app
    And I wait until the page is ready
    And I switch network connection to offline
    And I press "Actions menu" in the app
    And I press "Delete" in the app
    And I should find "Are you sure you want to delete this entry?" in the app
    And I press "Delete" in the app
    And I should find "https://moodlecloud.com/" in the app
    And I should find "Moodle Cloud" in the app
    And I should find "This Database has offline data to be synchronised" in the app
    And I press the back button in the app
    And I switch network connection to wifi
    And I press "Web links" near "General" in the app
    And I should not find "https://moodlecloud.com/" in the app
    And I should not find "Moodle Cloud" in the app
    And I should not find "This Database has offline data to be synchronised" in the app

  Scenario: Students can undo deleting entries to a database in the app while offline
    Given I entered the data activity "Web links" on course "Course 1" as "student1" in the app
    And I should find "No entries yet" in the app
    And I press "Add entry" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app
    And I should find "https://moodle.org/" in the app
    And I should find "Moodle community site" in the app
    And I press "Information" in the app
    And I press "Download" in the app
    And I wait until the page is ready
    And I close the popup in the app
    When I switch network connection to offline
    And I press "Actions menu" in the app
    And I press "Delete" in the app
    And I should find "Are you sure you want to delete this entry?" in the app
    And I press "Delete" in the app
    And I should find "https://moodle.org/" in the app
    And I should find "Moodle community site" in the app
    And I should find "This Database has offline data to be synchronised" in the app
    And I press "Actions menu" in the app
    And I press "Restore" in the app
    And I press the back button in the app
    And I switch network connection to wifi
    And I press "Web links" near "General" in the app
    Then I should find "https://moodle.org/" in the app
    And I should find "Moodle community site" in the app
    And I should not find "This Database has offline data to be synchronised" in the app
