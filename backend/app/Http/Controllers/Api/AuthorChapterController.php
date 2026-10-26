<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MangaChapter;
use App\Models\MangaTitle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AuthorChapterController extends Controller
{
    public function index(Request $request, MangaTitle $title)
    {
        $this->authorizeTitle($request, $title);
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
        $this->authorizeTitle($request, $title);
        $data = $request->validate([
            'number' => ['required', 'numeric', 'min:0', 'max:9999999.999'],
            'name' => ['nullable', 'string', 'max:190'],
            'pages' => ['sometimes', 'array', 'max:30'],
            'pages.*' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,avif', 'max:15360'],
        ]);
        abort_if(MangaChapter::where('manga_title_id', $title->id)->where('number', $data['number'])->exists(), 422, 'Глава с таким номером уже существует.');
        $files = $data['pages'] ?? [];

        $chapter = DB::transaction(function () use ($title, $data, $files) {
            $chapter = $title->chapters()->create([
                'number' => $data['number'], 'name' => $data['name'] ?? null,
                'is_published' => false, 'published_at' => null,
            ]);
            foreach (array_values($files) as $index => $file) {
                $path = $file->store("chapters/{$chapter->id}", 'public');
                $chapter->pages()->create(['page_number' => $index + 1, 'image_path' => $path]);
            }
            return $chapter;
        });

        return response()->json(['data' => $chapter->loadCount('pages')], 201);
    }

    public function uploadPages(Request $request, MangaChapter $chapter)
    {
        $this->authorizeChapter($request, $chapter);
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
            if ($chapter->is_published) $chapter->update(['is_published' => false, 'published_at' => null]);
        });

        return response()->json(['data' => $chapter->fresh()->loadCount('pages')]);
    }

    public function destroy(Request $request, MangaChapter $chapter)
    {
        $this->authorizeChapter($request, $chapter);
        abort_if($chapter->is_published, 403, 'Опубликованную главу может удалить только администратор.');
        Storage::disk('public')->deleteDirectory("chapters/{$chapter->id}");
        $chapter->delete();
        return response()->noContent();
    }

    private function authorizeTitle(Request $request, MangaTitle $title): void
    {
        abort_unless((string) $title->owner_user_id === (string) $request->user()->id, 404, 'Тайтл не найден.');
    }

    private function authorizeChapter(Request $request, MangaChapter $chapter): void
    {
        abort_unless((string) $chapter->title()->value('owner_user_id') === (string) $request->user()->id, 404, 'Глава не найдена.');
    }
}
