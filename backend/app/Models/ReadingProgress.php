<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReadingProgress extends BaseModel
{
    protected $fillable = ['user_id', 'manga_title_id', 'manga_chapter_id', 'page_number', 'last_read_at'];
    protected function casts(): array { return ['last_read_at' => 'datetime']; }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function title(): BelongsTo { return $this->belongsTo(MangaTitle::class, 'manga_title_id'); }
    public function chapter(): BelongsTo { return $this->belongsTo(MangaChapter::class, 'manga_chapter_id'); }
}
