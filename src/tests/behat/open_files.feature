@app @javascript
Feature: It opens files properly.

  Background:
    Given the following "users" exist:
      | username |
      | student1 |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
    And the following "activities" exist:
      | activity | name     | intro                | display | course | defaultfilename |
      | resource | Test TXT | Test TXT description | 5       | C1     | A txt.txt       |
      | resource | Test RTF | Test RTF description | 5       | C1     | A rtf.rtf       |
      | resource | Test DOC | Test DOC description | 5       | C1     | A doc.doc       |
    And the following config values are set as admin:
      | filetypeexclusionlist | rtf,doc | tool_mobile |

  Scenario: Open a file
    Given I entered the resource activity "Test TXT" on course "Course 1" as "student1" in the app
    When I press "Open" near "Last modified" in the app
    Then the app should have opened a browser tab with url "^blob:(first)?"

    When I switch to the browser tab opened by the app
    Then I should see "Test resource A txt.txt file"

    When I close the browser tab opened by the app
    And I press the back button in the app
    And I press "Test RTF" in the app
    And I press "Open" near "Last modified" in the app
    Then I should find "This file may not work as expected on this device" in the app

    When I press "Open file" in the app
    Then the app should have opened a browser tab with url "^blob:(second)?"

    When I switch to the browser tab opened by the app
    Then I should see "Test resource A rtf.rtf file"

    When I close the browser tab opened by the app
    And I press "Open" near "Last modified" in the app
    Then I should find "This file may not work as expected on this device" in the app

    When I select "Don't show again." in the app
    And I press "Open file" in the app
    Then the app should have opened a browser tab with url "^blob:(third)?"

    When I close the browser tab opened by the app
    And I press "Open" near "Last modified" in the app
    Then the app should have opened a browser tab with url "^blob:(fourth)?"

    When I close the browser tab opened by the app
    And I press the back button in the app
    And I press "Test DOC" in the app
    And I press "Open" in the app
    Then I should find "This file may not work as expected on this device" in the app
