@app_parallel_run_blocks @addon_block_search_forums @app @block @block_search_forums @mod_forum @javascript @lms_from4.3
Feature: View the search forums block and check
    it links to the correct page

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | email | idnumber |
      | teacher1 | Teacher | 1 | teacher1@example.com | T1 |
      | student1 | Student | 1 | student1@example.com | S1 |
    And the following config values are set as admin:
      | enableglobalsearch | 1 |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
      | student1 | C1 | student        |
    And the following "blocks" exist:
      | blockname     | contextlevel | reference | pagetypepattern | defaultregion |
      | search_forums | Course       | C1        | course-view-*   | side-post     |
    And the following "activities" exist:
      | activity | name         | intro               | course | idnumber |
      | forum    | Test forum 1 | Test forum 1 intro  | C1     | forum1   |
    And the following "mod_forum > discussions" exist:
      | forum   | name                 | subject              | message                      |
      | forum1  | Initial discussion 1 | Initial discussion 1 | Initial discussion message 1 |
    And the following "blocks" exist:
      | blockname     | contextlevel | reference | pagetypepattern | defaultregion |
      | search_forums | System       | 1         | site-index      | side-pre      |

  # The tests does not check if the search is correct.
  Scenario: Use the search forum block in a course without any forum posts
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Open block drawer" in the app
    Then I should find "Search forums" in the app
    When I press "Search forums" in the app
    And I set the field "Search" to "Moodle" in the app
    And I press "Search" "button" in the app
    Then I should find "No results for" in the app

  Scenario: Use the search forum block on the frontpage and search for posts as a user
    Given I entered the app as "student1"
    When I press "Site home" in the app
    And I press "Open block drawer" in the app
    Then I should find "Search forums" in the app
    When I press "Search forums" in the app
    And I set the field "Search" to "Moodle" in the app
    And I press "Search" "button" in the app
    Then I should find "No results for" in the app

  Scenario: Block is included in disabled features
    # Add another block just to ensure there is something in the block region and the drawer is displayed.
    Given the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | html             | Course       | C1        | course-view-*   | side-pre      | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockSearchForums | tool_mobile |
    And  I entered the course "Course 1" as "student1" in the app
    When I press "Open block drawer" in the app
    Then I should not find "Search forums" in the app
