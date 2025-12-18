@app_parallel_run_blocks @addon_block_activity_modules @app @block @block_activity_modules @javascript @lms_upto5.0
Feature: Basic tests of activity modules block

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | email | idnumber |
      | student1 | Student | 1 | student1@example.com | S1 |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |
    And the following "course enrolments" exist:
      | user | course | role |
      | student1 | C1 | student |
    And the following "activities" exist:
      | activity | course | name               | intro                | section | externalurl           |
      | assign   | C1     | Test assign name   | Assign description   | 1       |                       |
      | data     | C1     | Test database name | Database description | 2       |                       |
      | forum    | C1     | Test forum name 1  |                      | 1       |                       |
      | forum    | C1     | Test forum name 2  |                      | 1       |                       |
      | url      | C1     | Test URL name 1    | Test URL description | 3       | http://www.moodle.org |
      | forum    | C1     | Test forum name 3  |                      | 1       |                       |
      | url      | C1     | Test URL name 2    | Test URL description | 3       | http://www.moodle.org |

    And the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion |
      | activity_modules | Course       | C1        | course-view-*   | side-pre      |

  Scenario: View and navigate the activity modules block in a course
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Open block drawer" in the app
    Then I should find "Activities" in the app
    And I should find "Assignments" in the app
    And I should find "Databases" in the app
    And I should find "Forums" in the app
    And I should find "Resources" in the app
    And I should not find "Books" in the app
    And I should not find "Wikis" in the app
    And I should not find "Workshops" in the app
    When I press "Forums" in the app
    Then I should find "Test forum name 1" in the app
    And I should find "Test forum name 2" in the app
    And I should find "Test forum name 3" in the app
    And I should not find "Test assign name" in the app
    And I should not find "Test database name" in the app
    And I should not find "Test URL name 1" in the app
    And I should not find "Test URL name 2" in the app
    When I press "Test forum name 1" in the app
    Then the header should be "Test forum name 1" in the app

  Scenario: Block is included in disabled features
    # Add another block just to ensure there is something in the block region and the drawer is displayed.
    Given the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | html             | Course       | C1        | course-view-*   | side-pre      | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockActivityModules | tool_mobile |
    And  I entered the course "Course 1" as "student1" in the app
    When I press "Open block drawer" in the app
    Then I should not find "Activities" in the app
