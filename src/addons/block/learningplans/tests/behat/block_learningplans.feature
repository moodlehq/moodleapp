@app_parallel_run_competencies @addon_block_lp @app @block @block_lp @tool_lp @javascript
Feature: View the learning plans block and check
    it links to the correct page

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email | idnumber |
      | student1 | Student | 1 | student1@example.com | S1 |
    And the following "core_competency > plans" exist:
      | name       | user  | description                    | status |
      | Test-Plan1 | student1 | Description of plan for user 1 | active |
    And the following "blocks" exist:
      | blockname  | contextlevel | reference | pagetypepattern | defaultregion |
      | lp         | System       | 1         | my-index        | content       |

  Scenario: View and navigate the learning plans in site home
    Given I entered the app as "student1"
    Then I should find "Learning plans" in the app
    When I press "Learning plans" in the app
    Then the header should be "Learning plans" in the app
    And I should find "Test-Plan1" in the app

  Scenario: Block is included in disabled features
    Given the following config values are set as admin:
      | disabledfeatures | CoreBlockDelegate_AddonBlockLp | tool_mobile |
    And I entered the app as "student1"
    Then I should not find "Learning plans" in the app
