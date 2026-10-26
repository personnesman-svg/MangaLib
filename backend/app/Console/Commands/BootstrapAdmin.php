<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class BootstrapAdmin extends Command
{
    protected $signature = 'manga:bootstrap-admin';
    protected $description = 'Create the initial administrator and optionally reset an existing administrator password';

    public function handle(): int
    {
        $email = mb_strtolower(trim((string) env('MANGA_ADMIN_EMAIL', '')));
        $password = (string) env('MANGA_ADMIN_PASSWORD', '');
        $name = trim((string) env('MANGA_ADMIN_NAME', 'MangaLib Admin'));
        $resetExistingPassword = filter_var(
            (string) env('MANGA_ADMIN_RESET_PASSWORD', 'false'),
            FILTER_VALIDATE_BOOLEAN
        );

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

        if ($created) {
            $user->name = $name !== '' ? $name : 'MangaLib Admin';
            $user->password = Hash::make($password);
            $user->role = 'admin';
            $user->email_verified_at = now();
            $user->save();
            $this->info('Initial administrator created.');
            return self::SUCCESS;
        }

        $changed = false;
        if (($user->role ?? null) !== 'admin') {
            $user->role = 'admin';
            $changed = true;
        }

        $currentHash = (string) ($user->getAuthPassword() ?? '');
        $passwordMatches = $currentHash !== '' && Hash::check($password, $currentHash);
        if ($resetExistingPassword && !$passwordMatches) {
            $user->password = Hash::make($password);
            $changed = true;
        }

        if ($changed) {
            $user->save();
        }

        if ($resetExistingPassword && !$passwordMatches) {
            $this->info('Configured administrator password reset from environment as explicitly requested.');
        } elseif (!$passwordMatches) {
            $this->line('Existing administrator password left unchanged. Set MANGA_ADMIN_RESET_PASSWORD=true temporarily to reset it.');
        } elseif ($changed) {
            $this->info('Configured administrator account promoted to admin.');
        } else {
            $this->line('Configured administrator is ready; environment password matches.');
        }

        return self::SUCCESS;
    }
}
