<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MangaTitle;
use Illuminate\Http\Request;

class LibraryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $bookmarks = $user->bookmarks()->with('genres:id,name,slug')->withMax(['chapters as latest_chapter_number' => fn ($query) => $query->where('is_published', true)], 'number')->orderByDesc('manga_titles.updated_at')->get();
        $history = $user->readingProgress()->with(['title:id,slug,name,cover_path,status', 'chapter:id,number,name'])->orderByDesc('last_read_at')->limit(100)->get()->map(fn ($progress) => [
            'title' => [
                'id' => $progress->title->id, 'slug' => $progress->title->slug, 'name' => $progress->title->name,
                'cover_url' => $progress->title->cover_path ? asset('storage/' . $progress->title->cover_path) : null,
            ],
            'chapter' => $progress->chapter ? ['id' => $progress->chapter->id, 'number' => $progress->chapter->number] : null,
            'page_number' => $progress->page_number,
            'last_read_at' => $progress->last_read_at?->toISOString(),
        ]);
        return response()->json([
            'bookmarks' => $bookmarks->map(fn ($title) => [
                'id' => $title->id, 'slug' => $title->slug, 'name' => $title->name,
                'cover_url' => $title->cover_path ? asset('storage/' . $title->cover_path) : null,
                'status' => $title->status, 'latest_chapter' => $title->latest_chapter_number,
            ]),
            'history' => $history,
        ]);
    }

    public function addBookmark(Request $request, MangaTitle $title)
    {
        abort_unless($title->is_published, 404);
        $request->user()->bookmarks()->syncWithoutDetaching([$title->id]);
        return response()->json(['bookmarked' => true]);
    }

    public function removeBookmark(Request $request, MangaTitle $title)
    {
        $request->user()->bookmarks()->detach($title->id);
        return response()->json(['bookmarked' => false]);
    }
}
