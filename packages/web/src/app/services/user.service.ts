import { Injectable, inject, signal } from '@angular/core';
import {
  Firestore,
  deleteField,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import {
  Storage,
  ref,
  uploadBytes,
  getDownloadURL,
} from '@angular/fire/storage';
import { Auth, User } from '@angular/fire/auth';
import type { HomePort, UserProfile } from '@bwfish/core';

type UserProfileUpdate = Partial<
  Pick<UserProfile, 'displayName' | 'photoUrl' | 'boat' | 'website'>
> & {
  homePort?: HomePort | null;
};

@Injectable({ providedIn: 'root' })
export class UserService {
  private fs = inject(Firestore);
  private storage = inject(Storage);
  private auth = inject(Auth);

  profile = signal<UserProfile | null>(null);

  clearProfile() {
    this.profile.set(null);
  }

  async ensureProfile(firebaseUser: User): Promise<UserProfile> {
    const docRef = doc(this.fs, 'users', firebaseUser.uid);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const profile = snap.data() as UserProfile;
      this.profile.set(profile);
      return profile;
    }

    const profile: UserProfile = {
      uid: firebaseUser.uid,
      displayName:
        firebaseUser.displayName?.trim() ||
        firebaseUser.email?.split('@')[0] ||
        'Angler',
      ...(firebaseUser.photoURL ? { photoUrl: firebaseUser.photoURL } : {}),
    };

    await setDoc(docRef, profile);
    this.profile.set(profile);
    return profile;
  }

  async getById(uid: string): Promise<UserProfile | null> {
    const snap = await getDoc(doc(this.fs, 'users', uid));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  }

  async update(updates: UserProfileUpdate): Promise<UserProfile> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Must be signed in to update profile');

    const docRef = doc(this.fs, 'users', user.uid);
    const payload: Record<string, unknown> = {
      location: deleteField(),
    };

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      payload[key] = key === 'homePort' && value === null ? deleteField() : value;
    }

    await updateDoc(docRef, payload);

    const snap = await getDoc(docRef);
    const profile = snap.data() as UserProfile;
    this.profile.set(profile);
    return profile;
  }

  async uploadAvatar(file: File): Promise<string> {
    const user = this.auth.currentUser;
    if (!user) throw new Error('Must be signed in to upload an avatar');

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const storageRef = ref(this.storage, `avatars/${user.uid}/avatar.${ext}`);

    await uploadBytes(storageRef, file, { contentType: file.type });
    return getDownloadURL(storageRef);
  }
}
