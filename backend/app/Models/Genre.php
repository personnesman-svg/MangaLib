<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Genre extends BaseModel
{
    protected $fillable = ['name', 'slug'];

    public function titles(): BelongsToMany
    {
        return $this->belongsToMany(
            MangaTitle::class,
            in_array(env('DB_CONNECTION', 'mongodb'), ['mysql', 'sqlite'], true) ? 'genre_manga_title' : null
        );
    }
}
