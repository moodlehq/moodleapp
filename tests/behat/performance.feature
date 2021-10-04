@app @javascript @performance
Feature: Measure performance.

  Scenario: First Contentful Paint
    Given I start measuring "First Contentful Paint"
    When I launch the app runtime
    Then I should find "Welcome to the Moodle App!" in the app

    When I stop measuring "First Contentful Paint"
    Then "First Contentful Paint" should have taken less than 6 seconds

  Scenario: Time to Interactive
    Given I start measuring "Time to Interactive"
    When I launch the app runtime
    Then I should find "Welcome to the Moodle App!" in the app

    When I press "Skip" in the app
    Then I should not find "Skip" in the app
    And I should find "Connect to Moodle" in the app

    When I stop measuring "Time to Interactive"
    Then "Time to Interactive" should have taken less than 7 seconds

  Scenario: Total Blocking Time
    Given I launch the app runtime
    Then I should find "Welcome to the Moodle App!" in the app

    When I start measuring "Total Blocking Time"
    And I press "Skip" in the app
    Then I should not find "Skip" in the app
    And I should find "Connect to Moodle" in the app

    When I stop measuring "Total Blocking Time"
    Then "Total Blocking Time" should have taken less than 2 seconds
