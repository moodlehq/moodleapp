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
    And I log in as "teacher1"
    And I am on "Course 1" course homepage
    And I add a "Text input" field to "Web links" database and I fill the form with:
      | Field name | URL |
      | Field description | URL link |
    And I add a "Text input" field to "Web links" database and I fill the form with:
      | Field name | Description |
      | Field description | Link description |
    And I log out

  Scenario: Create entry
    Given I entered the data activity "Web links" on course "Course 1" as "student1" in the app
    And I should find "No entries in database" in the app
    When I press "Add entries" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app
    Then I should find "https://moodle.org/" in the app
    And I should find "Moodle community site" in the app

  Scenario: Browse entry
    Given I entered the data activity "Web links" on course "Course 1" as "student1" in the app
    And I press "Add entries" in the app
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
    And I should not find "Next" in the app
    And I should find "Previous" in the app
    And I press "Previous" in the app
    And I should find "Moodle Cloud" in the app
    And I should find "Next" in the app
    And I should not find "Previous" in the app
    And I press "Next" in the app
    And I should find "Moodle community site" in the app
    And I should not find "Moodle Cloud" in the app
    And I press the back button in the app
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
    When I press "Edit" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodlecloud.com/ |
      | Description | Moodle Cloud |
    And I press "Save" near "Web links" in the app
    Then I should not find "https://moodle.org/" in the app
    And I should not find "Moodle community site" in the app
    And I should find "https://moodlecloud.com/" in the app
    And I should find "Moodle Cloud" in the app
    And I press "Delete" in the app
    And I should find "Are you sure you want to delete this entry?" in the app
    And I press "Cancel" in the app
    And I should find "Moodle Cloud" in the app
    And I press "Delete" in the app
    And I should find "Are you sure you want to delete this entry?" in the app
    And I press "Delete" in the app
    And I should not find "Moodle Cloud" in the app
    And I press "Add entries" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodle.org/ |
      | Description | Moodle community site |
    And I press "Save" near "Web links" in the app
    And I press "More" in the app
    And I press "Edit" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodlecloud.com/ |
      | Description | Moodle Cloud |
    And I press "Save" near "Web links" in the app
    And I should not find "https://moodle.org/" in the app
    And I should not find "Moodle community site" in the app
    And I should find "https://moodlecloud.com/" in the app
    And I should find "Moodle Cloud" in the app
    And I press "Delete" in the app
    And I should find "Are you sure you want to delete this entry?" in the app
    And I press "Cancel" in the app
    And I should find "Moodle Cloud" in the app
    And I press "Delete" in the app
    And I should find "Are you sure you want to delete this entry?" in the app
    And I press "Delete" in the app
    And I should not find "Moodle Cloud" in the app
    And I should find "No entries in database" in the app

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
    And I press "Edit" near "Moodle community site" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodlecloud.com/ |
      | Description | Moodle Cloud |
    And I press "Save" near "Web links" in the app
    And I should not find "https://moodle.org/" in the app
    And I should not find "Moodle community site" in the app
    And I should find "https://moodlecloud.com/" in the app
    And I should find "Moodle Cloud" in the app
    And I press "Delete" near "Moodle Cloud" in the app
    And I should find "Are you sure you want to delete this entry?" in the app
    And I press "Cancel" in the app
    And I should find "Moodle Cloud" in the app
    And I press "Delete" near "Moodle Cloud" in the app
    And I should find "Are you sure you want to delete this entry?" in the app
    And I press "Delete" in the app
    And I should not find "Moodle Cloud" in the app
    And I press "More" in the app
    And I should find "https://telegram.org/" in the app
    And I should find "Telegram" in the app
    And I press "Edit" in the app
    And I set the following fields to these values in the app:
      | URL | https://moodlecloud.com/ |
      | Description | Moodle Cloud |
    And I press "Save" near "Web links" in the app
    And I should not find "https://telegram.org/" in the app
    And I should not find "Telegram" in the app
    And I should find "https://moodlecloud.com/" in the app
    And I should find "Moodle Cloud" in the app
    And I press "Delete" in the app
    And I should find "Are you sure you want to delete this entry?" in the app
    And I press "Cancel" in the app
    And I should find "Moodle Cloud" in the app
    And I press "Delete" in the app
    And I should find "Are you sure you want to delete this entry?" in the app
    And I press "Delete" in the app
    And I should not find "Moodle Cloud" in the app
