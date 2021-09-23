@app @javascript @performance
Feature: Measure performance.

Scenario: [FCP] First Contentful Paint
    Given I start timing "FCP"
    When I launch the app runtime
    Then I should find "Welcome to the Moodle App!" in the app

    When I stop timing "FCP"
    Then "FCP" should have taken less than 5 seconds

Scenario: [TTI] Time to Interactive
    Given I start timing "TTI"
    When I launch the app runtime
    Then I should find "Welcome to the Moodle App!" in the app

    When I press "Skip" in the app
    Then I should find "Connect to Moodle" in the app

    When I stop timing "TTI"
    Then "TTI" should have taken less than 6 seconds

Scenario: [TBT] Total Blocking Time
    Given I launch the app runtime
    Then I should find "Welcome to the Moodle App!" in the app

    When I start timing "TBT"
    And I press "Skip" in the app
    Then I should find "Connect to Moodle" in the app

    When I stop timing "TBT"
    Then "TBT" should have taken less than 2 seconds
