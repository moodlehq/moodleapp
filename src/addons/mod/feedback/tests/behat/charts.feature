@app_parallel_run_feedback @addon_mod_feedback @app @mod @mod_feedback @javascript @chartjs
Feature: Feedback charts in responses analysis

  Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | user1    | Username  | 1        |
      | user2    | Username  | 2        |
      | user3    | Username  | 3        |
      | user4    | Username  | 4        |
      | user5    | Username  | 5        |
      | user6    | Username  | 6        |
      | user7    | Username  | 7        |
      | user8    | Username  | 8        |
      | teacher  | Teacher   | T        |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user  | course | role    |
      | user1 | C1     | student |
      | user2 | C1     | student |
      | user3 | C1     | student |
      | user4 | C1     | student |
      | user5 | C1     | student |
      | user6 | C1     | student |
      | user7 | C1     | student |
      | user8 | C1     | student |
      | teacher | C1   | editingteacher |
    And the following "activities" exist:
      | activity   | name            | course               | idnumber  | anonymous | publish_stats | groupmode | section |
      | feedback   | Course feedback | C1                   | feedback1 | 2         | 1             | 1         | 0       |

  Scenario: Chart is shown in analysis
    Given the following "mod_feedback > questions" exist:
      | activity  | name                     | questiontype | label        | subtype | hidenoselect | values                                  |
      | feedback1 | Do you like this course? | multichoice  | multichoice1 | r       | 1            | Yes of course\nNot at all\nI don't know |

    And the following "mod_feedback > responses" exist:
      | activity  | user  | Do you like this course? |
      | feedback1 | user1 | Not at all               |
      | feedback1 | user2 | I don't know             |
      | feedback1 | user3 | Not at all               |
      | feedback1 | user4 | Yes of course            |
      | feedback1 | user5 | Yes of course            |
      | feedback1 | user6 | Not at all               |
      | feedback1 | user7 | I don't know             |

    When I entered the feedback activity "Course feedback" on course "C1" as "teacher" in the app
    And I press "Analysis" in the app
    Then the UI should match the snapshot
