/**
 * Route map: matches original HTML pages to React routes.
 * Keep route paths stable and readable.
 * Original .html files map as:
 *   index.html -> /
 *   read and select.html -> /read-and-select
 *   etc.
 */
export const ROUTES = {
  HOME: '/',
  READ_AND_SELECT: '/read-and-select',
  FILL_IN_THE_BLANKS: '/fill-in-the-blanks',
  READ_AND_COMPLETE: '/read-and-complete',
  LISTEN_AND_TYPE: '/listen-and-type',
  WRITE_ABOUT_THE_PHOTO: '/write-about-the-photo',
  SPEAK_ABOUT_THE_PHOTO: '/speak-about-the-photo',
  READ_THEN_SPEAK: '/read-then-speak',
  INTERACTIVE_READING: '/interactive-reading',
  INTERACTIVE_LISTENING: '/interactive-listening',
  WRITING_SAMPLE: '/writing-sample',
  SPEAKING_SAMPLE: '/speaking-sample',
}

/** Ordered list for "next quiz" navigation (same order as skills-config SKILLS_ORDER) */
export const QUIZ_ROUTE_ORDER = [
  ROUTES.READ_AND_SELECT,
  ROUTES.FILL_IN_THE_BLANKS,
  ROUTES.READ_AND_COMPLETE,
  ROUTES.LISTEN_AND_TYPE,
  ROUTES.WRITE_ABOUT_THE_PHOTO,
  ROUTES.SPEAK_ABOUT_THE_PHOTO,
  ROUTES.READ_THEN_SPEAK,
  ROUTES.INTERACTIVE_READING,
  ROUTES.INTERACTIVE_LISTENING,
  ROUTES.WRITING_SAMPLE,
  ROUTES.SPEAKING_SAMPLE,
]

export default ROUTES
