<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class BootstrapAdmin extends Command
{
    protected $signature = 'manga:bootstrap-admin';
    protected $description = 'Create or synchronize the initial administrator from environment variables';

    public function handle(): int
    {
        $email = mb_strtolower(trim((string) env('MANGA_ADMIN_EMAIL', '')));
        $password = (string) env('MANGA_ADMIN_PASSWORD', '');
        $name = trim((string) env('MANGA_ADMIN_NAME', 'MangaLib Admin'));

        if ($email === '' || $password === '') {
            $this->line('Admin bootstrap skipped: MANGA_ADMIN_EMAIL or MANGA_ADMIN_PASSWORD is not set.');
            return self::SUCCESS;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($password) < 12) {
            $this->error('Set a valid MANGA_ADMIN_EMAIL and a MANGA_ADMIN_PASSWORD of at least 12 characters.');
            return self::FAILURE;
        }

        $user = User::firstOrNew(['email' => $email]);
        $created = !$user->exists;
        $changed = false;

        if ($created) {
            $user->name = $name !== '' ? $name : 'MangaLib Admin';
            $user->email_verified_at = now();
            $changed = true;
        }

        if (($user->role ?? null) !== 'admin') {
            $user->role = 'admin';
            $changed = true;
        }

        $currentHash = (string) ($user->getAuthPassword() ?? '');
        $passwordMatches = $currentHash !== '' && Hash::check($password, $currentHash);

        // The configured environment password is the recovery source of truth.
        // This also repairs an admin created earlier with a different password.
        if (!$passwordMatches) {
            $user->password = Hash::make($password);
            $changed = true;
        }

        if ($changed) {
            $user->save();
        }

        if ($created) {
            $this->info('Initial administrator created.');
        } elseif (!$passwordMatches) {
            $this->info('Configured administrator password synchronized from environment.');
        } elseif ($changed) {
            $this->info('Configured administrator account promoted to admin.');
        } else {
            $this->line('Configured administrator is ready; environment password matches.');
        }

        return self::SUCCESS;
    }
}
