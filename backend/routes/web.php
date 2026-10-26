<?php

use App\Http\Controllers\GridFsFileController;
use Illuminate\Support\Facades\Route;

Route::get('/_backend-health', fn () => response()->json(['status' => 'ok']));
Route::get('/storage/{path}', [GridFsFileController::class, 'show'])->where('path', '.*');
