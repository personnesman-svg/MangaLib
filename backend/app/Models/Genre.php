<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Genre extends Model
{
    protected $fillable = ['name', 'slug'];

    public function titles(): BelongsToMany
    {
        return $this->belongsToMany(MangaTitle::class, 'genre_manga_title');
    }
}
