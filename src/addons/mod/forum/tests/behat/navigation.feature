@addon_mod_forum @app @mod @mod_forum @javascript
Feature: Test forum navigation

  Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | student1 | First     | Student  |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | student1 | C1     | student        |
    And the following "activities" exist:
      | activity | name  | course | idnumber |
      | forum    | Forum | C1     | forum    |
    And the following "mod_forum > discussions" exist:
      | forum | name | message | timenow |
      | forum | Discussion 01 | Discussion 01 message | 1638200100 |
      | forum | Discussion 02 | Discussion 02 message | 1638200200 |
      | forum | Discussion 03 | Discussion 03 message | 1638200300 |
      | forum | Discussion 04 | Discussion 04 message | 1638200400 |
      | forum | Discussion 05 | Discussion 05 message | 1638200500 |
      | forum | Discussion 06 | Discussion 06 message | 1638200600 |
      | forum | Discussion 07 | Discussion 07 message | 1638200700 |
      | forum | Discussion 08 | Discussion 08 message | 1638200800 |
      | forum | Discussion 09 | Discussion 09 message | 1638200900 |
      | forum | Discussion 10 | Discussion 10 message | 1638201000 |
      | forum | Discussion 11 | Discussion 11 message | 1638201100 |
      | forum | Discussion 12 | Discussion 12 message | 1638201200 |
      | forum | Discussion 13 | Discussion 13 message | 1638201300 |
      | forum | Discussion 14 | Discussion 14 message | 1638201400 |
      | forum | Discussion 15 | Discussion 15 message | 1638201500 |
      | forum | Discussion 16 | Discussion 16 message | 1638201600 |
      | forum | Discussion 17 | Discussion 17 message | 1638201700 |
      | forum | Discussion 18 | Discussion 18 message | 1638201800 |
      | forum | Discussion 19 | Discussion 19 message | 1638201900 |
      | forum | Discussion 20 | Discussion 20 message | 1638202000 |
    And I wait "1" seconds
    And the following "mod_forum > posts" exist:
      | discussion | parentsubject | message |
      | Discussion 04 | Discussion 04 | Discussion 04 first reply |
      | Discussion 05 | Discussion 05 | Discussion 05 first reply |

  Scenario: Mobile navigation on forum
    Given I entered the course "Course 1" as "student1" in the app

    # By last reply
    When I press "Forum" in the app
    Then I should find "Discussion 05" in the app
    And I should find "Discussion 04" in the app
    But I should not find "Discussion 12" in the app

    # By last reply — Infinite loading
    When I load more items in the app
    Then I should find "Discussion 12" in the app
    And I should find "Discussion 01" in the app
    But I should not be able to load more items in the app

    # By last reply — Swipe
    When I press "Discussion 05" in the app
    Then I should find "Discussion 05 first reply" in the app

    When I swipe to the right in the app
    Then I should find "Discussion 05 first reply" in the app

    When I swipe to the left in the app
    Then I should find "Discussion 04 first reply" in the app

    When I swipe to the left in the app
    Then I should find "Discussion 20 message" in the app

    # By creation date
    When I go back in the app
    And I scroll to "Discussion 05" in the app
    And I press "Sort" in the app
    And I press "Sort by creation date in descending order" in the app
    Then I should find "Discussion 20" in the app
    And I should find "Discussion 19" in the app
    But I should not find "Discussion 10" in the app
    And I should not find "Discussion 04" in the app
    And I should not find "Discussion 05" in the app

    # By creation date — Infinite loading
    When I load more items in the app
    Then I should find "Discussion 10" in the app
    And I should find "Discussion 04" in the app
    And I should find "Discussion 05" in the app
    But I should not be able to load more items in the app

    # By creation date — Swipe
    When I press "Discussion 20" in the app
    Then I should find "Discussion 20 message" in the app

    When I swipe to the right in the app
    Then I should find "Discussion 20 message" in the app

    When I swipe to the left in the app
    Then I should find "Discussion 19 message" in the app

    When I swipe to the left in the app
    Then I should find "Discussion 18 message" in the app

    # Offline
    When I go back in the app
    And I press "Add discussion topic" in the app
    And I switch network connection to offline
    And I set the following fields to these values in the app:
      | Subject | Offline discussion 1 |
      | Message | Offline discussion 1 message |
    And I press "Post to forum" in the app
    And I press "Add discussion topic" in the app
    And I set the following fields to these values in the app:
      | Subject | Offline discussion 2 |
      | Message | Offline discussion 2 message |
    And I press "Post to forum" in the app
    Then I should find "Not sent" in the app
    And I should find "Offline discussion 1" in the app
    And I should find "Offline discussion 2" in the app

    When I press "Offline discussion 2" in the app
    And I set the following fields to these values in the app:
      | Subject | Offline discussion 3 |
      | Message | Offline discussion 3 message |
    And I press "Post to forum" in the app
    Then I should find "Not sent" in the app
    And I should find "Offline discussion 1" in the app
    And I should find "Offline discussion 3" in the app
    But I should not find "Offline discussion 2" in the app

    # TODO fix flaky test failing on CI but working locally
    # # Offline — Swipe
    # When I press "Offline discussion 3" in the app
    # Then I should find "Offline discussion 3 message" in the app

    # When I swipe to the right in the app
    # Then I should find "Offline discussion 3 message" in the app

    # When I swipe to the left in the app
    # Then I should find "Offline discussion 1 message" in the app

    # When I swipe to the left in the app
    # Then I should find "Discussion 20 message" in the app

  Scenario: Tablet navigation on forum
    Given I entered the course "Course 1" as "student1" in the app
    And I change viewport size to "1200x640" in the app

    # By last reply
    When I press "Forum" in the app
    Then I should find "Discussion 04" in the app
    And I should find "Discussion 05" in the app
    And "Discussion 05" near "Discussion 04" should be selected in the app
    And I should find "Discussion 05 first reply" inside the split-view content in the app
    But I should not find "Discussion 12" in the app

    # By last reply — Infinite loading
    When I load more items in the app
    Then I should find "Discussion 12" in the app
    And I should find "Discussion 01" in the app
    But I should not be able to load more items in the app

    # By last reply — Split view
    When I press "Discussion 04" in the app
    Then "Discussion 04" near "Discussion 05" should be selected in the app
    And I should find "Discussion 04 first reply" inside the split-view content in the app

    When I press "Discussion 12" in the app
    Then "Discussion 12" near "Discussion 11" should be selected in the app
    And I should find "Discussion 12 message" inside the split-view content in the app

    # By creation date
    When I scroll to "Discussion 05" in the app
    And I press "Discussion 05" in the app
    And I press "Sort" in the app
    And I press "Sort by creation date in descending order" in the app
    Then I should find "Discussion 20" in the app
    And I should find "Discussion 19" in the app
    And "Discussion 20" near "Discussion 19" should be selected in the app
    And I should find "Discussion 20 message" inside the split-view content in the app
    But I should not find "Discussion 10" in the app
    And I should not find "Discussion 04" in the app
    And I should not find "Discussion 05" in the app

    # By creation date — Infinite loading
    When I load more items in the app
    Then I should find "Discussion 10" in the app
    And I should find "Discussion 04" in the app
    And I should find "Discussion 05" in the app
    But I should not be able to load more items in the app

    # By creation date — Split view
    When I press "Discussion 19" in the app
    Then "Discussion 19" near "Discussion 20" should be selected in the app
    And I should find "Discussion 19 message" inside the split-view content in the app

    When I press "Discussion 05" in the app
    Then "Discussion 05" near "Discussion 04" should be selected in the app
    And I should find "Discussion 05 first reply" inside the split-view content in the app

    # Offline
    When I press "Add discussion topic" in the app
    And I switch network connection to offline
    And I set the following fields to these values in the app:
      | Subject | Offline discussion 1 |
      | Message | Offline discussion 1 message |
    And I press "Post to forum" in the app
    And I press "Add discussion topic" in the app
    And I set the following fields to these values in the app:
      | Subject | Offline discussion 2 |
      | Message | Offline discussion 2 message |
    And I press "Post to forum" in the app
    Then I should find "Not sent" in the app
    And I should find "Offline discussion 1" in the app
    And I should find "Offline discussion 2" in the app

    When I press "Offline discussion 2" in the app
    And I set the following fields to these values in the app:
      | Subject | Offline discussion 3 |
      | Message | Offline discussion 3 message |
    And I press "Post to forum" in the app
    Then I should find "Not sent" in the app
    And I should find "Offline discussion 1" in the app
    And I should find "Offline discussion 3" in the app
    But I should not find "Offline discussion 2" in the app

    # Offline — Split view
    When I press "Offline discussion 1" in the app
    Then "Offline discussion 1" near "Offline discussion 3" should be selected in the app
    And I should find "Offline discussion 1 message" inside the split-view content in the app

    When I press "Offline discussion 3" in the app
    Then "Offline discussion 3" near "Offline discussion 1" should be selected in the app
    And I should find "Offline discussion 3 message" inside the split-view content in the app

    When I press "Discussion 20" in the app
    Then "Discussion 20" near "Discussion 19" should be selected in the app
    And I should find "Discussion 20 message" inside the split-view content in the app
