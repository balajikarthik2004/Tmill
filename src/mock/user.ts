/**
 * The signed-in user.
 *
 * One record, read by the header chip and by the copilot when it greets - so
 * the person the app says is signed in is the person the assistant addresses.
 */
export interface CurrentUser {
  name: string
  /** What the copilot calls them in conversation. */
  firstName: string
  initials: string
  email: string
}

export const currentUser: CurrentUser = {
  name: 'Hari Thiagarajan',
  firstName: 'Hari',
  initials: 'HT',
  email: 'hari.thiagarajan@gmail.com',
}
