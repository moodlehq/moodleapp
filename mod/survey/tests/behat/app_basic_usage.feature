@mod @mod_survey @app @javascript
Feature: Test basic usage in app
  In order to participate in surveys while using the mobile app
  As a student
  I need basic forum functionality to work

  Background:
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "users" exist:
      | username |
      | student1 |
      | teacher1 |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity   | name            | intro       | course | idnumber | groupmode |
      | survey      | Test survey name | Test survey  | C1     | survey    | 0         | 

  @Mobile @3.8.0 @OK
  Scenario: Student answer a survey and see results
  When I enter the app
  And I log in as "student1"
  And I press "Course 1" near "Course overview" in the app
  And I press "Test survey name" in the app
  And I press "Choose" near "1. In evaluating what someone says, I focus on the quality of their argument, not on the person who's presenting it." in the app
  And I press "Strongly agree" in the app
  And I press "Choose" near "2. I like playing devil's advocate - arguing the opposite of what someone is saying." in the app
  And I press "Strongly disagree" in the app
  And I press "Choose" near "3. I like to understand where other people are 'coming from', what experiences have led them to feel the way they do." in the app
  And I press "Somewhat agree" in the app
  And I press "Choose" near "4. The most important part of my education has been learning to understand people who are very different to me." in the app
  And I press "Somewhat disagree" in the app
  And I press "Choose" near "5. I feel that the best way for me to achieve my own identity is to interact with a variety of other people." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Choose" near "6. I enjoy hearing the opinions of people who come from backgrounds different to mine - it helps me to understand how the same things can be seen in such different ways." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Choose" near "7. I find that I can strengthen my own position through arguing with someone who disagrees with me." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Choose" near "8. I am always interested in knowing why people say and believe the things they do." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Choose" near "9. I often find myself arguing with the authors of books that I read, trying to logically figure out why they're wrong." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Choose" near "10. It's important for me to remain as objective as possible when I analyze something." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Choose" near "11. I try to think with people instead of against them." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Choose" near "12. I have certain criteria I use in evaluating arguments." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Choose" near "13. I'm more likely to try to understand someone else's opinion than to try to evaluate it." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Choose" near "14. I try to point out weaknesses in other people's thinking to help them clarify their arguments." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Choose" near "15. I tend to put myself in other people's shoes when discussing controversial issues, to see why they think the way they do." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Choose" near "16. One could call my way of analysing things 'putting them on trial' because I am careful to consider all the evidence." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Choose" near "17. I value the use of logic and reason over the incorporation of my own concerns when solving problems." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Choose" near "18. I can obtain insight into opinions that differ from mine through empathy." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Choose" near "19. When I encounter people whose opinions seem alien to me, I make a deliberate effort to 'extend' myself into that person, to try to see how they could have those opinions." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Choose" near "20. I spend time figuring out what's 'wrong' with things. For example, I'll look for something in a literary interpretation that isn't argued well enough." in the app
  And I press "Somewhat agree" near "Neither agree nor disagree" in the app
  And I press "Submit" in the app 
  And I press "OK" in the app
  And I press "open" in the app
  And I switch to the browser tab opened by the app
  And I log in as "student1"
  Then I should see "You've completed this survey.  The graph below shows a summary of your results compared to the class averages."
  And I should see "1 people have completed this survey so far"

  @Tablet @3.8.0
  Scenario: Student answer a survey and see results tablet
  When I enter the app
  And I change viewport size to "1280x1080"
  And I log in as "student1"
  And I press "Course 1" near "Course overview" in the app
  And I press "Test survey name" in the app
  And I pause
	

