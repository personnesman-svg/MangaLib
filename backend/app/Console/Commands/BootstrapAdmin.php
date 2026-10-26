<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class BootstrapAdmin extends Command
{
    protected $signature = 'manga:bootstrap-admin';
    protected $description = 'Create the initial administrator when bootstrap environment variables are set';

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
        if (!$user->exists) {
            $user->name = $name !== '' ? $name : 'MangaLib Admin';
            $user->password = Hash::make($password);
            $user->role = 'admin';
            $user->email_verified_at = now();
            $user->save();
            $this->info('Initial administrator created.');
            return self::SUCCESS;
        }

        if ($user->role !== 'admin') {
            $user->role = 'admin';
            $user->save();
            $this->info('Configured administrator account promoted to admin.');
        } else {
            $this->line('Configured administrator already exists; its password was not changed.');
        }

        return self::SUCCESS;
    }
}
