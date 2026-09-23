@app_parallel_run_wiki @addon_mod_wiki @app @mod @mod_wiki @javascript

Feature: Basic usage of the wiki activity
  As a user
  I need to view, edit and create pages on the wiki

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
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
      | wiki  | title           | content               | group |
      | wiki1 | Separate page 1 | Group 1 page [[New page]] | G1    |
      | wiki1 | Separate page 1 | Group 2 page          | G2    |
      | wiki2 | Visible page 1  | Group 1 page          | G1    |
      | wiki2 | Visible page 1  | Group 2 page          | G2    |
    And the following wiki pages exist:
      | wiki  | title           | content       |
      | wiki1 | Separate page 1 | No group page |
      | wiki2 | Visible page 1  | No group page |

  Scenario: Create, edit, view and navigate through the wiki
    Given I entered the wiki activity "Separate wiki" on course "Course 1" as "student1" in the app
    When I press "Create page" in the app
    And I set the field "New page title" to "New page from FAB" in the app
    And I set the field "Content" to "Student page contents to [[New page from link]]" in the app
    And I press "Save" in the app
    Then I should find "New page from FAB" in the app
    And I should find "Student page contents to New page from link" in the app

    When I press "New page from link" in the app
    Then I should find "New page from link" in the app
    When I set the field "Content" to "This is a child page" in the app
    And I press "Save" in the app
    Then I should find "New page from link" in the app
    And I should find "This is a child page" in the app

    When I press "Display options" in the app
    And I press "Create page" in the app
    And I set the field "New page title" to "New page from display options menu" in the app
    And I set the field "Content" to "This is the new content" in the app
    And I press "Save" in the app
    Then I should find "New page from display options menu" in the app
    And I should find "This is the new content" in the app

    When I press "Display options" in the app
    And I press "Edit" in the app
    And I set the field "Content" to "Edited page that I have created" in the app
    And I press "Save" in the app
    Then I should find "Edited page that I have created" in the app

    When I press "Map" in the app
    Then I should find "Map" in the app
    And I should find "Go to the wiki first page" in the app
    And I should find "Separate page 1" in the app
    And I should find "New page from link" in the app
    And I should find "New page from FAB" in the app
    And I should find "New page from display options menu" in the app

    When I press "New page from FAB" in the app
    Then I should find "Student page contents to New page from link" in the app
    When I press "New page from link" in the app
    Then I should find "This is a child page" in the app

    When I press "Map" in the app
    And I press "Go to the wiki first page" in the app
    Then I should find "Group 1 page" in the app

  Scenario: User cannot create pages on the the wiki
    Given the following "permission overrides" exist:
      | capability              | permission | role    | contextlevel | reference |
      | mod/wiki:createpage     | Prohibit   | student | System       |           |
    And I entered the wiki activity "Separate wiki" on course "Course 1" as "student1" in the app
    Then I should not find "Create page" in the app

    When I press "Display options" in the app
    Then I should not find "Create page" in the app

    When I press "Edit" in the app
    And I set the field "Content" to "Edited page contents to [[New page from link]]" in the app
    And I press "Save" in the app
    And I press "New page from link" in the app
    Then I should find "You can not edit this page." in the app

  Scenario: User cannot edit pages on the the wiki
    Given the following "permission overrides" exist:
      | capability              | permission | role    | contextlevel | reference |
      | mod/wiki:editpage     | Prohibit   | student | System       |           |
    And I entered the wiki activity "Separate wiki" on course "Course 1" as "student1" in the app
    Then I should not find "Create page" in the app
    And I should not find "Display options" in the app

    When I press "New page" in the app
    And I set the field "Content" to "I should not edit that" in the app
    And I press "Save" in the app
    Then I should find "You can not edit this page." in the app
