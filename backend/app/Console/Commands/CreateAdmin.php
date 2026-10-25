<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateAdmin extends Command
{
    protected $signature = 'manga:admin-create {email : Admin email} {name : Display name}';
    protected $description = 'Create or promote a user as site administrator';

    public function handle(): int
    {
        $email = mb_strtolower((string) $this->argument('email'));
        $name = (string) $this->argument('name');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { $this->error('Invalid email address.'); return self::FAILURE; }
        $password = $this->secret('Enter a strong password (at least 12 characters)');
        if (!is_string($password) || mb_strlen($password) < 12) { $this->error('Password must be at least 12 characters.'); return self::FAILURE; }
        $user = User::firstOrNew(['email' => $email]);
        $user->name = $name;
        $user->password = Hash::make($password);
        $user->role = 'admin';
        $user->email_verified_at = now();
        $user->save();
        $this->info("Administrator {$email} is ready.");
        return self::SUCCESS;
    }
}
