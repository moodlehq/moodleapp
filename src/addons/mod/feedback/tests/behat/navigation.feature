@app_parallel_run_feedback @addon_mod_feedback @app @mod @mod_feedback @javascript
Feature: Test feedback navigation

  Background:
    Given the Moodle site is compatible with this feature
    And the following "users" exist:
      | username  | firstname | lastname |
      | teacher1  | Teacher   | teacher  |
      | student01 | Student   | 01       |
      | student02 | Student   | 02       |
      | student03 | Student   | 03       |
      | student04 | Student   | 04       |
      | student05 | Student   | 05       |
      | student06 | Student   | 06       |
      | student07 | Student   | 07       |
      | student08 | Student   | 08       |
      | student09 | Student   | 09       |
      | student10 | Student   | 10       |
      | student11 | Student   | 11       |
      | student12 | Student   | 12       |
      | student13 | Student   | 13       |
      | student14 | Student   | 14       |
      | student15 | Student   | 15       |
      | student16 | Student   | 16       |
      | student17 | Student   | 17       |
      | student18 | Student   | 18       |
      | student19 | Student   | 19       |
      | student20 | Student   | 20       |
      | student21 | Student   | 21       |
      | student22 | Student   | 22       |
      | student23 | Student   | 23       |
      | student24 | Student   | 24       |
      | student25 | Student   | 25       |
      | student26 | Student   | 26       |
      | student27 | Student   | 27       |
      | student28 | Student   | 28       |
      | student29 | Student   | 29       |
      | student30 | Student   | 30       |
      | student31 | Student   | 31       |
      | student32 | Student   | 32       |
      | student33 | Student   | 33       |
      | student34 | Student   | 34       |
      | student35 | Student   | 35       |
      | student36 | Student   | 36       |
      | student37 | Student   | 37       |
      | student38 | Student   | 38       |
      | student39 | Student   | 39       |
      | student40 | Student   | 40       |
      | student41 | Student   | 41       |
      | student42 | Student   | 42       |
      | student43 | Student   | 43       |
      | student44 | Student   | 44       |
      | student45 | Student   | 45       |
      | student46 | Student   | 46       |
      | student47 | Student   | 47       |
      | student48 | Student   | 48       |
      | student49 | Student   | 49       |
      | student50 | Student   | 50       |
      | student51 | Student   | 51       |
      | student52 | Student   | 52       |
      | student53 | Student   | 53       |
      | student54 | Student   | 54       |
      | student55 | Student   | 55       |
      | student56 | Student   | 56       |
      | student57 | Student   | 57       |
      | student58 | Student   | 58       |
      | student59 | Student   | 59       |
      | student60 | Student   | 60       |
      | student61 | Student   | 61       |
      | student62 | Student   | 62       |
      | student63 | Student   | 63       |
      | student64 | Student   | 64       |
      | student65 | Student   | 65       |
      | student66 | Student   | 66       |
      | student67 | Student   | 67       |
      | student68 | Student   | 68       |
      | student69 | Student   | 69       |
      | student70 | Student   | 70       |
      | student71 | Student   | 71       |
      | student72 | Student   | 72       |
      | student73 | Student   | 73       |
      | student74 | Student   | 74       |
      | student75 | Student   | 75       |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user      | course | role           |
      | teacher1  | C1     | editingteacher |
      | student01 | C1     | student        |
      | student02 | C1     | student        |
      | student03 | C1     | student        |
      | student04 | C1     | student        |
      | student05 | C1     | student        |
      | student06 | C1     | student        |
      | student07 | C1     | student        |
      | student08 | C1     | student        |
      | student09 | C1     | student        |
      | student10 | C1     | student        |
      | student11 | C1     | student        |
      | student12 | C1     | student        |
      | student13 | C1     | student        |
      | student14 | C1     | student        |
      | student15 | C1     | student        |
      | student16 | C1     | student        |
      | student17 | C1     | student        |
      | student18 | C1     | student        |
      | student19 | C1     | student        |
      | student20 | C1     | student        |
      | student21 | C1     | student        |
      | student22 | C1     | student        |
      | student23 | C1     | student        |
      | student24 | C1     | student        |
      | student25 | C1     | student        |
      | student26 | C1     | student        |
      | student27 | C1     | student        |
      | student28 | C1     | student        |
      | student29 | C1     | student        |
      | student30 | C1     | student        |
      | student31 | C1     | student        |
      | student32 | C1     | student        |
      | student33 | C1     | student        |
      | student34 | C1     | student        |
      | student35 | C1     | student        |
      | student36 | C1     | student        |
      | student37 | C1     | student        |
      | student38 | C1     | student        |
      | student39 | C1     | student        |
      | student40 | C1     | student        |
      | student41 | C1     | student        |
      | student42 | C1     | student        |
      | student43 | C1     | student        |
      | student44 | C1     | student        |
      | student45 | C1     | student        |
      | student46 | C1     | student        |
      | student47 | C1     | student        |
      | student48 | C1     | student        |
      | student49 | C1     | student        |
      | student50 | C1     | student        |
      | student51 | C1     | student        |
      | student52 | C1     | student        |
      | student53 | C1     | student        |
      | student54 | C1     | student        |
      | student55 | C1     | student        |
      | student56 | C1     | student        |
      | student57 | C1     | student        |
      | student58 | C1     | student        |
      | student59 | C1     | student        |
      | student60 | C1     | student        |
      | student61 | C1     | student        |
      | student62 | C1     | student        |
      | student63 | C1     | student        |
      | student64 | C1     | student        |
      | student65 | C1     | student        |
      | student66 | C1     | student        |
      | student67 | C1     | student        |
      | student68 | C1     | student        |
      | student69 | C1     | student        |
      | student70 | C1     | student        |
      | student71 | C1     | student        |
      | student72 | C1     | student        |
      | student73 | C1     | student        |
      | student74 | C1     | student        |
      | student75 | C1     | student        |
    And the following "groups" exist:
      | name    | course | idnumber |
      | Group 1 | C1     | G1       |
    And the following "group members" exist:
      | user     | group |
      | student22 | G1    |
      | student30 | G1    |
      | student31 | G1    |
      | student32 | G1    |
      | student33 | G1    |
      | student34 | G1    |
      | student35 | G1    |
      | student36 | G1    |
      | student37 | G1    |
      | student38 | G1    |
      | student39 | G1    |
      | student40 | G1    |
      | student41 | G1    |
      | student42 | G1    |
      | student43 | G1    |
      | student44 | G1    |
      | student45 | G1    |
      | student46 | G1    |
      | student47 | G1    |
      | student48 | G1    |
      | student49 | G1    |
      | student50 | G1    |
    And the following "activities" exist:
      | activity | name     | course | idnumber | introformat | groupmode |
      | feedback | Feedback | C1     | feedback | 1           | 1         |
    And the following "mod_feedback > questions" exist:
      | activity | name     |
      | feedback | Question |
    And the following "mod_feedback > responses" exist:
      | activity | user      | Question           | anonymous | responsenumber |
      | feedback | student01 | student01 response | 0         | 0              |
      | feedback | student02 | student02 response | 0         | 0              |
      | feedback | student03 | student03 response | 0         | 0              |
      | feedback | student04 | student04 response | 0         | 0              |
      | feedback | student05 | student05 response | 0         | 0              |
      | feedback | student06 | student06 response | 0         | 0              |
      | feedback | student07 | student07 response | 0         | 0              |
      | feedback | student08 | student08 response | 0         | 0              |
      | feedback | student09 | student09 response | 0         | 0              |
      | feedback | student10 | student10 response | 0         | 0              |
      | feedback | student11 | student11 response | 0         | 0              |
      | feedback | student12 | student12 response | 0         | 0              |
      | feedback | student13 | student13 response | 0         | 0              |
      | feedback | student14 | student14 response | 0         | 0              |
      | feedback | student15 | student15 response | 0         | 0              |
      | feedback | student16 | student16 response | 0         | 0              |
      | feedback | student17 | student17 response | 0         | 0              |
      | feedback | student18 | student18 response | 0         | 0              |
      | feedback | student19 | student19 response | 0         | 0              |
      | feedback | student20 | student20 response | 0         | 0              |
      | feedback | student21 | student21 response | 0         | 0              |
      | feedback | student22 | student22 response | 1         | 22             |
      | feedback | student23 | student23 response | 1         | 23             |
      | feedback | student24 | student24 response | 1         | 24             |
      | feedback | student25 | student25 response | 1         | 25             |
      | feedback | student26 | student26 response | 1         | 26             |
      | feedback | student27 | student27 response | 1         | 27             |
      | feedback | student28 | student28 response | 1         | 28             |
      | feedback | student29 | student29 response | 1         | 29             |
      | feedback | student30 | student30 response | 1         | 30             |
      | feedback | student31 | student31 response | 1         | 31             |
      | feedback | student32 | student32 response | 1         | 32             |
      | feedback | student33 | student33 response | 1         | 33             |
      | feedback | student34 | student34 response | 1         | 34             |
      | feedback | student35 | student35 response | 1         | 35             |
      | feedback | student36 | student36 response | 1         | 36             |
      | feedback | student37 | student37 response | 1         | 37             |
      | feedback | student38 | student38 response | 1         | 38             |
      | feedback | student39 | student39 response | 1         | 39             |
      | feedback | student40 | student40 response | 1         | 40             |
      | feedback | student41 | student41 response | 1         | 41             |
      | feedback | student42 | student42 response | 1         | 42             |
      | feedback | student43 | student43 response | 1         | 43             |
      | feedback | student44 | student44 response | 1         | 44             |
      | feedback | student45 | student45 response | 1         | 45             |
      | feedback | student46 | student46 response | 1         | 46             |
      | feedback | student47 | student47 response | 1         | 47             |
      | feedback | student48 | student48 response | 1         | 48             |
      | feedback | student49 | student49 response | 1         | 49             |
      | feedback | student50 | student50 response | 1         | 50             |
      | feedback | student51 | student51 response | 1         | 51             |
      | feedback | student52 | student52 response | 1         | 52             |
      | feedback | student53 | student53 response | 1         | 53             |
      | feedback | student54 | student54 response | 1         | 54             |
      | feedback | student55 | student55 response | 1         | 55             |
      | feedback | student56 | student56 response | 1         | 56             |
      | feedback | student57 | student57 response | 1         | 57             |
      | feedback | student58 | student58 response | 1         | 58             |
      | feedback | student59 | student59 response | 1         | 59             |
      | feedback | student60 | student60 response | 1         | 60             |
      | feedback | student61 | student61 response | 1         | 61             |
      | feedback | student62 | student62 response | 1         | 62             |
      | feedback | student63 | student63 response | 1         | 63             |
      | feedback | student64 | student64 response | 1         | 64             |
      | feedback | student65 | student65 response | 1         | 65             |
      | feedback | student66 | student66 response | 1         | 66             |
      | feedback | student67 | student67 response | 1         | 67             |
      | feedback | student68 | student68 response | 1         | 68             |
      | feedback | student69 | student69 response | 1         | 69             |
      | feedback | student70 | student70 response | 1         | 70             |
      | feedback | student71 | student71 response | 1         | 71             |
      | feedback | student72 | student72 response | 1         | 72             |
      | feedback | student73 | student73 response | 1         | 73             |
      | feedback | student74 | student74 response | 1         | 74             |
      | feedback | student75 | student75 response | 1         | 75             |

  Scenario: Mobile navigation
    Given I entered the course "Course 1" as "teacher1" in the app

    # Preview
    When I press "Feedback" in the app
    And I press "Preview" in the app
    Then I should find "Anonymous" within "Mode" "ion-item" in the app

    # Analysis
    When I go back in the app
    And I press "Analysis" in the app
    Then I should find "student01 response" in the app
    And I should find "student75 response" in the app

    # All attempts
    When I press "Overview" in the app
    Then I should find "75" near "Submitted answers" in the app

    When I press "Submitted answers" in the app
    Then I should find "Non anonymous entries (21)" in the app
    And I should find "Student 01" in the app
    And I should find "Student 20" in the app
    But I should not find "Student 21" in the app
    And I should not find "Anonymous entries" in the app
    And I should not find "Response number: 22" in the app

    # All attempts — Infinite loading
    When I load more items in the app
    Then I should find "Student 21" in the app
    And I should find "Anonymous entries (54)" in the app
    And I should find "Response number: 22" in the app
    And I should find "Response number: 61" in the app
    But I should not find "Response number: 62" in the app

    When I load more items in the app
    Then I should find "Response number: 62" in the app
    And I should find "Response number: 75" in the app
    But I should not be able to load more items in the app

    # All attempts — Swipe
    When I press "Student 01" in the app
    Then I should find "student01 response" in the app

    When I swipe to the right in the app
    Then I should find "student01 response" in the app

    When I swipe to the left in the app
    Then I should find "student02 response" in the app

    When I swipe to the left in the app
    Then I should find "student03 response" in the app

    When I go back in the app
    And I press "Student 21" in the app
    And I swipe to the left in the app
    Then I should find "student22 response" in the app

    # By group
    When I go back 2 times in the app
    And I press "Separate groups" in the app
    And I press "Group 1" in the app
    Then I should find "22" near "Submitted answers" in the app

    When I press "Submitted answers" in the app
    Then I should find "Anonymous entries (22)" in the app
    And I should find "Response number: 22" in the app
    And I should find "Response number: 30" in the app
    And I should find "Response number: 48" in the app
    But I should not find "Response number: 23" in the app
    And I should not find "Response number: 49" in the app
    And I should not find "Non anonymous entries" in the app
    And I should not find "Student 01" in the app

    # By group — Infinite loading
    When I load more items in the app
    Then I should find "Response number: 49" in the app
    And I should find "Response number: 50" in the app
    But I should not find "Response number: 51" in the app
    And I should not find "Response number: 75" in the app
    And I should not be able to load more items in the app

    # By group — Swipe
    When I press "Response number: 22" in the app
    Then I should find "student22 response" in the app

    When I swipe to the right in the app
    Then I should find "student22 response" in the app

    When I swipe to the left in the app
    Then I should find "student30 response" in the app

    When I swipe to the left in the app
    Then I should find "student31 response" in the app

    # Reset group
    When I go back in the app
    When I press "Group 1" in the app
    And I press "All participants" in the app
    Then I should find "Non anonymous entries (21)" in the app
    And I should find "Student 01" in the app
    And I should find "Student 20" in the app
    But I should not find "Student 21" in the app
    And I should not find "Anonymous entries" in the app
    And I should not find "Response number: 22" in the app
    And the following events should have been logged for "teacher1" in the app:
      | name                                     | activity | activityname | course   |
      | \mod_feedback\event\course_module_viewed | feedback | Feedback     | Course 1 |

  Scenario: Tablet navigation
    Given I entered the course "Course 1" as "teacher1" in the app
    And I change viewport size to "1200x640" in the app

    # Preview
    When I press "Feedback" in the app
    And I press "Preview" in the app
    Then I should find "Anonymous" within "Mode" "ion-item" in the app

    # Analysis
    When I go back in the app
    And I press "Analysis" in the app
    Then I should find "student01 response" in the app
    And I should find "student75 response" in the app

    # All attempts
    When I press "Overview" in the app
    Then I should find "75" near "Submitted answers" in the app

    When I press "Submitted answers" in the app
    Then I should find "Non anonymous entries (21)" in the app
    And I should find "Student 01" in the app
    And I should find "Student 20" in the app
    And "Student 01" near "Student 02" should be selected in the app
    And I should find "student01 response" inside the split-view content in the app
    But I should not find "Student 21" in the app
    And I should not find "Anonymous entries" in the app
    And I should not find "Response number: 22" in the app

    # All attempts — Infinite loading
    When I load more items in the app
    Then I should find "Student 21" in the app
    And I should find "Anonymous entries (54)" in the app
    And I should find "Response number: 22" in the app
    And I should find "Response number: 61" in the app
    But I should not find "Response number: 62" in the app

    When I load more items in the app
    Then I should find "Response number: 62" in the app
    And I should find "Response number: 75" in the app
    But I should not be able to load more items in the app

    # All attempts — Split view
    When I press "Student 02" in the app
    Then "Student 02" near "Student 01" should be selected in the app
    And I should find "student02 response" inside the split-view content in the app

    When I press "Response number: 22" in the app
    Then "Response number: 22" near "Response number: 23" should be selected in the app
    And I should find "student22 response" inside the split-view content in the app

    # By group
    When I go back in the app
    And I press "Separate groups" in the app
    And I press "Group 1" in the app
    Then I should find "22" near "Submitted answers" in the app

    When I press "Submitted answers" in the app
    Then I should find "Anonymous entries (22)" in the app
    And I should find "Response number: 22" in the app
    And I should find "Response number: 30" in the app
    And I should find "Response number: 48" in the app
    And "Response number: 22" near "Response number: 30" should be selected in the app
    And I should find "student22 response" inside the split-view content in the app
    But I should not find "Response number: 23" in the app
    And I should not find "Response number: 49" in the app
    And I should not find "Non anonymous entries" in the app
    And I should not find "Student 01" in the app

    # By group — Infinite loading
    When I load more items in the app
    Then I should find "Response number: 49" in the app
    And I should find "Response number: 50" in the app
    But I should not find "Response number: 51" in the app
    And I should not find "Response number: 75" in the app
    And I should not be able to load more items in the app

    # By group — Split view
    When I press "Response number: 30" in the app
    Then "Response number: 30" near "Response number: 31" should be selected in the app
    And I should find "student30 response" inside the split-view content in the app

    # Reset group
    When I press "Group 1" in the app
    And I press "All participants" in the app
    Then I should find "Non anonymous entries (21)" in the app
    And I should find "Student 01" in the app
    And I should find "Student 20" in the app
    And I should find "student30 response" inside the split-view content in the app
    But I should not find "Student 21" in the app
    And I should not find "Anonymous entries" in the app
    And I should not find "Response number: 22" in the app

    When I press "Student 01" in the app
    And I press "All participants" in the app
    And I press "Group 1" in the app
    Then "Response number: 22" near "Response number: 30" should be selected in the app
    And I should find "student22 response" inside the split-view content in the app
