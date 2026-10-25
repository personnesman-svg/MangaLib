<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('bookmarks', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('manga_title_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->primary(['user_id', 'manga_title_id']);
        });
        Schema::create('reading_progress', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('manga_title_id')->constrained()->cascadeOnDelete();
            $table->foreignId('manga_chapter_id')->nullable()->constrained('manga_chapters')->nullOnDelete();
            $table->unsignedInteger('page_number')->default(1);
            $table->timestamp('last_read_at')->nullable()->index();
            $table->timestamps();
            $table->unique(['user_id', 'manga_title_id']);
        });
        Schema::create('comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('manga_title_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('comments')->cascadeOnDelete();
            $table->text('content');
            $table->boolean('is_visible')->default(true)->index();
            $table->timestamps();
            $table->index(['manga_title_id', 'created_at']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('comments');
        Schema::dropIfExists('reading_progress');
        Schema::dropIfExists('bookmarks');
    }
};
