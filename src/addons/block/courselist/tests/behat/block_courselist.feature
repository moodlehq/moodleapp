@addon_block_course_list @app @block @block_course_list @javascript
Feature: View the my courses block and check it links to the my page

  Background:
    Given the following "categories" exist:
      | name        | category | idnumber |
      | Category A  | 0        | CATA     |
      | Category B  | 0        | CATB     |
      | Category C  | CATB     | CATC     |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
      | Course 2 | C2        | CATA     |
      | Course 3 | C3        | CATB     |
      | Course 4 | C4        | CATC     |
    And the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | First    | teacher1@example.com |
    And the following "course enrolments" exist:
      | user | course | role           |
      | teacher1 | C1 | editingteacher |
      | teacher1 | C2 | editingteacher |
      | teacher1 | C3 | editingteacher |
    And the following config values are set as admin:
      | unaddableblocks | | theme_boost|
    And the following "blocks" exist:
      | blockname      | contextlevel | reference | pagetypepattern | defaultregion |
      | course_list    | Course       | C1        | course-view-*   | side-pre      |

  Scenario: View and navigate the courses block in a course
    Given I entered the course "Course 1" as "teacher1" in the app
    When I press "Open block drawer" in the app
    Then I should find "My courses" in the app
    When I press "My courses" in the app
    Then the header should be "Available courses" in the app
    And "Show only my courses" "ion-toggle" should be selected in the app
    And I should find "Course 1" in the app
    And I should find "Course 2" in the app
    And I should find "Course 3" in the app
    And I should not find "Course 4" in the app
    But I should find "Back" in the app


  Scenario: Block is included in disabled features
    # Add another block just to ensure there is something in the block region and the drawer is displayed.
    Given the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | html             | Course       | C1        | course-view-*   | side-pre      | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockCourseList | tool_mobile |
    And  I entered the course "Course 1" as "teacher1" in the app
    When I press "Open block drawer" in the app
    Then I should not find "My courses" in the app
