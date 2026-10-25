<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MangaChapter;
use Illuminate\Http\Request;

class ReaderController extends Controller
{
    public function show(Request $request, MangaChapter $chapter)
    {
        abort_unless($chapter->is_published && $chapter->title()->where('is_published', true)->exists(), 404);
        $chapter->load(['title:id,slug,name', 'pages:id,manga_chapter_id,page_number,image_path']);
        $previous = MangaChapter::where('manga_title_id', $chapter->manga_title_id)->where('is_published', true)
            ->where('number', '<', $chapter->number)->orderByDesc('number')->value('id');
        $next = MangaChapter::where('manga_title_id', $chapter->manga_title_id)->where('is_published', true)
            ->where('number', '>', $chapter->number)->orderBy('number')->value('id');

        $resumePage = 1;
        if ($request->user()) {
            $progress = $request->user()->readingProgress()->where('manga_title_id', $chapter->manga_title_id)->first();
            if (!$progress || (int) $progress->manga_chapter_id !== (int) $chapter->id) {
                $progress = $request->user()->readingProgress()->updateOrCreate(
                    ['manga_title_id' => $chapter->manga_title_id],
                    ['manga_chapter_id' => $chapter->id, 'page_number' => 1, 'last_read_at' => now()],
                );
            } else {
                $progress->update(['last_read_at' => now()]);
            }
            $resumePage = min(max(1, (int) $progress->page_number), max(1, $chapter->pages->count()));
        }

        return response()->json(['data' => [
            'resume_page_number' => $resumePage,
            'chapter' => ['id' => $chapter->id, 'number' => $chapter->number, 'name' => $chapter->name],
            'title' => ['id' => $chapter->title->id, 'slug' => $chapter->title->slug, 'name' => $chapter->title->name],
            'pages' => $chapter->pages->map(fn ($page) => ['id' => $page->id, 'number' => $page->page_number, 'url' => asset('storage/' . $page->image_path)])->values(),
            'previous_chapter_id' => $previous,
            'next_chapter_id' => $next,
        ]]);
    }

    public function progress(Request $request)
    {
        $data = $request->validate([
            'chapter_id' => ['required', 'integer', 'exists:manga_chapters,id'],
            'page_number' => ['required', 'integer', 'min:1'],
        ]);
        $chapter = MangaChapter::whereKey($data['chapter_id'])->where('is_published', true)->firstOrFail();
        abort_unless($chapter->title()->where('is_published', true)->exists(), 404);
        $pageCount = $chapter->pages()->count();
        $page = min($data['page_number'], max(1, $pageCount));
        $request->user()->readingProgress()->updateOrCreate(
            ['manga_title_id' => $chapter->manga_title_id],
            ['manga_chapter_id' => $chapter->id, 'page_number' => $page, 'last_read_at' => now()],
        );
        return response()->json(['message' => 'Прогресс сохранён.']);
    }
}
