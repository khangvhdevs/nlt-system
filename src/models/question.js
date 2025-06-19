import { supabase } from '../index.js';

export class Question {
  static fields = ['id', 'test_id', 'content'];

  static async findById(id) {
    const { data, error } = await supabase
      .from('questions')
      .select(Question.fields.join(','))
      .eq('id', id)
      .single();
    if (error) {
      // Supabase error code for no rows found is 'PGRST116' or message includes 'No rows'
      if (error.code === 'PGRST116' || error.message?.toLowerCase().includes('no rows')) {
        return null;
      }
      throw error;
    }
    return data;
  }

  static async create(questionData) {
    const validData = Question.pickValidFields(questionData, ['test_id', 'content']);
    if (!validData.test_id || !validData.content) {
      throw new Error('test_id and content are required');
    }

    const { data, error } = await supabase
      .from('questions')
      .insert([validData])
      .select(Question.fields.join(','))
      .single();
    if (error) throw error;
    return data;
  }

  static async update(id, questionData) {
    const validData = Question.pickValidFields(questionData, ['content']);
    if (Object.keys(validData).length === 0) throw new Error('No valid fields to update');

    const { data, error } = await supabase
      .from('questions')
      .update(validData)
      .eq('id', id)
      .select(Question.fields.join(','))
      .single();
    if (error) throw error;
    return data;
  }

  static async delete(id) {
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }

  /**
   * Find all questions with their choices for a specific test
   * @param {string} testId - The ID of the test
   * @returns {Promise<Array>} Array of questions with their choices
   */
  static async findByTestIdWithChoices(testId) {
    const { data, error } = await supabase
      .from('questions')
      .select(`
        id,
        content,
        choices (
          id,
          content,
          is_correct
        )
      `)
      .eq('test_id', testId);

    if (error) throw error;
    return data;
  }

  static pickValidFields(data, allowedFields) {
    return Object.keys(data)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = data[key];
        return obj;
      }, {});
  }
}