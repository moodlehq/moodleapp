@app_parallel_run_courses @addon_block_starredcourses @app @block @block_starredcourses @javascript
Feature: Basic tests of starred courses block

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email |
      | student1 | Student | 1 | student1@example.com |
    And the following "courses" exist:
      | shortname | fullname |
      | C1        | Course 1 |
      | C2        | Course 2 |
      | C3        | Course 3 |
    And the following "course enrolments" exist:
      | user      | course | role    |
      | student1  | C1     | student |
      | student1  | C2     | student |
      | student1  | C3     | student |
    And the following "blocks" exist:
      | blockname       | contextlevel | reference | pagetypepattern | defaultregion  |
      | starredcourses  | User         | student1  | my-index        | content        |

  Scenario: User has no starred courses
    Given I entered the app as "student1"
    When I scroll to "Starred courses" in the app
    Then I should find "No starred courses" within "Starred courses" "ion-card" in the app

  Scenario: User has starred courses
    Given I entered the app as "student1"
    And I press "My courses" in the app
    And I press "Display options" within "Course 1" "ion-card" in the app
    And I press "Star this course" in the app
    And I press "Display options" within "Course 3" "ion-card" in the app
    And I press "Star this course" in the app
    When I press "Home" in the app
    And I scroll to "Starred courses" in the app
    Then I should find "Course 1" within "Starred courses" "ion-card" in the app
    And I should find "Course 3" within "Starred courses" "ion-card" in the app
    But I should not find "Course 2" within "Starred courses" "ion-card" in the app
    When I press "Course 1" within "Starred courses" "ion-card" in the app
    Then the header should be "Course 1" in the app

  @disabled_features
  Scenario: Block is included in disabled features
    # Add another block just to ensure there is something in the block region and the drawer is displayed.
    Given the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | html             | System       | 1         | my-index        | content       | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockStarredCourses | tool_mobile |
    And I entered the app as "student1"
    Then I should not find "Recently accessed courses" in the app
