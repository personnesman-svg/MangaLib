<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('manga_chapters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manga_title_id')->constrained()->cascadeOnDelete();
            $table->decimal('number', 10, 3);
            $table->string('name')->nullable();
            $table->boolean('is_published')->default(false)->index();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
            $table->unique(['manga_title_id', 'number']);
        });
        Schema::create('chapter_pages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manga_chapter_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('page_number');
            $table->string('image_path');
            $table->timestamps();
            $table->unique(['manga_chapter_id', 'page_number']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('chapter_pages');
        Schema::dropIfExists('manga_chapters');
    }
};
