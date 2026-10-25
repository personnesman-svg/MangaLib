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

class AdminTitleController extends Controller
{
    public function index(Request $request)
    {
        $query = MangaTitle::query()->with(['genres:id,name,slug', 'owner:id,name,email'])->withCount('chapters')->orderByDesc('updated_at');
        if ($search = $request->string('search')->trim()->toString()) {
            $query->where('name', 'like', '%' . addcslashes($search, '%_\\') . '%');
        }
        $titles = $query->paginate(30);
        $titles->getCollection()->transform(fn (MangaTitle $title) => [
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
            'owner_user_id' => $title->owner_user_id,
            'owner_name' => $title->owner?->name,
            'owner_email' => $title->owner?->email,
            'review_status' => $title->review_status ?? 'draft',
            'review_note' => $title->review_note,
            'reviewed_at' => $title->reviewed_at?->toISOString(),
            'genres' => $title->genres->pluck('name')->values(),
            'chapters_count' => $title->chapters_count,
            'updated_at' => $title->updated_at?->toISOString(),
        ]);
        return response()->json($titles);
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
        $data['is_published'] = $request->boolean('is_published');
        $data['is_colored'] = $request->boolean('is_colored');
        $data['review_status'] = $data['is_published'] ? 'approved' : 'draft';
        $data['review_note'] = null;
        $data['reviewed_by'] = $data['is_published'] ? $request->user()->id : null;
        $data['reviewed_at'] = $data['is_published'] ? now() : null;
        $data['first_published_at'] = $data['is_published'] ? now() : null;

        return DB::transaction(function () use ($data, $genreNames, $cover) {
            $title = MangaTitle::create($data);
            $this->syncGenres($title, $genreNames);
            if ($cover) {
                $path = $cover->store("titles/{$title->id}", 'public');
                $title->update(['cover_path' => $path]);
            }
            return response()->json(['data' => $title->load('genres')], 201);
        });
    }

    public function update(Request $request, MangaTitle $title)
    {
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
        $data['is_published'] = $request->boolean('is_published');
        $data['is_colored'] = $request->boolean('is_colored');
        if ($data['is_published']) {
            $data['review_status'] = 'approved';
            $data['review_note'] = null;
            $data['reviewed_by'] = $request->user()->id;
            $data['reviewed_at'] = now();
            $data['first_published_at'] = $title->first_published_at ?? now();
        } elseif ($title->is_published) {
            $data['review_status'] = 'draft';
            $data['reviewed_by'] = null;
            $data['reviewed_at'] = null;
        }

        DB::transaction(function () use ($title, $data, $genreNames, $cover) {
            $title->update($data);
            if (is_array($genreNames)) $this->syncGenres($title, $genreNames);
            if ($cover) {
                $newPath = $cover->store("titles/{$title->id}", 'public');
                if ($title->cover_path) Storage::disk('public')->delete($title->cover_path);
                $title->update(['cover_path' => $newPath]);
            }
        });
        return response()->json(['data' => $title->fresh()->load('genres')]);
    }

    public function review(Request $request, MangaTitle $title)
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['approved', 'rejected'])],
            'review_note' => ['nullable', 'string', 'max:5000'],
        ]);

        $approved = $data['status'] === 'approved';
        abort_if($approved && !$title->cover_path, 422, 'Перед публикацией добавь обложку тайтла.');

        $title->update([
            'is_published' => $approved,
            'review_status' => $data['status'],
            'review_note' => $approved ? null : ($data['review_note'] ?? 'Требуются исправления.'),
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
            'first_published_at' => $approved ? ($title->first_published_at ?? now()) : $title->first_published_at,
        ]);

        return response()->json(['data' => [
            'id' => $title->id,
            'is_published' => $title->is_published,
            'review_status' => $title->review_status,
            'review_note' => $title->review_note,
        ]]);
    }

    public function destroy(MangaTitle $title)
    {
        Storage::disk('public')->deleteDirectory("titles/{$title->id}");
        foreach ($title->chapters as $chapter) Storage::disk('public')->deleteDirectory("chapters/{$chapter->id}");
        $title->delete();
        return response()->noContent();
    }

    private function validateTitle(Request $request, ?int $id = null): array
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
            'is_published' => ['sometimes', 'boolean'],
            'genres' => ['sometimes', 'array', 'max:30'],
            'genres.*' => ['string', 'max:80'],
            'cover' => ['sometimes', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp,avif', 'max:15360'],
        ]);
    }

    private function syncGenres(MangaTitle $title, array $names): void
    {
        $ids = [];
        foreach (array_unique(array_filter(array_map(fn ($n) => trim((string) $n), $names))) as $name) {
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
}
