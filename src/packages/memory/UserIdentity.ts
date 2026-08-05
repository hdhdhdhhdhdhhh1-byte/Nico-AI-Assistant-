import { UserProfile } from "./UserProfile";

/**
 * User Identity Layer.
 * Provides guest / registered user semantics on top of UserProfile.
 * Guests get a temporary id and volatile memory; registered users get
 * durable memory and personal settings that survive sessions.
 */
export class UserIdentity {
  constructor(readonly profile: UserProfile) {}

  isGuest(): boolean {
    return this.profile.data.isGuest;
  }

  guestId(): string {
    return this.profile.data.id;
  }

  register(name?: string) {
    this.profile.register(name);
  }

  signOut() {
    this.profile.reset();
  }
}
