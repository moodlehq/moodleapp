@addon_mod_data @app @mod @mod_data @javascript @lms_from5.1
Feature: Activities overview for database activity

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | 1        | student1@example.com |
      | teacher1 | Teacher   | 1        | teacher1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category | enablecompletion |
      | Course 1 | C1        | 0        | 1                |
    And the following "course enrolments" exist:
      | user | course | role           |
      | teacher1 | C1 | editingteacher |
      | student1 | C1 | student        |
    And the following "activity" exists:
      | course          | C1                   |
      | activity        | data                 |
      | name            | Database activity    |
      | intro           | description          |
      | idnumber        | data1                |
      | approval        | 1                    |
      | completion      | 1                    |
      | comments        | 1                    |
      | timeavailableto | ##1 Jan 2040 08:00## |
    And the following "activity" exists:
      | course          | C1                   |
      | activity        | data                 |
      | name            | Without comments     |
      | intro           | description          |
      | idnumber        | data2                |
      | approval        | 1                    |
      | completion      | 1                    |
      | comments        | 1                    |
      | timeavailableto | ##1 Jan 2040 08:00## |
    And the following "activity" exists:
      | course          | C1                   |
      | activity        | data                 |
      | name            | Empty database       |
      | intro           | empty database       |
      | idnumber        | data3                |
      | approval        | 0                    |
      | completion      | 0                    |
      | comments        | 0                    |
    And the following "mod_data > fields" exist:
      | database | type | name             | description                  |
      | data1    | text | Title field      | Title field description      |
      | data1    | text | Short text field | Short text field description |
      | data2    | text | Title field      | Title field description      |
      | data2    | text | Short text field | Short text field description |
    And the following "mod_data > templates" exist:
      | database | name            |
      | data1    | singletemplate  |
      | data1    | listtemplate    |
      | data1    | addtemplate     |
      | data1    | asearchtemplate |
      | data1    | rsstemplate     |
      | data2    | singletemplate  |
      | data2    | listtemplate    |
      | data2    | addtemplate     |
      | data2    | asearchtemplate |
      | data2    | rsstemplate     |
    And the following "mod_data > entries" exist:
      | database | user     | Title field           | Short text field | approved |
      | data1    | student1 | Student entry         | Approved         | 1        |
      | data1    | student1 | Student second entry  | Pending          | 0        |
      | data1    | teacher1 | Teacher entry         | Approved         | 1        |
      | data2    | teacher1 | Entry no comments     | Approved         | 1        |

  Scenario: The data overview report should generate log events
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Activities" in the app
    And I press "Databases" in the app
    Then the following events should have been logged for "student1" in the app:
      | name                                               | course   |
      | \core\event\course_overview_viewed                 | Course 1 |
      | \mod_data\event\course_module_instance_list_viewed | Course 1 |

  Scenario: Students can see relevant columns in the database activity overview
    # Add a comment to test the values.
    Given I am on the "Database activity" "data activity" page logged in as student1
    And I select "Single view" from the "jump" singleselect
    And I click on "Comments (0)" "link"
    And I set the following fields to these values:
      | Comment        | Commenting the entry |
    And I click on "Save comment" "link"
    And I entered the course "Course 1" as "student1" in the app

    When I press "Activities" in the app
    And I press "Databases" in the app
    And I press "Database activity" "ion-item" in the app
    Then I should find "1 January 2040" within "Due date" "ion-item" in the app
    And I should find "2" within "Total entries" "ion-item" in the app
    And I should find "2" within "My entries" "ion-item" in the app
    And I should find "1" within "Comments" "ion-item" in the app

    When I press "Without comments" "ion-item" in the app
    Then I should find "1 January 2040" within "Due date" "ion-item" in the app
    And I should find "1" within "Total entries" "ion-item" in the app
    And I should find "0" within "My entries" "ion-item" in the app
    And I should find "0" within "Comments" "ion-item" in the app

    When I press "Empty database" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should find "0" within "Total entries" "ion-item" in the app
    And I should find "0" within "My entries" "ion-item" in the app
    And I should find "-" within "Comments" "ion-item" in the app

  Scenario: Teachers can see relevant columns in the database activity overview
    # Add a comment to test the values.
    Given I am on the "Database activity" "data activity" page logged in as teacher1
    And I select "Single view" from the "jump" singleselect
    And I click on "Comments (0)" "link"
    And I set the following fields to these values:
      | Comment        | Commenting the entry |
    And I click on "Save comment" "link"
    And I entered the course "Course 1" as "teacher1" in the app

    When I press "Activities" in the app
    And I press "Databases" in the app
    And I press "Database activity" "ion-item" in the app
    Then I should find "1 January 2040" within "Due date" "ion-item" in the app
    And I should find "3" within "Entries" "ion-item" in the app
    And I should find "1" within "Comments" "ion-item" in the app
    And I should find "Approve" within "Actions" "ion-item" in the app
    And I should find "1" within "Approve" "ion-button" in the app

    When I press "Approve" within "Actions" "ion-item" in the app
    Then the header should be "Database activity" in the app

    When I go back in the app
    And I press "Without comments" "ion-item" in the app
    Then I should find "1 January 2040" within "Due date" "ion-item" in the app
    And I should find "1" within "Entries" "ion-item" in the app
    And I should find "0" within "Comments" "ion-item" in the app
    And I should find "View" within "Actions" "ion-item" in the app

    When I press "Empty database" "ion-item" in the app
    Then I should find "-" within "Due date" "ion-item" in the app
    And I should find "0" within "Entries" "ion-item" in the app
    And I should find "-" within "Comments" "ion-item" in the app
    And I should find "View" within "Actions" "ion-item" in the app
