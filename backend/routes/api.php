<?php

use App\Http\Controllers\Api\AdminChapterController;
use App\Http\Controllers\Api\AdminAuthorApplicationController;
use App\Http\Controllers\Api\AuthorApplicationController;
use App\Http\Controllers\Api\AuthorChapterController;
use App\Http\Controllers\Api\AuthorTitleController;
use App\Http\Controllers\Api\AdminTitleController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\GenreController;
use App\Http\Controllers\Api\LibraryController;
use App\Http\Controllers\Api\MangaTitleController;
use App\Http\Controllers\Api\ReaderController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/author-application', [AuthorApplicationController::class, 'show']);
        Route::post('/author-application', [AuthorApplicationController::class, 'store'])->middleware('throttle:3,60');
    });
});

Route::get('/genres', [GenreController::class, 'index']);
Route::get('/titles', [MangaTitleController::class, 'index']);
Route::get('/titles/{slug}', [MangaTitleController::class, 'show']);
Route::get('/titles/{title}/comments', [CommentController::class, 'index']);
Route::get('/chapters/{chapter}', [ReaderController::class, 'show']);

Route::middleware(['auth:sanctum', 'author'])->prefix('author')->group(function () {
    Route::get('/titles', [AuthorTitleController::class, 'index']);
    Route::post('/titles', [AuthorTitleController::class, 'store']);
    Route::post('/titles/{title}', [AuthorTitleController::class, 'update']);
    Route::delete('/titles/{title}', [AuthorTitleController::class, 'destroy']);
    Route::get('/titles/{title}/chapters', [AuthorChapterController::class, 'index']);
    Route::post('/titles/{title}/chapters', [AuthorChapterController::class, 'store']);
    Route::post('/chapters/{chapter}/pages', [AuthorChapterController::class, 'uploadPages']);
    Route::delete('/chapters/{chapter}', [AuthorChapterController::class, 'destroy']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/library', [LibraryController::class, 'index']);
    Route::post('/library/bookmarks/{title}', [LibraryController::class, 'addBookmark']);
    Route::delete('/library/bookmarks/{title}', [LibraryController::class, 'removeBookmark']);
    Route::post('/reader/progress', [ReaderController::class, 'progress']);
    Route::post('/titles/{title}/comments', [CommentController::class, 'store'])->middleware('throttle:10,1');

    Route::prefix('admin')->middleware('admin')->group(function () {
        Route::get('/author-applications', [AdminAuthorApplicationController::class, 'index']);
        Route::post('/author-applications/{application}/review', [AdminAuthorApplicationController::class, 'review']);
        Route::post('/titles/{title}/review', [AdminTitleController::class, 'review']);
        Route::get('/titles', [AdminTitleController::class, 'index']);
        Route::post('/titles', [AdminTitleController::class, 'store']);
        Route::match(['put', 'post'], '/titles/{title}', [AdminTitleController::class, 'update']);
        Route::delete('/titles/{title}', [AdminTitleController::class, 'destroy']);
        Route::get('/titles/{title}/chapters', [AdminChapterController::class, 'index']);
        Route::post('/titles/{title}/chapters', [AdminChapterController::class, 'store']);
        Route::put('/chapters/{chapter}', [AdminChapterController::class, 'update']);
        Route::post('/chapters/{chapter}/pages', [AdminChapterController::class, 'uploadPages']);
        Route::delete('/chapters/{chapter}', [AdminChapterController::class, 'destroy']);
    });
});
