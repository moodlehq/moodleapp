@addon_mod_wiki @app @mod @mod_wiki @javascript @lms_from5.1
Feature: Activities overview for wiki activity

  Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | student1 | Student   | 1        |
      | student2 | Student   | 2        |
      | student3 | Student   | 3        |
      | teacher1 | Teacher   | T        |
    And the following "courses" exist:
      | fullname | shortname | groupmode |
      | Course 1 | C1        | 1         |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
      | student2 | C1     | student        |
      | student3 | C1     | student        |
      | teacher1 | C1     | editingteacher |
    Given the following "groups" exist:
      | name    | course | idnumber | participation |
      | Group 1 | C1     | G1       | 1             |
      | Group 2 | C1     | G2       | 1             |
      | Group 3 | C1     | G3       | 0             |
    And the following "group members" exist:
      | user     | group |
      | student1 | G1    |
      | student2 | G2    |
      | student3 | G3    |
    And the following "activities" exist:
      | activity | course | name                     | idnumber | wikimode      | firstpagetitle       | groupmode |
      | wiki     | C1     | Separate wiki            | wiki1    | collaborative | Separate page 1      | 1         |
      | wiki     | C1     | Visible wiki             | wiki2    | collaborative | Visible page 1       | 2         |
      | wiki     | C1     | Collaborative wiki empty | wiki3    | collaborative | Collaborative page 1 |           |
      | wiki     | C1     | Individual wiki empty    | wiki4    | individual    | Individual page 1    |           |
    And the following wiki pages exist:
      | wiki  | title           | content      | group |
      | wiki1 | Separate page 1 | Group 1 page | G1    |
      | wiki1 | Separate page 1 | Group 2 page | G2    |
      | wiki2 | Visible page 1  | Group 1 page | G1    |
      | wiki2 | Visible page 1  | Group 2 page | G2    |
    And the following wiki pages exist:
      | wiki  | title           | content       |
      | wiki1 | Separate page 1 | No group page |
      | wiki2 | Visible page 1  | No group page |

  Scenario: Students can see relevant columns in the wiki overview
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Activities" in the app
    And I press "Wikis" in the app
    And I press "Separate wiki" "ion-item" in the app
    Then I should find "0" within "My entries" "ion-item" in the app
    And I should find "0" within "Total entries" "ion-item" in the app
    And I should find "Collaborative wiki" within "Wiki mode" "ion-item" in the app

    When I press "Visible wiki" "ion-item" in the app
    Then I should find "0" within "My entries" "ion-item" in the app
    And I should find "3" within "Total entries" "ion-item" in the app
    And I should find "Collaborative wiki" within "Wiki mode" "ion-item" in the app

    When I press "Collaborative wiki empty" "ion-item" in the app
    Then I should find "0" within "My entries" "ion-item" in the app
    And I should find "0" within "Total entries" "ion-item" in the app
    And I should find "Collaborative wiki" within "Wiki mode" "ion-item" in the app

    When I press "Individual wiki empty" "ion-item" in the app
    Then I should find "0" within "My entries" "ion-item" in the app
    And I should find "0" within "Total entries" "ion-item" in the app
    And I should find "Individual wiki" within "Wiki mode" "ion-item" in the app

  Scenario: Teachers can see relevant columns in the wiki overview
    Given I entered the course "Course 1" as "teacher1" in the app
    When I press "Activities" in the app
    And I press "Wikis" in the app
    And I press "Separate wiki" "ion-item" in the app
    Then I should find "3" within "Entries" "ion-item" in the app
    And I should find "Collaborative wiki" within "Wiki mode" "ion-item" in the app
    And I should find "View" within "Actions" "ion-item" in the app

    When I press "View" in the app
    Then I should find "Map" in the app
    And I should find "Separate page 1" in the app

    When I press "Close" in the app
    And I go back in the app
    And I press "Visible wiki" "ion-item" in the app
    Then I should find "3" within "Entries" "ion-item" in the app
    And I should find "Collaborative wiki" within "Wiki mode" "ion-item" in the app
    And I should find "View" within "Actions" "ion-item" in the app

    When I press "Collaborative wiki empty" "ion-item" in the app
    And I should find "0" within "Entries" "ion-item" in the app
    And I should find "Collaborative wiki" within "Wiki mode" "ion-item" in the app
    And I should find "View" within "Actions" "ion-item" in the app

    When I press "Individual wiki empty" "ion-item" in the app
    Then I should find "0" within "Entries" "ion-item" in the app
    And I should find "Individual wiki" within "Wiki mode" "ion-item" in the app
    And I should find "View" within "Actions" "ion-item" in the app
