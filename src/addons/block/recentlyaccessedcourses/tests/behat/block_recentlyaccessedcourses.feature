@addon_block_recentlyaccessedcourses @app @block @block_recentlyaccessedcourses @javascript
Feature: Basic tests of recent accessed courses block

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | 1        | student1@example.com |
    And the following "categories" exist:
      | name        | category | idnumber |
      | Category A  | 0        | CATA     |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
      | Course 2 | C2        | 0        |
      | Course 3 | C3        | 0        |
      | Course 4 | C4        | CATA     |
      | Course 5 | C5        | 0        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student1 | C2     | student |
      | student1 | C3     | student |
      | student1 | C4     | student |
      | student1 | C5     | student |
    And the following "blocks" exist:
      | blockname               | contextlevel | reference | pagetypepattern | defaultregion |
      | recentlyaccessedcourses | System       | 1         | my-index        | content       |

  Scenario: User has accessed two courses
    Given I entered the app as "student1"
    When I scroll to "Recently accessed courses" in the app
    Then I should find "No recent courses" within "Recently accessed courses" "ion-card" in the app
    And I should not find "Course 1" within "Recently accessed courses" "ion-card" in the app
    And I should not find "Course 2" within "Recently accessed courses" "ion-card" in the app
    When I press "My courses" in the app
    And I press "Course 1" in the app
    And I go back in the app
    And I press "Course 2" in the app
    And I go back in the app
    And I press "Home" in the app
    And I scroll to "Recently accessed courses" in the app
    Then I should find "Course 1" within "Recently accessed courses" "ion-card" in the app
    And I should find "Course 2" within "Recently accessed courses" "ion-card" in the app
    And I should not find "Course 3" within "Recently accessed courses" "ion-card" in the app
    And I should not find "Course 4" within "Recently accessed courses" "ion-card" in the app
    And I should not find "Course 5" within "Recently accessed courses" "ion-card" in the app

  Scenario: Show course category name and show short course name
    Given the following config values are set as admin:
      | displaycategories | 1 | block_recentlyaccessedcourses |
    And the following config values are set as admin:
      | courselistshortnames | 1 |
    And I entered the app as "student1"
    When I press "My courses" in the app
    And I press "C1" in the app
    And I go back in the app
    And I press "C4" in the app
    And I go back in the app
    And I press "Home" in the app
    And I scroll to "Recently accessed courses" in the app
    Then I should find "Category 1" within "Recently accessed courses" "ion-card" in the app
    And I should find "Category A" within "Recently accessed courses" "ion-card" in the app
    And I should find "C1" within "Recently accessed courses" "ion-card" in the app
    And I should find "C4" within "Recently accessed courses" "ion-card" in the app

  Scenario: Hide course category name and hide short course name
    Given the following config values are set as admin:
      | displaycategories | 0 | block_recentlyaccessedcourses |
    And the following config values are set as admin:
      | courselistshortnames | 0 |
    And I entered the app as "student1"
    When I press "My courses" in the app
    And I press "Course 1" in the app
    And I go back in the app
    And I press "Course 4" in the app
    And I go back in the app
    And I press "Home" in the app
    And I scroll to "Recently accessed courses" in the app
    Then I should not find "Category 1" within "Recently accessed courses" "ion-card" in the app
    And I should not find "Category A" within "Recently accessed courses" "ion-card" in the app
    And I should not find "C1" within "Recently accessed courses" "ion-card" in the app
    And I should not find "C4" within "Recently accessed courses" "ion-card" in the app

  Scenario: Block is included in disabled features
    # Add another block just to ensure there is something in the block region and the drawer is displayed.
    Given the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | html             | System       | 1         | my-index        | content       | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockRecentlyAccessedCourses | tool_mobile |
    And I entered the app as "student1"
    Then I should not find "Recently accessed courses" in the app
