@core_search @app @core @javascript @lms_from4.3
Feature: Test Global Search

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
      | activity | name         | course | idnumber |
      | page     | Test page 01 | C1     | page01   |
      | page     | Test page 02 | C1     | page02   |
      | page     | Test page 03 | C1     | page03   |
      | page     | Test page 04 | C1     | page04   |
      | page     | Test page 05 | C1     | page05   |
      | page     | Test page 06 | C1     | page06   |
      | page     | Test page 07 | C1     | page07   |
      | page     | Test page 08 | C1     | page08   |
      | page     | Test page 09 | C1     | page09   |
      | page     | Test page 10 | C1     | page10   |
      | page     | Test page 11 | C1     | page11   |
      | page     | Test page 12 | C1     | page12   |
      | page     | Test page 13 | C1     | page13   |
      | page     | Test page 14 | C1     | page14   |
      | page     | Test page 15 | C1     | page15   |
      | page     | Test page 16 | C1     | page16   |
      | page     | Test page 17 | C1     | page17   |
      | page     | Test page 18 | C1     | page18   |
      | page     | Test page 19 | C1     | page19   |
      | page     | Test page 20 | C1     | page20   |
      | page     | Test page 21 | C1     | page21   |
      | page     | Test page C2 | C2     | pagec2   |
    And the following "activities" exist:
      | activity | name       | intro            | course | idnumber |
      | forum    | Test forum | Test forum intro | C1     | forum    |

  Scenario: Search in a site
    Given global search expects the query "page" and will return:
      | type     | idnumber |
      | activity | page01   |
      | activity | page02   |
      | activity | page03   |
      | activity | page04   |
      | activity | page05   |
      | activity | page06   |
      | activity | page07   |
      | activity | page08   |
      | activity | page09   |
      | activity | page10   |
      | activity | page11   |
      | activity | page12   |
      | activity | pagec2   |
    And I entered the app as "student1"
    When I press the more menu button in the app
    And I press "Global search" in the app
    And I set the field "Search" to "page" in the app
    And I press "Search" "button" in the app
    Then I should find "Test page 01" in the app
    And I should find "Test page 10" in the app

    When I load more items in the app
    Then I should find "Test page 11" in the app

    When I press "Test page 01" in the app
    Then I should find "Test page content" in the app

    When I go back in the app
    And global search expects the query "forum" and will return:
      | type     | idnumber  |
      | activity | forum     |
    And I set the field "Search" to "forum" in the app
    And I press "Search" "button" in the app
    Then I should find "Test forum" in the app
    But I should not find "Test page" in the app

    When I press "Test forum" in the app
    Then I should find "Test forum intro" in the app

    When I go back in the app
    And I press "Clear search" in the app
    Then I should find "What are you searching for?" in the app
    But I should not find "Test forum" in the app

    Given global search expects the query "noresults" and will return:
      | type     | idnumber  |
    And I set the field "Search" to "noresults" in the app
    And I press "Search" "button" in the app
    Then I should find "No results for" in the app
    And the following events should have been logged for "student1" in the app:
      | name                              | other             |
      | \core\event\search_results_viewed | {"q":"page"}      |
      | \core\event\search_results_viewed | {"q":"forum"}     |
      | \core\event\search_results_viewed | {"q":"noresults"} |

    # TODO test other results like course, user, and messages (global search generator not supported)

  Scenario: Filter results
    Given global search expects the query "page" and will return:
      | type     | idnumber |
      | activity | page01   |
    And I entered the app as "student1"
    When I press the more menu button in the app
    And I press "Global search" in the app
    And I set the field "Search" to "page" in the app
    And I press "Search" "button" in the app
    Then I should find "Test page 01" in the app

    When I press "Filter" in the app
    And I press "C1" in the app
    And I press "Users" in the app
    And global search expects the query "page" and will return:
      | type     | idnumber  |
      | activity | page02    |
    And I press "Close" in the app
    Then I should find "Test page 02" in the app
    But I should not find "Test page 01" in the app

  Scenario: See search banner
    Given the following config values are set as admin:
      | searchbannerenable | 1 |
      | searchbanner | Search indexing is under maintentance! |
    And I entered the app as "student1"
    When I press the more menu button in the app
    And I press "Global search" in the app
    Then I should find "Search indexing is under maintentance!" in the app

  Scenario: Open from side block
    Given global search expects the query "message" and will return:
      | type     | idnumber |
      | activity | page01   |
    And the following "blocks" exist:
      | blockname    | contextlevel | reference |
      | globalsearch | Course       | C1        |
    And I entered the course "Course 1" as "student1" in the app
    When I press "Open block drawer" in the app
    And I press "Search" in the app
    Then I should find "What are you searching for?" in the app

    When I press "Filter" in the app
    Then I should find "Filter results by" in the app
    But I should not find "Search in" in the app
