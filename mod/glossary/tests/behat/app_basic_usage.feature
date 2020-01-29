@mod @mod_glossary @app @javascript
Feature: Test basic usage of glossary in app
  In order to participate in the glossaries while using the mobile app
  As a student
  I need basic glossary functionality to work

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email |
      | teacher1 | Teacher | teacher | teacher1@example.com |
      | student1 | Student | student | student1@example.com |

    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1 | 0 |

    And the following "course enrolments" exist:
      | user | course | role |
      | teacher1 | C1 | editingteacher |
      | student1 | C1 | student |

    And the following "activities" exist:
      | activity | name          | intro                | course | idnumber  |
      | glossary | Test glossary | glossary description | C1     | gloss1    |

  @app @3.8.0 @OK
  Scenario: View a glossary and its terms
  When I enter the app
  And I log in as "student1"
  Then the header should be "Acceptance test site" in the app 
  And I should see "Course 1"
  And I press "Course 1" near "Recently accessed courses" in the app
  Then the header should be "Course 1" in the app
  And I press "Test glossary" in the app
  And I press "close" in the app
  And I set the field "Concept" to "potato" in the app
  And I set the field "Definition" to "The potato is a root vegetable native to the Americas, a starchy tuber of the plant Solanum tuberosum, and the plant itself, a perennial in the family Solanaceae." in the app
  And I press "Save" in the app
  And I press "close" in the app
  And I set the field "Concept" to "car" in the app
  And I set the field "Definition" to "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods." in the app
  And I press "Save" in the app
  And I press "close" in the app
  And I set the field "Concept" to "mountain" in the app
  And I set the field "Definition" to "A mountain is a large landform that rises above the surrounding land in a limited area, usually in the form of a peak." in the app
  And I press "Save" in the app
  Then the header should be "Test glossary" in the app 
  And I should see "car"
  And I should see "mountain"
  And I should see "potato"
  And I press "car" in the app
  Then I should see "car"
  And I should see "A car (or automobile) is a wheeled motor vehicle used for transportation. Most definitions of cars say that they run primarily on roads, seat one to eight people, have four tires, and mainly transport people rather than goods."