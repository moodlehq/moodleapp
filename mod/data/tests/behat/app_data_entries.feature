@mod @mod_data @app @app_upto3.9.4 @javascript
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
    Given I enter the course "Course 1" as "student1" in the app
    And I press "Web links" near "General" in the app
    And I should see "No entries in database"
    When I press "Add entries" in the app
    And I set the field "URL" to "https://moodle.org/" in the app
    And I set the field "Description" to "Moodle community site" in the app
    And I press "Save" near "Web links" in the app
    Then I should see "https://moodle.org/"
    And I should see "Moodle community site"

  Scenario: Browse entry
    Given I enter the course "Course 1" as "student1" in the app
    And I press "Web links" near "General" in the app
    And I press "Add entries" in the app
    And I set the field "URL" to "https://moodle.org/" in the app
    And I set the field "Description" to "Moodle community site" in the app
    And I press "Save" near "Web links" in the app
    When I enter the course "Course 1" as "student2" in the app
    And I press "Web links" near "General" in the app
    And I press "Add entries" in the app
    And I set the field "URL" to "https://moodlecloud.com/" in the app
    And I set the field "Description" to "Moodle Cloud" in the app
    And I press "Save" near "Web links" in the app
    And I press "More" near "Moodle community site" in the app
    Then I should see "Moodle community site"
    And I should not see "Next"
    And I should see "Previous"
    And I press "Previous" in the app
    And I should see "Moodle Cloud"
    And I should see "Next"
    And I should not see "Previous"
    And I press "Next" in the app
    And I should see "Moodle community site"
    And I should not see "Moodle Cloud"
    And I press "back" near "Web links" in the app
    And I should see "Moodle community site"
    And I should see "Moodle Cloud"

  Scenario: Students can not edit or delete other user's entries from list and single view in the app
    Given I enter the course "Course 1" as "student1" in the app
    And I press "Web links" near "General" in the app
    And I press "Add entries" in the app
    And I set the field "URL" to "https://moodle.org/" in the app
    And I set the field "Description" to "Moodle community site" in the app
    And I press "Save" near "Web links" in the app
    When I enter the course "Course 1" as "student2" in the app
    And I press "Web links" near "General" in the app
    Then "Edit" "link" should not exist
    And "Delete" "link" should not exist
    And I press "More" in the app
    And "Edit" "link" should not exist
    And "Delete" "link" should not exist

  Scenario: Delete entry (student) & Update entry (student)
    Given I enter the course "Course 1" as "student1" in the app
    And I press "Web links" near "General" in the app
    And I press "Add entries" in the app
    And I set the field "URL" to "https://moodle.org/" in the app
    And I set the field "Description" to "Moodle community site" in the app
    And I press "Save" near "Web links" in the app
    When I press "Edit" in the app
    And I set the field "URL" to "https://moodlecloud.com/" in the app
    And I set the field "Description" to "Moodle Cloud" in the app
    And I press "Save" near "Web links" in the app
    Then I should not see "https://moodle.org/"
    And I should not see "Moodle community site"
    And I should see "https://moodlecloud.com/"
    And I should see "Moodle Cloud"
    And I press "Delete" in the app
    And I should see "Are you sure you want to delete this entry?"
    And I press "Cancel" in the app
    And I should see "Moodle Cloud"
    And I press "Delete" in the app
    And I should see "Are you sure you want to delete this entry?"
    And I press "Delete" in the app
    And I should not see "Moodle Cloud"
    And I press "Add entries" in the app
    And I set the field "URL" to "https://moodle.org/" in the app
    And I set the field "Description" to "Moodle community site" in the app
    And I press "Save" near "Web links" in the app
    And I press "More" in the app
    And I press "Edit" in the app
    And I set the field "URL" to "https://moodlecloud.com/" in the app
    And I set the field "Description" to "Moodle Cloud" in the app
    And I press "Save" near "Web links" in the app
    And I should not see "https://moodle.org/"
    And I should not see "Moodle community site"
    And I should see "https://moodlecloud.com/"
    And I should see "Moodle Cloud"
    And I press "Delete" in the app
    And I should see "Are you sure you want to delete this entry?"
    And I press "Cancel" in the app
    And I should see "Moodle Cloud"
    And I press "Delete" in the app
    And I should see "Are you sure you want to delete this entry?"
    And I press "Delete" in the app
    And I should not see "Moodle Cloud"
    And I should see "No entries in database"

  Scenario: Delete entry (teacher) & Update entry (teacher)
    Given I enter the course "Course 1" as "student1" in the app
    And I press "Web links" near "General" in the app
    And I press "Add entries" in the app
    And I set the field "URL" to "https://moodle.org/" in the app
    And I set the field "Description" to "Moodle community site" in the app
    And I press "Save" near "Web links" in the app
    And I press "Add entries" in the app
    And I set the field "URL" to "https://telegram.org/" in the app
    And I set the field "Description" to "Telegram" in the app
    And I press "Save" near "Web links" in the app
    When I enter the course "Course 1" as "teacher1" in the app
    And I press "Web links" near "General" in the app
    Then I should see "https://moodle.org/"
    And I should see "Moodle community site"
    And I press "Edit" near "Moodle community site" in the app
    And I set the field "URL" to "https://moodlecloud.com/" in the app
    And I set the field "Description" to "Moodle Cloud" in the app
    And I press "Save" near "Web links" in the app
    And I should not see "https://moodle.org/"
    And I should not see "Moodle community site"
    And I should see "https://moodlecloud.com/"
    And I should see "Moodle Cloud"
    And I press "Delete" near "Moodle Cloud" in the app
    And I should see "Are you sure you want to delete this entry?"
    And I press "Cancel" in the app
    And I should see "Moodle Cloud"
    And I press "Delete" near "Moodle Cloud" in the app
    And I should see "Are you sure you want to delete this entry?"
    And I press "Delete" in the app
    And I should not see "Moodle Cloud"
    And I press "More" in the app
    And I should see "https://telegram.org/"
    And I should see "Telegram"
    And I press "Edit" in the app
    And I set the field "URL" to "https://moodlecloud.com/" in the app
    And I set the field "Description" to "Moodle Cloud" in the app
    And I press "Save" near "Web links" in the app
    And I should not see "https://telegram.org/"
    And I should not see "Telegram"
    And I should see "https://moodlecloud.com/"
    And I should see "Moodle Cloud"
    And I press "Delete" in the app
    And I should see "Are you sure you want to delete this entry?"
    And I press "Cancel" in the app
    And I should see "Moodle Cloud"
    And I press "Delete" in the app
    And I should see "Are you sure you want to delete this entry?"
    And I press "Delete" in the app
    And I should not see "Moodle Cloud"
