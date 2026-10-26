<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MangaTitle;
use Illuminate\Http\Request;

class MangaTitleController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:120'],
            'status' => ['sometimes', 'nullable', 'in:ongoing,completed,hiatus,cancelled'],
            'genre' => ['sometimes', 'nullable', 'string', 'max:100'],
            'type' => ['sometimes', 'nullable', 'in:manga,manhwa,manhua,comic,webtoon,novel'],
            'year' => ['sometimes', 'nullable', 'integer', 'min:1900', 'max:' . (now()->year + 10)],
            'sort' => ['sometimes', 'nullable', 'in:updated,popular,name'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $query = MangaTitle::query()->where('is_published', true)->with('genres:id,name,slug')
            ->withMax(['chapters as latest_chapter_number' => fn ($q) => $q->where('is_published', true)], 'number');
        if (!empty($validated['search'])) {
            $term = addcslashes($validated['search'], '%_\\');
            $query->where(function ($builder) use ($term, $validated) {
                $builder->where('name', 'like', "%{$term}%")
                    ->orWhere('original_name', 'like', "%{$term}%");
                if (!empty($validated['search'])) {
                    if (in_array(env('DB_CONNECTION', 'mongodb'), ['mysql', 'sqlite'], true)) {
                        $builder->orWhereJsonContains('alternative_names', $validated['search']);
                    } else {
                        $builder->orWhere('alternative_names', $validated['search']);
                    }
                }
            });
        }
        if (!empty($validated['status'])) $query->where('status', $validated['status']);
        if (!empty($validated['type'])) $query->where('content_type', $validated['type']);
        if (!empty($validated['year'])) $query->where('release_year', $validated['year']);
        if (!empty($validated['genre'])) $query->whereHas('genres', fn ($q) => $q->where('slug', $validated['genre'])->orWhere('name', $validated['genre']));
        match ($validated['sort'] ?? 'updated') {
            'popular' => $query->orderByDesc('view_count')->orderByDesc('updated_at'),
            'name' => $query->orderBy('name'),
            default => $query->orderByDesc('updated_at'),
        };
        $titles = $query->paginate(24)->withQueryString();
        $titles->getCollection()->transform(fn (MangaTitle $title) => [
            'id' => $title->id, 'slug' => $title->slug, 'name' => $title->name,
            'description' => $title->description,
            'original_name' => $title->original_name,
            'alternative_names' => $title->alternative_names ?? [],
            'author' => $title->author,
            'artist' => $title->artist,
            'release_year' => $title->release_year,
            'content_type' => $title->content_type,
            'age_rating' => $title->age_rating,
            'is_colored' => $title->is_colored,
            'cover_url' => $title->cover_path ? asset('storage/' . $title->cover_path) : null,
            'status' => $title->status, 'genres' => $title->genres->pluck('name')->values(),
            'latest_chapter' => $title->latest_chapter_number,
            'view_count' => $title->view_count,
            'updated_at' => $title->updated_at?->toISOString(),
        ]);
        return response()->json($titles);
    }

    public function show(string $slug)
    {
        $title = MangaTitle::query()->where('slug', $slug)->where('is_published', true)
            ->with('genres:id,name,slug')
            ->with(['chapters' => fn ($query) => $query->where('is_published', true)->withCount('pages')->orderByDesc('number')])
            ->firstOrFail();
        $title->increment('view_count');
        return response()->json(['data' => [
            'id' => $title->id, 'slug' => $title->slug, 'name' => $title->name,
            'description' => $title->description,
            'original_name' => $title->original_name,
            'alternative_names' => $title->alternative_names ?? [],
            'author' => $title->author,
            'artist' => $title->artist,
            'release_year' => $title->release_year,
            'content_type' => $title->content_type,
            'age_rating' => $title->age_rating,
            'is_colored' => $title->is_colored,
            'cover_url' => $title->cover_path ? asset('storage/' . $title->cover_path) : null,
            'status' => $title->status, 'genres' => $title->genres->pluck('name')->values(),
            'view_count' => $title->view_count,
            'latest_chapter' => $title->chapters->first()?->number,
            'updated_at' => $title->updated_at?->toISOString(),
            'chapters' => $title->chapters->map(fn ($chapter) => [
                'id' => $chapter->id, 'number' => $chapter->number, 'name' => $chapter->name,
                'published_at' => $chapter->published_at?->toISOString(), 'pages_count' => $chapter->pages_count,
            ])->values(),
        ]]);
    }
}
