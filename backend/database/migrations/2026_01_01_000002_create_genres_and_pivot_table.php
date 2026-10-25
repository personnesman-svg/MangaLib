<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('genres', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->timestamps();
        });
        Schema::create('genre_manga_title', function (Blueprint $table) {
            $table->foreignId('manga_title_id')->constrained()->cascadeOnDelete();
            $table->foreignId('genre_id')->constrained()->cascadeOnDelete();
            $table->primary(['manga_title_id', 'genre_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('genre_manga_title');
        Schema::dropIfExists('genres');
    }
};
