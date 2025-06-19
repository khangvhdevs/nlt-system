import { Test } from '../models/test.js';
import { Question } from '../models/question.js';
import { Choice } from '../models/choice.js';
import { supabase } from '../index.js';

/**
 * Handles the creation of a full test, including questions and choices.
 * @param {Object} testData - The test data containing title, description, and questions.
 * @returns {Promise<{test: Object, questions: Object[]}>}
 * @throws {Error} Throws error if creation fails or validation fails.
 */
export async function createFullTestService(testData) {
  const { title, description, questions } = testData;

  // Validate title
  if (!title || title.trim() === '') {
    throw new Error('Title is required');
  }

  // Validate questions array
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('At least one question is required');
  }

  // Validate each question
  for (const question of questions) {
    if (!question.content || question.content.trim() === '') {
      throw new Error('Question content is required');
    }
    if (!Array.isArray(question.choices) || question.choices.length === 0) {
      throw new Error('Each question must have at least one choice');
    }
    for (const choice of question.choices) {
      if (!choice.content || choice.content.trim() === '') {
        throw new Error('Choice content is required');
      }
      if (typeof choice.is_correct !== 'boolean') {
        throw new Error('Choice must have a valid is_correct boolean value');
      }
    }
  }

  // Create the test
  const newTest = await Test.create({ title, description });
  const testId = newTest.id;
  const createdQuestions = [];

  // Create questions and choices
  for (const q of questions) {
    const newQuestion = await Question.create({
      test_id: testId,
      content: q.content
    });
    const questionId = newQuestion.id;
    for (let i = 0; i < q.choices.length; i++) {
      const choice = q.choices[i];
      await Choice.create({
        question_id: questionId,
        content: choice.content,
        is_correct: choice.is_correct
      });
    }
    createdQuestions.push(newQuestion);
  }

  return { test: newTest, questions: createdQuestions };
}

/**
 * Get full test data including all questions and choices
 * @param {string} testId - The ID of the test to retrieve
 * @returns {Promise<Object>} Test object with questions and choices
 * @throws {Error} If test not found or other errors occur
 */
export async function getFullTestService(testId) {
  try {
    // Get test basic info
    const test = await Test.findById(testId);
    if (!test) {
      throw new Error('Test not found');
    }

    // Get questions with choices using the model method
    const questions = await Question.findByTestIdWithChoices(testId);

    // Format the response
    const fullTest = {
      ...test,
      questions: questions.map(question => ({
        id: question.id,
        content: question.content,
        choices: question.choices
      }))
    };

    return fullTest;
  } catch (error) {
    throw new Error(`Error getting full test: ${error.message}`);
  }
}
