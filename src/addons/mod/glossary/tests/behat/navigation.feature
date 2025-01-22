@addon_mod_glossary @app @mod @mod_glossary @javascript
Feature: Test glossary navigation

  Background:
    Given the following "users" exist:
      | username | firstname | lastname |
      | student1 | First     | Student  |
      | student2 | Second    | Student  |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
    And the following "activities" exist:
      | activity | name            | course | idnumber | displayformat |
      | glossary | Fruits glossary | C1     | glossary | entrylist     |
    And the following "mod_glossary > entries" exist:
      | glossary | concept | definition | user |
      | glossary | Acerola | Acerola is a fruit | student1 |
      | glossary | Apple | Apple is a fruit | student2 |
      | glossary | Apricots | Apricots are a fruit | student1 |
      | glossary | Avocado | Avocado is a fruit | student2 |
      | glossary | Banana | Banana is a fruit | student1 |
      | glossary | Blackberries | Blackberries is a fruit | student2 |
      | glossary | Blackcurrant | Blackcurrant is a fruit | student1 |
      | glossary | Blueberries | Blueberries is a fruit | student2 |
      | glossary | Breadfruit | Breadfruit is a fruit | student1 |
      | glossary | Cantaloupe | Cantaloupe is a fruit | student2 |
      | glossary | Carambola | Carambola is a fruit | student1 |
      | glossary | Cherimoya | Cherimoya is a fruit | student2 |
      | glossary | Cherries | Cherries is a fruit | student1 |
      | glossary | Clementine | Clementine is a fruit | student2 |
      | glossary | Coconut | Coconut is a fruit | student1 |
      | glossary | Cranberries | Cranberries is a fruit | student2 |
      | glossary | Date Fruit | Date Fruit is a fruit | student1 |
      | glossary | Durian | Durian is a fruit | student2 |
      | glossary | Elderberries | Elderberries is a fruit | student1 |
      | glossary | Feijoa | Feijoa is a fruit | student2 |
      | glossary | Figs | Figs is a fruit | student1 |
      | glossary | Gooseberries | Gooseberries are a fruit | student2 |
      | glossary | Grapefruit | Grapefruit is a fruit | student1 |
      | glossary | Grapes | Grapes are a fruit | student2 |
      | glossary | Guava | Guava is a fruit | student1 |
      | glossary | Honeydew Melon | Honeydew Melon is a fruit | student2 |
      | glossary | Jackfruit | Jackfruit is a fruit | student1 |
      | glossary | Java-Plum | Java-Plum is a fruit | student2 |
      | glossary | Jujube Fruit | Jujube Fruit is a fruit | student1 |
      | glossary | Kiwifruit | Kiwifruit is a fruit | student2 |
      | glossary | Kumquat | Kumquat is a fruit | student1 |
      | glossary | Lemon | Lemon is a fruit | student2 |
      | glossary | lime | lime is a fruit | student1 |
      | glossary | Lime | Lime is a fruit | student2 |
      | glossary | Longan | Longan is a fruit | student1 |
      | glossary | Loquat | Loquat is a fruit | student2 |
      | glossary | Lychee | Lychee is a fruit | student1 |
      | glossary | Mandarin | Mandarin is a fruit | student2 |
      | glossary | Mango | Mango is a fruit | student1 |
      | glossary | Mangosteen | Mangosteen is a fruit | student2 |
      | glossary | Mulberries | Mulberries are a fruit | student1 |
      | glossary | Nectarine | Nectarine is a fruit | student2 |
      | glossary | Olives | Olives are a fruit | student1 |
      | glossary | Orange | Orange is a fruit | student2 |
      | glossary | Papaya | Papaya is a fruit | student1 |
      | glossary | Passion Fruit | Passion Fruit is a fruit | student2 |
      | glossary | Peaches | Peaches is a fruit | student1 |
      | glossary | Pear | Pear is a fruit | student2 |
      | glossary | Persimmon | Persimmon is a fruit | student1 |
      | glossary | Pitaya | Pitaya is a fruit | student2 |
      | glossary | Pineapple | Pineapple is a fruit | student1 |
      | glossary | Pitanga | Pitanga is a fruit | student2 |
      | glossary | Plantain | Plantain is a fruit | student1 |
      | glossary | Plums | Plums are a fruit | student2 |
      | glossary | Pomegranate | Pomegranate is a fruit | student1 |
      | glossary | Prickly Pear | Prickly Pear is a fruit | student2 |
      | glossary | Prunes | Prunes is a fruit | student1 |
      | glossary | Pummelo | Pummelo is a fruit | student2 |
      | glossary | Quince | Quince is a fruit | student1 |
      | glossary | Raspberries | Raspberries are a fruit | student2 |
      | glossary | Rhubarb | Rhubarb is a fruit | student1 |
      | glossary | Rose-Apple | Rose-Apple is a fruit | student2 |
      | glossary | Sapodilla | Sapodilla is a fruit | student1 |
      | glossary | Sapote, Mamey | Sapote, Mamey is a fruit | student2 |
      | glossary | Soursop | Soursop is a fruit | student1 |
      | glossary | Strawberries | Strawberries is a fruit | student2 |
      | glossary | Tamarind | Tamarind is a fruit | student2 |
      | glossary | Tangerine | Tangerine is a fruit | student1 |
      | glossary | Watermelon | Watermelon is a fruit | student2 |

  Scenario: Mobile navigation on glossary
    Given I entered the course "Course 1" as "student1" in the app

    # Alphabetically
    When I press "Fruits glossary" in the app
    Then I should find "Acerola" in the app
    And I should find "Apple" in the app
    But I should not find "Honeydew Melon" in the app

    # Alphabetically — Infinite loading
    When I load more items in the app
    Then I should find "Honeydew Melon" in the app

    # Alphabetically — Swipe
    When I press "Acerola" in the app
    Then I should find "Acerola is a fruit" in the app

    When I swipe to the right in the app
    Then I should find "Acerola is a fruit" in the app

    When I swipe to the left in the app
    Then I should find "Apple is a fruit" in the app

    When I swipe to the left in the app
    Then I should find "Apricots are a fruit" in the app

    # By author
    When I go back in the app
    And I scroll to "Acerola" in the app
    And I press "Browse entries" in the app
    And I press "Group by author" in the app
    Then I should find "First Student" in the app
    And I should find "Acerola" in the app
    And I should find "Apricots" in the app
    But I should not find "Second Student" in the app
    And I should not find "Apple" in the app

    # By author — Infinite loading
    When I load more items in the app
    Then I should find "Second Student" in the app
    And I should find "Apple" in the app

    # By author — Swipe
    When I press "Acerola" in the app
    Then I should find "Acerola is a fruit" in the app

    When I swipe to the right in the app
    Then I should find "Acerola is a fruit" in the app

    When I swipe to the left in the app
    Then I should find "Apricots are a fruit" in the app

    When I swipe to the left in the app
    Then I should find "Banana is a fruit" in the app

    # Search
    When I go back in the app
    And I scroll to "Acerola" in the app
    And I press "Search" in the app
    And I set the field "Enter your search query" to "something" in the app
    And I press enter
    Then I should find "No entries were found." in the app

    When I set the field "Enter your search query" to "melon" in the app
    And I press enter
    Then I should find "Honeydew Melon" in the app
    And I should find "Watermelon" in the app
    But I should not find "Acerola" in the app

    # Search — Swipe
    When I press "Honeydew Melon" in the app
    Then I should find "Honeydew Melon is a fruit" in the app

    When I swipe to the right in the app
    Then I should find "Honeydew Melon is a fruit" in the app

    When I swipe to the left in the app
    Then I should find "Watermelon is a fruit" in the app

    When I swipe to the left in the app
    Then I should find "Watermelon is a fruit" in the app

    # Offline
    When I go back in the app
    And I press "Clear search" in the app
    And I press "Add a new entry" in the app
    And I switch network connection to offline
    And I set the following fields to these values in the app:
      | Concept | Tomato |
      | Definition | Tomato is a fruit |
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the following fields to these values in the app:
      | Concept | Cashew |
      | Definition | Cashew is a fruit |
    And I press "Save" in the app
    Then I should find "Entries to be synced" in the app
    And I should find "Tomato" in the app
    And I should find "Cashew" in the app

    # Offline — Swipe
    When I press "Cashew" in the app
    Then I should find "Cashew is a fruit" in the app

    When I swipe to the right in the app
    Then I should find "Cashew is a fruit" in the app

    When I swipe to the left in the app
    Then I should find "Tomato is a fruit" in the app

    When I swipe to the left in the app
    Then I should find "Acerola is a fruit" in the app

    # Edit
    When I swipe to the right in the app
    And I press "Edit entry" in the app
    And I press "Save" in the app
    Then I should find "Tomato is a fruit" in the app

    When I go back in the app
    Then I should find "Tomato" in the app
    And I should find "Cashew" in the app
    And I should find "Acerola" in the app

  Scenario: Tablet navigation on glossary
    Given I entered the course "Course 1" as "student1" in the app
    And I change viewport size to "1200x640" in the app

    # Alphabetically
    When I press "Fruits glossary" in the app
    Then I should find "Acerola" in the app
    And I should find "Apple" in the app
    And "Acerola" near "Apple" should be selected in the app
    And I should find "Acerola is a fruit" inside the split-view content in the app
    But I should not find "Honeydew Melon" in the app

    # Alphabetically — Infinite loading
    When I load more items in the app
    Then I should find "Honeydew Melon" in the app

    # Alphabetically — Split view
    When I press "Apple" in the app
    Then "Apple" near "Acerola" should be selected in the app
    And I should find "Apple is a fruit" inside the split-view content in the app

    When I press "Honeydew Melon" in the app
    Then "Honeydew Melon" near "Guava" should be selected in the app
    And I should find "Honeydew Melon is a fruit" inside the split-view content in the app

    # By author
    When I press "Apple" in the app
    When I scroll to "Apple" in the app
    And I press "Browse entries" in the app
    And I press "Group by author" in the app
    Then I should find "First Student" in the app
    And I should find "Acerola" in the app
    And I should find "Apricots" in the app
    And "Acerola" near "Apricots" should be selected in the app
    And I should find "Acerola is a fruit" inside the split-view content in the app
    But I should not find "Second Student" in the app
    And I should not find "Apple" in the app

    # By author — Infinite loading
    When I load more items in the app
    Then I should find "Second Student" in the app
    And I should find "Apple" in the app

    # By author — Split view
    When I press "Apricots" in the app
    And "Apricots" near "Acerola" should be selected in the app
    And I should find "Apricots are a fruit" inside the split-view content in the app

    When I press "Apple" in the app
    And "Apple" near "Persimmon" should be selected in the app
    And I should find "Apple is a fruit" inside the split-view content in the app

    # Search
    When I press "Search" in the app
    And I set the field "Enter your search query" to "something" in the app
    And I press enter
    Then I should find "No entries were found." in the app

    When I set the field "Enter your search query" to "melon" in the app
    And I press enter
    Then I should find "Honeydew Melon" in the app
    And I should find "Watermelon" in the app
    And "Honeydew Melon" near "Watermelon" should be selected in the app
    And I should find "Honeydew Melon is a fruit" inside the split-view content in the app
    But I should not find "Acerola" in the app

    # Search — Split view
    When I press "Watermelon" in the app
    Then "Watermelon" near "Honeydew Melon" should be selected in the app
    And I should find "Watermelon is a fruit" inside the split-view content in the app

    # Offline
    When I press "Clear search" in the app
    And I press "Add a new entry" in the app
    And I switch network connection to offline
    And I set the following fields to these values in the app:
      | Concept | Tomato |
      | Definition | Tomato is a fruit |
    And I press "Save" in the app
    And I press "Add a new entry" in the app
    And I set the following fields to these values in the app:
      | Concept | Cashew |
      | Definition | Cashew is a fruit |
    And I press "Save" in the app
    Then I should find "Entries to be synced" in the app
    And I should find "Tomato" in the app
    And I should find "Cashew" in the app

    # Offline — Split view
    When I press "Cashew" in the app
    Then "Cashew" near "Tomato" should be selected in the app
    And I should find "Cashew is a fruit" inside the split-view content in the app

    When I press "Tomato" in the app
    Then "Tomato" near "Cashew" should be selected in the app
    And I should find "Tomato is a fruit" inside the split-view content in the app

    When I press "Acerola" in the app
    Then "Acerola" near "Tomato" should be selected in the app
    And I should find "Acerola is a fruit" inside the split-view content in the app

    # Edit
    When I press "Tomato" in the app
    And I press "Edit entry" in the app
    And I press "Save" in the app
    Then I should find "Tomato is a fruit" inside the split-view content in the app
    And I should find "Tomato" in the app
    And I should find "Cashew" in the app
    And I should find "Acerola" in the app
