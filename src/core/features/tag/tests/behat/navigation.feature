@app_parallel_run_tags @core_tag @app @core @javascript
Feature: Tag navigation

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email             | interests |
      | user1    | User      | 1        | user1@example.com | Cat       |
      | user2    | User      | 2        | user1@example.com | Cat, Dog  |
      | user3    | User      | 3        | user1@example.com | Dog       |
    And the following "courses" exist:
      | fullname  | shortname | tags     |
      | Course 1  | c1        | Cat, Dog |
      | Course 2  | c2        | Cat      |
      | Course 3  | c3        | Cat      |
      | Course 4  | c4        | Cat      |
      | Course 5  | c5        | Cat      |
      | Course 6  | c6        | Cat      |
      | Course 7  | c7        | Cat      |

  Scenario: Tag menu item is found in the more menu when completion is enabled
    Given I entered the app as "user1"
    When I press the more menu button in the app
    And I press "Tags" in the app
    Then I should find "Cat" in the app
    Then I should find "Dog" in the app

    Given the following config values are set as admin:
      | usetags  | 0 |
    And I entered the app as "user1"
    When I press the more menu button in the app
    Then I should not find "Tags" in the app
