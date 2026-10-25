<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('manga_titles', function (Blueprint $table) {
            $table->string('original_name', 190)->nullable();
            $table->json('alternative_names')->nullable();
            $table->string('author', 190)->nullable();
            $table->string('artist', 190)->nullable();
            $table->unsignedSmallInteger('release_year')->nullable()->index();
            $table->enum('content_type', ['manga', 'manhwa', 'manhua', 'comic', 'webtoon', 'novel'])->default('manga')->index();
            $table->enum('age_rating', ['all', '12+', '16+', '18+'])->default('16+');
            $table->boolean('is_colored')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('manga_titles', function (Blueprint $table) {
            $table->dropIndex(['release_year']);
            $table->dropIndex(['content_type']);
            $table->dropColumn(['original_name', 'alternative_names', 'author', 'artist', 'release_year', 'content_type', 'age_rating', 'is_colored']);
        });
    }
};
