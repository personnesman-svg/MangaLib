<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChapterPage;
use App\Models\MangaChapter;
use App\Models\MangaTitle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AdminChapterController extends Controller
{
    public function index(MangaTitle $title)
    {
        $chapters = $title->chapters()->withCount('pages')->orderByDesc('number')->get()->map(fn (MangaChapter $chapter) => [
            'id' => $chapter->id,
            'number' => $chapter->number,
            'name' => $chapter->name,
            'is_published' => $chapter->is_published,
            'published_at' => $chapter->published_at?->toISOString(),
            'pages_count' => $chapter->pages_count,
        ]);
        return response()->json(['data' => $chapters]);
    }

    public function store(Request $request, MangaTitle $title)
    {
        $data = $request->validate([
            'number' => ['required', 'numeric', 'min:0', 'max:9999999.999'],
            'name' => ['nullable', 'string', 'max:190'],
            'is_published' => ['sometimes', 'boolean'],
            'pages' => ['sometimes', 'array', 'max:30'],
            'pages.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,avif', 'max:15360'],
        ]);
        abort_if(MangaChapter::where('manga_title_id', $title->id)->where('number', $data['number'])->exists(), 422, 'Глава с таким номером уже существует.');
        $files = $data['pages'] ?? [];
        $published = $request->boolean('is_published') && count($files) > 0;
        $chapter = DB::transaction(function () use ($title, $data, $files, $published) {
            $chapter = $title->chapters()->create([
                'number' => $data['number'], 'name' => $data['name'] ?? null,
                'is_published' => false, 'published_at' => null,
            ]);
            foreach (array_values($files) as $index => $file) {
                $path = $file->store("chapters/{$chapter->id}", 'public');
                $chapter->pages()->create(['page_number' => $index + 1, 'image_path' => $path]);
            }
            if ($published) $chapter->update(['is_published' => true, 'published_at' => now()]);
            return $chapter;
        });
        return response()->json(['data' => $chapter->loadCount('pages')], 201);
    }

    public function update(Request $request, MangaChapter $chapter)
    {
        $data = $request->validate([
            'number' => ['sometimes', 'numeric', 'min:0', 'max:9999999.999'],
            'name' => ['nullable', 'string', 'max:190'],
            'is_published' => ['sometimes', 'boolean'],
        ]);
        if (array_key_exists('number', $data)) {
            abort_if(MangaChapter::where('manga_title_id', $chapter->manga_title_id)->where('number', $data['number'])->where('id', '<>', $chapter->id)->exists(), 422, 'Глава с таким номером уже существует.');
        }
        if (($data['is_published'] ?? false) && !$chapter->pages()->exists()) abort(422, 'Нельзя публиковать главу без страниц.');
        if (($data['is_published'] ?? false) && !$chapter->is_published) $data['published_at'] = now();
        if (array_key_exists('is_published', $data) && !$data['is_published']) $data['published_at'] = null;
        $chapter->update($data);
        return response()->json(['data' => $chapter->fresh()->loadCount('pages')]);
    }

    public function uploadPages(Request $request, MangaChapter $chapter)
    {
        $data = $request->validate([
            'pages' => ['required', 'array', 'min:1', 'max:30'],
            'pages.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,avif', 'max:15360'],
        ]);
        $next = ((int) $chapter->pages()->max('page_number')) + 1;
        DB::transaction(function () use ($data, $chapter, &$next) {
            foreach ($data['pages'] as $file) {
                $path = $file->store("chapters/{$chapter->id}", 'public');
                $chapter->pages()->create(['page_number' => $next++, 'image_path' => $path]);
            }
        });
        return response()->json(['data' => $chapter->fresh()->loadCount('pages')]);
    }

    public function destroy(MangaChapter $chapter)
    {
        Storage::disk('public')->deleteDirectory("chapters/{$chapter->id}");
        $chapter->delete();
        return response()->noContent();
    }
}
