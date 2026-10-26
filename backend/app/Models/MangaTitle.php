<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MangaTitle extends BaseModel
{
    protected $fillable = ['owner_user_id', 'slug', 'name', 'original_name', 'alternative_names', 'description', 'author', 'artist', 'release_year', 'content_type', 'age_rating', 'is_colored', 'cover_path', 'status', 'is_published', 'view_count', 'review_status', 'review_note', 'reviewed_by', 'reviewed_at', 'first_published_at'];
    protected function casts(): array { return ['is_published' => 'boolean', 'view_count' => 'integer', 'release_year' => 'integer', 'alternative_names' => 'array', 'is_colored' => 'boolean', 'reviewed_at' => 'datetime', 'first_published_at' => 'datetime']; }
    public function owner() { return $this->belongsTo(User::class, 'owner_user_id'); }
    public function reviewer() { return $this->belongsTo(User::class, 'reviewed_by'); }
    public function genres(): BelongsToMany { return $this->belongsToMany(Genre::class, in_array(env('DB_CONNECTION', 'mongodb'), ['mysql', 'sqlite'], true) ? 'genre_manga_title' : null); }
    public function chapters(): HasMany { return $this->hasMany(MangaChapter::class); }
    public function comments(): HasMany { return $this->hasMany(Comment::class); }
}
