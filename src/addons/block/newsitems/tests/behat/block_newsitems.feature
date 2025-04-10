@addon_block_news_items @app @block @block_news_items @javascript
Feature: Basic tests of news items block

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email |
      | student1 | Student | 1 | student1@example.com |
      | teacher1 | Teacher | 1 | teacher1@example.com |
    And the following "courses" exist:
      | fullname | shortname | category | newsitems |
      | Course 1 | C1        | 0        | 5         |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1 | student |
      | teacher1 | C1     | editingteacher |
    And the following "blocks" exist:
      | blockname  | contextlevel | reference | pagetypepattern | defaultregion |
      | news_items | Course       | C1        | course-view-*   | side-pre      |
    And the following "mod_forum > discussions" exist:
      | user     | forum         | name             | message       |
      | teacher1 | Announcements | Discussion One   | Not important |
      | teacher1 | Announcements | Discussion Two   | Not important |
      | teacher1 | Announcements | Discussion Three | Not important |

  Scenario: View and navigate the news items block in a course as an student
    Given I entered the course "Course 1" as "student1" in the app
    When I press "Open block drawer" in the app
    Then I should find "Latest announcements" in the app
    And I should find "Discussion One" in the app
    And I should find "Discussion Two" in the app
    And I should find "Discussion Three" in the app
    When I press "Discussion Three" in the app
    Then the header should be "Discussion Three" in the app
    And I should find "Not important" in the app
    And I should not find "Discussion One" in the app
    When I go back in the app
    And I press "Open block drawer" in the app
    And I press "Older topics" in the app
    Then the header should be "Announcements" in the app
    And I should find "3 discussions" in the app
    And I should find "Discussion One" in the app
    And I should find "Discussion Two" in the app
    And I should find "Discussion Three" in the app

  Scenario: View and navigate the news items block in a course as a teacher
    Given I entered the course "Course 1" as "teacher1" in the app
    When I press "Open block drawer" in the app
    Then I should find "Latest announcements" in the app
    And I should find "Discussion One" in the app
    And I should find "Discussion Two" in the app
    And I should find "Discussion Three" in the app
    When I press "Add a new topic" in the app
    Then the header should be "Add discussion topic" in the app
    When I set the following fields to these values in the app:
     | Subject | Discussion Four |
     | Message | An awesome message |
    And I press "Post to forum" in the app
    And I press "Open block drawer" in the app
    And I pull to refresh in the app
    Then I should find "Discussion Four" in the app
    And I should find "Discussion One" in the app
    And I should find "Discussion Two" in the app
    And I should find "Discussion Three" in the app

  Scenario: Block is included in disabled features
    # Add another block just to ensure there is something in the block region and the drawer is displayed.
    Given the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | html             | Course       | C1        | course-view-*   | side-pre      | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockNewsItems | tool_mobile |
    And  I entered the course "Course 1" as "student1" in the app
    When I press "Open block drawer" in the app
    Then I should not find "Latest announcements" in the app
