import { supabase } from '../index.js';
import { Test } from '../models/test.js';
import { Question } from '../models/question.js';
import { Choice } from '../models/choice.js';
import { createFullTestService, getFullTestService } from '../services/testService.js';

export async function createFullTestController(req, res) {
  try {
    const { title, description, questions } = req.body;
    const { test, questions: createdQuestions } = await createFullTestService({ title, description, questions });
    return res.status(201).json({
      message: 'Test created successfully',
      data: { test, questions: createdQuestions }
    });
  } catch (error) {
    if (
      error.message === 'Title is required' ||
      error.message === 'At least one question is required' ||
      error.message === 'Question content is required' ||
      error.message === 'Each question must have at least one choice' ||
      error.message === 'Choice content is required' ||
      error.message === 'Choice must have a valid is_correct boolean value'
    ) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating test:', error.message);
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
}

export async function getTestController(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Test ID is required' });
  }

  try {
    const test = await Test.findById(id);
    
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Get questions for the test
    const { data: questions } = await supabase
      .from('questions')
      .select('id, content')
      .eq('test_id', id);

    // Get choices for each question including is_correct field
    const questionsWithChoices = await Promise.all(questions.map(async (question) => {
      const { data: choices } = await supabase
        .from('choices')
        .select('id, content')
        .eq('question_id', question.id);

      return {
        ...question,
        choices: choices
      };
    }));

    return res.status(200).json({
      data: {
        test,
        questions: questionsWithChoices
      }
    });

  } catch (error) {
    console.error('Error fetching test:', error.message);
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
}

export async function submitTestController(req, res) {
  try {
    const { test_id, answers } = req.body;
    const user = req.user;

    // Validate user authentication
    if (!user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate required fields
    if (!test_id || !Array.isArray(answers)) {
      return res.status(400).json({ error: 'test_id and answers are required' });
    }

    // Validate test exists
    const test = await Test.findById(test_id);
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    let score = 0;
    const detailed = [];

    // Process each answer
    for (const { question_id, answer_id } of answers) {
      if (!question_id || !answer_id) {
        return res.status(400).json({ 
          error: 'Each answer must contain question_id and answer_id'
        });
      }

      try {
        const { data: correct, error } = await supabase
          .from('choices')
          .select('id')
          .eq('question_id', question_id)
          .eq('is_correct', true)
          .single();

        if (error) {
          console.error('Database error:', error);
          return res.status(500).json({ 
            error: 'Error checking answer correctness'
          });
        }

        const is_correct = correct.id === answer_id;
        if (is_correct) score++;
        detailed.push({ question_id, answer_id, is_correct });
      } catch (err) {
        console.error('Answer processing error:', err);
        return res.status(500).json({ 
          error: 'Error processing answer'
        });
      }
    }

    const total = answers.length;
    const percentage = (score / total) * 100;

    try {
      const { data: questions } = await supabase
        .from('questions')
        .select('id, content')
        .eq('test_id', test_id);

      const fullQuestions = await Promise.all(questions.map(async (q) => {
        const { data: choices, error } = await supabase
          .from('choices')
          .select('id, content, is_correct')
          .eq('question_id', q.id);

        if (error) {
          throw new Error('Error fetching choices');
        }

        const userAnswer = detailed.find(a => a.question_id === q.id);
        
        // Add is_answered only to the user's selected choice
        const processedChoices = choices.map(choice => {
          if (choice.id === userAnswer?.answer_id) {
            return { ...choice, is_answered: true };
          }
          return choice;
        });

        return {
          ...q,
          choices: processedChoices
        };
      }));

      // Save test result
      const { error: resultError } = await supabase
        .from('test_results')
        .insert({
          user_id: user.id,
          test_id: test_id,
          score: score,
          total: total,
          percentage: percentage,
          submitted_at: new Date().toISOString()
        });

      if (resultError) {
        console.error('Error saving test result:', resultError);
      }

      return res.status(200).json({
        message: 'Test submitted successfully',
        result: {
          score,
          total,
          percentage,
          test,
          questions: fullQuestions
        }
      });

    } catch (err) {
      console.error('Error processing test results:', err);
      return res.status(500).json({ 
        error: 'Error processing test results'
      });
    }

  } catch (err) {
    console.error('Submit test error:', err);
    return res.status(500).json({ 
      error: 'Error submitting test'
    });
  }
}

export async function addQuestionsController(req, res) {
  const { test_id, questions } = req.body;

  if (!test_id || !Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'test_id and questions are required' });
  }

  try {
    const createdQuestions = [];

    for (const q of questions) {
      if (!q.content || !Array.isArray(q.choices) || q.choices.length === 0) continue;

      const newQuestion = await Question.create({
        test_id,
        content: q.content
      });

      const questionId = newQuestion.id;

      for (const choice of q.choices) {
        if (!choice.content || typeof choice.is_correct !== 'boolean') continue;

        await Choice.create({
          question_id: questionId,
          content: choice.content,
          is_correct: choice.is_correct
        });
      }

      createdQuestions.push(newQuestion);
    }

    return res.status(201).json({
      message: 'New questions added successfully',
      data: createdQuestions
    });
  } catch (error) {
    console.error('Error adding questions:', error.message);
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
}

export async function updateQuestionsController(req, res) {
  const { questions } = req.body;

  // Validate questions array
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ error: 'At least one question is required' });
  }

  try {
    const updatedQuestions = [];

    // Update each question and its choices
    for (const q of questions) {
      // Validate question data
      if (!q.id || !q.content || q.content.trim() === '') {
        return res.status(400).json({ error: 'Question ID and content are required for each question' });
      }

      if (!Array.isArray(q.choices)) {
        return res.status(400).json({ error: 'Choices must be an array for each question' });
      }

      // Verify the question exists
      const existingQuestion = await Question.findById(q.id);
      if (!existingQuestion) {
        return res.status(404).json({ error: `Question with ID ${q.id} not found` });
      }

      // Update the question
      const updatedQuestion = await Question.update(q.id, {
        content: q.content
      });

      // Update choices
      const updatedChoices = [];
      for (const choice of q.choices) {
        if (!choice.id) {
          return res.status(400).json({ error: 'Choice ID is required. Creating new choices is not allowed.' });
        }
        if (!choice.content || choice.content.trim() === '') {
          return res.status(400).json({ error: 'Choice content is required' });
        }
        if (typeof choice.is_correct !== 'boolean') {
          return res.status(400).json({ error: 'Choice must have a valid is_correct boolean value' });
        }

        // Update existing choice
        const updatedChoice = await Choice.update(choice.id, {
          content: choice.content,
          is_correct: choice.is_correct
        });
        updatedChoices.push(updatedChoice);
      }

      updatedQuestions.push({
        ...updatedQuestion,
        choices: updatedChoices
      });
    }

    return res.status(200).json({
      message: 'Questions updated successfully',
      data: updatedQuestions
    });
  } catch (error) {
    console.error('Error updating questions:', error.message);
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
}

export async function deleteQuestionController(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Question ID is required' });
  }

  try {
    // Verify the question exists
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Get choices before deletion for verification
    const { data: choicesBefore } = await supabase
      .from('choices')
      .select('id')
      .eq('question_id', id);

    // Delete the question
    await Question.delete(id);

    // Verify choices were deleted
    const { data: choicesAfter } = await supabase
      .from('choices')
      .select('id')
      .eq('question_id', id);

    // Log deletion results for monitoring
    console.log(`Deleted question ${id} with ${choicesBefore?.length || 0} choices`);
    if (choicesAfter?.length > 0) {
      console.warn(`Warning: ${choicesAfter.length} choices remain after question deletion`);
      
      // Clean up any remaining choices manually
      const { error: cleanupError } = await supabase
        .from('choices')
        .delete()
        .eq('question_id', id);
        
      if (cleanupError) {
        console.error('Error cleaning up choices:', cleanupError);
      }
    }

    return res.status(200).json({
      message: 'Question and associated choices deleted successfully',
      deletedChoices: choicesBefore?.length || 0
    });
  } catch (error) {
    console.error('Error deleting question:', error.message);
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
}

export async function getFullTestController(req, res) {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Test ID is required' });
  }

  try {
    const fullTest = await getFullTestService(id);
    return res.status(200).json({
      message: 'Test retrieved successfully',
      data: fullTest
    });
  } catch (error) {
    if (error.message === 'Test not found') {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error retrieving test:', error);
    return res.status(500).json({ error: 'Internal server error', detail: error.message });
  }
}