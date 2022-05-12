@mod @mod_data @app @app_upto3.9.4 @javascript
Feature: Users can store entries in database activities when offline and sync when online
  In order to populate databases while offline
  As a user
  I need to add and manage entries to databases and sync then when online

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

  @app_from3.7
  Scenario: Create entry (offline)
    Given I enter the course "Course 1" as "student1" in the app
    And I press "Web links" near "General" in the app
    And I switch offline mode to "true"
    And I should see "No entries in database"
    When I press "Add entries" in the app
    And I set the field "URL" to "https://moodle.org/" in the app
    And I set the field "Description" to "Moodle community site" in the app
    And I press "Save" near "Web links" in the app
    Then I should see "https://moodle.org/"
    And I should see "Moodle community site"
    And I should see "This Database has offline data to be synchronised"
    And I press "back" near "Web links" in the app
    And I switch offline mode to "false"
    And I press "Web links" near "General" in the app
    And I should see "https://moodle.org/"
    And I should see "Moodle community site"
    And I should not see "This Database has offline data to be synchronised"

  @app_from3.7
  Scenario: Update entry (offline) & Delete entry (offline)
    Given I enter the course "Course 1" as "student1" in the app
    And I press "Web links" near "General" in the app
    And I should see "No entries in database"
    And I press "Add entries" in the app
    And I set the field "URL" to "https://moodle.org/" in the app
    And I set the field "Description" to "Moodle community site" in the app
    And I press "Save" near "Web links" in the app
    And I should see "https://moodle.org/"
    And I should see "Moodle community site"
    And I press "Display options" in the app
    And I press "Download" in the app
    And I wait until the page is ready
    And I switch offline mode to "true"
    When I press "Edit" in the app
    And I set the field "URL" to "https://moodlecloud.com/" in the app
    And I set the field "Description" to "Moodle Cloud" in the app
    And I press "Save" near "Web links" in the app
    Then I should not see "https://moodle.org/"
    And I should not see "Moodle community site"
    And I should see "https://moodlecloud.com/"
    And I should see "Moodle Cloud"
    And I should see "This Database has offline data to be synchronised"
    And I press "back" near "Web links" in the app
    And I switch offline mode to "false"
    And I press "Web links" near "General" in the app
    And I should not see "https://moodle.org/"
    And I should not see "Moodle community site"
    And I should see "https://moodlecloud.com/"
    And I should see "Moodle Cloud"
    And I should not see "This Database has offline data to be synchronised"
    And I press "Display options" in the app
    And I press "Refresh" in the app
    And I wait until the page is ready
    And I switch offline mode to "true"
    And I press "Delete" in the app
    And I should see "Are you sure you want to delete this entry?"
    And I press "Delete" in the app
    And I should see "https://moodlecloud.com/"
    And I should see "Moodle Cloud"
    And I should see "This Database has offline data to be synchronised"
    And I press "back" near "Web links" in the app
    And I switch offline mode to "false"
    And I press "Web links" near "General" in the app
    And I should not see "https://moodlecloud.com/"
    And I should not see "Moodle Cloud"
    And I should not see "This Database has offline data to be synchronised"

  @app_from3.7
  Scenario: Students can undo deleting entries to a database in the app while offline
    Given I enter the course "Course 1" as "student1" in the app
    And I press "Web links" near "General" in the app
    And I should see "No entries in database"
    And I press "Add entries" in the app
    And I set the field "URL" to "https://moodle.org/" in the app
    And I set the field "Description" to "Moodle community site" in the app
    And I press "Save" near "Web links" in the app
    And I should see "https://moodle.org/"
    And I should see "Moodle community site"
    And I press "Display options" in the app
    And I press "Download" in the app
    And I wait until the page is ready
    When I switch offline mode to "true"
    And I press "Delete" in the app
    And I should see "Are you sure you want to delete this entry?"
    And I press "Delete" in the app
    And I should see "https://moodle.org/"
    And I should see "Moodle community site"
    And I should see "This Database has offline data to be synchronised"
    And I press "Restore" in the app
    And I press "back" near "Web links" in the app
    And I switch offline mode to "false"
    And I press "Web links" near "General" in the app
    Then I should see "https://moodle.org/"
    And I should see "Moodle community site"
    And I should not see "This Database has offline data to be synchronised"
