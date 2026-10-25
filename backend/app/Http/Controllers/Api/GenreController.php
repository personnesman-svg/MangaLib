<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Genre;

class GenreController extends Controller
{
    public function index()
    {
        $genres = Genre::query()
            ->whereHas('titles', fn ($query) => $query->where('is_published', true))
            ->withCount(['titles' => fn ($query) => $query->where('is_published', true)])
            ->orderBy('name')
            ->get(['id', 'name', 'slug']);

        return response()->json(['data' => $genres]);
    }
}
