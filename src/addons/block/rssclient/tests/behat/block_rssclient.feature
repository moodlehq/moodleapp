@app_parallel_run_blocks @addon_block_rss_client @app @block @block_rss_client @javascript @lms_from4.5
Feature: Basic tests of rss client block

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username | firstname | lastname | email |
      | student1 | Student | 1 | student1@example.com |
    And I log in as "admin"
    When I navigate to "Plugins > Blocks > Manage blocks" in site administration
    Then I enable "rss_client" "block" plugin
    And the following "blocks" exist:
      | blockname      | contextlevel | reference | pagetypepattern | defaultregion |
      | rss_client     | System       | 1         | site-index      | side-pre      |
    And I am on site homepage
    And I turn editing mode on
    And "RSS feed" "block" should exist
    And I configure the "RSS feed" block
    And I click on "Add new RSS feed" "radio"
    And I set the field "config_feedurl" to "https://www.nasa.gov/rss/dyn/breaking_news.rss"
    And I set the field "config_block_rss_client_show_channel_link" to "Yes"
    And I press "Save changes"
    And I should see "NASA"

  Scenario: View the rss client block in site home
    Given I entered the app as "student1"
    When I press "Site home" in the app
    And I press "Open block drawer" in the app
    Then I should find "Source site..." within "NASA" "ion-card" in the app

  @disabled_features
  Scenario: Block is included in disabled features
    # Add another block just to ensure there is something in the block region and the drawer is displayed.
    Given the following "blocks" exist:
      | blockname        | contextlevel | reference | pagetypepattern | defaultregion | configdata                                                                                                   |
      | html             | System       | 1         | site-index      | side-pre      | Tzo4OiJzdGRDbGFzcyI6Mjp7czo1OiJ0aXRsZSI7czoxNToiSFRNTCB0aXRsZSB0ZXN0IjtzOjQ6InRleHQiO3M6OToiYm9keSB0ZXN0Ijt9 |
    And the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockRssClient | tool_mobile |
    And I entered the app as "student1"
    When I press "Site home" in the app
    And I press "Open block drawer" in the app
    Then I should not find "NASA" in the app
