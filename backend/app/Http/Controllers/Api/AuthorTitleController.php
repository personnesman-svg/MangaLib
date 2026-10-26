<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Genre;
use App\Models\MangaTitle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AuthorTitleController extends Controller
{
    public function index(Request $request)
    {
        $titles = MangaTitle::query()
            ->where('owner_user_id', $request->user()->id)
            ->with('genres:id,name,slug')
            ->withCount('chapters')
            ->orderByDesc('updated_at')
            ->get()
            ->map(fn (MangaTitle $title) => $this->titleData($title));

        return response()->json(['data' => $titles]);
    }

    public function store(Request $request)
    {
        $data = $this->validateTitle($request);
        $cover = $data['cover'] ?? null;
        unset($data['cover']);
        if ($request->boolean('clear_alternative_names')) $data['alternative_names'] = [];
        unset($data['clear_alternative_names']);
        $genreNames = $data['genres'] ?? [];
        unset($data['genres']);

        $data['slug'] = $this->uniqueSlug(($data['slug'] ?? '') ?: $data['name']);
        $data['owner_user_id'] = $request->user()->id;
        $data['is_published'] = false;
        $data['review_status'] = 'pending';
        $data['review_note'] = null;

        return DB::transaction(function () use ($data, $genreNames, $cover) {
            $title = MangaTitle::create($data);
            $this->syncGenres($title, $genreNames);
            if ($cover) {
                $path = $cover->store("titles/{$title->id}", 'public');
                $title->update(['cover_path' => $path]);
            }

            return response()->json(['data' => $this->titleData($title->fresh()->load('genres')->loadCount('chapters'))], 201);
        });
    }

    public function update(Request $request, MangaTitle $title)
    {
        $this->authorizeTitle($request, $title);
        $data = $this->validateTitle($request, $title->id);
        $cover = $data['cover'] ?? null;
        unset($data['cover']);
        if ($request->boolean('clear_alternative_names')) $data['alternative_names'] = [];
        unset($data['clear_alternative_names']);
        $genreNames = $data['genres'] ?? [];
        unset($data['genres']);

        if (array_key_exists('slug', $data) && $data['slug']) {
            $normalizedSlug = Str::slug($data['slug']);
            abort_if(
                $normalizedSlug === '' || MangaTitle::where('slug', $normalizedSlug)->where('id', '<>', $title->id)->exists(),
                422,
                'Этот URL уже занят или не содержит допустимых символов.'
            );
            $data['slug'] = $normalizedSlug;
        } else {
            unset($data['slug']);
        }

        // Every author edit returns the item to moderation. An already published item is hidden until the admin re-approves it.
        $data['is_published'] = false;
        $data['review_status'] = 'pending';
        $data['review_note'] = null;
        $data['reviewed_by'] = null;
        $data['reviewed_at'] = null;

        DB::transaction(function () use ($title, $data, $genreNames, $cover) {
            $title->update($data);
            $this->syncGenres($title, $genreNames);
            if ($cover) {
                $newPath = $cover->store("titles/{$title->id}", 'public');
                if ($title->cover_path) Storage::disk('public')->delete($title->cover_path);
                $title->update(['cover_path' => $newPath]);
            }
        });

        return response()->json(['data' => $this->titleData($title->fresh()->load('genres')->loadCount('chapters'))]);
    }

    public function destroy(Request $request, MangaTitle $title)
    {
        $this->authorizeTitle($request, $title);
        abort_if($title->first_published_at !== null, 403, 'Тайтл, который уже публиковался, может удалить только администратор.');
        Storage::disk('public')->deleteDirectory("titles/{$title->id}");
        foreach ($title->chapters as $chapter) Storage::disk('public')->deleteDirectory("chapters/{$chapter->id}");
        $title->delete();
        return response()->noContent();
    }

    private function authorizeTitle(Request $request, MangaTitle $title): void
    {
        abort_unless((string) $title->owner_user_id === (string) $request->user()->id, 404, 'Тайтл не найден.');
    }

    private function validateTitle(Request $request, ?string $id = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:190'],
            'slug' => ['nullable', 'string', 'max:190', Rule::unique('manga_titles', 'slug')->ignore($id)],
            'original_name' => ['nullable', 'string', 'max:190'],
            'alternative_names' => ['sometimes', 'array', 'max:30'],
            'clear_alternative_names' => ['sometimes', 'boolean'],
            'alternative_names.*' => ['string', 'max:190'],
            'description' => ['nullable', 'string', 'max:30000'],
            'author' => ['nullable', 'string', 'max:190'],
            'artist' => ['nullable', 'string', 'max:190'],
            'release_year' => ['nullable', 'integer', 'min:1900', 'max:' . (now()->year + 10)],
            'content_type' => ['required', Rule::in(['manga', 'manhwa', 'manhua', 'comic', 'webtoon', 'novel'])],
            'age_rating' => ['required', Rule::in(['all', '12+', '16+', '18+'])],
            'is_colored' => ['sometimes', 'boolean'],
            'status' => ['required', Rule::in(['ongoing', 'completed', 'hiatus', 'cancelled'])],
            'genres' => ['sometimes', 'array', 'max:30'],
            'genres.*' => ['string', 'max:80'],
            'cover' => ['sometimes', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp,avif', 'max:15360'],
        ]);
    }

    private function syncGenres(MangaTitle $title, array $names): void
    {
        $ids = [];
        foreach (array_unique(array_filter(array_map(fn ($name) => trim((string) $name), $names))) as $name) {
            $slug = Str::slug($name);
            if ($slug === '') continue;
            $genre = Genre::firstOrCreate(['slug' => $slug], ['name' => $name]);
            $ids[] = $genre->id;
        }
        $title->genres()->sync($ids);
    }

    private function uniqueSlug(string $value): string
    {
        $base = Str::slug($value);
        if ($base === '') $base = 'title';
        $slug = $base;
        $counter = 2;
        while (MangaTitle::where('slug', $slug)->exists()) $slug = $base . '-' . $counter++;
        return $slug;
    }

    private function titleData(MangaTitle $title): array
    {
        return [
            'id' => $title->id,
            'slug' => $title->slug,
            'name' => $title->name,
            'original_name' => $title->original_name,
            'alternative_names' => $title->alternative_names ?? [],
            'description' => $title->description,
            'author' => $title->author,
            'artist' => $title->artist,
            'release_year' => $title->release_year,
            'content_type' => $title->content_type,
            'age_rating' => $title->age_rating,
            'is_colored' => $title->is_colored,
            'cover_url' => $title->cover_path ? asset('storage/' . $title->cover_path) : null,
            'status' => $title->status,
            'is_published' => $title->is_published,
            'review_status' => $title->review_status,
            'review_note' => $title->review_note,
            'genres' => $title->genres?->pluck('name')->values() ?? [],
            'chapters_count' => $title->chapters_count ?? $title->chapters()->count(),
            'updated_at' => $title->updated_at?->toISOString(),
        ];
    }
}
