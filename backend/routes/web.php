<?php

use Illuminate\Support\Facades\Route;

Route::get('/_backend-health', fn () => response()->json(['status' => 'ok']));
