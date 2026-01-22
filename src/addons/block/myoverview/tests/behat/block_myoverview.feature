@app_parallel_run_courses @addon_block_myoverview @app @block @block_myoverview @javascript
Feature: Basic tests of my overview block

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email |
      | student1 | Student | 1 | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category | newsitems |
      | Course 1 | C1        | 0        | 5         |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1 | student |
    And the following "blocks" exist:
      | blockname  | contextlevel | reference | pagetypepattern | defaultregion |
      | myoverview | System       | 1         | my-index        | content       |

  Scenario: View and navigate the my overview block
    Given I entered the app as "student1"
    Then I should find "Course overview" in the app
    And I should find "Course 1" in the app
    And I should find "In progress" in the app
    When I press "My courses" in the app
    Then I should find "My courses" in the app
    And I should find "Course 1" in the app
    And I should find "In progress" in the app

  @disabled_features
  Scenario: Block is included in disabled features with other blocks
    # Add another block just to ensure there is something in the block region and the drawer is displayed.
    Given the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | html             | System       | 1         | my-index        | side-pre      | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockMyOverview | tool_mobile |
    And I entered the app as "student1"
    Then I should not find "Course overview" in the app
    And I should not find "Course 1" in the app
    And I should not find "In progress" in the app
    When I press "My courses" in the app
    Then I should find "My courses" in the app
    And I should not find "Course 1" in the app
    And I should not find "In progress" in the app

  @disabled_features
  Scenario: Block is included in disabled features with no other blocks
    Given the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockMyOverview | tool_mobile |
    And I entered the app as "student1"
    Then I should not find "Course overview" in the app
    And I should not find "Course 1" in the app
    And I should not find "In progress" in the app
    And I should not find "My courses" in the app

  Scenario: My courses is included in disabled features
    # Add another block just to ensure there is something in the block region and the drawer is displayed.
    Given the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | html             | System       | 1         | my-index        | side-pre      | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And the following config values are set as admin:
      | disabledfeatures | CoreMainMenuDelegate_CoreCourses | tool_mobile |
    And I entered the app as "student1"
    Then I should find "Course overview" in the app
    And I should find "Course 1" in the app
    And I should find "In progress" in the app
    And I should not find "My courses" in the app
