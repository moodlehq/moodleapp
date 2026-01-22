@app_parallel_run_files @addon_block_private_files @app @block @block_private_files @javascript
Feature: View the private files block and check
    it links to the correct page

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email | idnumber |
      | student1 | Student | 1 | student1@example.com | S1 |
    And the following "blocks" exist:
      | blockname     | contextlevel | reference | pagetypepattern | defaultregion |
      | private_files | System       | 1         | my-index        | content       |

  Scenario: View and navigate the private files block in a course
    Given I entered the app as "student1"
    Then I should find "Private files" in the app
    When I press "Private files" in the app
    Then the header should be "Files" in the app
    And I should find "Private files" in the app
    And I should find "There are no files to show" in the app

  @disabled_features
  Scenario: Block is included in disabled features
    Given the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockPrivateFiles | tool_mobile |
    And I entered the app as "student1"
    Then I should not find "Private files" in the app
