<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MangaChapter extends BaseModel
{
    protected $fillable = ['manga_title_id', 'number', 'name', 'is_published', 'published_at'];

    protected function casts(): array
    {
        return ['is_published' => 'boolean', 'published_at' => 'datetime'];
    }

    public function title(): BelongsTo
    {
        return $this->belongsTo(MangaTitle::class, 'manga_title_id');
    }

    public function pages(): HasMany
    {
        return $this->hasMany(ChapterPage::class, 'manga_chapter_id')->orderBy('page_number');
    }
}
