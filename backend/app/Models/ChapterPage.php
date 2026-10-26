<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChapterPage extends BaseModel
{
    protected $fillable = ['manga_chapter_id', 'page_number', 'image_path'];

    public function chapter(): BelongsTo
    {
        return $this->belongsTo(MangaChapter::class, 'manga_chapter_id');
    }
}
