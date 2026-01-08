@app_parallel_run_courses @addon_block_recentlyaccesseditems @app @block @block_recentlyaccesseditems @javascript
Feature: Basic tests of recent activity block

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | 1        | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
      | Course 2 | C2        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student1 | C2     | student |
    And the following "activity" exists:
      | course   | C1              |
      | activity | forum           |
      | idnumber | Test forum name |
      | name     | Test forum name |

  Scenario: User has accessed some items
    Given I entered the app as "student1"
    When I press "Open block drawer" in the app
    Then I should find "No recent items" within "Recently accessed items" "ion-card" in the app
    When I close the popup in the app
    And I press "My courses" in the app
    And I press "Course 1" in the app
    And I press "Test forum name" in the app
    And I go back to the root page in the app
    And I press "Home" in the app
    And I press "Open block drawer" in the app
    And I pull to refresh in the app
    Then I should not find "No recent items" within "Recently accessed items" "ion-card" in the app
    And I should find "Test forum name" within "Recently accessed items" "ion-card" in the app

  Scenario: User has accessed more than 9 items
    Given the following "activities" exist:
      | activity   | name                   | intro | course |
      | assign     | Test assignment name   | -     | C1     |
      | book       | Test book name         | -     | C1     |
      | page       | Test page name 1       | -     | C1     |
      | page       | Test page name 2       | -     | C1     |
      | page       | Test page name 3       | -     | C1     |
      | choice     | Test choice name       | -     | C1     |
      | data       | Test database name     | -     | C1     |
      | wiki       | Test wiki name         | -     | C1     |
      | workshop   | Test workshop name     | -     | C1     |
    And I entered the app as "student1"
    When I press "My courses" in the app
    And I press "Course 1" in the app
    And I press "Test forum name" in the app
    And I go back in the app
    And I press "Test assignment name" in the app
    And I go back in the app
    And I press "Test book name" in the app
    And I go back in the app
    And I press "Test page name 1" in the app
    And I go back in the app
    And I press "Test page name 2" in the app
    And I go back in the app
    And I press "Test page name 3" in the app
    And I go back in the app
    And I press "Test choice name" in the app
    And I go back in the app
    And I press "Test database name" in the app
    And I go back in the app
    And I press "Test wiki name" in the app
    And I go back in the app
    And I press "Test workshop name" in the app
    And I go back to the root page in the app
    And I press "Home" in the app
    And I press "Open block drawer" in the app
    And I pull to refresh in the app
    Then I should not find "No recent items" within "Recently accessed items" "ion-card" in the app
    And I should find "Test assignment name" within "Recently accessed items" "ion-card" in the app
    And I should find "Test book name" within "Recently accessed items" "ion-card" in the app
    And I should find "Test page name 1" within "Recently accessed items" "ion-card" in the app
    And I should find "Test page name 2" within "Recently accessed items" "ion-card" in the app
    And I should find "Test page name 3" within "Recently accessed items" "ion-card" in the app
    And I should find "Test choice name" within "Recently accessed items" "ion-card" in the app
    And I should find "Test database name" within "Recently accessed items" "ion-card" in the app
    And I should find "Test wiki name" within "Recently accessed items" "ion-card" in the app
    And I should find "Test workshop name" within "Recently accessed items" "ion-card" in the app
    And I should not find "Test forum name" within "Recently accessed items" "ion-card" in the app

  Scenario: Block is included in disabled features
    # Add another block just to ensure there is something in the block region and the drawer is displayed.
    Given the following "blocks" exist:
      | blockname | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | html      | System       | 1         | my-index        | side-pre      | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockRecentlyAccessedItems | tool_mobile |
    And I entered the app as "student1"
    When I press "Open block drawer" in the app
    Then I should not find "Recently accessed items" in the app
