<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Comment extends BaseModel
{
    protected $fillable = ['user_id', 'manga_title_id', 'parent_id', 'content', 'is_visible'];
    protected function casts(): array { return ['is_visible' => 'boolean']; }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function title(): BelongsTo { return $this->belongsTo(MangaTitle::class, 'manga_title_id'); }
    public function parent(): BelongsTo { return $this->belongsTo(self::class, 'parent_id'); }
    public function replies(): HasMany { return $this->hasMany(self::class, 'parent_id'); }
}
