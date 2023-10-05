@mod @mod_forum @app @javascript @lms_from4.3
Feature: Test Forum Search

  Background:
    Given solr is installed
    And the following config values are set as admin:
      | enableglobalsearch | 1 |
      | searchengine       | solr |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
      | Course 2 | C2        |
    And the following "users" exist:
      | username |
      | student1 |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student1 | C2     | student |
    And the following "activities" exist:
      | activity | name        | intro               | course | idnumber |
      | forum    | Test forum 1 | Test forum 1 intro | C1     | forum1   |
      | forum    | Test forum 2 | Test forum 2 intro | C1     | forum2   |
      | forum    | Test forum 3 | Test forum 3 intro | C2     | forum3   |
    And the following "mod_forum > discussions" exist:
      | forum   | name                 | subject              | message                      |
      | forum1  | Initial discussion 1 | Initial discussion 1 | Initial discussion message 1 |
      | forum2  | Initial discussion 2 | Initial discussion 2 | Initial discussion message 2 |
      | forum3  | Initial discussion 3 | Initial discussion 3 | Initial discussion message 3 |

  # TODO test single forum search (lacking generators for post search results)

  Scenario: Search in side block
    Given global search expects the query "message" and will return:
      | type     | idnumber |
      | activity | forum1   |
      | activity | forum2   |
    And the following "blocks" exist:
      | blockname     | contextlevel | reference |
      | search_forums | Course       | C1        |
    And I entered the course "Course 1" as "student1" in the app
    When I press "Open block drawer" in the app
    And I press "Search forums" in the app
    Then I should find "What are you searching for?" in the app
    And I should find "Search forums" in the app

    When I set the field "Search" to "message" in the app
    And I press "Search" "button" in the app
    Then I should find "Test forum 1" in the app
    And I should find "Test forum 2" in the app
