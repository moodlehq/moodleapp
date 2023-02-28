@app @javascript @core_reportbuilder @lms_from4.1
Feature: Report builder

  Background:
    Given the Moodle site is compatible with this feature
    And the following "core_reportbuilder > Reports" exist:
      | name         | source                                   | default |
      | My report 01 | core_user\reportbuilder\datasource\users | 1       |
      | My report 02 | core_user\reportbuilder\datasource\users | 2       |
      | My report 03 | core_user\reportbuilder\datasource\users | 3       |
      | My report 04 | core_user\reportbuilder\datasource\users | 4       |
      | My report 05 | core_user\reportbuilder\datasource\users | 5       |
      | My report 06 | core_user\reportbuilder\datasource\users | 6       |
      | My report 07 | core_user\reportbuilder\datasource\users | 7       |
      | My report 08 | core_user\reportbuilder\datasource\users | 8       |
      | My report 09 | core_user\reportbuilder\datasource\users | 9       |
      | My report 10 | core_user\reportbuilder\datasource\users | 10      |
      | My report 11 | core_user\reportbuilder\datasource\users | 11      |
      | My report 12 | core_user\reportbuilder\datasource\users | 12      |
      | My report 13 | core_user\reportbuilder\datasource\users | 13      |
      | My report 14 | core_user\reportbuilder\datasource\users | 14      |
      | My report 15 | core_user\reportbuilder\datasource\users | 15      |
      | My report 16 | core_user\reportbuilder\datasource\users | 16      |
      | My report 17 | core_user\reportbuilder\datasource\users | 17      |
      | My report 18 | core_user\reportbuilder\datasource\users | 18      |
      | My report 19 | core_user\reportbuilder\datasource\users | 19      |
      | My report 20 | core_user\reportbuilder\datasource\users | 20      |
      | My report 21 | core_user\reportbuilder\datasource\users | 21      |
      | My report 22 | core_user\reportbuilder\datasource\users | 22      |
      | My report 23 | core_user\reportbuilder\datasource\users | 23      |
      | My report 24 | core_user\reportbuilder\datasource\users | 24      |
      | My report 25 | core_user\reportbuilder\datasource\users | 25      |
      | My report 26 | core_user\reportbuilder\datasource\users | 26      |
      | My report 27 | core_user\reportbuilder\datasource\users | 27      |
      | My report 28 | core_user\reportbuilder\datasource\users | 28      |
      | My report 29 | core_user\reportbuilder\datasource\users | 29      |
      | My report 30 | core_user\reportbuilder\datasource\users | 30      |
      | My report 31 | core_user\reportbuilder\datasource\users | 31      |
      | My report 32 | core_user\reportbuilder\datasource\users | 32      |
      | My report 33 | core_user\reportbuilder\datasource\users | 33      |
      | My report 34 | core_user\reportbuilder\datasource\users | 34      |
      | My report 35 | core_user\reportbuilder\datasource\users | 35      |
    And the following "core_reportbuilder > Columns" exist:
      | report       | uniqueidentifier |
      | My report 01 | user:fullname    |
      | My report 02 | user:fullname    |
      | My report 03 | user:fullname    |
      | My report 04 | user:fullname    |
      | My report 05 | user:fullname    |
      | My report 06 | user:fullname    |
      | My report 07 | user:fullname    |
      | My report 08 | user:fullname    |
      | My report 09 | user:fullname    |
      | My report 10 | user:fullname    |
      | My report 11 | user:fullname    |
      | My report 12 | user:fullname    |
      | My report 13 | user:fullname    |
      | My report 14 | user:fullname    |
      | My report 15 | user:fullname    |
      | My report 16 | user:fullname    |
      | My report 17 | user:fullname    |
      | My report 18 | user:fullname    |
      | My report 19 | user:fullname    |
      | My report 20 | user:fullname    |
      | My report 21 | user:fullname    |
      | My report 22 | user:fullname    |
      | My report 23 | user:fullname    |
      | My report 24 | user:fullname    |
      | My report 25 | user:fullname    |
      | My report 26 | user:fullname    |
      | My report 27 | user:fullname    |
      | My report 28 | user:fullname    |
      | My report 29 | user:fullname    |
      | My report 30 | user:fullname    |
      | My report 31 | user:fullname    |
      | My report 32 | user:fullname    |
      | My report 33 | user:fullname    |
      | My report 34 | user:fullname    |
      | My report 35 | user:fullname    |
    And the following "core_reportbuilder > Audiences" exist:
      | report       | configdata | classname                                          |
      | My report 01 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 02 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 03 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 04 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 05 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 06 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 07 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 08 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 09 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 10 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 11 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 12 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 13 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 14 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 15 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 16 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 17 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 18 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 19 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 20 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 21 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 22 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 23 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 24 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 25 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 26 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 27 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 28 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 29 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 30 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 31 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 32 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 33 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 34 |            | core_reportbuilder\reportbuilder\audience\allusers |
      | My report 35 |            | core_reportbuilder\reportbuilder\audience\allusers |
    And the following "users" exist:
      | username | firstname   | lastname | email              | city     |
      | student1 | Lionel      | Smith    | lionel@example.com | Bilbao   |

  Scenario: Open report in mobile
    Given I enter the app
    And I log in as "student1"
    And I press the user menu button in the app
    When I press "Reports" in the app

    # Find report in the screen
    Then I should find "My report 03" in the app
    And I press "My report 03" in the app
    And I should find "My report 03" in the app
    And I should find "Lionel Smith" in the app
    But I should not find "My report 02" in the app

  Scenario: Open report in tablet
    Given I enter the app
    And I change viewport size to "1200x640"
    And I log in as "student1"
    And I press the user menu button in the app
    When I press "Reports" in the app

    # Find report in the screen
    Then I should find "My report 02" in the app
    And I press "My report 02" in the app
    And I should find "My report 02" in the app
    And I should find "Lionel Smith" in the app
    But I should not find "My report 03" in the app
