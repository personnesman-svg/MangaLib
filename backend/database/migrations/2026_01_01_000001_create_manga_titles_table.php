<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('manga_titles', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('cover_path')->nullable();
            $table->enum('status', ['ongoing', 'completed', 'hiatus', 'cancelled'])->default('ongoing');
            $table->boolean('is_published')->default(false)->index();
            $table->timestamps();
            $table->index(['is_published', 'updated_at']);
            $table->fullText(['name', 'description']);
        });
    }

    public function down(): void { Schema::dropIfExists('manga_titles'); }
};
