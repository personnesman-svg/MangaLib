<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\MangaTitle;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function index(MangaTitle $title)
    {
        abort_unless($title->is_published, 404);
        return response()->json(['data' => $title->comments()->whereNull('parent_id')->where('is_visible', true)
            ->with(['user:id,name', 'replies' => fn ($q) => $q->where('is_visible', true)->with('user:id,name')->latest()])
            ->latest()->paginate(30)]);
    }

    public function store(Request $request, MangaTitle $title)
    {
        abort_unless($title->is_published, 404);
        $data = $request->validate([
            'content' => ['required', 'string', 'min:1', 'max:3000'],
            'parent_id' => ['nullable', 'integer', 'exists:comments,id'],
        ]);
        if (!empty($data['parent_id'])) {
            $parent = Comment::whereKey($data['parent_id'])->where('manga_title_id', $title->id)->whereNull('parent_id')->where('is_visible', true)->firstOrFail();
        }
        $comment = $title->comments()->create([
            'user_id' => $request->user()->id,
            'parent_id' => $data['parent_id'] ?? null,
            'content' => trim($data['content']),
            'is_visible' => true,
        ]);
        return response()->json(['data' => $comment->load('user:id,name')], 201);
    }
}
