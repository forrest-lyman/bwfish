import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Port, Region } from '@bwfish/core';
import { Layout } from '../../components/layout/layout';
import { AuthService } from '../../services/auth.service';
import { PortService } from '../../services/port.service';
import { RegionService } from '../../services/region.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [Layout, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  auth = inject(AuthService);
  userService = inject(UserService);
  private regionService = inject(RegionService);
  private portService = inject(PortService);

  regions = signal<Region[]>([]);
  ports = signal<Port[]>([]);
  avatarFile = signal<File | null>(null);
  avatarPreview = signal<string | null>(null);
  saving = signal(false);
  error = signal<string | null>(null);
  saved = signal(false);

  form = new FormGroup({
    displayName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(100)],
    }),
    boat: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(120)] }),
    regionId: new FormControl('', { nonNullable: true }),
    portId: new FormControl({ value: '', disabled: true }, { nonNullable: true }),
    website: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2048)] }),
  });

  constructor() {
    effect(() => {
      const profile = this.userService.profile();
      if (!profile || this.avatarFile()) return;

      void this.applyProfile(profile);
    });
  }

  async ngOnInit() {
    this.regions.set(await this.regionService.getAll());

    this.form.controls.regionId.valueChanges.subscribe((regionId) => {
      void this.onRegionChange(regionId);
    });
  }

  private async applyProfile(profile: NonNullable<ReturnType<typeof this.userService.profile>>) {
    this.form.patchValue(
      {
        displayName: profile.displayName,
        boat: profile.boat ?? '',
        website: profile.website ?? '',
        regionId: profile.homePort?.regionId ?? '',
      },
      { emitEvent: false }
    );

    if (profile.homePort?.regionId) {
      await this.loadPorts(profile.homePort.regionId);
      this.form.controls.portId.enable({ emitEvent: false });
      this.form.controls.portId.setValue(profile.homePort.portId, { emitEvent: false });
    } else {
      this.ports.set([]);
      this.form.controls.portId.reset('', { emitEvent: false });
      this.form.controls.portId.disable({ emitEvent: false });
    }

    this.avatarPreview.set(profile.photoUrl ?? null);
  }

  private async onRegionChange(regionId: string) {
    this.form.controls.portId.reset('', { emitEvent: false });

    if (!regionId) {
      this.ports.set([]);
      this.form.controls.portId.disable({ emitEvent: false });
      return;
    }

    await this.loadPorts(regionId);
    this.form.controls.portId.enable({ emitEvent: false });
  }

  private async loadPorts(regionId: string) {
    this.ports.set(await this.portService.getByRegion(regionId));
  }

  initials() {
    const name =
      this.userService.profile()?.displayName ??
      this.auth.user()?.displayName ??
      this.auth.user()?.email ??
      '?';
    return name
      .split(' ')
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    this.avatarFile.set(file);
    this.avatarPreview.set(URL.createObjectURL(file));
    this.saved.set(false);
  }

  async save() {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.error.set(null);
    this.saved.set(false);

    try {
      const values = this.form.getRawValue();
      let photoUrl = this.userService.profile()?.photoUrl;

      const file = this.avatarFile();
      if (file) {
        photoUrl = await this.userService.uploadAvatar(file);
      }

      const homePort =
        values.regionId && values.portId
          ? { regionId: values.regionId, portId: values.portId }
          : null;

      await this.userService.update({
        displayName: values.displayName.trim(),
        boat: values.boat.trim(),
        website: values.website.trim(),
        homePort,
        photoUrl,
      });

      this.avatarFile.set(null);
      this.saved.set(true);
    } catch (err: unknown) {
      this.error.set(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      this.saving.set(false);
    }
  }
}
