<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password'];
    protected $hidden = ['password', 'remember_token'];
    protected function casts(): array { return ['email_verified_at' => 'datetime', 'password' => 'hashed']; }

    public function bookmarks(): BelongsToMany
    {
        return $this->belongsToMany(MangaTitle::class, 'bookmarks')->withTimestamps();
    }
    public function readingProgress(): HasMany { return $this->hasMany(ReadingProgress::class); }
    public function comments(): HasMany { return $this->hasMany(Comment::class); }
    public function authorApplications(): HasMany { return $this->hasMany(AuthorApplication::class); }
    public function mangaTitles(): HasMany { return $this->hasMany(MangaTitle::class, 'owner_user_id'); }
}
