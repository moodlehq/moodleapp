@addon_block_site_main_menu @app @block @block_site_main_menu @javascript @lms_upto4.5
Feature: Basic tests of Main menu block

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | email |
      | student1 | Student | 1 | student1@example.com |
    And the following "blocks" exist:
      | blockname      | contextlevel | reference | pagetypepattern | defaultregion |
      | site_main_menu | System       | 1         | site-index      | side-pre      |

  Scenario: View the Main menu block in site home
    Given the following "activities" exist:
      | activity | course               | section | name          |
      | forum    | Acceptance test site | 0       | My forum name |
    And I entered the app as "student1"
    When I press "Site home" in the app
    And I press "Open block drawer" in the app
    Then I should find "My forum name" within "Main menu" "ion-card" in the app
    When I press "My forum name" in the app
    Then the header should be "My forum name" in the app

  Scenario: Activities in main menu block can be made available but not visible on a course page
    Given the following config values are set as admin:
      | allowstealth | 1 |
    And the following "activities" exist:
      | activity | course               | section | name          |
      | forum    | Acceptance test site | 0       | Visible forum |
      | forum    | Acceptance test site | 0       | My forum name |
    And I log in as "admin"
    And I am on site homepage
    And I turn editing mode on
    And I open "My forum name" actions menu in site main menu block
    And I choose "Availability > Make available but don't show on course page" in the open action menu
    And I entered the app as "student1"
    When I press "Site home" in the app
    And I press "Open block drawer" in the app
    Then I should find "Visible forum" within "Main menu" "ion-card" in the app
    Then I should not find "My forum name" within "Main menu" "ion-card" in the app
    When I press "Visible forum" in the app
    Then the header should be "Visible forum" in the app

  Scenario: Block is included in disabled features
    # Add another block just to ensure there is something in the block region and the drawer is displayed.
    Given the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | html             | System       | 1         | site-index      | side-pre      | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockSiteMainMenu | tool_mobile |
    And I entered the app as "student1"
    When I press "Site home" in the app
    And I press "Open block drawer" in the app
    Then I should not find "Main menu" in the app
