import Mixpanel from '@/lib/mixpanel';
import { EVENTS, USER_PROPERTIES } from './events';

// Track lesson start with all context
export const trackLessonStart = ({
  lessonId,
  lessonTitle,
  category,
  moduleNumber,
  lessonNumber,
  coachingStyle,
  isFirstLesson = false
}) => {
  Mixpanel.track(EVENTS.LESSON_STARTED, {
    lesson_id: lessonId,
    lesson_title: lessonTitle,
    category,
    module_number: moduleNumber,
    lesson_number: lessonNumber,
    coaching_style: coachingStyle,
    is_first_lesson: isFirstLesson
  });
};

// Track lesson completion
export const trackLessonCompletion = ({
  lessonId,
  lessonTitle,
  category,
  moduleNumber,
  lessonNumber,
  coachingStyle,
  overallScore,
  passed,
  attempts,
  totalTime,
  transcriptWordCount,
  fillerWordsCount
}) => {
  Mixpanel.track(EVENTS.LESSON_COMPLETED, {
    lesson_id: lessonId,
    lesson_title: lessonTitle,
    category,
    module_number: moduleNumber,
    lesson_number: lessonNumber,
    coaching_style: coachingStyle,
    overall_score: overallScore,
    passed,
    attempts,
    total_time_seconds: totalTime,
    transcript_word_count: transcriptWordCount,
    filler_words_count: fillerWordsCount
  });
};

// Track recording behavior
export const trackRecordingStart = ({ lessonId, attemptNumber, coachingStyle }) => {
  Mixpanel.timeEvent(EVENTS.RECORDING_STOPPED);
  Mixpanel.track(EVENTS.RECORDING_STARTED, {
    lesson_id: lessonId,
    attempt_number: attemptNumber,
    coaching_style: coachingStyle
  });
};

export const trackRecordingStop = ({ lessonId, duration, tooShort, tooLong }) => {
  Mixpanel.track(EVENTS.RECORDING_STOPPED, {
    lesson_id: lessonId,
    duration_seconds: duration,
    too_short: tooShort,
    too_long: tooLong
  });
};

// Track audio submission
export const trackAudioSubmission = ({
  lessonId,
  coachingStyle,
  duration,
  attemptNumber,
  fileSize
}) => {
  Mixpanel.track(EVENTS.AUDIO_SUBMITTED, {
    lesson_id: lessonId,
    coaching_style: coachingStyle,
    duration_seconds: duration,
    attempt_number: attemptNumber,
    file_size_bytes: fileSize
  });
};

// Track feedback interaction
export const trackFeedbackViewed = ({ lessonId, overallScore, passed, timeToView }) => {
  Mixpanel.track(EVENTS.FEEDBACK_VIEWED, {
    lesson_id: lessonId,
    overall_score: overallScore,
    passed,
    time_to_view_seconds: timeToView
  });
};

// Track navigation
export const trackNavigation = ({ fromPage, toPage }) => {
  Mixpanel.track('Navigation', {
    from_page: fromPage,
    to_page: toPage
  });
};

// Track errors
export const trackError = ({ errorType, errorMessage, context = {} }) => {
  Mixpanel.track(EVENTS.ERROR_OCCURRED, {
    error_type: errorType,
    error_message: errorMessage,
    ...context
  });
};

// Update user properties
export const updateUserProperties = (properties) => {
  Mixpanel.people.set(properties);
};

// Increment counters
export const incrementUserProperty = (property, amount = 1) => {
  Mixpanel.people.increment(property, amount);
};